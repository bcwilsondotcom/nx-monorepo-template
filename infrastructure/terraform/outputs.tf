# Output Values for Root Terraform Configuration

# Account and Region Information
output "aws_account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "AWS region"
  value       = data.aws_region.current.name
}

output "availability_zones" {
  description = "Available availability zones"
  value       = data.aws_availability_zones.available.names
}

# Networking Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.networking.vpc_cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.networking.private_subnet_ids
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = module.networking.internet_gateway_id
}

output "nat_gateway_ids" {
  description = "IDs of the NAT Gateways"
  value       = module.networking.nat_gateway_ids
}

output "nat_gateway_public_ips" {
  description = "Public IPs of the NAT Gateways"
  value       = module.networking.nat_gateway_public_ips
}

# Security Group Outputs
output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = module.networking.alb_security_group_id
}

output "ecs_security_group_id" {
  description = "ID of the ECS security group"
  value       = module.networking.ecs_security_group_id
}

output "lambda_security_group_id" {
  description = "ID of the Lambda security group"
  value       = module.networking.lambda_security_group_id
}

output "database_security_group_id" {
  description = "ID of the database security group"
  value       = module.networking.database_security_group_id
}

# S3 Outputs
output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = var.create_s3_buckets ? module.s3_assets[0].bucket_name : null
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = var.create_s3_buckets ? module.s3_assets[0].bucket_arn : null
}

output "s3_bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = var.create_s3_buckets ? module.s3_assets[0].bucket_domain_name : null
}

output "s3_bucket_regional_domain_name" {
  description = "Regional domain name of the S3 bucket"
  value       = var.create_s3_buckets ? module.s3_assets[0].bucket_regional_domain_name : null
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = var.create_s3_buckets ? module.s3_assets[0].cloudfront_distribution_id : null
}

output "cloudfront_distribution_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = var.create_s3_buckets ? module.s3_assets[0].cloudfront_distribution_domain_name : null
}

# DynamoDB Outputs
output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = var.create_dynamodb_tables ? module.dynamodb_main[0].table_name : null
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  value       = var.create_dynamodb_tables ? module.dynamodb_main[0].table_arn : null
}

output "dynamodb_table_stream_arn" {
  description = "ARN of the DynamoDB table stream"
  value       = var.create_dynamodb_tables ? module.dynamodb_main[0].table_stream_arn : null
}

output "dynamodb_global_secondary_indexes" {
  description = "Global secondary indexes of the DynamoDB table"
  value       = var.create_dynamodb_tables ? module.dynamodb_main[0].global_secondary_indexes : null
}

# Lambda Outputs
output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = var.create_lambda_functions ? module.lambda_api[0].lambda_function_name : null
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = var.create_lambda_functions ? module.lambda_api[0].lambda_function_arn : null
}

output "lambda_invoke_arn" {
  description = "Invoke ARN of the Lambda function"
  value       = var.create_lambda_functions ? module.lambda_api[0].lambda_invoke_arn : null
}

output "lambda_role_arn" {
  description = "ARN of the Lambda IAM role"
  value       = var.create_lambda_functions ? module.lambda_api[0].lambda_role_arn : null
}

output "lambda_cloudwatch_log_group_name" {
  description = "Name of the Lambda CloudWatch log group"
  value       = var.create_lambda_functions ? module.lambda_api[0].lambda_cloudwatch_log_group_name : null
}

# API Gateway Outputs
output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = var.create_api_gateway ? module.api_gateway[0].api_gateway_id : null
}

output "api_gateway_arn" {
  description = "ARN of the API Gateway"
  value       = var.create_api_gateway ? module.api_gateway[0].api_gateway_arn : null
}

output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = var.create_api_gateway ? module.api_gateway[0].api_gateway_url : null
}

output "api_gateway_invoke_url" {
  description = "Invoke URL of the API Gateway"
  value       = var.create_api_gateway ? module.api_gateway[0].api_gateway_invoke_url : null
}

output "api_gateway_stage_name" {
  description = "Name of the API Gateway stage"
  value       = var.create_api_gateway ? module.api_gateway[0].api_gateway_stage_name : null
}

output "api_key_id" {
  description = "ID of the API key"
  value       = var.create_api_gateway ? module.api_gateway[0].api_key_id : null
}

output "api_key_value" {
  description = "Value of the API key"
  value       = var.create_api_gateway ? module.api_gateway[0].api_key_value : null
  sensitive   = true
}

# ECS Outputs
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = var.create_ecs_cluster ? module.ecs[0].cluster_name : null
}

output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = var.create_ecs_cluster ? module.ecs[0].cluster_id : null
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = var.create_ecs_cluster ? module.ecs[0].cluster_arn : null
}

output "load_balancer_arn" {
  description = "ARN of the Application Load Balancer"
  value       = var.create_ecs_cluster && var.create_load_balancer ? module.ecs[0].load_balancer_arn : null
}

output "load_balancer_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = var.create_ecs_cluster && var.create_load_balancer ? module.ecs[0].load_balancer_dns_name : null
}

output "load_balancer_hosted_zone_id" {
  description = "Hosted zone ID of the Application Load Balancer"
  value       = var.create_ecs_cluster && var.create_load_balancer ? module.ecs[0].load_balancer_hosted_zone_id : null
}

