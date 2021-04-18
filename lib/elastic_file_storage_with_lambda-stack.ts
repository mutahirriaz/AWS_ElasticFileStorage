import * as cdk from '@aws-cdk/core';
import * as efs from "@aws-cdk/aws-efs";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigw from "@aws-cdk/aws-apigatewayv2";
import * as integrations from "@aws-cdk/aws-apigatewayv2-integrations";

export class ElasticFileStorageWithLambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const myVpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
    });

    const fileSystem = new efs.FileSystem(this, "LambdaEfsFileSystem", {
      vpc: myVpc
    });

    const accessPoint = fileSystem.addAccessPoint("AccessPoint", {
      createAcl: {
        ownerGid: "1001",
        ownerUid: "1001",
        permissions: "750"
      },
      path: "/export/lambda",
      posixUser: {
        gid: "1001",
        uid: "1001"
      },
    });
    
    const efsLambda = new lambda.Function(this, "efsLambdaFunction", {
      code: lambda.Code.fromAsset("lambda"),
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: "msg.handler",
      vpc: myVpc,
      filesystem: lambda.FileSystem.fromEfsAccessPoint(accessPoint,"/mnt/msg"),
    });

    const api = new apigw.HttpApi(this, "HTTP API Url", {
      defaultIntegration: new integrations.LambdaProxyIntegration({
        handler: efsLambda,
      }),
    });

    new cdk.CfnOutput(this, "API_Url", {
      value: api.url ?? "Something went wrong with the deploy"
    });

  }
}
