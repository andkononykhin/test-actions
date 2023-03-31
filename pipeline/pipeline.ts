import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
//import { PolicyStatement } from "aws-cdk-lib/aws-iam"
import { Function, Runtime, AssetCode, Code, FunctionUrlAuthType } from "aws-cdk-lib/aws-lambda"
import 'source-map-support/register';

import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';

declare var process : {
    env: {
       CODEBUILD_WEBHOOK_TRIGGER: string
    }
}


export class MyPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'MyPipeline',
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub('andkononykhin/test-actions', process.env['CODEBUILD_WEBHOOK_TRIGGER'], {
         authentication: cdk.SecretValue.secretsManager('github-access-token-secret'),
        }),
        commands: ['npm ci', 'npm run build', 'npx cdk synth']
      })
    });
  }
}

const app = new cdk.App();
new MyPipelineStack(app, 'MyPipelineStack', {});

app.synth();


/*

import { Construct } from 'constructs';
import { Function, InlineCode, Runtime } from 'aws-cdk-lib/aws-lambda';

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

import { Construct } from "constructs";
import { MyLambdaStack } from './my-pipeline-lambda-stack';

export class MyPipelineAppStage extends cdk.Stage {
    
    constructor(scope: Construct, id: string, props?: cdk.StageProps) {
      super(scope, id, props);
  
      const lambdaStack = new MyLambdaStack(this, 'LambdaStack');      
    }
}

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

