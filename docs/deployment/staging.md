# Staging Deployment Guide

## Overview

The staging environment provides a production-like environment for testing and validation before deploying to production. This guide covers the complete staging deployment process, including infrastructure setup, application deployment, and testing procedures.

## Staging Environment Architecture

### Infrastructure Components
```
┌─────────────────────┐    ┌─────────────────────┐
│   CloudFront CDN    │    │   Route 53 DNS      │
│   (Global)          │    │   (staging.app.com) │
└─────────────────────┘    └─────────────────────┘
            │                           │
            └───────────────┬───────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                 Application Load Balancer               │
│              (staging-alb.example.com)                 │
└─────────────────────────────────────────────────────────┘
            │                           │
┌─────────────────────┐    ┌─────────────────────┐
│     ECS Cluster     │    │   Lambda Functions  │
│   (API Services)    │    │  (Event Handlers)   │
└─────────────────────┘    └─────────────────────┘
            │                           │
┌─────────────────────────────────────────────────────────┐
│                    VPC Network                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   RDS       │  │  ElastiCache │  │     S3      │     │
│  │ PostgreSQL  │  │    Redis     │  │   Buckets   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Resource Naming Convention
- **Environment**: `staging`
- **Resource Prefix**: `nx-staging-`
- **Tags**: `Environment=staging`, `Project=nx-monorepo`

## Prerequisites

### Required Access
- AWS CLI configured with staging account credentials
- GitHub Actions permissions for deployment
- Terraform Cloud/Enterprise access (if using)
- Docker registry access (ECR)

### Required Tools
```bash
# AWS CLI v2
aws --version

# Terraform
terraform --version

# Docker
docker --version

# GitHub CLI (optional)
gh --version

# kubectl (for EKS if used)
kubectl version --client
```

### Environment Variables
```bash
# AWS Configuration
export AWS_REGION=us-east-1
export AWS_PROFILE=staging
export AWS_ACCOUNT_ID=123456789012

# Deployment Configuration
export ENVIRONMENT=staging
export DEPLOY_VERSION=v1.2.3
export CONTAINER_REGISTRY=123456789012.dkr.ecr.us-east-1.amazonaws.com
```

## Infrastructure Deployment

### Terraform Configuration

#### Backend Configuration (terraform/staging/backend.tf)
```hcl
terraform {
  backend "s3" {
    bucket         = "nx-terraform-state-staging"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "nx-terraform-locks-staging"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "staging"
      Project     = "nx-monorepo"
      ManagedBy   = "terraform"
    }
  }
}
```

#### Main Infrastructure (terraform/staging/main.tf)
```hcl
module "vpc" {
  source = "../modules/vpc"

  environment = "staging"
  cidr_block  = "10.1.0.0/16"

  availability_zones = ["us-east-1a", "us-east-1b"]
  public_subnets     = ["10.1.1.0/24", "10.1.2.0/24"]
  private_subnets    = ["10.1.10.0/24", "10.1.11.0/24"]
}

module "database" {
  source = "../modules/rds"

  environment           = "staging"
  vpc_id               = module.vpc.vpc_id
  subnet_ids           = module.vpc.private_subnet_ids
  instance_class       = "db.t3.medium"
  allocated_storage    = 100
  backup_retention     = 7
  multi_az            = false
  deletion_protection = false
}

module "cache" {
  source = "../modules/elasticache"

  environment     = "staging"
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
  node_type      = "cache.t3.micro"
  num_cache_nodes = 1
}

module "ecs_cluster" {
  source = "../modules/ecs"

  environment = "staging"
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids

  cluster_name = "nx-staging-cluster"
  capacity_providers = ["EC2", "FARGATE"]
}

module "load_balancer" {
  source = "../modules/alb"

  environment = "staging"
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.public_subnet_ids

  certificate_arn = aws_acm_certificate.staging.arn
}

module "eventbridge" {
  source = "../modules/eventbridge"

  environment = "staging"

  event_buses = [
    "nx-staging-events",
    "nx-staging-build-events"
  ]
}
```

### Deploy Infrastructure
```bash
# Navigate to staging terraform
cd infrastructure/terraform/staging

# Initialize Terraform
terraform init

# Plan infrastructure changes
terraform plan -var-file="staging.tfvars" -out=staging.tfplan

# Review the plan
terraform show staging.tfplan

# Apply infrastructure changes
terraform apply staging.tfplan

# Save outputs for application deployment
terraform output -json > ../../../config/staging-outputs.json
```

#### Staging Variables (terraform/staging/staging.tfvars)
```hcl
# Environment Configuration
environment = "staging"
aws_region  = "us-east-1"

