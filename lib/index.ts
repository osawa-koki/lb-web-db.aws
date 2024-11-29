import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import NetworkStack from './network/network';
import DatabaseStack from './database/database';
import ComputeStack from './compute/compute';
import OutputStack from './output/output';

export class IndexStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      stackName: process.env.BASE_STACK_NAME!,
    });

    const networkStack = new NetworkStack(this, 'NetworkStack', {
      stackName: `${process.env.BASE_STACK_NAME!}-network`,
    });

    const databaseStack = new DatabaseStack(this, 'DatabaseStack', {
      stackName: `${process.env.BASE_STACK_NAME!}-database`,
      vpc: networkStack.vpc,
      privateWebSubnets: networkStack.privateWebSubnets,
      privateDbSubnets: networkStack.privateDbSubnets,
    });
    databaseStack.addDependency(networkStack);

    const computeStack = new ComputeStack(this, 'ComputeStack', {
      stackName: `${process.env.BASE_STACK_NAME!}-compute`,
      vpc: networkStack.vpc,
      privateWebSubnets: networkStack.privateWebSubnets,
      databaseSecret: databaseStack.aurora.secret!,
    });
    computeStack.addDependency(networkStack);
    computeStack.addDependency(databaseStack);

    const outputStack = new OutputStack(this, 'OutputStack', {
      stackName: `${process.env.BASE_STACK_NAME!}-output`,
      fargateService: computeStack.fargateService,
    });
    outputStack.addDependency(computeStack);
  }
}
