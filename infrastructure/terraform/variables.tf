# Input Variables for Root Terraform Configuration

# Basic Configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "nx-monorepo"
}

variable "environment" {
  description = "Environment name (local, staging, production)"
  type        = string
  validation {
    condition     = contains(["local", "staging", "production"], var.environment)
    error_message = "Environment must be one of: local, staging, production."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "owner" {
  description = "Owner of the infrastructure"
  type        = string
  default     = "platform-team"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"
}

# Terraform State Configuration
variable "terraform_state_bucket" {
  description = "S3 bucket for Terraform state"
  type        = string
  default     = ""
}

variable "terraform_state_lock_table" {
  description = "DynamoDB table for Terraform state locking"
  type        = string
  default     = ""
}

# Networking Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

# Feature Flags
variable "create_s3_buckets" {
  description = "Create S3 buckets"
  type        = bool
  default     = true
}

variable "create_dynamodb_tables" {
  description = "Create DynamoDB tables"
  type        = bool
  default     = true
}

variable "create_lambda_functions" {
  description = "Create Lambda functions"
  type        = bool
  default     = true
}

variable "create_api_gateway" {
  description = "Create API Gateway"
  type        = bool
  default     = true
}

variable "create_ecs_cluster" {
  description = "Create ECS cluster"
  type        = bool
  default     = false
}

variable "create_load_balancer" {
  description = "Create Application Load Balancer"
  type        = bool
  default     = false
}

variable "create_cloudfront_distribution" {
  description = "Create CloudFront distribution"
  type        = bool
  default     = false
}

variable "enable_cloudwatch_monitoring" {
  description = "Enable CloudWatch monitoring"
  type        = bool
  default     = true
}

# Security Configuration
variable "kms_key_arn" {
  description = "ARN of KMS key for encryption"
  type        = string
  default     = ""
}

variable "s3_encryption_enabled" {
  description = "Enable S3 encryption with KMS"
  type        = bool
  default     = false
}

variable "waf_acl_arn" {
  description = "ARN of WAF Web ACL"
  type        = string
  default     = ""
}

# S3 Configuration
variable "s3_versioning_enabled" {
  description = "Enable S3 versioning"
  type        = bool
  default     = true
}

variable "s3_cors_rules" {
  description = "CORS rules for S3 bucket"
  type = list(object({
    allowed_headers = optional(list(string))
    allowed_methods = list(string)
    allowed_origins = list(string)
    expose_headers  = optional(list(string))
    max_age_seconds = optional(number)
  }))
  default = []
}

variable "s3_lifecycle_rules" {
  description = "Lifecycle rules for S3 bucket"
  type = list(object({
    id      = string
    enabled = bool
    filter = optional(object({
      prefix = optional(string)
      tags   = optional(map(string))
    }))
    expiration = optional(object({
      days                         = optional(number)
      date                         = optional(string)
      expired_object_delete_marker = optional(bool)
    }))
    noncurrent_version_expiration = optional(object({
      days                      = number
      newer_noncurrent_versions = optional(number)
    }))
    transitions = optional(list(object({
      days          = optional(number)
      date          = optional(string)
      storage_class = string
    })))
    noncurrent_version_transitions = optional(list(object({
      days                      = number
      storage_class             = string
      newer_noncurrent_versions = optional(number)
    })))
    abort_incomplete_multipart_upload_days = optional(number)
  }))
  default = []
}

# CloudFront Configuration
variable "cloudfront_aliases" {
  description = "CloudFront distribution aliases"
  type        = list(string)
  default     = []
}

variable "cloudfront_certificate_arn" {
  description = "ARN of ACM certificate for CloudFront"
  type        = string
  default     = null
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}

# DynamoDB Configuration
variable "dynamodb_billing_mode" {
  description = "DynamoDB billing mode"
  type        = string
  default     = "PAY_PER_REQUEST"
}

variable "dynamodb_hash_key" {
  description = "DynamoDB hash key"
  type        = string
  default     = "id"
}

variable "dynamodb_range_key" {
  description = "DynamoDB range key"
  type        = string
  default     = null
}

variable "dynamodb_attributes" {
  description = "DynamoDB table attributes"
  type = list(object({
    name = string
    type = string
  }))
  default = [
    {
      name = "id"
      type = "S"
    }
  ]
}

variable "dynamodb_global_secondary_indexes" {
  description = "DynamoDB global secondary indexes"
  type = map(object({
    name               = string
    hash_key           = string
    range_key          = optional(string)
    projection_type    = optional(string, "ALL")
    non_key_attributes = optional(list(string), [])
    read_capacity      = optional(number, 5)
    write_capacity     = optional(number, 5)
  }))
  default = {}
}

variable "dynamodb_local_secondary_indexes" {
  description = "DynamoDB local secondary indexes"
  type = map(object({
    name               = string
    range_key          = string
    projection_type    = optional(string, "ALL")
    non_key_attributes = optional(list(string), [])
  }))
  default = {}
}

variable "dynamodb_stream_enabled" {
  description = "Enable DynamoDB streams"
  type        = bool
  default     = false
}

variable "dynamodb_stream_view_type" {
  description = "DynamoDB stream view type"
  type        = string
  default     = "NEW_AND_OLD_IMAGES"
}

variable "dynamodb_ttl_enabled" {
  description = "Enable DynamoDB TTL"
  type        = bool
  default     = false
}

variable "dynamodb_ttl_attribute_name" {
  description = "DynamoDB TTL attribute name"
  type        = string
  default     = "ttl"
}

variable "enable_point_in_time_recovery" {
  description = "Enable DynamoDB point-in-time recovery"
  type        = bool
  default     = true
}

# Lambda Configuration
variable "lambda_handler" {
  description = "Lambda function handler"
  type        = string
  default     = "index.handler"
}

variable "lambda_runtime" {
  description = "Lambda function runtime"
  type        = string
  default     = "nodejs18.x"
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_memory_size" {
  description = "Lambda function memory size in MB"
  type        = number
  default     = 256
}

variable "lambda_architectures" {
  description = "Lambda function architectures"
  type        = list(string)
  default     = ["x86_64"]
}

variable "lambda_source_path" {
  description = "Path to Lambda function source code"
  type        = string
  default     = ""
}

variable "lambda_s3_bucket" {
  description = "S3 bucket containing Lambda deployment package"
  type        = string
  default     = ""
}

variable "lambda_s3_key" {
  description = "S3 key for Lambda deployment package"
  type        = string
  default     = ""
}

variable "lambda_vpc_enabled" {
  description = "Enable VPC for Lambda function"
  type        = bool
  default     = false
}

variable "lambda_environment_variables" {
  description = "Environment variables for Lambda function"
  type        = map(string)
  default     = {}
}

variable "lambda_secrets" {
  description = "Secrets for Lambda function"
  type        = map(string)
  default     = {}
}

variable "lambda_custom_policy" {
  description = "Custom IAM policy for Lambda function"
  type        = string
  default     = null
}

variable "lambda_reserved_concurrency" {
  description = "Reserved concurrency for Lambda function"
  type        = number
  default     = -1
}

variable "lambda_provisioned_concurrency" {
  description = "Provisioned concurrency for Lambda function"
  type        = number
  default     = 0
}

variable "enable_lambda_dlq" {
  description = "Enable dead letter queue for Lambda"
  type        = bool
  default     = false
}

# API Gateway Configuration
variable "api_gateway_stage_name" {
  description = "API Gateway stage name"
  type        = string
  default     = "v1"
}

variable "api_gateway_authorization_type" {
  description = "API Gateway authorization type"
  type        = string
  default     = "NONE"
}

variable "api_gateway_enable_cors" {
  description = "Enable CORS for API Gateway"
  type        = bool
  default     = true
}

variable "api_gateway_cors_origin" {
  description = "CORS origin for API Gateway"
  type        = string
  default     = "*"
}

variable "api_gateway_cors_headers" {
  description = "CORS headers for API Gateway"
  type        = list(string)
  default     = ["Content-Type", "X-Amz-Date", "Authorization", "X-Api-Key"]
}

variable "api_gateway_cors_methods" {
  description = "CORS methods for API Gateway"
  type        = list(string)
  default     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}

variable "api_gateway_throttle_rate_limit" {
  description = "API Gateway throttle rate limit"
  type        = number
  default     = 10000
}

variable "api_gateway_throttle_burst_limit" {
  description = "API Gateway throttle burst limit"
  type        = number
  default     = 5000
}

variable "api_gateway_create_api_key" {
  description = "Create API key for API Gateway"
  type        = bool
  default     = false
}

variable "api_gateway_api_key_required" {
  description = "Require API key for API Gateway"
  type        = bool
  default     = false
}

variable "api_gateway_usage_plan_quota_limit" {
  description = "API Gateway usage plan quota limit"
  type        = number
  default     = 10000
}

variable "api_gateway_usage_plan_quota_period" {
  description = "API Gateway usage plan quota period"
  type        = string
  default     = "MONTH"
}

variable "enable_api_gateway_logging" {
  description = "Enable API Gateway access logging"
  type        = bool
  default     = true
}

# Existing Lambda Integration (if not creating new Lambda)
variable "existing_lambda_invoke_arn" {
  description = "Invoke ARN of existing Lambda function"
  type        = string
  default     = ""
}

variable "existing_lambda_function_name" {
  description = "Name of existing Lambda function"
  type        = string
  default     = ""
}

# ECS Configuration
variable "ecs_assign_public_ip" {
  description = "Assign public IP to ECS tasks"
  type        = bool
  default     = false
}

variable "ecs_capacity_providers" {
  description = "ECS capacity providers"
  type        = list(string)
  default     = ["FARGATE", "FARGATE_SPOT"]
}

variable "ecs_capacity_provider_strategy" {
  description = "ECS capacity provider strategy"
  type = list(object({
    capacity_provider = string
    weight           = number
    base             = number
  }))
  default = [
    {
      capacity_provider = "FARGATE"
      weight           = 1
      base             = 0
    }
  ]
}

variable "alb_certificate_arn" {
  description = "ARN of ACM certificate for ALB"
  type        = string
  default     = null
}

variable "ecr_repositories" {
  description = "ECR repositories configuration"
  type = map(object({
    name                 = string
    image_tag_mutability = optional(string, "MUTABLE")
    scan_on_push        = optional(bool, true)
    encryption_type     = optional(string, "AES256")
    kms_key             = optional(string, null)
    max_image_count     = optional(number, 10)
  }))
  default = {}
}

variable "ecs_services" {
  description = "ECS services configuration"
  type = map(object({
    ecr_repository    = string
    image_tag         = optional(string, "latest")
    cpu               = optional(number, 256)
    memory            = optional(number, 512)
    container_port    = number
    desired_count     = optional(number, 1)
    environment_variables = optional(map(string), {})
    secrets              = optional(map(string), {})
    health_check = object({
      healthy_threshold   = optional(number, 2)
      interval           = optional(number, 30)
      matcher            = optional(string, "200")
      path               = optional(string, "/health")
      timeout            = optional(number, 5)
      unhealthy_threshold = optional(number, 2)
    })
    health_check_command = optional(list(string), null)
    listener_rule_priority = optional(number, 100)
    path_patterns         = optional(list(string), null)
    host_headers          = optional(list(string), null)
    autoscaling = object({
      min_capacity              = optional(number, 1)
      max_capacity              = optional(number, 10)
      cpu_target_value          = optional(number, 70)
      memory_target_value       = optional(number, 80)
      request_count_target_value = optional(number, 1000)
    })
    task_role_policy = optional(string, null)
    service_discovery_arn = optional(string, null)
  }))
  default = {}
}

# CloudWatch Configuration
variable "enable_cloudwatch_alarms" {
  description = "Enable CloudWatch alarms"
  type        = bool
  default     = true
}

variable "create_sns_topic" {
  description = "Create SNS topic for alerts"
  type        = bool
  default     = false
}

variable "alert_email_addresses" {
  description = "Email addresses for CloudWatch alerts"
  type        = list(string)
  default     = []
}

variable "alert_phone_numbers" {
  description = "Phone numbers for CloudWatch SMS alerts"
  type        = list(string)
  default     = []
}

variable "cloudwatch_log_groups" {
  description = "CloudWatch log groups configuration"
  type = map(object({
    name           = string
    retention_days = number
    kms_key_id     = optional(string)
    tags           = optional(map(string), {})
  }))
  default = {}
}

variable "cloudwatch_metric_filters" {
  description = "CloudWatch metric filters configuration"
  type = map(object({
    name             = string
    log_group_name   = string
    pattern          = string
    metric_name      = string
    metric_namespace = string
    metric_value     = string
  }))
  default = {}
}

variable "cloudwatch_custom_alarms" {
  description = "Custom CloudWatch alarms"
  type = map(object({
    name                = string
    comparison_operator = string
    evaluation_periods  = number
    metric_name         = string
    namespace           = string
    period              = number
    statistic           = string
    threshold           = number
    description         = string
    alarm_actions       = optional(list(string), [])
    ok_actions          = optional(list(string), [])
    treat_missing_data  = optional(string, "missing")
    dimensions          = optional(map(string))
  }))
  default = {}
}

variable "create_cloudwatch_dashboard" {
  description = "Create CloudWatch dashboard"
  type        = bool
  default     = true
}

variable "create_log_insights_queries" {
  description = "Create CloudWatch Log Insights queries"
  type        = bool
  default     = true
}

# General Configuration
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}