# Networking
vpc_cidr             = "10.1.0.0/16"
availability_zones   = ["us-east-1a", "us-east-1b"]
public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24"]
private_subnet_cidrs = ["10.1.10.0/24", "10.1.11.0/24"]

# Database
rds_instance_class      = "db.t3.medium"
rds_allocated_storage   = 100
rds_backup_retention    = 7
rds_multi_az           = false
rds_deletion_protection = false

# Cache
elasticache_node_type      = "cache.t3.micro"
elasticache_num_cache_nodes = 1

# ECS
ecs_capacity_providers = ["FARGATE"]
api_cpu                = 512
api_memory             = 1024
api_desired_count      = 2

# Lambda
lambda_memory_size = 512
lambda_timeout     = 30

# Monitoring
enable_detailed_monitoring = true
log_retention_days        = 30

# Security
enable_waf                = true
enable_shield            = false
ssl_policy               = "ELBSecurityPolicy-TLS-1-2-2017-01"
```

## Application Deployment

### Docker Image Building

#### Build and Push Images
```bash
# Build all Docker images
pnpm build:docker

# Tag images for staging
docker tag nx-monorepo/api-example:latest \
  $CONTAINER_REGISTRY/nx-staging-api:$DEPLOY_VERSION

docker tag nx-monorepo/web-app:latest \
  $CONTAINER_REGISTRY/nx-staging-web:$DEPLOY_VERSION

# Push to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $CONTAINER_REGISTRY

docker push $CONTAINER_REGISTRY/nx-staging-api:$DEPLOY_VERSION
docker push $CONTAINER_REGISTRY/nx-staging-web:$DEPLOY_VERSION
```

#### Multi-stage Dockerfile for API
```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm nx build api-example --prod

# Production stage
FROM node:20-alpine AS production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

WORKDIR /app
COPY --from=builder --chown=nodeuser:nodejs /app/dist/apps/api-example ./
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/package.json ./

USER nodeuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "main.js"]
```

### ECS Service Deployment

#### API Service Task Definition
```json
{
  "family": "nx-staging-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/nx-staging-api-task-role",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/nx-staging-api:v1.2.3",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "staging"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:nx-staging-database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:nx-staging-jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/nx-staging-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### Deploy ECS Service
```bash
# Register task definition
aws ecs register-task-definition \
  --cli-input-json file://ecs/api-task-definition.json

# Update service
aws ecs update-service \
  --cluster nx-staging-cluster \
  --service nx-staging-api \
  --task-definition nx-staging-api:LATEST \
  --desired-count 2

# Wait for deployment to complete
aws ecs wait services-stable \
  --cluster nx-staging-cluster \
  --services nx-staging-api
```

### Lambda Function Deployment

#### Package Lambda Functions
```bash
# Build event handler
pnpm nx build event-handler --prod

# Create deployment package
cd dist/apps/event-handler
zip -r ../../../event-handler.zip . -x "*.map"

# Upload to S3
aws s3 cp event-handler.zip \
  s3://nx-staging-lambda-deployments/event-handler-$DEPLOY_VERSION.zip
```

#### Deploy Lambda Functions
```bash
# Update function code
aws lambda update-function-code \
  --function-name nx-staging-event-handler \
  --s3-bucket nx-staging-lambda-deployments \
  --s3-key event-handler-$DEPLOY_VERSION.zip

# Update function configuration
aws lambda update-function-configuration \
  --function-name nx-staging-event-handler \
  --environment Variables='{
    "NODE_ENV": "staging",
    "DATABASE_URL": "$DATABASE_URL",
    "EVENTBRIDGE_BUS": "nx-staging-events"
  }'

# Update alias
aws lambda update-alias \
  --function-name nx-staging-event-handler \
  --name LIVE \
  --function-version $LATEST
```

### Static Assets Deployment

#### Web App Build and Deploy
```bash
# Build Next.js application
pnpm nx build web-app --prod

# Upload to S3
aws s3 sync dist/apps/web-app/_next/static \
  s3://nx-staging-web-assets/static \
  --cache-control "public, max-age=31536000, immutable"

aws s3 sync dist/apps/web-app \
  s3://nx-staging-web-assets \
  --exclude "static/*" \
  --cache-control "public, max-age=86400"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

## Environment Configuration

### Secrets Management
```bash
# Store database connection string
aws secretsmanager create-secret \
  --name nx-staging-database-url \
  --description "Database connection string for staging" \
  --secret-string "postgresql://username:password@host:5432/database"

# Store JWT secret
aws secretsmanager create-secret \
  --name nx-staging-jwt-secret \
  --description "JWT signing secret for staging" \
  --secret-string "your-super-secret-jwt-key"

# Store API keys
aws secretsmanager create-secret \
  --name nx-staging-api-keys \
  --description "External API keys for staging" \
  --secret-string '{
    "stripe_key": "sk_test_...",
    "sendgrid_key": "SG...",
    "aws_access_key": "AKIA..."
  }'
