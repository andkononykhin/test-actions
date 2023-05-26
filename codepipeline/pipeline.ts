import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';

import { Construct } from 'constructs';
import { Function, InlineCode, Runtime, AssetCode, Code, FunctionUrlAuthType } from "aws-cdk-lib/aws-lambda"
import 'source-map-support/register';

import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import {CodePipelinePostToGitHub} from "@awesome-cdk/cdk-report-codepipeline-status-to-github";

const theRepo = 'andkononykhin/test-actions';
const codePipelineDir = 'codepipeline';
const repo = theRepo;


// TODO move regex parsing logic to a utility module
/*
const repoMatch = process.env['SOURCE_REPO_URL']?.match(/:?\/*(.*)/)

if (repoMatch == null) {
    throw new Error(
        `repo url has unexpected format: ${process.env['SOURCE_REPO_URL']}, env: ${JSON.stringify(process.env)}`
    );
}
const repo = repoMatch[1].replace('.git', '');
if (repo != theRepo) {
    throw new Error(`repo url is unexpected: ${repo}`);
}

const versionMatch = process.env['WEBHOOK_TRIGGER']?.match(/(tag|branch|pr)\/(.+)/);
if (versionMatch == null) {
    throw new Error(`WEBHOOK_TRIGGER has an unexpected format: ${process.env['WEBHOOK_TRIGGER']}`);
}

const versionType = versionMatch[1];
const versionValue = versionMatch[2];
*/

const versionType = 'branch';
const versionValue = 'test-ci-02';

if (versionType != 'branch') {
    throw new Error(`WEBHOOK_TRIGGER is unexpected: ${process.env['WEBHOOK_TRIGGER']}`);
}

function pipelineName(repoName: string, versionType: string, versionValue: string): string {
    return `${repoName}/${versionType}/${versionValue}`.replace(/[^0-9a-zA-Z_-]/g, '_');
}


export class BuildStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);
    }
}

export class MyPipelineAppStage extends cdk.Stage {

    constructor(scope: Construct, id: string, props?: cdk.StageProps) {
      super(scope, id, props);

      const buildStack = new BuildStack(this, 'LambdaStack');
    }
}


export class MyPipelineStack extends cdk.Stack {
  pipeline: CodePipeline;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const source = CodePipelineSource.gitHub(theRepo, versionValue, {
        authentication: cdk.SecretValue.secretsManager('github-access-token-secret05'), // FIXME
    })

    this.pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: pipelineName(repo!, versionType!, versionValue!),
      artifactBucket: s3.Bucket.fromBucketName(
          this, 'ArtifactBucket',
          'rsc-iot-rsc-platform-afr-pipelineartifactsbucketa-1ox7y7qmllyed' // FIXME
      ),
      synth: new ShellStep('Synth', {
        input: source,
        env: {
            'WEBHOOK_TRIGGER': `branch/${source.sourceAttribute('BranchName')}`,
            'SOURCE_REPO_URL': `://andkononykhin/${source.sourceAttribute('RepositoryName')}`, // FIXME
        },
        commands: [`cd ${codePipelineDir}`, 'npm ci', 'npm run build', 'npx cdk synth'],
        primaryOutputDirectory: `${codePipelineDir}/cdk.out` // ref: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.pipelines-readme.html#synth-and-sources
      })
    });

    // TODO overhead: empty stack just for a CodeBuild project
    //      need to explore how to deploy the project without stage (stack)
    //      option: use generated pipeline attribute (@aws-cdk/aws-codepipeline » Pipeline)
    //      and (@aws-cdk/aws-codebuild » PipelineProject)
    this.pipeline.addStage(new MyPipelineAppStage(this, "test", {}), {
        pre: [
            new ShellStep('validate', {
              input: source,
              commands: ['find .']
            })
        ]
    });
  }
}

const app = new cdk.App();
const pipelineStack = new MyPipelineStack(app, 'MyPipelineStack', {});

pipelineStack.pipeline.buildPipeline()

new CodePipelinePostToGitHub(pipelineStack.pipeline.pipeline, 'CodePipelinePostToGitHub', {
    pipeline: pipelineStack.pipeline.pipeline,
    githubToken: cdk.SecretValue.secretsManager('github-access-token-secret05').unsafeUnwrap() // FIXME
});

app.synth();
