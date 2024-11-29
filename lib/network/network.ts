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

    const endpointSecurityGroup = new ec2.SecurityGroup(this, 'EndpointSecurityGroup', {
      vpc,
      allowAllOutbound: true,
      description: 'Security group for VPC endpoint',
    });
    endpointSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(443)
    );

    new ec2.InterfaceVpcEndpoint(this, 'ECRApiEndpoint', {
      vpc,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      securityGroups: [endpointSecurityGroup],
    });

    new ec2.InterfaceVpcEndpoint(this, 'ECRDkrEndpoint', {
      vpc,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      securityGroups: [endpointSecurityGroup],
    });

    new ec2.GatewayVpcEndpoint(this, 'S3Endpoint', {
      vpc,
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    new ec2.InterfaceVpcEndpoint(this, 'CloudWatchLogsEndpoint', {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [endpointSecurityGroup],
    });

    this.vpc = vpc;
    this.publicSubnets = vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC });
    this.privateWebSubnets = vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED });
    this.privateDbSubnets = vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED });
  }
}
