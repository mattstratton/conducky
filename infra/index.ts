import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as docker from "@pulumi/docker";

// --- Managed VPC (using awsx) ---
// Creates a new VPC with public and private subnets in 2 AZs
const vpc = new awsx.ec2.Vpc("conducky-vpc", {
    numberOfAvailabilityZones: 2,
    tags: { Project: "conducky" },
});
const vpcId = vpc.vpcId;
const publicSubnets = vpc.publicSubnetIds;

// --- ECR Repositories ---
const frontendRepo = new aws.ecr.Repository("frontend-repo", {
    forceDelete: true,
    imageScanningConfiguration: { scanOnPush: true },
    tags: { Project: "conducky", Service: "frontend" },
});
const backendRepo = new aws.ecr.Repository("backend-repo", {
    forceDelete: true,
    imageScanningConfiguration: { scanOnPush: true },
    tags: { Project: "conducky", Service: "backend" },
});
export const frontendRepoUrl = frontendRepo.repositoryUrl;
export const backendRepoUrl = backendRepo.repositoryUrl;

// --- ECS Cluster ---
const cluster = new aws.ecs.Cluster("conducky-cluster", {
    name: "conducky-cluster",
    tags: { Project: "conducky" },
});
export const ecsClusterName = cluster.name;

// --- IAM Roles & Policies ---
const taskRole = new aws.iam.Role("ecsTaskRole", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ecs-tasks.amazonaws.com" }),
    tags: { Project: "conducky", Role: "ecs-task" },
});
const executionRole = new aws.iam.Role("ecsExecutionRole", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ecs-tasks.amazonaws.com" }),
    tags: { Project: "conducky", Role: "ecs-execution" },
});
new aws.iam.RolePolicyAttachment("ecsExecutionRolePolicy", {
    role: executionRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
});
// Attach additional policies as needed

// --- RDS (Postgres 15) ---
const config = new pulumi.Config();
const dbUsername = config.require("dbUsername");
const dbPassword = config.requireSecret("dbPassword");
const dbName = "conducky";
const dbSg = new aws.ec2.SecurityGroup("db-sg", {
    vpcId: vpcId,
    description: "Allow inbound from ECS services",
    ingress: [
        { protocol: "tcp", fromPort: 5432, toPort: 5432, cidrBlocks: ["0.0.0.0/0"] },
    ],
    egress: [
        { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
    ],
    tags: { Project: "conducky", Service: "db" },
});
const db = new aws.rds.Instance("conducky-db", {
    allocatedStorage: 20,
    engine: "postgres",
    engineVersion: "15",
    instanceClass: "db.t3.micro",
    name: dbName,
    username: dbUsername,
    password: dbPassword,
    dbSubnetGroupName: new aws.rds.SubnetGroup("db-subnet-group", {
        subnetIds: vpc.privateSubnetIds,
        tags: { Project: "conducky", Service: "db" },
    }).id,
    vpcSecurityGroupIds: [dbSg.id],
    skipFinalSnapshot: true,
    publiclyAccessible: false,
    tags: { Project: "conducky", Service: "db" },
});
export const dbEndpoint = db.endpoint;
export const dbConnectionString = pulumi.interpolate`postgresql://${dbUsername}:${dbPassword}@${db.endpoint}:5432/${dbName}`;

// --- Security Groups ---
const ecsSg = new aws.ec2.SecurityGroup("ecs-sg", {
    vpcId: vpcId,
    description: "Allow HTTP/HTTPS inbound for ECS services",
    ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
        { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] },
    ],
    egress: [
        { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
    ],
    tags: { Project: "conducky", Service: "ecs" },
});

// --- Application Load Balancers ---
const frontendAlb = new aws.lb.LoadBalancer("frontend-alb", {
    internal: false,
    loadBalancerType: "application",
    securityGroups: [ecsSg.id],
    subnets: publicSubnets,
    tags: { Project: "conducky", Service: "frontend" },
});
const frontendTargetGroup = new aws.lb.TargetGroup("frontend-tg", {
    port: 3000,
    protocol: "HTTP",
    targetType: "ip",
    vpcId: vpcId,
    healthCheck: { path: "/", protocol: "HTTP" },
    tags: { Project: "conducky", Service: "frontend" },
});
new aws.lb.Listener("frontend-listener", {
    loadBalancerArn: frontendAlb.arn,
    port: 80,
    protocol: "HTTP",
    defaultActions: [{ type: "forward", targetGroupArn: frontendTargetGroup.arn }],
});
const backendAlb = new aws.lb.LoadBalancer("backend-alb", {
    internal: false,
    loadBalancerType: "application",
    securityGroups: [ecsSg.id],
    subnets: publicSubnets,
    tags: { Project: "conducky", Service: "backend" },
});
const backendTargetGroup = new aws.lb.TargetGroup("backend-tg", {
    port: 4000,
    protocol: "HTTP",
    targetType: "ip",
    vpcId: vpcId,
    healthCheck: { path: "/", protocol: "HTTP" },
    tags: { Project: "conducky", Service: "backend" },
});
new aws.lb.Listener("backend-listener", {
    loadBalancerArn: backendAlb.arn,
    port: 80,
    protocol: "HTTP",
    defaultActions: [{ type: "forward", targetGroupArn: backendTargetGroup.arn }],
});

