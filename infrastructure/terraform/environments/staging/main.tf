# Staging Environment Configuration
# This configuration is optimized for cost while maintaining production-like features

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state configuration
  backend "s3" {
    # bucket = "your-terraform-state-bucket"
    # key    = "environments/staging/terraform.tfstate"
    # region = "us-east-1"
    # encrypt = true
    # dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "staging"
      Project     = var.project_name
      ManagedBy   = "terraform"
      Purpose     = "staging-environment"
    }
  }
}

# Local variables
locals {
  environment = "staging"
  name_prefix = "${var.project_name}-${local.environment}"

  common_tags = {
    Environment = local.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
    Purpose     = "staging-environment"
    CostCenter  = var.cost_center
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# Networking Module
module "networking" {
  source = "../../modules/networking"

  name_prefix           = local.name_prefix
  vpc_cidr             = "10.1.0.0/16"
  public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24"]
  private_subnet_cidrs = ["10.1.10.0/24", "10.1.20.0/24"]

  # Cost optimization: Single NAT Gateway
  enable_nat_gateway   = true
  enable_vpc_endpoints = false # Disable for cost savings

  common_tags = local.common_tags
}

# S3 Buckets
module "s3_assets" {
  source = "../../modules/s3"

  bucket_name        = "${local.name_prefix}-assets"
  versioning_enabled = true
  force_destroy      = false

  # Security settings
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  # CORS for web applications
  cors_rules = [
    {
      allowed_headers = ["*"]
      allowed_methods = ["GET", "POST", "PUT", "DELETE", "HEAD"]
      allowed_origins = var.allowed_origins
      max_age_seconds = 3000
    }
  ]

  # Lifecycle rules for cost optimization
  lifecycle_rules = [
    {
      id      = "transition_to_ia"
      enabled = true
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
    },
    {
      id      = "delete_old_versions"
      enabled = true
      noncurrent_version_expiration = {
        days = 90
      }
    }
  ]

  # CloudFront for better performance
  create_cloudfront_distribution = true
  cloudfront_price_class         = "PriceClass_100" # US and Europe only
  cloudfront_aliases             = var.cloudfront_aliases

  common_tags = local.common_tags
}

module "s3_logs" {
  source = "../../modules/s3"

  bucket_name        = "${local.name_prefix}-logs"
  versioning_enabled = false
  force_destroy      = true

  # Lifecycle rules for log cleanup
  lifecycle_rules = [
    {
      id      = "delete_old_logs"
      enabled = true
      expiration = {
        days = 30
      }
    }
  ]

  common_tags = local.common_tags
}

# DynamoDB Tables
module "dynamodb_users" {
  source = "../../modules/dynamodb"

  table_name   = "${local.name_prefix}-users"
  billing_mode = "PAY_PER_REQUEST" # Better for staging workloads
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
    },
    {
      name = "status"
      type = "S"
    }
  ]

  global_secondary_indexes = {
    email_index = {
      name            = "email-index"
      hash_key        = "email"
      projection_type = "ALL"
    }
    status_index = {
      name            = "status-index"
      hash_key        = "status"
      range_key       = "created_at"
      projection_type = "KEYS_ONLY"
    }
  }

  # Production-like features but cost optimized
  deletion_protection_enabled    = false # Allow deletion in staging
  point_in_time_recovery_enabled = true
  enable_continuous_backups      = false # Disable for cost savings
  enable_cloudwatch_alarms       = true
  ttl_enabled                   = true
  ttl_attribute_name            = "expires_at"
  stream_enabled                = true
  stream_view_type              = "NEW_AND_OLD_IMAGES"

  common_tags = local.common_tags
}

module "dynamodb_sessions" {
  source = "../../modules/dynamodb"

  table_name   = "${local.name_prefix}-sessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "session_id"

  attributes = [
    {
      name = "session_id"
      type = "S"
    }
  ]

  # Session-specific settings
  ttl_enabled                   = true
  ttl_attribute_name            = "expires_at"
  deletion_protection_enabled   = false
  point_in_time_recovery_enabled = false
  enable_cloudwatch_alarms      = false

  common_tags = local.common_tags
}

# Lambda Functions
module "lambda_api" {
  source = "../../modules/lambda"

  function_name = "${local.name_prefix}-api"
  description   = "API handler for staging environment"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 30
  memory_size   = 512
  architectures = ["arm64"] # Cost optimization

  # Deploy from S3
  s3_bucket = var.lambda_deployment_bucket
  s3_key    = var.lambda_deployment_key

