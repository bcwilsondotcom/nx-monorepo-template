# Terraform Infrastructure for NX Monorepo Template

This directory contains the complete Terraform infrastructure-as-code configuration for the NX Monorepo Template. It provides a modular, scalable, and environment-specific AWS infrastructure setup.

## Architecture Overview

The infrastructure is organized into reusable modules and environment-specific configurations:

```
infrastructure/terraform/
├── modules/                 # Reusable Terraform modules
│   ├── api-gateway/        # API Gateway with Lambda integration
│   ├── cloudwatch/         # Monitoring and alerting
│   ├── dynamodb/           # NoSQL database with auto-scaling
│   ├── ecs/                # Container orchestration with Fargate
│   ├── lambda/             # Serverless functions
│   ├── networking/         # VPC, subnets, security groups
│   └── s3/                 # Object storage with CloudFront
├── environments/           # Environment-specific configurations
│   ├── local/              # LocalStack for local development
│   ├── staging/            # Cost-optimized staging environment
│   └── production/         # High-availability production setup
├── main.tf                 # Root module configuration
├── variables.tf            # Input variables
├── outputs.tf              # Output values
├── versions.tf             # Provider version constraints
└── README.md               # This file
```

## Quick Start

### Prerequisites

1. **Terraform**: Install Terraform >= 1.0
   ```bash
   # macOS
   brew install terraform

   # Or download from https://terraform.io/downloads
   ```

2. **AWS CLI**: Configure AWS credentials
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, and region
   ```

3. **LocalStack** (for local development):
   ```bash
   pip install localstack
   localstack start
   ```

### Local Development Setup

1. **Initialize Terraform**:
   ```bash
   cd infrastructure/terraform/environments/local
   terraform init
   ```

2. **Plan the deployment**:
   ```bash
   terraform plan
   ```

3. **Apply the infrastructure**:
   ```bash
   terraform apply
   ```

4. **Access your local services**:
   ```bash
   terraform output application_urls
   ```

### Staging/Production Setup

1. **Configure remote state** (recommended):
   ```bash
   # Create S3 bucket for state
   aws s3 mb s3://your-terraform-state-bucket

   # Create DynamoDB table for state locking
   aws dynamodb create-table \
     --table-name terraform-state-lock \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST
   ```

2. **Update backend configuration**:
   ```hcl
   # In environments/staging/main.tf or environments/production/main.tf
   terraform {
     backend "s3" {
       bucket         = "your-terraform-state-bucket"
       key            = "environments/staging/terraform.tfstate"  # or production
       region         = "us-east-1"
       encrypt        = true
       dynamodb_table = "terraform-state-lock"
     }
   }
   ```

3. **Deploy to staging**:
   ```bash
   cd infrastructure/terraform/environments/staging
   terraform init
   terraform plan -var-file="staging.tfvars"
   terraform apply -var-file="staging.tfvars"
   ```

## Module Documentation

Each module includes comprehensive documentation:

- **[API Gateway](./modules/api-gateway/README.md)**: REST API with Lambda integration, throttling, and CORS
- **[CloudWatch](./modules/cloudwatch/README.md)**: Monitoring, alerting, and dashboards
- **[DynamoDB](./modules/dynamodb/README.md)**: NoSQL database with auto-scaling and backup
- **[ECS](./modules/ecs/README.md)**: Container orchestration with Fargate and auto-scaling
- **[Lambda](./modules/lambda/README.md)**: Serverless functions with VPC and monitoring
- **[Networking](./modules/networking/README.md)**: VPC, subnets, NAT gateways, and security groups
- **[S3](./modules/s3/README.md)**: Object storage with CloudFront CDN

## Environment Configurations

### Local Development (LocalStack)
- **Purpose**: Local development and testing
- **Features**: Simplified configuration, no NAT gateways, public subnets
- **Cost**: Free (uses LocalStack)

### Staging
- **Purpose**: Pre-production testing and validation
- **Features**: Cost-optimized, Fargate Spot, shorter retention periods
- **Cost**: Optimized for development budgets

### Production
- **Purpose**: Live application environment
- **Features**: High availability, encryption, monitoring, backup
- **Cost**: Optimized for performance and reliability

## Configuration Examples

### Basic Setup (Serverless)
```hcl
# terraform.tfvars
project_name = "my-app"
environment  = "staging"