```

### Parameter Store Configuration
```bash
# Application configuration
aws ssm put-parameter \
  --name "/nx/staging/api/port" \
  --value "3000" \
  --type "String"

aws ssm put-parameter \
  --name "/nx/staging/api/log-level" \
  --value "info" \
  --type "String"

aws ssm put-parameter \
  --name "/nx/staging/features/feature-flags-enabled" \
  --value "true" \
  --type "String"
```

### Environment-Specific Configuration Files

#### config/staging.json
```json
{
  "api": {
    "port": 3000,
    "cors": {
      "origin": ["https://staging.example.com"],
      "credentials": true
    },
    "rateLimit": {
      "windowMs": 900000,
      "max": 1000
    }
  },
  "database": {
    "pool": {
      "min": 2,
      "max": 10
    },
    "ssl": true
  },
  "cache": {
    "ttl": 300,
    "cluster": false
  },
  "logging": {
    "level": "info",
    "format": "json"
  },
  "monitoring": {
    "enabled": true,
    "sampleRate": 0.1
  },
  "features": {
    "feature_flags": true,
    "new_ui": true,
    "beta_features": false
  }
}
```

## CI/CD Pipeline

### GitHub Actions Workflow

#### .github/workflows/deploy-staging.yml
```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to deploy'
        required: true
        default: 'latest'

