# Outputs for Staging Environment

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

# S3
output "s3_assets_bucket_name" {
  description = "Name of the S3 assets bucket"
  value       = module.s3_assets.bucket_name
}

output "s3_logs_bucket_name" {
  description = "Name of the S3 logs bucket"
  value       = module.s3_logs.bucket_name
}

output "cloudfront_distribution_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = module.s3_assets.cloudfront_distribution_domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = module.s3_assets.cloudfront_distribution_id
}

# DynamoDB
output "dynamodb_users_table_name" {
  description = "Name of the DynamoDB users table"
  value       = module.dynamodb_users.table_name
}

output "dynamodb_sessions_table_name" {
  description = "Name of the DynamoDB sessions table"
  value       = module.dynamodb_sessions.table_name
}

# Lambda
output "lambda_api_function_name" {
  description = "Name of the API Lambda function"
  value       = module.lambda_api.lambda_function_name
}

output "lambda_processor_function_name" {
  description = "Name of the processor Lambda function"
  value       = module.lambda_processor.lambda_function_name
}

# API Gateway
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

# ECS
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "load_balancer_dns_name" {
  description = "DNS name of the load balancer"
  value       = module.ecs.load_balancer_dns_name
}

output "load_balancer_hosted_zone_id" {
  description = "Hosted zone ID of the load balancer"
  value       = module.ecs.load_balancer_hosted_zone_id
}

output "ecr_repository_urls" {
  description = "URLs of the ECR repositories"
  value       = module.ecs.ecr_repository_urls
}

# CloudWatch
output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = module.cloudwatch.sns_topic_arn
}

output "dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = module.cloudwatch.dashboard_url
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

# Environment summary
output "environment_summary" {
  description = "Summary of the staging environment"
  value = {
    environment     = "staging"
    project_name    = var.project_name
    aws_region      = var.aws_region
    vpc_id          = module.networking.vpc_id

    # Service counts
    ecs_services    = length(module.ecs.service_names)
    lambda_functions = 2
    dynamodb_tables = 2
    s3_buckets      = 2

    # Key endpoints
    load_balancer   = module.ecs.load_balancer_dns_name
    api_gateway     = module.api_gateway.api_gateway_url
    cloudfront      = module.s3_assets.cloudfront_distribution_domain_name

    # Monitoring
    sns_alerts      = module.cloudwatch.sns_topic_arn != null
    dashboard       = module.cloudwatch.dashboard_url

    # Cost optimization features
    fargate_spot    = true
    lifecycle_rules = true
    short_retention = true
  }
}

# Deployment information
output "deployment_info" {
  description = "Information for deployment pipelines"
  value = {
    ecr_repositories = module.ecs.ecr_repository_urls
    ecs_cluster     = module.ecs.cluster_name
    ecs_services    = module.ecs.service_names
    lambda_functions = {
      api       = module.lambda_api.lambda_function_name
      processor = module.lambda_processor.lambda_function_name
    }
    s3_buckets = {
      assets = module.s3_assets.bucket_name
      logs   = module.s3_logs.bucket_name
    }
    api_gateway = {
      id  = module.api_gateway.api_gateway_id
      url = module.api_gateway.api_gateway_url
    }
  }
}