# Enable only what you need
create_lambda_functions = true
create_api_gateway      = true
create_s3_buckets      = true
create_dynamodb_tables = true
create_ecs_cluster     = false

# Lambda configuration
lambda_source_path = "../../../apps/api/dist"
lambda_memory_size = 512
lambda_timeout     = 30
```

### Container-based Setup
```hcl
# terraform.tfvars
project_name = "my-app"
environment  = "production"

# Enable container infrastructure
create_ecs_cluster    = true
create_load_balancer  = true
create_s3_buckets    = true
create_dynamodb_tables = true

# ECS configuration
ecs_services = {
  web = {
    ecr_repository = "web_app"
    container_port = 3000
    desired_count  = 3
    cpu           = 512
    memory        = 1024
    health_check = {
      path = "/health"
    }
    autoscaling = {
      min_capacity = 2
      max_capacity = 10
    }
  }
}
```

### Full-stack Setup
```hcl
# terraform.tfvars
project_name = "my-app"
environment  = "production"

# Enable all components
create_lambda_functions = true
create_api_gateway      = true
create_ecs_cluster     = true
create_load_balancer   = true
create_s3_buckets      = true
create_dynamodb_tables = true
create_cloudfront_distribution = true

# Security
s3_encryption_enabled = true
kms_key_arn          = "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"

# Monitoring
enable_cloudwatch_monitoring = true
create_sns_topic            = true
alert_email_addresses       = ["ops@company.com"]
```

## Best Practices

### Security
- Always enable encryption in production
- Use IAM roles with least privilege
- Enable VPC flow logs for network monitoring
- Use WAF for API Gateway protection
- Store secrets in AWS Secrets Manager or SSM Parameter Store

### Cost Optimization
- Use Fargate Spot for non-critical workloads
- Implement S3 lifecycle policies
- Set appropriate log retention periods
- Use DynamoDB on-demand for unpredictable workloads
- Monitor costs with AWS Cost Explorer

### High Availability
- Deploy across multiple availability zones
- Use Application Load Balancer health checks
- Enable auto-scaling for ECS services
- Configure DynamoDB auto-scaling
- Implement proper backup strategies

### Monitoring
- Set up CloudWatch dashboards
- Configure meaningful alarms
- Use structured logging
- Implement distributed tracing
- Monitor business metrics

## Troubleshooting

### Common Issues

1. **State lock conflicts**:
   ```bash
   # Force unlock (use with caution)
   terraform force-unlock <lock-id>
   ```

2. **Provider version conflicts**:
   ```bash
   terraform init -upgrade
   ```

3. **Resource naming conflicts**:
   - Ensure unique resource names across environments
   - Use consistent naming prefixes

4. **Permission errors**:
   - Verify AWS credentials and permissions
   - Check IAM policies for required actions

### Debugging

1. **Enable detailed logging**:
   ```bash
   export TF_LOG=DEBUG
   terraform plan
   ```

2. **Validate configuration**:
   ```bash
   terraform validate
   terraform fmt -check
   ```

3. **Check state**:
   ```bash
   terraform state list
   terraform state show <resource>
   ```

## Migration and Upgrades

### Upgrading Terraform Version
1. Check compatibility in `versions.tf`
2. Update the required version
3. Run `terraform init -upgrade`
4. Test with `terraform plan`

### Module Updates
1. Review module changelogs
2. Update module versions
3. Run `terraform plan` to review changes
4. Apply changes in staging first

### State Migration
For moving resources between states or modules, use:
```bash
terraform state mv <source> <destination>
terraform import <resource> <id>
```

## Contributing

### Module Development
1. Follow the existing module structure
2. Include comprehensive variables and outputs
3. Add validation and descriptions
4. Write documentation and examples
5. Test with multiple environments

### Code Style
- Use consistent naming conventions
- Add meaningful descriptions
- Include appropriate tags
- Follow Terraform best practices
- Use `terraform fmt` for formatting

## Support

For issues and questions:
1. Check the module-specific README files
2. Review Terraform documentation
3. Check AWS service documentation
4. Create an issue in the repository

## License

This infrastructure configuration is provided as part of the NX Monorepo Template and follows the same license terms.