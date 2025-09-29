# Production Deployment Guide

## Overview

This guide covers the complete production deployment process for the NX Monorepo Template, including infrastructure provisioning, application deployment, security hardening, and operational procedures. Production deployments require careful planning, testing, and monitoring to ensure zero-downtime releases and high availability.

## Production Environment Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        Global Infrastructure                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   CloudFront    │  │   Route 53      │  │      WAF        │ │
│  │     (CDN)       │  │    (DNS)        │  │   (Security)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────┐
│                         Region: us-east-1                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Application Load Balancer               ││
│  │               (Multi-AZ, High Availability)                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                  │                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   ECS Fargate   │  │   Lambda@Edge   │  │   API Gateway   │ │
│  │  (API Services) │  │ (Edge Computing)│  │  (Rate Limiting)│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                  │                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                         VPC Network                        ││
│  │ AZ-1              AZ-2              AZ-3                   ││
│  │┌────────────┐    ┌────────────┐    ┌────────────┐          ││
│  ││ Private    │    │ Private    │    │ Private    │          ││
│  ││ Subnet     │    │ Subnet     │    │ Subnet     │          ││
│  │└────────────┘    └────────────┘    └────────────┘          ││
│  │┌────────────┐    ┌────────────┐    ┌────────────┐          ││
│  ││ Database   │    │ Database   │    │ Database   │          ││
│  ││ Subnet     │    │ Subnet     │    │ Subnet     │          ││
│  │└────────────┘    └────────────┘    └────────────┘          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                  │                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   RDS Aurora    │  │  ElastiCache    │  │    S3 Buckets   │ │
│  │   (Multi-AZ)    │  │   (Cluster)     │  │  (Multi-Region) │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Disaster Recovery Setup
```
┌─────────────────────────────────────────────────────────────────┐
│                    Disaster Recovery Region: us-west-2         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   RDS Aurora    │  │   ECS Cluster   │  │   S3 Bucket     │ │
│  │ (Read Replica)  │  │   (Standby)     │  │ (Cross-Region   │ │
│  │                 │  │                 │  │  Replication)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Access Requirements
- **AWS Production Account**: Administrator access with MFA
- **GitHub**: Repository admin with deployment keys
- **Terraform Cloud**: Production workspace access
- **PagerDuty**: Integration for alerts
- **Monitoring**: Datadog/New Relic access (if used)

### Security Requirements
- **MFA**: Enabled for all production access
- **VPN**: Required for database access
- **Audit Logging**: All actions logged
- **Change Management**: Approved deployment windows
- **Backup Verification**: Tested restore procedures

### Required Tools and Versions
```bash
# AWS CLI v2.x
aws --version
# aws-cli/2.x.x

# Terraform v1.6+
terraform --version
# Terraform v1.6.x

# Kubectl v1.28+
kubectl version --client
# Client Version: v1.28.x

# Docker v24+
docker --version
# Docker version 24.x.x

