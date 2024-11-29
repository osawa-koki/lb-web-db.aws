import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';

interface ComputeStackProps extends cdk.StackProps {
  stackName: string;
  vpc: ec2.Vpc;
  privateWebSubnets: ec2.SelectedSubnets;
  databaseSecret: ISecret;
}

export default class ComputeStack extends cdk.Stack {
  public readonly fargateService: ecsPatterns.ApplicationLoadBalancedFargateService;
  public readonly bastionInstance: ec2.Instance;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    const { stackName, vpc, privateWebSubnets, databaseSecret } = props;

    super(scope, id, {
      ...props,
      stackName,
    });

    const cluster = new ecs.Cluster(this, 'FargateCluster', {
      vpc,
      clusterName: process.env.ECS_CLUSTER_NAME!,
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'FargateTaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
    });

    taskDefinition.addToExecutionRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"]
      })
    );
    taskDefinition.addToExecutionRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ],
        resources: [`arn:aws:ecr:${this.region}:${this.account}:repository/${process.env.ECR_REPOSITORY_NAME!}`]
      })
    );

    const container = taskDefinition.addContainer('WebContainer', {
      image: ecs.ContainerImage.fromRegistry(`${this.account}.dkr.ecr.${this.region}.amazonaws.com/${process.env.ECR_REPOSITORY_NAME!}`),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'FargateWebApp' }),
      containerName: process.env.ECS_CONTAINER_NAME!,
      secrets: {
        DB_HOST: ecs.Secret.fromSecretsManager(databaseSecret, 'host'),
        DB_PORT: ecs.Secret.fromSecretsManager(databaseSecret, 'port'),
        DB_USER: ecs.Secret.fromSecretsManager(databaseSecret, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(databaseSecret, 'password'),
        DB_DATABASE: ecs.Secret.fromSecretsManager(databaseSecret, 'dbname'),
      },
    });

    container.addPortMappings({
      containerPort: 80,
      hostPort: 80,
    });

    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'FargateService', {
      taskSubnets: privateWebSubnets,
      cluster,
      taskDefinition,
      publicLoadBalancer: true,
      desiredCount: 2,
      assignPublicIp: false,
      listenerPort: 80,
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE',
          weight: 1,
        },
        {
          capacityProvider: 'FARGATE_SPOT',
          weight: 1,
        },
      ],
    });

    const scaling = fargateService.service.autoScaleTaskCount({
      maxCapacity: 4,
      minCapacity: 2,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    fargateService.service.connections.allowFrom(
      fargateService.loadBalancer,
      ec2.Port.tcp(80),
      'Allow only ALB access'
    );

    const bastionInstance = new ec2.Instance(this, 'BastionInstance', {
      vpc,
      vpcSubnets: privateWebSubnets,
      instanceType: new ec2.InstanceType(process.env.BASTION_EC2_INSTANCE_TYPE!),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      role: new iam.Role(this, 'EC2Role', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        ],
      }),
    });

    this.fargateService = fargateService;
    this.bastionInstance = bastionInstance;
  }
}
