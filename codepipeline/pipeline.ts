import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
//import { PolicyStatement } from "aws-cdk-lib/aws-iam"
import { Function, InlineCode, Runtime, AssetCode, Code, FunctionUrlAuthType } from "aws-cdk-lib/aws-lambda"
import 'source-map-support/register';

import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';

const theRepo = 'andkononykhin/test-actions'
const codePipelineDir = 'codepipeline'

const repoMatch = process.env['CODEBUILD_SOURCE_REPO_URL']?.match(/:\/*(.*)/)

if (repoMatch == null) {
    throw new Error(`repo url has unexpected format: ${process.env['CODEBUILD_SOURCE_REPO_URL']}`);
}
const repo = repoMatch[1].replace('.git', '');
if (repo != theRepo) {
    throw new Error(`repo url is unexpected: ${repo}`);
}

const versionMatch = process.env['CODEBUILD_WEBHOOK_TRIGGER']?.match(/(tag|branch|pr)\/(.+)/);
if (versionMatch == null) {
    throw new Error(`CODEBUILD_WEBHOOK_TRIGGER has an unexpected format: ${process.env['CODEBUILD_WEBHOOK_TRIGGER']}`);
}

const versionType = versionMatch[1];
const versionValue = versionMatch[2];

if (versionValue != 'branch') {
    throw new Error(`CODEBUILD_WEBHOOK_TRIGGER is unexpected: ${process.env['CODEBUILD_WEBHOOK_TRIGGER']}`);
}

function pipelineName(repoName: string, versionType: string, versionValue: string): string {
    return `${repoName}/${versionType}/${versionValue}`.replace(/[^0-9a-zA-Z_-]/g, '_');
}


export class MyLambdaStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);

      new Function(this, 'LambdaFunction', {
        runtime: Runtime.NODEJS_12_X,
        handler: 'index.handler',
        code: new InlineCode('exports.handler = _ => "Hello, CDK";')
      });
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

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: pipelineName(repo!, versionType!, versionValue!),
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub(theRepo, versionValue, {
         authentication: cdk.SecretValue.secretsManager('github-access-token-secret'),
        }),
        commands: [`cd ${codePipelineDir}`, 'npm ci', 'npm run build', 'npx cdk synth'],
        primaryOutputDirectory: '${codePipelineDir}/cdk.out' // ref: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.pipelines-readme.html#synth-and-sources
      })
    });

    pipeline.addStage(new MyPipelineAppStage(this, "test", {
      env: { account: "111111111111", region: "eu-west-1" }
    }));
  }
}

const app = new cdk.App();
new MyPipelineStack(app, 'MyPipelineStack', {});

app.synth();


/*

import { Construct } from 'constructs';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { MyPipelineAppStage } from './my-pipeline-app-stage';

export class MyPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'MyPipeline',
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub('OWNER/REPO', 'main'),
        commands: ['npm ci', 'npm run build', 'npx cdk synth']
      })
    });

    pipeline.addStage(new MyPipelineAppStage(this, "test", {
      env: { account: "111111111111", region: "eu-west-1" }
    }));
  }
}

*/

/*

// import { ManualApprovalStep } from 'aws-cdk-lib/pipelines';

const testingStage = pipeline.addStage(new MyPipelineAppStage(this, 'testing', {
  env: { account: '111111111111', region: 'eu-west-1' }
}));

    testingStage.addPost(new ManualApprovalStep('approval'));

const wave = pipeline.addWave('wave');
wave.addStage(new MyApplicationStage(this, 'MyAppEU', {
  env: { account: '111111111111', region: 'eu-west-1' }
}));
wave.addStage(new MyApplicationStage(this, 'MyAppUS', {
  env: { account: '111111111111', region: 'us-west-1' }
}));

*/

/*

// self-testing

stage.addPost(new ShellStep("validate", {
  commands: ['../tests/validate.sh'],
}));

*/