output "ecr_repository_urls" {
  description = "URLs of the ECR repositories"
  value       = var.create_ecs_cluster ? module.ecs[0].ecr_repository_urls : null
}

output "ecs_service_names" {
  description = "Names of the ECS services"
  value       = var.create_ecs_cluster ? module.ecs[0].service_names : null
}

output "ecs_service_arns" {
  description = "ARNs of the ECS services"
  value       = var.create_ecs_cluster ? module.ecs[0].service_arns : null
}

output "target_group_arns" {
  description = "ARNs of the target groups"
  value       = var.create_ecs_cluster ? module.ecs[0].target_group_arns : null
}

# CloudWatch Outputs
output "cloudwatch_sns_topic_arn" {
  description = "ARN of the CloudWatch SNS topic"
  value       = var.enable_cloudwatch_monitoring ? module.cloudwatch[0].sns_topic_arn : null
}

output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = var.enable_cloudwatch_monitoring ? module.cloudwatch[0].dashboard_url : null
}

output "cloudwatch_log_group_names" {
  description = "Names of the CloudWatch log groups"
  value       = var.enable_cloudwatch_monitoring ? module.cloudwatch[0].log_group_names : null
}

# Application URLs
output "application_urls" {
  description = "URLs to access the application"
  value = {
    api_gateway = var.create_api_gateway ? module.api_gateway[0].api_gateway_url : null
    load_balancer = var.create_ecs_cluster && var.create_load_balancer ? "https://${module.ecs[0].load_balancer_dns_name}" : null
    cloudfront = var.create_s3_buckets && var.create_cloudfront_distribution ? "https://${module.s3_assets[0].cloudfront_distribution_domain_name}" : null
    s3_website = var.create_s3_buckets ? module.s3_assets[0].bucket_website_endpoint : null
  }
}

# Environment Information
output "environment_info" {
  description = "Environment configuration summary"
  value = {
    environment   = var.environment
    project_name  = var.project_name
    aws_region    = var.aws_region
    owner         = var.owner
    cost_center   = var.cost_center

    # Feature flags
    s3_created           = var.create_s3_buckets
    dynamodb_created     = var.create_dynamodb_tables
    lambda_created       = var.create_lambda_functions
    api_gateway_created  = var.create_api_gateway
    ecs_created          = var.create_ecs_cluster
    cloudfront_created   = var.create_cloudfront_distribution
    monitoring_enabled   = var.enable_cloudwatch_monitoring

    # Network configuration
    vpc_cidr            = var.vpc_cidr
    public_subnets      = length(var.public_subnet_cidrs)
    private_subnets     = length(var.private_subnet_cidrs)
    nat_gateway_enabled = var.enable_nat_gateway

    # Security
    encryption_enabled = var.s3_encryption_enabled
    waf_enabled       = var.waf_acl_arn != ""
  }
}

# Resource ARNs (for cross-stack references)
output "resource_arns" {
  description = "ARNs of created resources for cross-stack references"
  value = {
    vpc_arn           = "arn:aws:ec2:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:vpc/${module.networking.vpc_id}"
    s3_bucket_arn     = var.create_s3_buckets ? module.s3_assets[0].bucket_arn : null
    dynamodb_table_arn = var.create_dynamodb_tables ? module.dynamodb_main[0].table_arn : null
    lambda_function_arn = var.create_lambda_functions ? module.lambda_api[0].lambda_function_arn : null
    api_gateway_arn   = var.create_api_gateway ? module.api_gateway[0].api_gateway_arn : null
    ecs_cluster_arn   = var.create_ecs_cluster ? module.ecs[0].cluster_arn : null
    load_balancer_arn = var.create_ecs_cluster && var.create_load_balancer ? module.ecs[0].load_balancer_arn : null
  }
}

# Deployment Information
output "deployment_summary" {
  description = "Summary for deployment and CI/CD systems"
  value = {
    # Infrastructure
    vpc_id              = module.networking.vpc_id
    private_subnet_ids  = module.networking.private_subnet_ids
    public_subnet_ids   = module.networking.public_subnet_ids

    # Container infrastructure
    ecr_repositories    = var.create_ecs_cluster ? module.ecs[0].ecr_repository_urls : {}
    ecs_cluster        = var.create_ecs_cluster ? module.ecs[0].cluster_name : null
    ecs_services       = var.create_ecs_cluster ? module.ecs[0].service_names : {}

    # Serverless infrastructure
    lambda_functions   = var.create_lambda_functions ? {
      api = module.lambda_api[0].lambda_function_name
    } : {}
    api_gateway_url    = var.create_api_gateway ? module.api_gateway[0].api_gateway_url : null

    # Storage
    s3_buckets = var.create_s3_buckets ? {
      assets = module.s3_assets[0].bucket_name
    } : {}
    dynamodb_tables = var.create_dynamodb_tables ? {
      main = module.dynamodb_main[0].table_name
    } : {}

    # CDN
    cloudfront_distribution = var.create_s3_buckets ? module.s3_assets[0].cloudfront_distribution_id : null

    # Monitoring
    cloudwatch_dashboard = var.enable_cloudwatch_monitoring ? module.cloudwatch[0].dashboard_url : null
    sns_topic           = var.enable_cloudwatch_monitoring ? module.cloudwatch[0].sns_topic_arn : null
  }
}