# GitHub CLI
gh --version
# gh version 2.x.x
```

## Pre-Deployment Checklist

### Infrastructure Validation
- [ ] Terraform state is backed up
- [ ] Infrastructure plan reviewed and approved
- [ ] Security groups validated
- [ ] SSL certificates are valid and not expiring
- [ ] DNS configuration tested
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures tested

### Application Validation
- [ ] All tests pass (unit, integration, e2e)
- [ ] Security scans completed
- [ ] Performance benchmarks met
- [ ] Database migrations tested
- [ ] Feature flags configured
- [ ] Rollback procedures documented
- [ ] Load testing completed

### Operational Readiness
- [ ] On-call team notified
- [ ] Runbooks updated
- [ ] Monitoring dashboards configured
- [ ] Alert thresholds set
- [ ] Documentation updated
- [ ] Stakeholders informed
- [ ] Rollback plan approved

## Infrastructure Deployment

### Production Terraform Configuration

#### Backend Configuration (terraform/production/backend.tf)
```hcl
terraform {
  backend "s3" {
    bucket         = "nx-terraform-state-production"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "nx-terraform-locks-production"

    # Enable versioning and MFA delete
    versioning = true
    mfa_delete = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  required_version = ">= 1.6"
}

provider "aws" {
  region = "us-east-1"

  # Assume role for production deployments
  assume_role {
    role_arn = "arn:aws:iam::${var.production_account_id}:role/TerraformRole"
  }

  default_tags {
    tags = {
      Environment = "production"
      Project     = "nx-monorepo"
      ManagedBy   = "terraform"
      Owner       = "platform-team"
      CostCenter  = "engineering"
    }
  }
}

# Disaster recovery provider
provider "aws" {
  alias  = "dr"
  region = "us-west-2"

  assume_role {
    role_arn = "arn:aws:iam::${var.production_account_id}:role/TerraformRole"
  }
}
```

#### Production Variables (terraform/production/production.tfvars)
```hcl
# Environment Configuration
environment = "production"
aws_region  = "us-east-1"
dr_region   = "us-west-2"

# Networking
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["us-east-1a", "us-east-1b", "us-east-1c"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
db_subnet_cidrs      = ["10.0.20.0/24", "10.0.21.0/24", "10.0.22.0/24"]

# Database Configuration
rds_engine                 = "aurora-postgresql"
rds_engine_version        = "15.4"
rds_instance_class        = "db.r6g.xlarge"
rds_instances_count       = 3
rds_backup_retention      = 30
rds_backup_window         = "03:00-04:00"
rds_maintenance_window    = "sun:04:00-sun:05:00"
rds_deletion_protection   = true
rds_performance_insights  = true
rds_monitoring_interval   = 60

# Cache Configuration
elasticache_node_type           = "cache.r6g.large"
elasticache_num_cache_clusters  = 3
elasticache_parameter_group     = "default.redis7"
elasticache_snapshot_retention  = 7
elasticache_snapshot_window     = "03:00-05:00"

# ECS Configuration
ecs_capacity_providers = ["FARGATE"]
api_cpu               = 2048
api_memory            = 4096
api_desired_count     = 6
api_max_capacity      = 20
api_min_capacity      = 3

# Lambda Configuration
lambda_memory_size     = 1024
lambda_timeout         = 30
lambda_reserved_concurrency = 100

# Load Balancer
alb_enable_deletion_protection = true
alb_enable_http2              = true
alb_idle_timeout              = 60

# Security
enable_waf                = true
enable_shield_advanced    = true
enable_guardduty         = true
enable_config            = true
ssl_policy               = "ELBSecurityPolicy-TLS-1-2-2017-01"

# Monitoring
enable_detailed_monitoring = true
log_retention_days        = 90
enable_flow_logs         = true
enable_cloudtrail        = true

# Auto Scaling
api_scale_up_threshold   = 70
api_scale_down_threshold = 30
api_scale_up_cooldown    = 300
api_scale_down_cooldown  = 600

# Backup
enable_automated_backups = true
backup_schedule         = "cron(0 2 * * ? *)"
```

#### Main Infrastructure (terraform/production/main.tf)
```hcl
# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# VPC and Networking
module "vpc" {
  source = "../modules/vpc"

  environment        = var.environment
  cidr_block        = var.vpc_cidr
  availability_zones = var.availability_zones
  public_subnets    = var.public_subnet_cidrs
  private_subnets   = var.private_subnet_cidrs
  database_subnets  = var.db_subnet_cidrs

  enable_nat_gateway   = true
  enable_vpn_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true
  enable_flow_logs     = var.enable_flow_logs

  tags = {
    Terraform = "true"
    Environment = var.environment
  }
}

# Security Groups
module "security_groups" {
  source = "../modules/security-groups"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id

  allowed_cidr_blocks = [
    var.vpc_cidr,
    "10.1.0.0/16", # VPN CIDR
  ]
}

# Database
module "database" {
  source = "../modules/rds-aurora"

  environment                = var.environment
  vpc_id                    = module.vpc.vpc_id
  subnet_ids                = module.vpc.database_subnet_ids
  security_group_ids        = [module.security_groups.database_sg_id]

  engine                    = var.rds_engine
  engine_version           = var.rds_engine_version
  instance_class           = var.rds_instance_class
  instances_count          = var.rds_instances_count

  backup_retention_period  = var.rds_backup_retention
  backup_window           = var.rds_backup_window
  maintenance_window      = var.rds_maintenance_window
  deletion_protection     = var.rds_deletion_protection

  performance_insights_enabled = var.rds_performance_insights
  monitoring_interval         = var.rds_monitoring_interval

  # Encryption
  storage_encrypted = true
  kms_key_id       = aws_kms_key.database.arn

  # Cross-region backup
  enable_cross_region_backup = true
  backup_region             = var.dr_region

  tags = local.common_tags
}

# Cache
module "cache" {
  source = "../modules/elasticache"

  environment     = var.environment
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
  security_group_ids = [module.security_groups.cache_sg_id]

  node_type              = var.elasticache_node_type
  num_cache_clusters     = var.elasticache_num_cache_clusters
  parameter_group_name   = var.elasticache_parameter_group

  snapshot_retention_limit = var.elasticache_snapshot_retention
  snapshot_window         = var.elasticache_snapshot_window

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = random_password.redis_auth.result

  tags = local.common_tags
}

# ECS Cluster
module "ecs" {
  source = "../modules/ecs"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids

  cluster_name       = "nx-production-cluster"
  capacity_providers = var.ecs_capacity_providers

  # Container Insights
  enable_container_insights = true

  tags = local.common_tags
}

# Load Balancer
module "load_balancer" {
  source = "../modules/alb"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.public_subnet_ids

  enable_deletion_protection = var.alb_enable_deletion_protection
  enable_http2              = var.alb_enable_http2
  idle_timeout              = var.alb_idle_timeout

  certificate_arn = aws_acm_certificate.production.arn
  security_group_ids = [module.security_groups.alb_sg_id]

  # WAF Association
  web_acl_arn = aws_wafv2_web_acl.production.arn

  tags = local.common_tags
}

# S3 Buckets
module "s3" {
  source = "../modules/s3"

  environment = var.environment

  buckets = {
    assets = {
      versioning = true
      lifecycle_rules = [
        {
          id     = "delete_old_versions"
          status = "Enabled"
          noncurrent_version_expiration = {
            noncurrent_days = 90
          }
        }
      ]
    }

    backups = {
      versioning = true
      lifecycle_rules = [
        {
          id     = "archive_old_backups"
          status = "Enabled"
          transitions = [
            {
              days          = 30
              storage_class = "STANDARD_IA"
            },
            {
              days          = 90
              storage_class = "GLACIER"
            }
          ]
        }
      ]
    }
  }

  # Cross-region replication
  enable_cross_region_replication = true
  replication_region             = var.dr_region

  tags = local.common_tags
}

# EventBridge
module "eventbridge" {
  source = "../modules/eventbridge"

  environment = var.environment

  event_buses = [
    "nx-production-events",
    "nx-production-build-events",
    "nx-production-deployment-events"
  ]

  # Cross-region replication
  enable_cross_region_replication = true
  replication_region             = var.dr_region

  tags = local.common_tags
}

# CloudFront
module "cloudfront" {
  source = "../modules/cloudfront"

  environment = var.environment

  origins = [
    {
      domain_name = module.load_balancer.dns_name
      origin_id   = "api"
      custom_origin_config = {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  ]

  # WAF Association
  web_acl_id = aws_wafv2_web_acl.production.arn

  # Geographic restrictions
  geo_restriction = {
    restriction_type = "whitelist"
    locations       = ["US", "CA", "GB", "DE", "FR"]
  }

  tags = local.common_tags
}
```

### Infrastructure Deployment Process

#### 1. Validate Terraform Configuration
```bash
# Navigate to production terraform directory
cd infrastructure/terraform/production

# Format code
terraform fmt -recursive

# Validate configuration
terraform validate

# Initialize with backend
terraform init

# Create workspace (if using Terraform Cloud)
terraform workspace new production
terraform workspace select production
```

#### 2. Plan Infrastructure Changes
```bash
# Generate execution plan
terraform plan \
  -var-file="production.tfvars" \
  -out=production.tfplan \
  -detailed-exitcode

# Review plan output
terraform show production.tfplan

# Save plan for approval
aws s3 cp production.tfplan \
  s3://nx-terraform-plans/production/$(date +%Y%m%d-%H%M%S).tfplan
```

#### 3. Apply Infrastructure Changes
```bash
# Apply with approval
terraform apply production.tfplan

# Verify outputs
terraform output -json > ../../../config/production-outputs.json

# Tag the deployment
git tag -a "infra-$(date +%Y%m%d-%H%M%S)" -m "Production infrastructure deployment"
git push origin --tags
```

## Application Deployment

### Docker Image Management

#### Production-Ready Dockerfile
```dockerfile
# Multi-stage production build
FROM node:20-alpine AS base

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Build stage
FROM base AS builder

WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./
COPY packages/package.json packages/
COPY apps/api-example/package.json apps/api-example/

# Install dependencies
RUN npm install -g pnpm@9 && \
    pnpm install --frozen-lockfile --prod=false

# Copy source code
COPY . .

# Build application
RUN pnpm nx build api-example --prod && \
    pnpm prune --prod

# Production stage
FROM base AS production

# Security: Use non-root user
USER nodeuser
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodeuser:nodejs /app/dist/apps/api-example ./
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/package.json ./

# Security: Remove unnecessary packages
RUN npm prune --production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "main.js"]
```

#### Image Building and Scanning
```bash
# Build production images
docker build -t nx-production/api:$VERSION \
  -f apps/api-example/Dockerfile .

docker build -t nx-production/web:$VERSION \
  -f apps/web-app/Dockerfile .

# Security scanning with Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image nx-production/api:$VERSION

# Sign images with cosign (if using)
cosign sign --key cosign.key nx-production/api:$VERSION

# Push to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_REGISTRY

docker tag nx-production/api:$VERSION $ECR_REGISTRY/nx-production-api:$VERSION
docker tag nx-production/web:$VERSION $ECR_REGISTRY/nx-production-web:$VERSION

docker push $ECR_REGISTRY/nx-production-api:$VERSION
docker push $ECR_REGISTRY/nx-production-web:$VERSION

# Create image manifest for deployment
cat > image-manifest.json << EOF
{
  "api": {
    "image": "$ECR_REGISTRY/nx-production-api:$VERSION",
    "digest": "$(docker inspect --format='{{index .RepoDigests 0}}' $ECR_REGISTRY/nx-production-api:$VERSION)"
  },
  "web": {
    "image": "$ECR_REGISTRY/nx-production-web:$VERSION",
    "digest": "$(docker inspect --format='{{index .RepoDigests 0}}' $ECR_REGISTRY/nx-production-web:$VERSION)"
  }
}
EOF
```

### ECS Service Deployment

#### Production Task Definition
```json
{
  "family": "nx-production-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/nx-production-api-task-role",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/nx-production-api:v1.2.3",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        },
        {
          "name": "LOG_LEVEL",
          "value": "info"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:nx-production-database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:nx-production-jwt-secret"
        },
        {
          "name": "REDIS_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:nx-production-redis-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/nx-production-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs",
          "awslogs-create-group": "true"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/health || exit 1"
        ],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 120
      },
      "stopTimeout": 30,
      "ulimits": [
        {
          "name": "nofile",
          "softLimit": 65536,
          "hardLimit": 65536
        }
      ],
      "mountPoints": [],
      "volumesFrom": []
    }
  ],
  "volumes": [],
  "placementConstraints": [],
  "requiresAttributes": [
    {
      "name": "ecs.capability.logging-driver.awslogs"
    },
    {
      "name": "ecs.capability.execution-role-awslogs"
    }
  ],
  "pidMode": null,
  "ipcMode": null,
  "proxyConfiguration": null,
  "tags": [
    {
      "key": "Environment",
      "value": "production"
    },
    {
      "key": "Service",
      "value": "api"
    }
  ]
}
```

#### Blue-Green Deployment Script
```bash
#!/bin/bash
set -euo pipefail

