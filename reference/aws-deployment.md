This is the context for setting up AWS deployment.

## Tech Stack

We will be using AWS to deploy our application. We want to use the free tier and the cheapest options available.

For the two services (frontend and backend), we will use ECS, Fargate, and also host the container images on ECR.

The database will be hosted on RDS in the free tier.

## Deployment and IAC Tech

We want to use Pulumi to deploy our infrastructure. We will use Pulumi Cloud to manage it. 

All of the necessary steps for deployment should be in a GitHub Actions workflow, with appropriate repository secrets.

## Other notes

We need the ability to run commands in both the frontend and backend containers, so make sure the ECS Exec is enabled.

Please make sure to create all the necessary IAM roles and policies for the deployment.