env:
  AWS_REGION: us-east-1
  ECR_REGISTRY: 123456789012.dkr.ecr.us-east-1.amazonaws.com

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test:ci

      - name: Run integration tests
        run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.ECR_REGISTRY }}/nx-staging-api
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./apps/api-example/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-infrastructure:
    needs: [test, build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.0

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Terraform Init
        working-directory: infrastructure/terraform/staging
        run: terraform init

      - name: Terraform Plan
        working-directory: infrastructure/terraform/staging
        run: terraform plan -var-file="staging.tfvars" -out=staging.tfplan

      - name: Terraform Apply
        working-directory: infrastructure/terraform/staging
        run: terraform apply -auto-approve staging.tfplan

  deploy-applications:
    needs: [build, deploy-infrastructure]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy API to ECS
        run: |
          # Update task definition with new image
          aws ecs describe-task-definition \
            --task-definition nx-staging-api \
            --query 'taskDefinition' > task-def.json

          # Update image URI in task definition
          jq '.containerDefinitions[0].image = "${{ needs.build.outputs.image-tag }}"' \
            task-def.json > updated-task-def.json

          # Register new task definition
          aws ecs register-task-definition \
            --cli-input-json file://updated-task-def.json

          # Update service
          aws ecs update-service \
            --cluster nx-staging-cluster \
            --service nx-staging-api \
            --task-definition nx-staging-api

          # Wait for deployment
          aws ecs wait services-stable \
            --cluster nx-staging-cluster \
            --services nx-staging-api

      - name: Deploy Lambda functions
        run: |
          # Build and deploy event handler
          pnpm nx build event-handler --prod
          cd dist/apps/event-handler
          zip -r ../../../event-handler.zip .

          aws lambda update-function-code \
            --function-name nx-staging-event-handler \
            --zip-file fileb://event-handler.zip

      - name: Deploy static assets
        run: |
          # Build web app
          pnpm nx build web-app --prod

          # Upload to S3
          aws s3 sync dist/apps/web-app \
            s3://nx-staging-web-assets \
            --delete

          # Invalidate CloudFront
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"

  smoke-tests:
    needs: deploy-applications
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run smoke tests
        run: |
          # Wait for services to be healthy
          sleep 60

          # Test API health
          curl -f https://api-staging.example.com/health

          # Test web app
          curl -f https://staging.example.com

          # Run API tests
          pnpm test:api:staging
```

## Database Management

### Database Migration
```bash
# Run database migrations in staging
pnpm db:migrate:staging

# Specific migration commands
DATABASE_URL=$STAGING_DATABASE_URL pnpm db:migrate

# Rollback if needed
DATABASE_URL=$STAGING_DATABASE_URL pnpm db:rollback
```

### Data Seeding
```bash
# Seed staging data
pnpm db:seed:staging

# Import production data subset (if needed)
pnpm db:import:staging --source=production --limit=1000
```

## Monitoring and Logging

### CloudWatch Configuration
```bash
# Create log groups
aws logs create-log-group --log-group-name /ecs/nx-staging-api
aws logs create-log-group --log-group-name /aws/lambda/nx-staging-event-handler

# Set retention policy
aws logs put-retention-policy \
  --log-group-name /ecs/nx-staging-api \
  --retention-in-days 30
```

### Monitoring Setup
```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "NX-Staging-Dashboard" \
  --dashboard-body file://monitoring/staging-dashboard.json

# Create alarms
aws cloudwatch put-metric-alarm \
  --alarm-name "nx-staging-api-high-cpu" \
  --alarm-description "High CPU usage in staging API" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

## Testing and Validation

### Post-Deployment Testing
```bash
# Health checks
curl https://api-staging.example.com/health

# API functionality tests
pnpm test:api:staging

# End-to-end tests
pnpm test:e2e:staging

# Performance tests
pnpm test:performance:staging
```

### Load Testing
```bash
# API load test
k6 run tools/performance/api-load.js \
  --env API_URL=https://api-staging.example.com

# Web app performance test
k6 run tools/performance/web-performance.js \
  --env WEB_URL=https://staging.example.com
```

## Security Configuration

### WAF Rules
```bash
# Create WAF web ACL
aws wafv2 create-web-acl \
  --name nx-staging-waf \
  --scope CLOUDFRONT \
  --default-action Allow={} \
  --rules file://security/waf-rules.json
```

### Security Groups
```bash
# API security group rules
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 3000 \
  --source-group sg-87654321
```

## Troubleshooting

### Common Deployment Issues

#### ECS Service Deployment Failure
```bash
# Check service events
aws ecs describe-services \
  --cluster nx-staging-cluster \
  --services nx-staging-api \
  --query 'services[0].events'

# Check task logs
aws logs get-log-events \
  --log-group-name /ecs/nx-staging-api \
  --log-stream-name ecs/api/task-id
```

#### Lambda Function Issues
```bash
# Check function logs
aws logs tail /aws/lambda/nx-staging-event-handler --follow

# Check function configuration
aws lambda get-function-configuration \
  --function-name nx-staging-event-handler
```

#### Database Connection Issues
```bash
# Test database connectivity
aws rds describe-db-instances \
  --db-instance-identifier nx-staging-db

# Check security groups
aws ec2 describe-security-groups \
  --group-ids sg-database
```

### Rollback Procedures

#### Application Rollback
```bash
# Rollback ECS service to previous version
aws ecs update-service \
  --cluster nx-staging-cluster \
  --service nx-staging-api \
  --task-definition nx-staging-api:PREVIOUS_VERSION

# Rollback Lambda function
aws lambda update-alias \
  --function-name nx-staging-event-handler \
  --name LIVE \
  --function-version PREVIOUS_VERSION
```

#### Database Rollback
```bash
# Rollback database migration
DATABASE_URL=$STAGING_DATABASE_URL pnpm db:rollback

# Restore from backup if needed
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier nx-staging-db-restored \
  --db-snapshot-identifier nx-staging-db-snapshot-backup
```

## Maintenance

### Regular Maintenance Tasks
```bash
# Update dependencies
pnpm update

# Security patches
pnpm audit fix

# Clean up old images
aws ecr batch-delete-image \
  --repository-name nx-staging-api \
  --image-ids imageTag=old-tag

# Database maintenance
pnpm db:analyze:staging
pnpm db:vacuum:staging
```

### Backup Procedures
```bash
# Database backup
aws rds create-db-snapshot \
  --db-instance-identifier nx-staging-db \
  --db-snapshot-identifier nx-staging-db-$(date +%Y%m%d)

# Configuration backup
aws ssm get-parameters-by-path \
  --path "/nx/staging" \
  --recursive > staging-config-backup.json
```

## Performance Optimization

### Auto Scaling Configuration
```bash
# ECS service auto scaling
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/nx-staging-cluster/nx-staging-api \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Lambda concurrency limits
aws lambda put-provisioned-concurrency-config \
  --function-name nx-staging-event-handler \
  --qualifier LIVE \
  --provisioned-concurrency-config ProvisionedConcurrencyConfig=5
```

### CDN Optimization
```bash
# CloudFront cache behaviors
aws cloudfront update-distribution \
  --id E1234567890ABC \
  --distribution-config file://cdn/staging-distribution.json
```

---

**Last Updated**: January 15, 2024
**Environment**: Staging Deployment