# Root Terraform Configuration for NX Monorepo Template
# This is the main entry point for the infrastructure deployment

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }

  # Backend configuration for remote state
  # Uncomment and configure for production use
  # backend "s3" {
  #   bucket         = var.terraform_state_bucket
  #   key            = "terraform.tfstate"
  #   region         = var.aws_region
  #   encrypt        = true
  #   dynamodb_table = var.terraform_state_lock_table
  # }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region

  # Default tags applied to all resources
  default_tags {
    tags = {
      Environment   = var.environment
      Project       = var.project_name
      ManagedBy     = "terraform"
      Owner         = var.owner
      CostCenter    = var.cost_center
      Repository    = "nx-monorepo-template"
      TerraformRoot = "infrastructure/terraform"
    }
  }
}

# Data sources for account and region information
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# Local values for reuse across modules
locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Environment   = var.environment
    Project       = var.project_name
    ManagedBy     = "terraform"
    Owner         = var.owner
    CostCenter    = var.cost_center
    Repository    = "nx-monorepo-template"
    TerraformRoot = "infrastructure/terraform"
  }

  # Feature flags based on environment
  enable_high_availability = var.environment == "production"
  enable_cost_optimization = var.environment != "production"
  enable_advanced_monitoring = var.environment == "production"
  enable_encryption = var.environment == "production"
}

# Networking Module
module "networking" {
  source = "./modules/networking"

  name_prefix           = local.name_prefix
  vpc_cidr             = var.vpc_cidr
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs

  # Environment-specific configurations
  enable_nat_gateway   = var.enable_nat_gateway
  enable_vpc_endpoints = local.enable_high_availability

  common_tags = local.common_tags
}

# S3 Buckets
module "s3_assets" {
  source = "./modules/s3"
  count  = var.create_s3_buckets ? 1 : 0

  bucket_name        = "${local.name_prefix}-assets"
  versioning_enabled = var.s3_versioning_enabled
  force_destroy      = local.enable_cost_optimization

  # Security configuration
  sse_algorithm     = var.s3_encryption_enabled ? "aws:kms" : "AES256"
  kms_master_key_id = var.s3_encryption_enabled ? var.kms_key_arn : null

  # CORS for web applications
  cors_rules = var.s3_cors_rules

  # Lifecycle rules
  lifecycle_rules = var.s3_lifecycle_rules

  # CloudFront
  create_cloudfront_distribution = var.create_cloudfront_distribution
  cloudfront_aliases             = var.cloudfront_aliases
  cloudfront_acm_certificate_arn = var.cloudfront_certificate_arn
  cloudfront_price_class         = var.cloudfront_price_class

  common_tags = local.common_tags
}

# DynamoDB Tables
module "dynamodb_main" {
  source = "./modules/dynamodb"
  count  = var.create_dynamodb_tables ? 1 : 0

  table_name   = "${local.name_prefix}-main"
  billing_mode = var.dynamodb_billing_mode
  hash_key     = var.dynamodb_hash_key
  range_key    = var.dynamodb_range_key

  attributes                  = var.dynamodb_attributes
  global_secondary_indexes    = var.dynamodb_global_secondary_indexes
  local_secondary_indexes     = var.dynamodb_local_secondary_indexes

  # Environment-specific configurations
  deletion_protection_enabled    = local.enable_high_availability
  point_in_time_recovery_enabled = var.enable_point_in_time_recovery
  enable_continuous_backups      = local.enable_high_availability
  enable_cloudwatch_alarms       = var.enable_cloudwatch_alarms
  enable_autoscaling            = var.dynamodb_billing_mode == "PROVISIONED"

  # Encryption
  encryption_enabled = local.enable_encryption
  kms_key_id        = local.enable_encryption ? var.kms_key_arn : null

  # Streams and TTL
  stream_enabled     = var.dynamodb_stream_enabled
  stream_view_type   = var.dynamodb_stream_view_type
  ttl_enabled        = var.dynamodb_ttl_enabled
  ttl_attribute_name = var.dynamodb_ttl_attribute_name

  common_tags = local.common_tags
}

# Lambda Functions
module "lambda_api" {
  source = "./modules/lambda"
  count  = var.create_lambda_functions ? 1 : 0

  function_name = "${local.name_prefix}-api"
  description   = "API handler for ${var.environment} environment"
  handler       = var.lambda_handler
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size
  architectures = var.lambda_architectures

  # Source configuration
  source_code_path = var.lambda_source_path
  s3_bucket        = var.lambda_s3_bucket
  s3_key           = var.lambda_s3_key

  # VPC configuration
  vpc_config = var.lambda_vpc_enabled ? {
    subnet_ids         = module.networking.private_subnet_ids
    security_group_ids = [module.networking.lambda_security_group_id]
  } : null

  # Environment variables
  environment_variables = merge(
    var.lambda_environment_variables,
    {
      ENVIRONMENT = var.environment
      PROJECT_NAME = var.project_name
    }
  )

  # Secrets
  secrets = var.lambda_secrets

  # Permissions
  dynamodb_tables = var.create_dynamodb_tables ? [module.dynamodb_main[0].table_arn] : []
  s3_buckets      = var.create_s3_buckets ? [module.s3_assets[0].bucket_arn] : []
  custom_policy   = var.lambda_custom_policy