# Blue-Green deployment for ECS service
CLUSTER_NAME="nx-production-cluster"
SERVICE_NAME="nx-production-api"
NEW_TASK_DEFINITION="nx-production-api:$VERSION"
HEALTH_CHECK_URL="https://api.example.com/health"

echo "Starting blue-green deployment for $SERVICE_NAME"

# Get current service configuration
CURRENT_TASK_DEF=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --query 'services[0].taskDefinition' \
  --output text)

echo "Current task definition: $CURRENT_TASK_DEF"
echo "New task definition: $NEW_TASK_DEFINITION"

# Update service with new task definition
echo "Updating service with new task definition..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --task-definition $NEW_TASK_DEFINITION

# Wait for deployment to stabilize
echo "Waiting for deployment to stabilize..."
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME

# Health check
echo "Performing health checks..."
for i in {1..30}; do
  if curl -f --max-time 10 $HEALTH_CHECK_URL; then
    echo "Health check passed"
    break
  else
    echo "Health check failed, attempt $i/30"
    if [ $i -eq 30 ]; then
      echo "Health checks failed, rolling back..."
      aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service $SERVICE_NAME \
        --task-definition $CURRENT_TASK_DEF
      exit 1
    fi
    sleep 10
  fi
done

# Verify all tasks are healthy
RUNNING_TASKS=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --query 'services[0].runningCount' \
  --output text)

