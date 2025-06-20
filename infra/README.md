# Conducky Infrastructure (Pulumi)

This directory contains the Pulumi infrastructure-as-code for deploying the Conducky application stack to AWS.

## Tech Stack
- **Pulumi** (TypeScript)
- **AWS** (ECS Fargate, RDS, IAM, ALB)
- **Pulumi Cloud** for state management

## Project Structure
- All Pulumi code and configuration is in this `infra/` directory.
- The default Pulumi stack is `dev`.
- Designed to support both automated deployment via GitHub Actions and manual usage via `pulumi up` for local testing.

## Prerequisites
- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [Node.js](https://nodejs.org/) (v16+ recommended)
- AWS credentials with permissions to manage ECS, RDS, IAM, and related resources

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

## Required Pulumi Config Settings
Set these before deploying:
- `infra:dbUsername`
- `infra:dbPassword` (secret)
- `infra:jwtSecret` (secret)
- `infra:sessionSecret` (secret)

### AWS Settings (if not set globally)
- `aws:region`
- `aws:profile`

## Optional Pulumi Config Settings
Set these only if you want to override defaults or enable extra features:
- `infra:containerVersion` (defaults to `"latest"`)
- `infra:emailProvider` (default: `"console"`)
- `infra:emailFrom` (default: `"noreply@conducky.local"`)
- `infra:emailReplyTo` (default: `""`)
- `infra:smtpHost` (default: `""`)
- `infra:smtpPort` (default: `"587"`)
- `infra:smtpSecure` (default: `"false"`)
- `infra:smtpUser` (default: `""`)
- `infra:smtpPass` (default: `""`)
- `infra:sendgridApiKey` (secret, default: `""`)
- `infra:googleClientId` (default: `""`)
- `infra:googleClientSecret` (secret, default: `""`)
- `infra:githubClientId` (default: `""`)
- `infra:githubClientSecret` (secret, default: `""`)
- `infra:frontendCpu` (default: `"512"`)
- `infra:frontendMemory` (default: `"1024"`)
- `infra:backendCpu` (default: `"512"`)
- `infra:backendMemory` (default: `"1024"`)

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
- ECS cluster and Fargate services for frontend and backend (public, internet-facing)
- RDS (Postgres 15) instance (created if not present)
- IAM roles and policies for ECS and RDS access
- Application secrets and environment variables injected into services
- Outputs for service URLs and database connection strings

## CI/CD Integration
- The stack is designed to be deployed automatically via GitHub Actions on push to `main`.
- All required secrets and configuration should be set as GitHub repository secrets.

## Notes
- All environment variables, secrets, and configuration are documented in `../reference/aws-deployment.md` and `../reference/plan.md`.
- Update this README as the infrastructure evolves.

## Pulumi Configuration Notes

- The `Pulumi.dev.yaml` file is committed to version control for convenience, but the values inside (such as secrets and usernames) are specific to the current environment and **should be changed** before use by others.
- **Do not use the committed secrets in production or other environments.**
- Each user or environment should set their own secrets and config values using `pulumi config set` and `pulumi config set --secret` as appropriate.
- For team or CI/CD usage, consider using separate Pulumi stacks (e.g., `dev`, `prod`) and configure secrets per stack.
- See the "Required Pulumi Config Settings" and "Optional Pulumi Config Settings" sections above for what needs to be set.