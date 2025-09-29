# Outputs for Local Environment

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
output "s3_bucket_name" {
  description = "Name of the S3 assets bucket"
  value       = module.s3_assets.bucket_name
}

output "s3_bucket_url" {
  description = "URL of the S3 bucket for LocalStack"
  value       = "http://localhost:4566/${module.s3_assets.bucket_name}"
}

# DynamoDB
output "dynamodb_table_name" {
  description = "Name of the DynamoDB users table"
  value       = module.dynamodb_users.table_name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB users table"
  value       = module.dynamodb_users.table_arn
}

# Lambda
output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = module.lambda_api.lambda_function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = module.lambda_api.lambda_function_arn
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

# ECS
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "load_balancer_dns_name" {
  description = "DNS name of the load balancer"
  value       = module.ecs.load_balancer_dns_name
}

output "ecr_repository_urls" {
  description = "URLs of the ECR repositories"
  value       = module.ecs.ecr_repository_urls
}

# Application URLs
output "application_urls" {
  description = "URLs to access the application"
  value = {
    api_gateway    = module.api_gateway.api_gateway_url
    load_balancer  = "http://${module.ecs.load_balancer_dns_name}"
    s3_bucket      = "http://localhost:4566/${module.s3_assets.bucket_name}"
  }
}

# LocalStack endpoints
output "localstack_endpoints" {
  description = "LocalStack service endpoints"
  value = {
    api_gateway = "http://localhost:4566"
    dynamodb    = "http://localhost:4566"
    lambda      = "http://localhost:4566"
    s3          = "http://localhost:4566"
    ecs         = "http://localhost:4566"
    cloudwatch  = "http://localhost:4566"
  }
}

# Development information
output "development_info" {
  description = "Information for local development"
  value = {
    environment     = "local"
    project_name    = var.project_name
    aws_region      = var.aws_region
    localstack_url  = "http://localhost:4566"

    # Quick access commands
    aws_cli_example = "aws --endpoint-url=http://localhost:4566 s3 ls s3://${module.s3_assets.bucket_name}"

    # Service URLs
    services = {
      api     = module.api_gateway.api_gateway_url
      web     = "http://${module.ecs.load_balancer_dns_name}"
      assets  = "http://localhost:4566/${module.s3_assets.bucket_name}"
    }
  }
}