DESIRED_TASKS=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --query 'services[0].desiredCount' \
  --output text)

if [ "$RUNNING_TASKS" -eq "$DESIRED_TASKS" ]; then
  echo "Deployment successful! All $RUNNING_TASKS tasks are running"
else
  echo "Deployment failed! Only $RUNNING_TASKS out of $DESIRED_TASKS tasks are running"
  exit 1
fi

echo "Blue-green deployment completed successfully"
```

### Lambda Function Deployment

#### Production Lambda Configuration
```bash
# Create Lambda deployment package
cd dist/apps/event-handler
zip -r ../../../event-handler-$VERSION.zip . -x "*.map" "test/*"

# Upload to S3
aws s3 cp event-handler-$VERSION.zip \
  s3://nx-production-lambda-deployments/event-handler-$VERSION.zip

# Update function code
aws lambda update-function-code \
  --function-name nx-production-event-handler \
  --s3-bucket nx-production-lambda-deployments \
  --s3-key event-handler-$VERSION.zip

# Update function configuration
aws lambda update-function-configuration \
  --function-name nx-production-event-handler \
  --environment Variables='{
    "NODE_ENV": "production",
    "LOG_LEVEL": "info",
    "DATABASE_URL": "'$DATABASE_URL'",
    "EVENTBRIDGE_BUS": "nx-production-events"
  }' \
  --timeout 30 \
  --memory-size 1024 \
  --reserved-concurrent-executions 100

