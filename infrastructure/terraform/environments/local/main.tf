# Local Environment Configuration
# This configuration is designed to work with LocalStack for local development

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state - for production, use remote state
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "environments/local/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

# LocalStack provider configuration
provider "aws" {
  region                      = var.aws_region
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    apigateway     = "http://localhost:4566"
    cloudformation = "http://localhost:4566"
    cloudwatch     = "http://localhost:4566"
    dynamodb       = "http://localhost:4566"
    ec2            = "http://localhost:4566"
    ecs            = "http://localhost:4566"
    iam            = "http://localhost:4566"
    lambda         = "http://localhost:4566"
    logs           = "http://localhost:4566"
    s3             = "http://localhost:4566"
    secretsmanager = "http://localhost:4566"
    sns            = "http://localhost:4566"
    sqs            = "http://localhost:4566"
    ssm            = "http://localhost:4566"
    sts            = "http://localhost:4566"
  }
}

# Local variables
locals {
  environment = "local"
  name_prefix = "${var.project_name}-${local.environment}"

  common_tags = {
    Environment = local.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
    Purpose     = "local-development"
  }
}

# Networking Module
module "networking" {
  source = "../../modules/networking"

  name_prefix           = local.name_prefix
  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24"]

  # Cost optimization for local environment
  enable_nat_gateway   = false # No internet access needed for containers in local
  enable_vpc_endpoints = false

  common_tags = local.common_tags
}

# S3 Bucket for application assets
module "s3_assets" {
  source = "../../modules/s3"

  bucket_name        = "${local.name_prefix}-assets"
  versioning_enabled = false # Simplified for local development
  force_destroy      = true  # Allow destruction for local cleanup

  # Public access for local development
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false

  # CORS for local development
  cors_rules = [
    {
      allowed_headers = ["*"]
      allowed_methods = ["GET", "POST", "PUT", "DELETE", "HEAD"]
      allowed_origins = ["http://localhost:3000", "http://localhost:4200"]
      max_age_seconds = 3000
    }
  ]

  # Simple lifecycle rule for local cleanup
  lifecycle_rules = [
    {
      id      = "cleanup"
      enabled = true
      expiration = {
        days = 7 # Clean up old files after 7 days
      }
    }
  ]

  common_tags = local.common_tags
}

# DynamoDB Tables
module "dynamodb_users" {
  source = "../../modules/dynamodb"

  table_name   = "${local.name_prefix}-users"
  billing_mode = "PAY_PER_REQUEST" # Simpler for local development
  hash_key     = "user_id"
  range_key    = "created_at"

  attributes = [
    {
      name = "user_id"
      type = "S"
    },
    {
      name = "created_at"
      type = "S"
    },
    {
      name = "email"
      type = "S"
    }
  ]

  global_secondary_indexes = {
    email_index = {
      name        = "email-index"
      hash_key    = "email"
      projection_type = "ALL"
    }
  }

  # Simplified settings for local development
  deletion_protection_enabled    = false
  point_in_time_recovery_enabled = false
  enable_continuous_backups      = false
  enable_cloudwatch_alarms       = false
  ttl_enabled                   = true
  ttl_attribute_name            = "expires_at"

  common_tags = local.common_tags
}

# Lambda Function
module "lambda_api" {
  source = "../../modules/lambda"

  function_name = "${local.name_prefix}-api"
  description   = "API handler for local development"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 30
  memory_size   = 256

  # For local development, you might build the function locally
  source_code_path = var.lambda_source_path != "" ? var.lambda_source_path : null

  environment_variables = {
    NODE_ENV        = "development"
    DYNAMODB_TABLE  = module.dynamodb_users.table_name
    S3_BUCKET       = module.s3_assets.bucket_name
    AWS_ENDPOINT    = "http://localhost:4566" # LocalStack endpoint
  }

