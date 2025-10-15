import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const frontendRole = new cdk.aws_iam.Role(this, "FrontendRole", {
      roleName: `${this.stackName}-FrontendRole`,
      assumedBy: new cdk.aws_iam.AnyPrincipal(),
      inlinePolicies: {
        transcribe: new cdk.aws_iam.PolicyDocument({
          statements: [
            new cdk.aws_iam.PolicyStatement({
              actions: ["transcribe:StartStreamTranscriptionWebSocket"],
              resources: ["*"],
            }),
          ],
        }),
      },
    });

    new cdk.CfnOutput(this, "FrontendRoleArn", {
      value: frontendRole.roleArn,
      exportName: "FrontendRoleArn",
    });
  }
}