# Create alias for this version
LATEST_VERSION=$(aws lambda publish-version \
  --function-name nx-production-event-handler \
  --query 'Version' --output text)

aws lambda update-alias \
  --function-name nx-production-event-handler \
  --name LIVE \
  --function-version $LATEST_VERSION
```

## Production CI/CD Pipeline

### GitHub Actions Production Workflow

#### .github/workflows/deploy-production.yml
```yaml
name: Deploy to Production

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to deploy'
        required: true
        type: string
      skip_tests:
        description: 'Skip tests (emergency deployment)'
        required: false
        type: boolean
        default: false

env:
  AWS_REGION: us-east-1
  ECR_REGISTRY: 123456789012.dkr.ecr.us-east-1.amazonaws.com

jobs:
  validate:
    runs-on: ubuntu-latest
    if: ${{ !inputs.skip_tests }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run full test suite
        run: |
          pnpm test:ci
          pnpm test:integration
          pnpm test:e2e

      - name: Security audit
        run: pnpm audit --audit-level moderate

      - name: License compliance check
        run: pnpm license-checker --production --onlyAllow 'MIT;ISC;Apache-2.0;BSD-2-Clause;BSD-3-Clause'

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          languages: typescript, javascript

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  build-and-scan:
    needs: [validate, security-scan]
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
          role-to-assume: ${{ secrets.PRODUCTION_DEPLOY_ROLE }}
          role-session-name: GitHubActions-ProductionDeploy

      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: |
            ${{ env.ECR_REGISTRY }}/nx-production-api
            ${{ env.ECR_REGISTRY }}/nx-production-web
          tags: |
            type=ref,event=tag
            type=raw,value=${{ inputs.version }},enable=${{ inputs.version != '' }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push API image
        id: build-api
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./apps/api-example/Dockerfile
          push: true
          tags: ${{ env.ECR_REGISTRY }}/nx-production-api:${{ github.ref_name }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          provenance: true
          sbom: true

      - name: Build and push Web image
        id: build-web
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./apps/web-app/Dockerfile
          push: true
          tags: ${{ env.ECR_REGISTRY }}/nx-production-web:${{ github.ref_name }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          provenance: true
          sbom: true

      - name: Scan images with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.ECR_REGISTRY }}/nx-production-api:${{ github.ref_name }}
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

  deploy-infrastructure:
    needs: [build-and-scan]
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.0
          terraform_wrapper: false

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
          role-to-assume: ${{ secrets.PRODUCTION_DEPLOY_ROLE }}

      - name: Terraform Init
        working-directory: infrastructure/terraform/production
        run: terraform init

      - name: Terraform Plan
        working-directory: infrastructure/terraform/production
        run: |
          terraform plan \
            -var-file="production.tfvars" \
            -out=production.tfplan \
            -detailed-exitcode

          # Save plan for audit
          terraform show -json production.tfplan > plan.json
          aws s3 cp plan.json s3://nx-terraform-plans/production/$(date +%Y%m%d-%H%M%S)-plan.json

      - name: Terraform Apply
        working-directory: infrastructure/terraform/production
        run: terraform apply -auto-approve production.tfplan

  deploy-applications:
    needs: [deploy-infrastructure]
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
          role-to-assume: ${{ secrets.PRODUCTION_DEPLOY_ROLE }}

      - name: Deploy API to ECS
        run: |
          # Get current task definition
          aws ecs describe-task-definition \
            --task-definition nx-production-api \
            --query 'taskDefinition' > current-task-def.json

          # Remove system-generated fields
          jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)' \
            current-task-def.json > clean-task-def.json

          # Update image URI
          jq '.containerDefinitions[0].image = "${{ env.ECR_REGISTRY }}/nx-production-api:${{ github.ref_name }}"' \
            clean-task-def.json > updated-task-def.json

          # Register new task definition
          NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
            --cli-input-json file://updated-task-def.json \
            --query 'taskDefinition.taskDefinitionArn' \
            --output text)

          echo "New task definition: $NEW_TASK_DEF_ARN"

          # Blue-green deployment
          chmod +x scripts/blue-green-deploy.sh
          ./scripts/blue-green-deploy.sh nx-production-api $NEW_TASK_DEF_ARN

      - name: Deploy Lambda functions
        run: |
          # Build Lambda package
          pnpm nx build event-handler --prod
          cd dist/apps/event-handler
          zip -r ../../../event-handler-${{ github.ref_name }}.zip .

          # Upload to S3
          aws s3 cp event-handler-${{ github.ref_name }}.zip \
            s3://nx-production-lambda-deployments/

          # Update function code
          aws lambda update-function-code \
            --function-name nx-production-event-handler \
            --s3-bucket nx-production-lambda-deployments \
            --s3-key event-handler-${{ github.ref_name }}.zip

          # Publish version and update alias
          LATEST_VERSION=$(aws lambda publish-version \
            --function-name nx-production-event-handler \
            --query 'Version' --output text)

          aws lambda update-alias \
            --function-name nx-production-event-handler \
            --name LIVE \
            --function-version $LATEST_VERSION

      - name: Deploy static assets
        run: |
          # Build web application
          pnpm nx build web-app --prod

          # Upload to S3 with appropriate cache headers
          aws s3 sync dist/apps/web-app/_next/static \
            s3://nx-production-web-assets/static \
            --cache-control "public, max-age=31536000, immutable" \
            --delete

          aws s3 sync dist/apps/web-app \
            s3://nx-production-web-assets \
            --exclude "static/*" \
            --cache-control "public, max-age=86400" \
            --delete

          # Invalidate CloudFront cache
          INVALIDATION_ID=$(aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*" \
            --query 'Invalidation.Id' \
            --output text)

          echo "CloudFront invalidation ID: $INVALIDATION_ID"

  post-deploy-tests:
    needs: [deploy-applications]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Wait for services to stabilize
        run: sleep 120

      - name: Run smoke tests
        run: |
          curl -f https://api.example.com/health
          curl -f https://example.com

      - name: Run production API tests
        run: |
          export API_URL=https://api.example.com
          pnpm test:api:production

      - name: Run load tests
        run: |
          k6 run tools/performance/production-load-test.js \
            --out influxdb=http://monitoring.example.com:8086/k6

  notify:
    needs: [post-deploy-tests]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          fields: repo,message,commit,author,action,eventName,ref,workflow

      - name: Create deployment record
        run: |
          aws ssm put-parameter \
            --name "/nx/production/deployments/${{ github.ref_name }}" \
            --value '{
              "version": "${{ github.ref_name }}",
              "deployed_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
              "deployed_by": "${{ github.actor }}",
              "commit": "${{ github.sha }}",
              "status": "${{ job.status }}"
            }' \
            --type "String" \
            --overwrite
