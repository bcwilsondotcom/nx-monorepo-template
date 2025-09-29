# Outputs for Production Environment

# KMS
output "kms_key_id" {
  description = "ID of the KMS key"
  value       = aws_kms_key.main.key_id
}

output "kms_key_arn" {
  description = "ARN of the KMS key"
  value       = aws_kms_key.main.arn
}

# Networking
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.networking.private_subnet_ids
}

output "nat_gateway_ips" {
  description = "Public IPs of the NAT gateways"
  value       = module.networking.nat_gateway_public_ips
}

# S3 Buckets
output "s3_assets_bucket_name" {
  description = "Name of the S3 assets bucket"
  value       = module.s3_assets.bucket_name
}

output "s3_logs_bucket_name" {
  description = "Name of the S3 logs bucket"
  value       = module.s3_logs.bucket_name
}

output "s3_backups_bucket_name" {
  description = "Name of the S3 backups bucket"
  value       = module.s3_backups.bucket_name
}

output "cloudfront_distribution_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = module.s3_assets.cloudfront_distribution_domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = module.s3_assets.cloudfront_distribution_id
}

# DynamoDB Tables
output "dynamodb_users_table_name" {
  description = "Name of the DynamoDB users table"
  value       = module.dynamodb_users.table_name
}

output "dynamodb_users_table_arn" {
  description = "ARN of the DynamoDB users table"
  value       = module.dynamodb_users.table_arn
}

output "dynamodb_sessions_table_name" {
  description = "Name of the DynamoDB sessions table"
  value       = module.dynamodb_sessions.table_name
}

output "dynamodb_audit_logs_table_name" {
  description = "Name of the DynamoDB audit logs table"
  value       = module.dynamodb_audit_logs.table_name
}

# Lambda Functions
output "lambda_api_function_name" {
  description = "Name of the API Lambda function"
  value       = module.lambda_api.lambda_function_name
}

output "lambda_api_function_arn" {
  description = "ARN of the API Lambda function"
  value       = module.lambda_api.lambda_function_arn
}

output "lambda_processor_function_name" {
  description = "Name of the processor Lambda function"
  value       = module.lambda_processor.lambda_function_name
}

output "lambda_processor_function_arn" {
  description = "ARN of the processor Lambda function"
  value       = module.lambda_processor.lambda_function_arn
}

# API Gateway
output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = module.api_gateway.api_gateway_id
}

output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = module.api_gateway.api_gateway_url
}

output "api_gateway_invoke_url" {
  description = "Invoke URL of the API Gateway"
  value       = module.api_gateway.api_gateway_invoke_url
}

output "api_key_id" {
  description = "ID of the API key"
  value       = module.api_gateway.api_key_id
}

output "api_key_value" {
  description = "Value of the API key"
  value       = module.api_gateway.api_key_value
  sensitive   = true
}

# ECS Cluster
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = module.ecs.cluster_arn
}

output "load_balancer_dns_name" {
  description = "DNS name of the load balancer"
  value       = module.ecs.load_balancer_dns_name
}

output "load_balancer_arn" {
  description = "ARN of the load balancer"
  value       = module.ecs.load_balancer_arn
}

output "load_balancer_hosted_zone_id" {
  description = "Hosted zone ID of the load balancer"
  value       = module.ecs.load_balancer_hosted_zone_id
}

output "ecr_repository_urls" {
  description = "URLs of the ECR repositories"
  value       = module.ecs.ecr_repository_urls
}

output "ecs_service_arns" {
  description = "ARNs of the ECS services"
  value       = module.ecs.service_arns
}

# CloudWatch Monitoring
output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = module.cloudwatch.sns_topic_arn
}

output "dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = module.cloudwatch.dashboard_url
}

output "log_group_arns" {
  description = "ARNs of the CloudWatch log groups"
  value       = module.cloudwatch.log_group_arns
}

