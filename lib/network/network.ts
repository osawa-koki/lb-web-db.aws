import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface NetworkStackProps extends cdk.StackProps {
  stackName: string;
}

export default class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly publicSubnets: cdk.aws_ec2.SelectedSubnets;
  public readonly privateWebSubnets: cdk.aws_ec2.SelectedSubnets;
  public readonly privateDbSubnets: cdk.aws_ec2.SelectedSubnets;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    const { stackName } = props;

    super(scope, id, {
      ...props,
      stackName,
    });

    const vpc = new ec2.Vpc(this, 'MyVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public-subnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private-web-subnet',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        {
          cidrMask: 24,
          name: 'private-db-subnet',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    this.vpc = vpc;
    this.publicSubnets = vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC });
    this.privateWebSubnets = vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED });
    this.privateDbSubnets = vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED });
  }
}