```

## Database Management

### Production Database Operations

#### Database Migration Process
```bash
#!/bin/bash
# Production database migration script
set -euo pipefail

DB_HOST="production-aurora-cluster.us-east-1.rds.amazonaws.com"
DB_NAME="nx_production"
BACKUP_NAME="pre-migration-$(date +%Y%m%d-%H%M%S)"

echo "Starting production database migration..."

# 1. Create backup
echo "Creating database backup..."
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier nx-production-cluster \
  --db-cluster-snapshot-identifier $BACKUP_NAME

# Wait for backup completion
aws rds wait db-cluster-snapshot-completed \
  --db-cluster-snapshot-identifier $BACKUP_NAME

# 2. Test migration on read replica
echo "Testing migration on read replica..."
export DATABASE_URL="postgresql://readonly_user:$READONLY_PASSWORD@$READ_REPLICA_HOST:5432/$DB_NAME"
pnpm db:migrate:test

# 3. Run migration on primary
echo "Running migration on primary database..."
export DATABASE_URL="postgresql://admin_user:$ADMIN_PASSWORD@$DB_HOST:5432/$DB_NAME"
pnpm db:migrate

# 4. Verify migration
echo "Verifying migration..."
pnpm db:verify

echo "Database migration completed successfully"
```

#### Database Backup Strategy
```bash
# Automated backup script
#!/bin/bash