  # Grant access to DynamoDB and S3
  dynamodb_tables = [module.dynamodb_users.table_arn]
  s3_buckets      = [module.s3_assets.bucket_arn]

  # Simplified settings for local development
  enable_dead_letter_queue = false
  enable_xray_tracing     = false
  enable_error_alarm      = false
  enable_duration_alarm   = false

  common_tags = local.common_tags
}

# API Gateway
module "api_gateway" {
  source = "../../modules/api-gateway"

  api_name          = "${local.name_prefix}-api"
  api_description   = "API Gateway for local development"
  stage_name        = "dev"
  lambda_invoke_arn = module.lambda_api.lambda_invoke_arn
  lambda_function_name = module.lambda_api.lambda_function_name

  # CORS enabled for local development
  enable_cors   = true
  cors_origin   = "*"
  cors_headers  = ["Content-Type", "X-Amz-Date", "Authorization", "X-Api-Key"]
  cors_methods  = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]

  # Relaxed throttling for local development
  throttle_rate_limit  = 10000
  throttle_burst_limit = 5000

  # Simplified settings for local development
  create_api_key        = false
  enable_access_logging = false
  enable_xray_tracing   = false

  common_tags = local.common_tags
}

# CloudWatch for basic monitoring
module "cloudwatch" {
  source = "../../modules/cloudwatch"

  environment      = local.environment
  application_name = var.project_name

  # Basic log groups for local development
  log_groups = {
    lambda_api = {
      name           = "/aws/lambda/${module.lambda_api.lambda_function_name}"
      retention_days = 3 # Short retention for local
    }
    api_gateway = {
      name           = "/aws/apigateway/${module.api_gateway.api_gateway_id}"
      retention_days = 3
    }
  }

  # Lambda monitoring
  lambda_functions = {
    api = {
      function_name      = module.lambda_api.lambda_function_name
      duration_threshold = 10000
    }
  }

  # API Gateway monitoring
  api_gateways = {
    main = {
      api_name   = module.api_gateway.api_gateway_id
      stage_name = "dev"
    }
  }

  # Simplified monitoring for local development
  create_sns_topic            = false
  enable_default_alarms       = false
  create_dashboard            = false
  create_log_insights_queries = false

  common_tags = local.common_tags
}

# ECS Cluster (simplified for local development)
module "ecs" {
  source = "../../modules/ecs"

  cluster_name = "${local.name_prefix}-cluster"
  vpc_id       = module.networking.vpc_id

  # Use public subnets for simplicity in local development
  ecs_subnets           = module.networking.public_subnet_ids
  ecs_security_group_id = module.networking.ecs_security_group_id
  assign_public_ip      = true

  # Simplified load balancer setup
  create_load_balancer  = true
  load_balancer_subnets = module.networking.public_subnet_ids
  alb_security_group_id = module.networking.alb_security_group_id

  # Simple ECR repository
  ecr_repositories = {
    web_app = {
      name            = "${local.name_prefix}/web"
      max_image_count = 3 # Keep only a few images locally
      scan_on_push    = false # Disable scanning for local development
    }
  }

  # Basic web service
  services = {
    web = {
      ecr_repository = "web_app"
      image_tag      = "latest"
      cpu            = 256
      memory         = 512
      container_port = 3000
      desired_count  = 1

      health_check = {
        path                = "/health"
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout             = 5
        interval           = 30
        matcher            = "200"
      }

      autoscaling = {
        min_capacity     = 1
        max_capacity     = 2 # Limited scaling for local
        cpu_target_value = 80
        memory_target_value = 80
      }

      environment_variables = {
        NODE_ENV    = "development"
        API_URL     = module.api_gateway.api_gateway_url
        S3_BUCKET   = module.s3_assets.bucket_name
        AWS_ENDPOINT = "http://localhost:4566"
      }
    }
  }

  # Short log retention for local development
  log_retention_days = 1

  common_tags = local.common_tags
}