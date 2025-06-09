# Conducky Infrastructure (Pulumi)

This directory contains the Pulumi infrastructure-as-code for deploying the Conducky application stack to AWS.

## Tech Stack
- **Pulumi** (TypeScript)
- **AWS** (ECS Fargate, ECR, RDS, IAM, ALB)
- **Pulumi Cloud** for state management

## Project Structure
- All Pulumi code and configuration is in this `infra/` directory.
- The default Pulumi stack is `dev`.
- Designed to support both automated deployment via GitHub Actions and manual usage via `pulumi up` for local testing.

## Prerequisites
- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [Node.js](https://nodejs.org/) (v16+ recommended)
- AWS credentials with permissions to manage ECS, ECR, RDS, IAM, and related resources

## Setup
1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Login to Pulumi Cloud:**
   ```sh
   pulumi login
   ```
3. **Configure AWS credentials:**
   - For local use, set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` in your environment or use the AWS CLI profile.
   - For GitHub Actions, set these as repository secrets.

## Usage
- **Preview and deploy changes locally:**
  ```sh
  pulumi up
  ```
- **Destroy the stack:**
  ```sh
  pulumi destroy
  ```
- **View stack outputs:**
  ```sh
  pulumi stack output
  ```

## Stack Purpose
This Pulumi stack provisions:
- ECR repositories for frontend and backend Docker images
- ECS cluster and Fargate services for frontend and backend (public, internet-facing)
- RDS (Postgres 15) instance (created if not present)
- IAM roles and policies for ECS, ECR, and RDS access
- Application secrets and environment variables injected into services
- Outputs for service URLs and database connection strings

## CI/CD Integration
- The stack is designed to be deployed automatically via GitHub Actions on push to `main`.
- All required secrets and configuration should be set as GitHub repository secrets.

## Notes
- All environment variables, secrets, and configuration are documented in `../reference/aws-deployment.md` and `../reference/plan.md`.
- Update this README as the infrastructure evolves.