// --- Pulumi Config for Environment Variables ---
const frontendBaseUrl = config.require("frontendBaseUrl");
const corsOrigin = config.require("corsOrigin");
const jwtSecret = config.requireSecret("jwtSecret");
const sessionSecret = config.requireSecret("sessionSecret");
// DATABASE_URL is constructed from dbConnectionString
const backendPort = "4000";
const frontendPort = "3000";
const nextPublicApiUrl = config.require("nextPublicApiUrl");

// --- Docker Image Build and Push (Cross-Platform) ---
// ECR credentials for authentication
const frontendEcrCreds = aws.ecr.getCredentialsOutput({ registryId: frontendRepo.registryId });
const backendEcrCreds = aws.ecr.getCredentialsOutput({ registryId: backendRepo.registryId });

// Helper to decode ECR auth token
function ecrRegistryBlock(repoUrl: pulumi.Output<string>, authToken: pulumi.Output<string>) {
    return pulumi.all([repoUrl, authToken]).apply(([url, token]) => {
        const decoded = Buffer.from(token, "base64").toString();
        const [username, password] = decoded.split(":");
        return {
            server: url.split("/")[0],
            username,
            password,
        };
    });
}

// Build and push frontend image for linux/amd64
const frontendImage = new docker.Image("frontend-image", {
    build: {
        context: "../frontend",
        dockerfile: "../frontend/Dockerfile",
        platform: "linux/amd64",
    },
    imageName: pulumi.interpolate`${frontendRepo.repositoryUrl}:latest`,
    registry: ecrRegistryBlock(frontendRepo.repositoryUrl, frontendEcrCreds.authorizationToken),
});

// Build and push backend image for linux/amd64
const backendImage = new docker.Image("backend-image", {
    build: {
        context: "../backend",
        dockerfile: "../backend/Dockerfile",
        platform: "linux/amd64",
    },
    imageName: pulumi.interpolate`${backendRepo.repositoryUrl}:latest`,
    registry: ecrRegistryBlock(backendRepo.repositoryUrl, backendEcrCreds.authorizationToken),
});

// --- Task Definitions ---
const frontendTaskDef = new aws.ecs.TaskDefinition("frontend-taskdef", {
    family: "frontend-taskdef",
    cpu: "256",
    memory: "512",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    executionRoleArn: executionRole.arn,
    taskRoleArn: taskRole.arn,
    containerDefinitions: pulumi.interpolate`[
      {
        "name": "frontend",
        "image": "${frontendImage.repoDigest}",
        "portMappings": [{ "containerPort": 3000, "hostPort": 3000, "protocol": "tcp" }],
        "environment": [
          { "name": "NEXT_PUBLIC_API_URL", "value": "${nextPublicApiUrl}" }
        ],
        "essential": true
      }
    ]`,
    tags: { Project: "conducky", Service: "frontend" },
});
const backendTaskDef = new aws.ecs.TaskDefinition("backend-taskdef", {
    family: "backend-taskdef",
    cpu: "256",
    memory: "512",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    executionRoleArn: executionRole.arn,
    taskRoleArn: taskRole.arn,
    containerDefinitions: pulumi.interpolate`[
      {
        "name": "backend",
        "image": "${backendImage.repoDigest}",
        "portMappings": [{ "containerPort": 4000, "hostPort": 4000, "protocol": "tcp" }],
        "environment": [
          { "name": "PORT", "value": "${backendPort}" },
          { "name": "DATABASE_URL", "value": "${dbConnectionString}" },
          { "name": "JWT_SECRET", "value": "${jwtSecret}" },
          { "name": "FRONTEND_BASE_URL", "value": "${frontendBaseUrl}" },
          { "name": "SESSION_SECRET", "value": "${sessionSecret}" },
          { "name": "CORS_ORIGIN", "value": "${corsOrigin}" }
        ],
        "essential": true
      }
    ]`,
    tags: { Project: "conducky", Service: "backend" },
});
const frontendService = new aws.ecs.Service("frontend-service", {
    cluster: cluster.arn,
    taskDefinition: frontendTaskDef.arn,
    desiredCount: 1,
    launchType: "FARGATE",
    networkConfiguration: {
        subnets: publicSubnets,
        securityGroups: [ecsSg.id],
        assignPublicIp: true,
    },
    loadBalancers: [{
        targetGroupArn: frontendTargetGroup.arn,
        containerName: "frontend",
        containerPort: 3000,
    }],
    tags: { Project: "conducky", Service: "frontend" },
});
const backendService = new aws.ecs.Service("backend-service", {
    cluster: cluster.arn,
    taskDefinition: backendTaskDef.arn,
    desiredCount: 1,
    launchType: "FARGATE",
    networkConfiguration: {
        subnets: publicSubnets,
        securityGroups: [ecsSg.id],
        assignPublicIp: true,
    },
    loadBalancers: [{
        targetGroupArn: backendTargetGroup.arn,
        containerName: "backend",
        containerPort: 4000,
    }],
    tags: { Project: "conducky", Service: "backend" },
});

// --- Outputs ---
export const frontendUrl = frontendAlb.dnsName;
export const backendUrl = backendAlb.dnsName;
