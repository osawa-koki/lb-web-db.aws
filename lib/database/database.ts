import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  stackName: string;
  vpc: ec2.Vpc;
  privateWebSubnets: ec2.SelectedSubnets;
  privateDbSubnets: ec2.SelectedSubnets;
}

export default class DatabaseStack extends cdk.Stack {
  public readonly aurora: rds.DatabaseCluster;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    const { stackName, vpc, privateWebSubnets, privateDbSubnets } = props;

    super(scope, id, {
      ...props,
      stackName,
    });

    const aurora = new rds.DatabaseCluster(this, 'Aurora', {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_3_04_0
      }),
      vpc,
      vpcSubnets: privateDbSubnets,
      credentials: rds.Credentials.fromGeneratedSecret(process.env.AURORA_USERNAME!, {
        secretName: process.env.AURORA_CREDENTIALS_SECRET_NAME!,
      }),
      deletionProtection: false,
      writer: rds.ClusterInstance.provisioned("Writer", {
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.T3,
          ec2.InstanceSize.MEDIUM
        ),
        publiclyAccessible: false,
        instanceIdentifier: "db-writer",
      }),
      readers: [],
    });

    privateWebSubnets.subnets.forEach((subnet) => {
      aurora.connections.allowFrom(
        ec2.Peer.ipv4(subnet.ipv4CidrBlock),
        ec2.Port.tcp(3306)
      );
    });

    this.aurora = aurora;
  }
}
