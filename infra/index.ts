import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// --- Managed VPC (using awsx) ---
// Creates a new VPC with public and private subnets in 2 AZs
const vpc = new awsx.ec2.Vpc("conducky-vpc", {
    numberOfAvailabilityZones: 2,
    tags: { Project: "conducky" },
});
const vpcId = vpc.vpcId;
const publicSubnets = vpc.publicSubnetIds;

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
export const dbConnectionString = pulumi.interpolate`postgresql://${dbUsername}:${dbPassword.apply(p => encodeURIComponent(p))}@${db.endpoint}/${dbName}`;

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
const backendAlb = new aws.lb.LoadBalancer("backend-alb", {
    internal: false,
    loadBalancerType: "application",
    securityGroups: [ecsSg.id],
    subnets: publicSubnets,
    tags: { Project: "conducky", Service: "backend" },
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
const jwtSecret = config.requireSecret("jwtSecret");
const sessionSecret = config.requireSecret("sessionSecret");
const backendPort = "4000";
const frontendPort = "3000";

// --- Container Version Config ---
const containerVersion = config.get("containerVersion") || "latest";
const backendImage = `mattstratton/conducky-backend:${containerVersion}`;
const frontendImage = `mattstratton/conducky-frontend:${containerVersion}`;

// --- CloudWatch Log Group for ECS ---
const logGroup = new aws.cloudwatch.LogGroup("conducky-ecs-logs", {
    retentionInDays: 7,
    tags: { Project: "conducky" },
});

// --- Container Resource Config (with defaults, overridable via Pulumi config) ---
const frontendCpu = config.get("frontendCpu") || "512";
const frontendMemory = config.get("frontendMemory") || "1024";
const backendCpu = config.get("backendCpu") || "512";
const backendMemory = config.get("backendMemory") || "1024";

// --- Task Definitions ---
const frontendTaskDef = new aws.ecs.TaskDefinition("frontend-taskdef", {
    family: "frontend-taskdef",
    cpu: frontendCpu,
    memory: frontendMemory,
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    executionRoleArn: executionRole.arn,
    taskRoleArn: taskRole.arn,
    containerDefinitions: pulumi.all([frontendAlb.dnsName, backendAlb.dnsName, logGroup.name]).apply(([frontendDns, backendDns, logGroupName]) => JSON.stringify([
      {
        name: "frontend",
        image: frontendImage,
        portMappings: [{ containerPort: 3000, hostPort: 3000, protocol: "tcp" }],
        environment: [
          { name: "NODE_ENV", value: "production" },
          { name: "NEXT_PUBLIC_API_URL", value: `http://${backendDns}` },
          { name: "BACKEND_API_URL", value: `http://${backendDns}` }
        ],
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": logGroupName,
            "awslogs-region": aws.config.region,
            "awslogs-stream-prefix": "frontend"
          }
        },
        essential: true
      }
    ])),
    tags: { Project: "conducky", Service: "frontend" },
});
const backendTaskDef = new aws.ecs.TaskDefinition("backend-taskdef", {
    family: "backend-taskdef",
    cpu: backendCpu,
    memory: backendMemory,
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    executionRoleArn: executionRole.arn,
    taskRoleArn: taskRole.arn,
    containerDefinitions: pulumi.all([frontendAlb.dnsName, backendAlb.dnsName, dbConnectionString, jwtSecret, sessionSecret, logGroup.name]).apply(([frontendDns, backendDns, dbConn, jwt, session, logGroupName]) => JSON.stringify([
      {
        name: "backend",
        image: backendImage,
        portMappings: [{ containerPort: 4000, hostPort: 4000, protocol: "tcp" }],
        environment: [
          { name: "NODE_ENV", value: "production" },
          { name: "PORT", value: backendPort },
          { name: "DATABASE_URL", value: dbConn },
          { name: "JWT_SECRET", value: jwt },
          { name: "SESSION_SECRET", value: session },
          { name: "FRONTEND_BASE_URL", value: `http://${frontendDns}` },
          { name: "CORS_ORIGIN", value: `http://${frontendDns}` },
          { name: "EMAIL_PROVIDER", value: config.get("emailProvider") || "console" },
          { name: "EMAIL_FROM", value: config.get("emailFrom") || "noreply@conducky.local" },
          { name: "EMAIL_REPLY_TO", value: config.get("emailReplyTo") || "" },
          { name: "SMTP_HOST", value: config.get("smtpHost") || "" },
          { name: "SMTP_PORT", value: config.get("smtpPort") || "587" },
          { name: "SMTP_SECURE", value: config.get("smtpSecure") || "false" },
          { name: "SMTP_USER", value: config.get("smtpUser") || "" },
          { name: "SMTP_PASS", value: config.get("smtpPass") || "" },
          { name: "SENDGRID_API_KEY", value: config.getSecret("sendgridApiKey") || "" },
          { name: "GOOGLE_CLIENT_ID", value: config.get("googleClientId") || "" },
          { name: "GOOGLE_CLIENT_SECRET", value: config.getSecret("googleClientSecret") || "" },
          { name: "GITHUB_CLIENT_ID", value: config.get("githubClientId") || "" },
          { name: "GITHUB_CLIENT_SECRET", value: config.getSecret("githubClientSecret") || "" },
          { name: "BACKEND_BASE_URL", value: `http://${backendDns}` },
          { name: "FRONTEND_BASE_URL", value: `http://${frontendDns}` }
        ],
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": logGroupName,
            "awslogs-region": aws.config.region,
            "awslogs-stream-prefix": "backend"
          }
        },
        essential: true
      }
    ])),
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
    healthCheckGracePeriodSeconds: 120, // Allow more time for the frontend to become healthy
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
    healthCheckGracePeriodSeconds: 120, // Allow more time for the backend to become healthy
    tags: { Project: "conducky", Service: "backend" },
});

// --- Outputs ---
export const frontendUrl = frontendAlb.dnsName;
export const backendUrl = backendAlb.dnsName;