# Application URLs
output "application_urls" {
  description = "URLs to access the application"
  value = {
    web_app         = "https://${module.ecs.load_balancer_dns_name}"
    api_gateway     = module.api_gateway.api_gateway_url
    cloudfront      = "https://${module.s3_assets.cloudfront_distribution_domain_name}"
    dashboard       = module.cloudwatch.dashboard_url
  }
}

# Security Information
output "security_summary" {
  description = "Security configuration summary"
  value = {
    kms_encryption_enabled    = true
    vpc_endpoints_enabled     = true
    waf_enabled              = var.waf_acl_arn != ""
    deletion_protection      = true
    access_logging_enabled   = true
    encryption_in_transit    = true
    encryption_at_rest       = true
    secret_management        = true
    audit_logging_enabled    = true
  }
}

# Production Environment Summary
output "production_summary" {
  description = "Summary of the production environment"
  value = {
    environment     = "production"
    project_name    = var.project_name
    aws_region      = var.aws_region
    vpc_id          = module.networking.vpc_id
    kms_key_id      = aws_kms_key.main.key_id

    # High Availability
    availability_zones = length(module.networking.public_subnet_ids)
    multi_az_deployment = true
    auto_scaling_enabled = true

    # Service Counts
    ecs_services    = length(module.ecs.service_names)
    lambda_functions = 2
    dynamodb_tables = 3
    s3_buckets      = 3
    ecr_repositories = length(module.ecs.ecr_repository_urls)

    # Key Endpoints
    load_balancer   = module.ecs.load_balancer_dns_name
    api_gateway     = module.api_gateway.api_gateway_url
    cloudfront      = module.s3_assets.cloudfront_distribution_domain_name

    # Monitoring & Alerting
    cloudwatch_dashboard = module.cloudwatch.dashboard_url
    sns_alerts          = module.cloudwatch.sns_topic_arn
    log_groups_count    = length(module.cloudwatch.log_group_arns)

    # Security Features
    encryption_enabled   = true
    secrets_managed     = true
    vpc_isolated        = true
    deletion_protected  = true

    # Compliance
    audit_logging       = true
    backup_configured   = true
    monitoring_enabled  = true
  }
}

# Disaster Recovery Information
output "disaster_recovery_info" {
  description = "Disaster recovery configuration"
  value = {
    cross_region_backups_enabled = var.enable_cross_region_backup
    backup_region                = var.backup_region
    point_in_time_recovery       = true
    automated_backups            = true
    backup_retention_days        = var.backup_retention_years * 365

    # Recovery targets
    rpo_hours = 1  # Recovery Point Objective
    rto_hours = 4  # Recovery Time Objective

    # Critical resources for recovery
    critical_data_stores = [
      module.dynamodb_users.table_arn,
      module.dynamodb_audit_logs.table_arn,
      module.s3_assets.bucket_arn
    ]
  }
}

# Deployment Information
output "deployment_info" {
  description = "Information for deployment pipelines"
  value = {
    # Container Registries
    ecr_repositories = module.ecs.ecr_repository_urls

    # ECS Deployment
    ecs_cluster     = module.ecs.cluster_name
    ecs_services    = module.ecs.service_names

    # Lambda Deployment
    lambda_functions = {
      api       = module.lambda_api.lambda_function_name
      processor = module.lambda_processor.lambda_function_name
    }

    # Storage
    s3_buckets = {
      assets  = module.s3_assets.bucket_name
      logs    = module.s3_logs.bucket_name
      backups = module.s3_backups.bucket_name
    }

    # Database
    dynamodb_tables = {
      users      = module.dynamodb_users.table_name
      sessions   = module.dynamodb_sessions.table_name
      audit_logs = module.dynamodb_audit_logs.table_name
    }

    # API
    api_gateway = {
      id  = module.api_gateway.api_gateway_id
      url = module.api_gateway.api_gateway_url
    }

    # CDN
    cloudfront = {
      distribution_id = module.s3_assets.cloudfront_distribution_id
      domain_name     = module.s3_assets.cloudfront_distribution_domain_name
    }
  }
}