  # Monitoring and observability
  enable_dead_letter_queue = var.enable_lambda_dlq
  enable_xray_tracing     = local.enable_advanced_monitoring
  enable_error_alarm      = var.enable_cloudwatch_alarms
  enable_duration_alarm   = var.enable_cloudwatch_alarms
  log_retention_days      = var.log_retention_days

  # Performance
  reserved_concurrency   = var.lambda_reserved_concurrency
  provisioned_concurrency = var.lambda_provisioned_concurrency

  common_tags = local.common_tags
}

# API Gateway
module "api_gateway" {
  source = "./modules/api-gateway"
  count  = var.create_api_gateway ? 1 : 0

  api_name          = "${local.name_prefix}-api"
  api_description   = "API Gateway for ${var.environment} environment"
  stage_name        = var.api_gateway_stage_name
  lambda_invoke_arn = var.create_lambda_functions ? module.lambda_api[0].lambda_invoke_arn : var.existing_lambda_invoke_arn
  lambda_function_name = var.create_lambda_functions ? module.lambda_api[0].lambda_function_name : var.existing_lambda_function_name

  # Security
  authorization_type = var.api_gateway_authorization_type

  # CORS
  enable_cors   = var.api_gateway_enable_cors
  cors_origin   = var.api_gateway_cors_origin
  cors_headers  = var.api_gateway_cors_headers
  cors_methods  = var.api_gateway_cors_methods

  # Throttling
  throttle_rate_limit  = var.api_gateway_throttle_rate_limit
  throttle_burst_limit = var.api_gateway_throttle_burst_limit

  # API Key and usage plans
  create_api_key = var.api_gateway_create_api_key
  api_key_required = var.api_gateway_api_key_required
  usage_plan_quota_limit = var.api_gateway_usage_plan_quota_limit
  usage_plan_quota_period = var.api_gateway_usage_plan_quota_period

  # Monitoring
  enable_access_logging = var.enable_api_gateway_logging
  enable_xray_tracing   = local.enable_advanced_monitoring
  log_retention_days    = var.log_retention_days

  # Security
  waf_acl_arn = var.waf_acl_arn

  common_tags = local.common_tags
}

# ECS Cluster (optional)
module "ecs" {
  source = "./modules/ecs"
  count  = var.create_ecs_cluster ? 1 : 0

  cluster_name       = "${local.name_prefix}-cluster"
  cluster_kms_key_id = local.enable_encryption ? var.kms_key_arn : null
  vpc_id             = module.networking.vpc_id

  # Networking
  ecs_subnets           = module.networking.private_subnet_ids
  ecs_security_group_id = module.networking.ecs_security_group_id
  assign_public_ip      = var.ecs_assign_public_ip

  # Load Balancer
  create_load_balancer  = var.create_load_balancer
  load_balancer_subnets = module.networking.public_subnet_ids
  alb_security_group_id = module.networking.alb_security_group_id
  enable_deletion_protection = local.enable_high_availability
  alb_certificate_arn   = var.alb_certificate_arn

  # Capacity providers
  capacity_providers = var.ecs_capacity_providers
  default_capacity_provider_strategy = var.ecs_capacity_provider_strategy

  # ECR repositories
  ecr_repositories = var.ecr_repositories

  # Services
  services = var.ecs_services

  log_retention_days = var.log_retention_days

  common_tags = local.common_tags
}

# CloudWatch Monitoring
module "cloudwatch" {
  source = "./modules/cloudwatch"
  count  = var.enable_cloudwatch_monitoring ? 1 : 0

  environment      = var.environment
  application_name = var.project_name

  # Log groups
  log_groups = var.cloudwatch_log_groups

  # Metric filters
  metric_filters = var.cloudwatch_metric_filters

  # SNS notifications
  create_sns_topic      = var.create_sns_topic
  alert_email_addresses = var.alert_email_addresses
  alert_phone_numbers   = var.alert_phone_numbers

  # Default alarms
  enable_default_alarms   = var.enable_cloudwatch_alarms
  load_balancer_full_name = var.create_ecs_cluster && var.create_load_balancer ? module.ecs[0].load_balancer_arn_suffix : ""

  # Service monitoring
  ecs_services = var.create_ecs_cluster ? {
    for k, v in var.ecs_services : k => {
      service_name = k
      cluster_name = module.ecs[0].cluster_name
    }
  } : {}

  lambda_functions = var.create_lambda_functions ? {
    api = {
      function_name      = module.lambda_api[0].lambda_function_name
      duration_threshold = var.lambda_timeout * 1000 * 0.8 # 80% of timeout
    }
  } : {}

  dynamodb_tables = var.create_dynamodb_tables ? {
    main = {
      table_name = module.dynamodb_main[0].table_name
    }
  } : {}

  api_gateways = var.create_api_gateway ? {
    main = {
      api_name   = module.api_gateway[0].api_gateway_id
      stage_name = var.api_gateway_stage_name
    }
  } : {}

  # Custom alarms
  custom_alarms = var.cloudwatch_custom_alarms

  # Dashboard and insights
  create_dashboard            = var.create_cloudwatch_dashboard
  create_log_insights_queries = var.create_log_insights_queries

  common_tags = local.common_tags
}