import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import 'source-map-support/register';
import {CodePipelinePostToGitHub} from "@awesome-cdk/cdk-report-codepipeline-status-to-github";

const codePipelineDir:string = 'codepipeline'
const repo = 'RSC-IoT/rsc-backend-deployment-service'
const refType = process.env['REF_TYPE'];
const ref = process.env['REF'];

console.log(`${repo} ${ref} ${refType}`);

function resourcePrefix(): string {
    return `${repo}/${refType}/${ref}`.replace(/[^0-9a-zA-Z_-]/g, '_');
}

interface PipelineStackProps extends cdk.StackProps {
    repo: string;
    refType: string;
    ref: string;
}

interface PipelineStageProps extends cdk.StageProps {
    resourcePrefix: string;
}

export class BuildStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);
    }
}

export class PipelineAppStage extends cdk.Stage {
    constructor(scope: Construct, id: string, props: PipelineStageProps) {
        super(scope, id, props);
        const buildStack = new BuildStack(
            this, `PipelineStack-${props.resourcePrefix.replace(/[^0-9a-zA-Z-]/g, '-')}`); // TODO first letter must be [A-Za-z]
    }
}

export class PipelineStack extends cdk.Stack {
  pipeline: CodePipeline;

  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    let _pipelineName = resourcePrefix();

    const source = CodePipelineSource.gitHub(props.repo, props.ref, {
        authentication: cdk.SecretValue.secretsManager('github-access-token-secret'),
    })

    this.pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: _pipelineName,
      synth: new ShellStep('Synth', {
        input: source,
        env: {
            'REPO_FULL_NAME': props.repo,
            'REF_TYPE': props.refType,
            'REF': props.ref
        },
        commands: [`cd ${codePipelineDir}`, 'npm ci', 'npm run build', 'npx cdk synth'],
        primaryOutputDirectory: `${codePipelineDir}/cdk.out` // ref: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.pipelines-readme.html#synth-and-sources
      })
    });

    // TODO overhead: empty stack just for a CodeBuild project
    //      need to explore how to deploy the project without stage (stack)
    //      option: use generated pipeline attribute (@aws-cdk/aws-codepipeline » Pipeline)
    //      and (@aws-cdk/aws-codebuild » PipelineProject)
    this.pipeline.addStage(new PipelineAppStage(this, "BuildStage", { resourcePrefix: _pipelineName }), {
        pre: [
            new ShellStep('build', {
              input: source,
              commands: ['ls -la']  // TODO add build command here
            })
        ]
    });
  }
}

if (refType !== 'branch') {
    console.log(`ignoring webhook trigger for ref type '${refType}' (check REF_TYPE environment varialbe)`)
    process.exit();
}

if (ref === undefined || ref.length == 0) {
    console.log(`'ref' is not specified (check REF environment varialbe)`)
    process.exit();
}

console.log(`deploying pipeline for branch '${ref}', repository '${repo}'`)

const app = new cdk.App();
const pipelineStack = new PipelineStack(app, `PipelineStack-${resourcePrefix().replace(/[^0-9a-zA-Z-]/g, '-')}`, { repo, refType, ref });

pipelineStack.pipeline.buildPipeline()

new CodePipelinePostToGitHub(pipelineStack.pipeline.pipeline, 'CodePipelinePostToGitHub', {
    pipeline: pipelineStack.pipeline.pipeline,
    githubToken: cdk.SecretValue.secretsManager('github-access-token-secret').unsafeUnwrap() // FIXME
});

app.synth();
