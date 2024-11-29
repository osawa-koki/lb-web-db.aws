import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';

interface OutputStackProps extends cdk.StackProps {
  stackName: string;
  fargateService: ecsPatterns.ApplicationLoadBalancedFargateService;
}

export default class OutputStack extends cdk.Stack {
  public readonly fargateService: ecsPatterns.ApplicationLoadBalancedFargateService;

  constructor(scope: Construct, id: string, props: OutputStackProps) {
    const { stackName } = props;

    super(scope, id, {
      ...props,
      stackName,
    });

    new cdk.CfnOutput(this, 'LoadBalancerDnsName', {
      value: this.fargateService.loadBalancer.loadBalancerDnsName,
    });
  }
}
