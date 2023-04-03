import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
//import { PolicyStatement } from "aws-cdk-lib/aws-iam"
import { Function, InlineCode, Runtime, AssetCode, Code, FunctionUrlAuthType } from "aws-cdk-lib/aws-lambda"
import 'source-map-support/register';

import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';

const theRepo = 'andkononykhin/test-actions'
const codePipelineDir = 'codepipeline'

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

if (versionType != 'branch') {
    throw new Error(`WEBHOOK_TRIGGER is unexpected: ${process.env['WEBHOOK_TRIGGER']}`);
}

function pipelineName(repoName: string, versionType: string, versionValue: string): string {
    return `${repoName}/${versionType}/${versionValue}`.replace(/[^0-9a-zA-Z_-]/g, '_');
}


export class MyLambdaStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);

      /*
      new Function(this, 'LambdaFunction', {
        runtime: Runtime.NODEJS_12_X,
        handler: 'index.handler',
        code: new InlineCode('exports.handler = _ => "Hello, CDK";')
      });
      */
    }
}

export class MyPipelineAppStage extends cdk.Stage {

    constructor(scope: Construct, id: string, props?: cdk.StageProps) {
      super(scope, id, props);

      const lambdaStack = new MyLambdaStack(this, 'LambdaStack');
    }
}


export class MyPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const source = CodePipelineSource.gitHub(theRepo, versionValue, {
        authentication: cdk.SecretValue.secretsManager('github-access-token-secret'), // FIXME
    })

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: pipelineName(repo!, versionType!, versionValue!),
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

    pipeline.addStage(new MyPipelineAppStage(this, "test", {}), {
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
new MyPipelineStack(app, 'MyPipelineStack', {});

app.synth();
