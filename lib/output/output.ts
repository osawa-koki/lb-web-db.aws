import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

interface OutputStackProps extends cdk.StackProps {
  stackName: string;
  fargateService: ecsPatterns.ApplicationLoadBalancedFargateService;
  bastionInstance: ec2.Instance;
}

export default class OutputStack extends cdk.Stack {
  public readonly fargateService: ecsPatterns.ApplicationLoadBalancedFargateService;

  constructor(scope: Construct, id: string, props: OutputStackProps) {
    const { stackName, fargateService, bastionInstance } = props;

    super(scope, id, {
      ...props,
      stackName,
    });

    new cdk.CfnOutput(this, 'LoadBalancerDnsName', {
      value: fargateService.loadBalancer.loadBalancerDnsName,
    });

    new cdk.CfnOutput(this, 'BastionInstanceId', {
      value: bastionInstance.instanceId,
    });
  }
}