  vpc_config = {
    subnet_ids         = module.networking.private_subnet_ids
    security_group_ids = [module.networking.lambda_security_group_id]
  }

  environment_variables = {
    NODE_ENV           = "staging"
    DYNAMODB_TABLE     = module.dynamodb_users.table_name
    SESSION_TABLE      = module.dynamodb_sessions.table_name
    S3_BUCKET          = module.s3_assets.bucket_name
    CLOUDFRONT_DOMAIN  = module.s3_assets.cloudfront_distribution_domain_name
    LOG_LEVEL          = "info"
  }

  # Grant necessary permissions
  dynamodb_tables = [
    module.dynamodb_users.table_arn,
    module.dynamodb_sessions.table_arn
  ]
  s3_buckets = [module.s3_assets.bucket_arn]

  # Monitoring settings
  enable_dead_letter_queue = true
  enable_xray_tracing     = true
  enable_error_alarm      = true
  enable_duration_alarm   = true
  log_retention_days      = 14

  common_tags = local.common_tags
}

module "lambda_processor" {
  source = "../../modules/lambda"

  function_name = "${local.name_prefix}-processor"
  description   = "Background processor for staging"
  handler       = "processor.handler"
  runtime       = "nodejs18.x"
  timeout       = 300
  memory_size   = 1024
  architectures = ["arm64"]

  s3_bucket = var.lambda_deployment_bucket
  s3_key    = var.lambda_processor_deployment_key

  environment_variables = {
    NODE_ENV      = "staging"
    DYNAMODB_TABLE = module.dynamodb_users.table_name
    S3_BUCKET     = module.s3_assets.bucket_name
  }

  dynamodb_tables = [module.dynamodb_users.table_arn]
  s3_buckets      = [module.s3_assets.bucket_arn]

  enable_dead_letter_queue = true
  log_retention_days       = 7

  common_tags = local.common_tags
}

# API Gateway
module "api_gateway" {
  source = "../../modules/api-gateway"

  api_name          = "${local.name_prefix}-api"
  api_description   = "API Gateway for staging environment"
  stage_name        = "v1"
  lambda_invoke_arn = module.lambda_api.lambda_invoke_arn
  lambda_function_name = module.lambda_api.lambda_function_name

  # CORS configuration
  enable_cors   = true
  cors_origin   = var.cors_origin
  cors_headers  = ["Content-Type", "X-Amz-Date", "Authorization", "X-Api-Key"]
  cors_methods  = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]

  # Throttling (relaxed for staging)
  throttle_rate_limit  = 5000
  throttle_burst_limit = 2500

  # API Key and usage plan
  create_api_key               = true
  usage_plan_quota_limit       = 100000
  usage_plan_quota_period      = "MONTH"
  usage_plan_throttle_rate_limit  = 1000
  usage_plan_throttle_burst_limit = 2000

  # Monitoring
  enable_access_logging = true
  enable_xray_tracing   = true
  log_retention_days    = 14

  common_tags = local.common_tags
}

# ECS Cluster
module "ecs" {
  source = "../../modules/ecs"

  cluster_name = "${local.name_prefix}-cluster"
  vpc_id       = module.networking.vpc_id

  # Networking
  ecs_subnets           = module.networking.private_subnet_ids
  ecs_security_group_id = module.networking.ecs_security_group_id

  # Load Balancer
  create_load_balancer  = true
  load_balancer_subnets = module.networking.public_subnet_ids
  alb_security_group_id = module.networking.alb_security_group_id
  alb_access_logs_enabled = true
  alb_access_logs_bucket  = module.s3_logs.bucket_name
  alb_certificate_arn     = var.acm_certificate_arn

  # Cost optimization: Use Fargate Spot
  default_capacity_provider_strategy = [
    {
      capacity_provider = "FARGATE_SPOT"
      weight           = 2
      base             = 0
    },
    {
      capacity_provider = "FARGATE"
      weight           = 1
      base             = 1
    }
  ]

  # ECR Repositories
  ecr_repositories = {
    web_app = {
      name            = "${local.name_prefix}/web"
      max_image_count = 10
      scan_on_push    = true
    }
    api_service = {
      name            = "${local.name_prefix}/api"
      max_image_count = 15
      scan_on_push    = true
    }
  }