# Daily backup
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier nx-production-cluster \
  --db-cluster-snapshot-identifier nx-production-daily-$(date +%Y%m%d)

# Weekly full backup with cross-region copy
SNAPSHOT_ID="nx-production-weekly-$(date +%Y%m%d)"
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier nx-production-cluster \
  --db-cluster-snapshot-identifier $SNAPSHOT_ID

# Copy to disaster recovery region
aws rds copy-db-cluster-snapshot \
  --source-db-cluster-snapshot-identifier $SNAPSHOT_ID \
  --target-db-cluster-snapshot-identifier $SNAPSHOT_ID \
  --source-region us-east-1 \
  --region us-west-2

# Cleanup old snapshots (keep 30 daily, 12 weekly)
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier nx-production-cluster \
  --snapshot-type manual \
  --query 'DBClusterSnapshots[?contains(DBClusterSnapshotIdentifier, `daily`) && SnapshotCreateTime < `'$(date -d '30 days ago' --iso-8601)'`].DBClusterSnapshotIdentifier' \
  --output text | \
  xargs -r -n1 aws rds delete-db-cluster-snapshot --db-cluster-snapshot-identifier
```

## Monitoring and Alerting

### CloudWatch Configuration
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", "ServiceName", "nx-production-api"],
          [".", "MemoryUtilization", ".", "."],
          ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "nx-production-alb"],
          [".", "RequestCount", ".", "."],
          ["AWS/RDS", "CPUUtilization", "DBClusterIdentifier", "nx-production-cluster"],
          [".", "DatabaseConnections", ".", "."]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Production System Metrics"
      }
    }
  ]
}
```

### Critical Alerts
```bash
# High CPU alert
aws cloudwatch put-metric-alarm \
  --alarm-name "nx-production-api-high-cpu" \
  --alarm-description "Production API high CPU usage" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:nx-production-alerts

# Database connection alert
aws cloudwatch put-metric-alarm \
  --alarm-name "nx-production-db-connections" \
  --alarm-description "Production database high connections" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:nx-production-alerts

# Application error rate alert
aws cloudwatch put-metric-alarm \
  --alarm-name "nx-production-error-rate" \
  --alarm-description "Production application error rate" \
  --metric-name ErrorRate \
  --namespace NXMonorepo/API \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:nx-production-alerts
```

## Disaster Recovery

### Disaster Recovery Plan
```bash
#!/bin/bash
# Disaster recovery activation script
set -euo pipefail

DR_REGION="us-west-2"
PRIMARY_REGION="us-east-1"

echo "Activating disaster recovery in $DR_REGION..."

# 1. Promote read replica to primary
aws rds promote-read-replica \
  --db-instance-identifier nx-production-replica \
  --region $DR_REGION

# 2. Update Route 53 to point to DR region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "CNAME",
        "TTL": 60,
        "ResourceRecords": [{"Value": "dr-alb.us-west-2.elb.amazonaws.com"}]
      }
    }]
  }'

# 3. Scale up DR services
aws ecs update-service \
  --cluster nx-dr-cluster \
  --service nx-dr-api \
  --desired-count 6 \
  --region $DR_REGION

# 4. Verify DR services
sleep 120
curl -f https://api.example.com/health

echo "Disaster recovery activation completed"
```

### Recovery Testing
```bash
# Monthly DR testing script
#!/bin/bash

echo "Starting DR test..."

# Create test environment in DR region
terraform workspace select dr-test
terraform apply -var-file="dr-test.tfvars" -auto-approve

# Run validation tests
export API_URL=https://dr-test.example.com
pnpm test:api:production

# Cleanup test environment
terraform destroy -var-file="dr-test.tfvars" -auto-approve

echo "DR test completed successfully"
```

## Security Hardening

### Runtime Security Monitoring
```bash
# Enable GuardDuty
aws guardduty create-detector \
  --enable \
  --finding-publishing-frequency FIFTEEN_MINUTES

# Enable Security Hub
aws securityhub enable-security-hub \
  --enable-default-standards

# Enable Config
aws configservice put-configuration-recorder \
  --configuration-recorder name=nx-production-config,roleARN=arn:aws:iam::123456789012:role/ConfigRole \
  --recording-group allSupported=true,includeGlobalResourceTypes=true

# Enable CloudTrail
aws cloudtrail create-trail \
  --name nx-production-trail \
  --s3-bucket-name nx-production-cloudtrail \
  --include-global-service-events \
  --is-multi-region-trail \
  --enable-log-file-validation
```

### WAF Rules
```json
{
  "Name": "nx-production-waf",
  "Scope": "CLOUDFRONT",
  "DefaultAction": {
    "Allow": {}
  },
  "Rules": [
    {
      "Name": "RateLimitRule",
      "Priority": 1,
      "Statement": {
        "RateBasedStatement": {
          "Limit": 10000,
          "AggregateKeyType": "IP"
        }
      },
      "Action": {
        "Block": {}
      }
    },
    {
      "Name": "AWSManagedRulesCommonRuleSet",
      "Priority": 2,
      "OverrideAction": {
        "None": {}
      },
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      }
    }
  ]
}
```

## Rollback Procedures

### Emergency Rollback Script
```bash
#!/bin/bash
# Emergency rollback script
set -euo pipefail

PREVIOUS_VERSION=${1:-""}
if [ -z "$PREVIOUS_VERSION" ]; then
  echo "Usage: $0 <previous-version>"
  exit 1
fi

echo "Starting emergency rollback to version $PREVIOUS_VERSION..."

# 1. Rollback ECS service
aws ecs update-service \
  --cluster nx-production-cluster \
  --service nx-production-api \
  --task-definition nx-production-api:$PREVIOUS_VERSION

# 2. Rollback Lambda function
aws lambda update-alias \
  --function-name nx-production-event-handler \
  --name LIVE \
  --function-version $PREVIOUS_VERSION

# 3. Rollback static assets
aws s3 sync s3://nx-production-web-assets-backup/$PREVIOUS_VERSION/ \
  s3://nx-production-web-assets/ \
  --delete

# 4. Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*"

# 5. Wait for services to stabilize
aws ecs wait services-stable \
  --cluster nx-production-cluster \
  --services nx-production-api

# 6. Verify rollback
curl -f https://api.example.com/health

echo "Emergency rollback completed successfully"
```

---

**Last Updated**: January 15, 2024
**Environment**: Production Deployment