  # Services
  services = {
    web = {
      ecr_repository = "web_app"
      image_tag      = var.web_image_tag
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
        min_capacity              = 1
        max_capacity              = 3
        cpu_target_value          = 70
        memory_target_value       = 80
        request_count_target_value = 500
      }

      listener_rule_priority = 100
      path_patterns         = ["/", "/static/*"]

      environment_variables = {
        NODE_ENV      = "staging"
        API_URL       = module.api_gateway.api_gateway_url
        CLOUDFRONT_URL = "https://${module.s3_assets.cloudfront_distribution_domain_name}"
      }
    }

    api = {
      ecr_repository = "api_service"
      image_tag      = var.api_image_tag
      cpu            = 512
      memory         = 1024
      container_port = 8080
      desired_count  = 1

      health_check = {
        path                = "/api/health"
        healthy_threshold   = 2
        unhealthy_threshold = 5
        timeout             = 10
        interval           = 30
        matcher            = "200"
      }

      autoscaling = {
        min_capacity     = 1
        max_capacity     = 4
        cpu_target_value = 70
        memory_target_value = 80
      }

      listener_rule_priority = 200
      path_patterns         = ["/api/*"]

      environment_variables = {
        NODE_ENV          = "staging"
        DYNAMODB_TABLE    = module.dynamodb_users.table_name
        SESSION_TABLE     = module.dynamodb_sessions.table_name
        S3_BUCKET         = module.s3_assets.bucket_name
      }

      secrets = {
        DATABASE_PASSWORD = var.database_password_arn
        JWT_SECRET       = var.jwt_secret_arn
      }

      task_role_policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect = "Allow"
            Action = [
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:DeleteItem",
              "dynamodb:Query",
              "dynamodb:Scan"
            ]
            Resource = [
              module.dynamodb_users.table_arn,
              "${module.dynamodb_users.table_arn}/index/*",
              module.dynamodb_sessions.table_arn
            ]
          },
          {
            Effect = "Allow"
            Action = [
              "s3:GetObject",
              "s3:PutObject",
              "s3:DeleteObject"
            ]
            Resource = "${module.s3_assets.bucket_arn}/*"
          }
        ]
      })
    }
  }

  log_retention_days = 14

  common_tags = local.common_tags
}

# CloudWatch Monitoring
module "cloudwatch" {
  source = "../../modules/cloudwatch"

  environment      = local.environment
  application_name = var.project_name

  # Log groups
  log_groups = {
    lambda_api = {
      name           = "/aws/lambda/${module.lambda_api.lambda_function_name}"
      retention_days = 14
    }
    lambda_processor = {
      name           = "/aws/lambda/${module.lambda_processor.lambda_function_name}"
      retention_days = 7
    }
    api_gateway = {
      name           = "/aws/apigateway/${module.api_gateway.api_gateway_id}"
      retention_days = 14
    }
    ecs_web = {
      name           = "/aws/ecs/${module.ecs.cluster_name}/web"
      retention_days = 14
    }
    ecs_api = {
      name           = "/aws/ecs/${module.ecs.cluster_name}/api"
      retention_days = 14
    }
  }

  # Metric filters
  metric_filters = {
    api_errors = {
      name             = "APIErrors"
      log_group_name   = "/aws/lambda/${module.lambda_api.lambda_function_name}"
      pattern          = "[timestamp, request_id, \"ERROR\"]"
      metric_name      = "APIErrorCount"
      metric_namespace = "${var.project_name}/API"
      metric_value     = "1"
    }
  }

  # SNS notifications
  create_sns_topic      = true
  alert_email_addresses = var.alert_email_addresses

  # Service monitoring
  load_balancer_full_name = module.ecs.load_balancer_arn_suffix
  error_rate_threshold    = 5
  response_time_threshold = 2

  # ECS monitoring
  ecs_services = {
    web = {
      service_name = "web"
      cluster_name = module.ecs.cluster_name
    }
    api = {
      service_name = "api"
      cluster_name = module.ecs.cluster_name
    }
  }

  # Lambda monitoring
  lambda_functions = {
    api = {
      function_name      = module.lambda_api.lambda_function_name
      duration_threshold = 10000
    }
    processor = {
      function_name      = module.lambda_processor.lambda_function_name
      duration_threshold = 30000
    }
  }

  # DynamoDB monitoring
  dynamodb_tables = {
    users = {
      table_name = module.dynamodb_users.table_name
    }
  }

  # API Gateway monitoring
  api_gateways = {
    main = {
      api_name   = module.api_gateway.api_gateway_id
      stage_name = "v1"
    }
  }

  # Dashboard and insights
  create_dashboard            = true
  create_log_insights_queries = true

  common_tags = local.common_tags
}