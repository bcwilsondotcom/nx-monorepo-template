# Production Environment Configuration
# This configuration is optimized for high availability, security, and performance

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
    # key    = "environments/production/terraform.tfstate"
    # region = "us-east-1"
    # encrypt = true
    # dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "production"
      Project     = var.project_name
      ManagedBy   = "terraform"
      Purpose     = "production-environment"
    }
  }
}

# Local variables
locals {
  environment = "production"
  name_prefix = "${var.project_name}-${local.environment}"

  common_tags = {
    Environment = local.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
    Purpose     = "production-environment"
    CostCenter  = var.cost_center
    Compliance  = "required"
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# KMS Key for encryption
resource "aws_kms_key" "main" {
  description             = "KMS key for ${local.name_prefix}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = local.common_tags
}

resource "aws_kms_alias" "main" {
  name          = "alias/${local.name_prefix}"
  target_key_id = aws_kms_key.main.key_id
}

# Networking Module - Multi-AZ for high availability
module "networking" {
  source = "../../modules/networking"

  name_prefix           = local.name_prefix
  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24", "10.0.30.0/24"]

  # Production settings
  enable_nat_gateway   = true
  enable_vpc_endpoints = true # Enable for security and performance

  common_tags = local.common_tags
}

# S3 Buckets with enterprise features
module "s3_assets" {
  source = "../../modules/s3"

  bucket_name        = "${local.name_prefix}-assets"
  versioning_enabled = true
  force_destroy      = false

  # Enhanced security
  sse_algorithm      = "aws:kms"
  kms_master_key_id  = aws_kms_key.main.arn
  bucket_key_enabled = true

  # Strict security settings
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  # CORS for web applications
  cors_rules = [
    {
      allowed_headers = ["Content-Type", "Content-MD5", "Authorization"]
      allowed_methods = ["GET", "HEAD"]
      allowed_origins = var.allowed_origins
      max_age_seconds = 3600
    }
  ]

  # Comprehensive lifecycle rules
  lifecycle_rules = [
    {
      id      = "intelligent_tiering"
      enabled = true
      transitions = [
        {
          days          = 0
          storage_class = "INTELLIGENT_TIERING"
        }
      ]
    },
    {
      id      = "archive_old_versions"
      enabled = true
      noncurrent_version_transitions = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        },
        {
          days          = 365
          storage_class = "DEEP_ARCHIVE"
        }
      ]
    },
    {
      id      = "delete_very_old_versions"
      enabled = true
      noncurrent_version_expiration = {
        days = 2555 # 7 years
      }
    }
  ]

  # CloudFront for global distribution
  create_cloudfront_distribution = true
  cloudfront_price_class         = "PriceClass_All" # Global distribution
  cloudfront_aliases             = var.cloudfront_aliases
  cloudfront_acm_certificate_arn = var.cloudfront_certificate_arn

  # Access logging
  access_logging_enabled = true

  common_tags = local.common_tags
}

module "s3_logs" {
  source = "../../modules/s3"

  bucket_name        = "${local.name_prefix}-logs"
  versioning_enabled = true
  force_destroy      = false

  # Encryption for logs
  sse_algorithm     = "aws:kms"
  kms_master_key_id = aws_kms_key.main.arn

  # Lifecycle rules for log retention
  lifecycle_rules = [
    {
      id      = "log_retention"
      enabled = true
      transitions = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        },
        {
          days          = 365
          storage_class = "DEEP_ARCHIVE"
        }
      ]
      expiration = {
        days = var.log_retention_years * 365
      }
    }
  ]

  common_tags = local.common_tags
}

module "s3_backups" {
  source = "../../modules/s3"

  bucket_name        = "${local.name_prefix}-backups"
  versioning_enabled = true
  force_destroy      = false

  # Enhanced encryption for backups
  sse_algorithm     = "aws:kms"
  kms_master_key_id = aws_kms_key.main.arn

  # Backup-specific lifecycle rules
  lifecycle_rules = [
    {
      id      = "backup_retention"
      enabled = true
      transitions = [
        {
          days          = 1
          storage_class = "GLACIER"
        },
        {
          days          = 90
          storage_class = "DEEP_ARCHIVE"
        }
      ]
      expiration = {
        days = var.backup_retention_years * 365
      }
    }
  ]

  common_tags = local.common_tags
}

# DynamoDB Tables with enterprise features
module "dynamodb_users" {
  source = "../../modules/dynamodb"

  table_name   = "${local.name_prefix}-users"
  billing_mode = var.dynamodb_billing_mode
  hash_key     = "user_id"
  range_key    = "created_at"

  # Provisioned capacity (if not on-demand)
  read_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? 20 : null
  write_capacity = var.dynamodb_billing_mode == "PROVISIONED" ? 20 : null

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
    },
    {
      name = "organization_id"
      type = "S"
    }
  ]

  global_secondary_indexes = {
    email_index = {
      name               = "email-index"
      hash_key           = "email"
      projection_type    = "ALL"
      read_capacity      = var.dynamodb_billing_mode == "PROVISIONED" ? 10 : null
      write_capacity     = var.dynamodb_billing_mode == "PROVISIONED" ? 10 : null
    }
    status_index = {
      name               = "status-index"
      hash_key           = "status"
      range_key          = "created_at"
      projection_type    = "KEYS_ONLY"
      read_capacity      = var.dynamodb_billing_mode == "PROVISIONED" ? 5 : null
      write_capacity     = var.dynamodb_billing_mode == "PROVISIONED" ? 5 : null
    }
    organization_index = {
      name               = "organization-index"
      hash_key           = "organization_id"
      range_key          = "created_at"
      projection_type    = "ALL"
      read_capacity      = var.dynamodb_billing_mode == "PROVISIONED" ? 10 : null
      write_capacity     = var.dynamodb_billing_mode == "PROVISIONED" ? 10 : null
    }
  }

  # Production settings
  deletion_protection_enabled    = true
  point_in_time_recovery_enabled = true
  enable_continuous_backups      = true
  enable_cloudwatch_alarms       = true
  enable_autoscaling            = var.dynamodb_billing_mode == "PROVISIONED"

  # Enhanced settings
  encryption_enabled = true
  kms_key_id        = aws_kms_key.main.arn
  stream_enabled    = true
  stream_view_type  = "NEW_AND_OLD_IMAGES"
  ttl_enabled       = true
  ttl_attribute_name = "expires_at"

  # Auto scaling settings
  autoscaling_read_min_capacity  = 20
  autoscaling_read_max_capacity  = 1000
  autoscaling_write_min_capacity = 20
  autoscaling_write_max_capacity = 1000

  backup_schedule = "cron(0 3 * * ? *)" # Daily backup at 3 AM

  common_tags = local.common_tags
}

module "dynamodb_sessions" {
  source = "../../modules/dynamodb"

  table_name   = "${local.name_prefix}-sessions"
  billing_mode = "PAY_PER_REQUEST" # Sessions are typically unpredictable
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
  deletion_protection_enabled   = true
  point_in_time_recovery_enabled = true
  enable_cloudwatch_alarms      = true
  encryption_enabled           = true
  kms_key_id                   = aws_kms_key.main.arn

  common_tags = local.common_tags
}

module "dynamodb_audit_logs" {
  source = "../../modules/dynamodb"

  table_name   = "${local.name_prefix}-audit-logs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "log_id"
  range_key    = "timestamp"

  attributes = [
    {
      name = "log_id"
      type = "S"
    },
    {
      name = "timestamp"
      type = "S"
    },
    {
      name = "user_id"
      type = "S"
    },
    {
      name = "action_type"
      type = "S"
    }
  ]

  global_secondary_indexes = {
    user_index = {
      name            = "user-index"
      hash_key        = "user_id"
      range_key       = "timestamp"
      projection_type = "ALL"
    }
    action_index = {
      name            = "action-index"
      hash_key        = "action_type"
      range_key       = "timestamp"
      projection_type = "KEYS_ONLY"
    }
  }

  # Audit log settings
  deletion_protection_enabled    = true
  point_in_time_recovery_enabled = true
  enable_continuous_backups      = true
  encryption_enabled             = true
  kms_key_id                     = aws_kms_key.main.arn

  # Long retention for audit logs
  ttl_enabled        = true
  ttl_attribute_name = "expires_at"

  common_tags = local.common_tags
}

# Lambda Functions with enterprise features
module "lambda_api" {
  source = "../../modules/lambda"

  function_name = "${local.name_prefix}-api"
  description   = "API handler for production environment"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 30
  memory_size   = 1024
  architectures = ["x86_64"] # Use x86_64 for consistent performance

  # Deploy from S3
  s3_bucket = var.lambda_deployment_bucket
  s3_key    = var.lambda_deployment_key

  vpc_config = {
    subnet_ids         = module.networking.private_subnet_ids
    security_group_ids = [module.networking.lambda_security_group_id]
  }

  environment_variables = {
    NODE_ENV           = "production"
    DYNAMODB_TABLE     = module.dynamodb_users.table_name
    SESSION_TABLE      = module.dynamodb_sessions.table_name
    AUDIT_TABLE        = module.dynamodb_audit_logs.table_name
    S3_BUCKET          = module.s3_assets.bucket_name
    CLOUDFRONT_DOMAIN  = module.s3_assets.cloudfront_distribution_domain_name
    LOG_LEVEL          = "warn"
    KMS_KEY_ID         = aws_kms_key.main.key_id
  }

  # Grant necessary permissions
  dynamodb_tables = [
    module.dynamodb_users.table_arn,
    module.dynamodb_sessions.table_arn,
    module.dynamodb_audit_logs.table_arn
  ]
  s3_buckets = [module.s3_assets.bucket_arn]

  # Production monitoring
  enable_dead_letter_queue = true
  enable_xray_tracing     = true
  enable_error_alarm      = true
  enable_duration_alarm   = true
  log_retention_days      = 30

  # Performance optimization
  reserved_concurrency   = 100
  provisioned_concurrency = 10

  common_tags = local.common_tags
}

module "lambda_processor" {
  source = "../../modules/lambda"

  function_name = "${local.name_prefix}-processor"
  description   = "Background processor for production"
  handler       = "processor.handler"
  runtime       = "nodejs18.x"
  timeout       = 900 # 15 minutes for batch processing
  memory_size   = 3008 # Maximum memory for performance
  architectures = ["x86_64"]

  s3_bucket = var.lambda_deployment_bucket
  s3_key    = var.lambda_processor_deployment_key

  vpc_config = {
    subnet_ids         = module.networking.private_subnet_ids
    security_group_ids = [module.networking.lambda_security_group_id]
  }

  environment_variables = {
    NODE_ENV      = "production"
    DYNAMODB_TABLE = module.dynamodb_users.table_name
    AUDIT_TABLE   = module.dynamodb_audit_logs.table_name
    S3_BUCKET     = module.s3_assets.bucket_name
    BACKUP_BUCKET = module.s3_backups.bucket_name
    KMS_KEY_ID    = aws_kms_key.main.key_id
  }

  dynamodb_tables = [
    module.dynamodb_users.table_arn,
    module.dynamodb_audit_logs.table_arn
  ]
  s3_buckets = [
    module.s3_assets.bucket_arn,
    module.s3_backups.bucket_arn
  ]

  enable_dead_letter_queue = true
  enable_xray_tracing     = true
  log_retention_days      = 30

  common_tags = local.common_tags
}

# API Gateway with enterprise features
module "api_gateway" {
  source = "../../modules/api-gateway"

  api_name          = "${local.name_prefix}-api"
  api_description   = "API Gateway for production environment"
  stage_name        = "v1"
  lambda_invoke_arn = module.lambda_api.lambda_invoke_arn
  lambda_function_name = module.lambda_api.lambda_function_name

  # Security settings
  authorization_type = "AWS_IAM" # Consider using Cognito for production

  # CORS configuration
  enable_cors   = true
  cors_origin   = var.cors_origin
  cors_headers  = ["Content-Type", "X-Amz-Date", "Authorization", "X-Api-Key"]
  cors_methods  = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]

  # Production throttling
  throttle_rate_limit  = 10000
  throttle_burst_limit = 5000

  # API Key and usage plans
  create_api_key               = true
  api_key_required             = true
  usage_plan_quota_limit       = 1000000
  usage_plan_quota_period      = "MONTH"
  usage_plan_throttle_rate_limit  = 5000
  usage_plan_throttle_burst_limit = 10000

  # Monitoring
  enable_access_logging = true
  enable_xray_tracing   = true
  log_retention_days    = 30

  # Security
  waf_acl_arn = var.waf_acl_arn

  common_tags = local.common_tags
}

# ECS Cluster with enterprise features
module "ecs" {
  source = "../../modules/ecs"

  cluster_name       = "${local.name_prefix}-cluster"
  cluster_kms_key_id = aws_kms_key.main.arn
  vpc_id             = module.networking.vpc_id

  # High availability networking
  ecs_subnets           = module.networking.private_subnet_ids
  ecs_security_group_id = module.networking.ecs_security_group_id

  # Load Balancer with full features
  create_load_balancer     = true
  load_balancer_subnets    = module.networking.public_subnet_ids
  alb_security_group_id    = module.networking.alb_security_group_id
  enable_deletion_protection = true
  alb_access_logs_enabled  = true
  alb_access_logs_bucket   = module.s3_logs.bucket_name
  alb_listener_port        = 443
  alb_listener_protocol    = "HTTPS"
  alb_certificate_arn      = var.alb_certificate_arn

  # Production capacity strategy (prefer regular Fargate for consistency)
  default_capacity_provider_strategy = [
    {
      capacity_provider = "FARGATE"
      weight           = 4
      base             = 2
    },
    {
      capacity_provider = "FARGATE_SPOT"
      weight           = 1
      base             = 0
    }
  ]

  # ECR Repositories with enhanced security
  ecr_repositories = {
    web_app = {
      name            = "${local.name_prefix}/web"
      max_image_count = 50
      scan_on_push    = true
      encryption_type = "KMS"
      kms_key         = aws_kms_key.main.arn
    }
    api_service = {
      name            = "${local.name_prefix}/api"
      max_image_count = 50
      scan_on_push    = true
      encryption_type = "KMS"
      kms_key         = aws_kms_key.main.arn
    }
    worker_service = {
      name            = "${local.name_prefix}/worker"
      max_image_count = 30
      scan_on_push    = true
      encryption_type = "KMS"
      kms_key         = aws_kms_key.main.arn
    }
  }

  # Production services with high availability
  services = {
    web = {
      ecr_repository = "web_app"
      image_tag      = var.web_image_tag
      cpu            = 512
      memory         = 1024
      container_port = 3000
      desired_count  = 3 # Multi-AZ deployment

      health_check = {
        path                = "/health"
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout             = 5
        interval           = 30
        matcher            = "200"
      }

      autoscaling = {
        min_capacity              = 3
        max_capacity              = 50
        cpu_target_value          = 60
        memory_target_value       = 70
        request_count_target_value = 1000
      }

      listener_rule_priority = 100
      path_patterns         = ["/", "/static/*", "/assets/*"]

      environment_variables = {
        NODE_ENV       = "production"
        API_URL        = module.api_gateway.api_gateway_url
        CLOUDFRONT_URL = "https://${module.s3_assets.cloudfront_distribution_domain_name}"
        LOG_LEVEL      = "warn"
      }
    }

    api = {
      ecr_repository = "api_service"
      image_tag      = var.api_image_tag
      cpu            = 1024
      memory         = 2048
      container_port = 8080
      desired_count  = 3

      health_check = {
        path                = "/api/health"
        healthy_threshold   = 2
        unhealthy_threshold = 5
        timeout             = 10
        interval           = 30
        matcher            = "200"
      }

      autoscaling = {
        min_capacity     = 3
        max_capacity     = 20
        cpu_target_value = 60
        memory_target_value = 70
      }

      listener_rule_priority = 200
      path_patterns         = ["/api/*"]

      environment_variables = {
        NODE_ENV          = "production"
        DYNAMODB_TABLE    = module.dynamodb_users.table_name
        SESSION_TABLE     = module.dynamodb_sessions.table_name
        AUDIT_TABLE       = module.dynamodb_audit_logs.table_name
        S3_BUCKET         = module.s3_assets.bucket_name
        KMS_KEY_ID        = aws_kms_key.main.key_id
        LOG_LEVEL         = "warn"
      }

      secrets = {
        DATABASE_PASSWORD = var.database_password_arn
        JWT_SECRET       = var.jwt_secret_arn
        API_KEYS         = var.api_keys_arn
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
              "dynamodb:Scan",
              "dynamodb:BatchGetItem",
              "dynamodb:BatchWriteItem"
            ]
            Resource = [
              module.dynamodb_users.table_arn,
              "${module.dynamodb_users.table_arn}/index/*",
              module.dynamodb_sessions.table_arn,
              module.dynamodb_audit_logs.table_arn,
              "${module.dynamodb_audit_logs.table_arn}/index/*"
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
          },
          {
            Effect = "Allow"
            Action = [
              "kms:Encrypt",
              "kms:Decrypt",
              "kms:ReEncrypt*",
              "kms:GenerateDataKey*",
              "kms:DescribeKey"
            ]
            Resource = aws_kms_key.main.arn
          }
        ]
      })
    }

    worker = {
      ecr_repository = "worker_service"
      image_tag      = var.worker_image_tag
      cpu            = 512
      memory         = 1024
      container_port = 8080
      desired_count  = 2

      # Worker doesn't need load balancer exposure
      listener_rule_priority = null
      path_patterns          = null

      health_check = {
        path = "/health"
      }

      autoscaling = {
        min_capacity     = 2
        max_capacity     = 10
        cpu_target_value = 70
        memory_target_value = 80
      }

      environment_variables = {
        NODE_ENV    = "production"
        QUEUE_URL   = var.sqs_queue_url
        S3_BUCKET   = module.s3_assets.bucket_name
        BACKUP_BUCKET = module.s3_backups.bucket_name
        KMS_KEY_ID  = aws_kms_key.main.key_id
      }

      secrets = {
        QUEUE_ACCESS_KEY = var.queue_access_key_arn
      }

      task_role_policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect = "Allow"
            Action = [
              "s3:GetObject",
              "s3:PutObject"
            ]
            Resource = [
              "${module.s3_assets.bucket_arn}/*",
              "${module.s3_backups.bucket_arn}/*"
            ]
          },
          {
            Effect = "Allow"
            Action = [
              "sqs:ReceiveMessage",
              "sqs:DeleteMessage",
              "sqs:GetQueueAttributes"
            ]
            Resource = var.sqs_queue_arn
          }
        ]
      })
    }
  }

  log_retention_days = 30

  common_tags = local.common_tags
}

# Comprehensive CloudWatch Monitoring
module "cloudwatch" {
  source = "../../modules/cloudwatch"

  environment      = local.environment
  application_name = var.project_name

  # Comprehensive log groups
  log_groups = {
    lambda_api = {
      name           = "/aws/lambda/${module.lambda_api.lambda_function_name}"
      retention_days = 30
      kms_key_id     = aws_kms_key.main.arn
    }
    lambda_processor = {
      name           = "/aws/lambda/${module.lambda_processor.lambda_function_name}"
      retention_days = 30
      kms_key_id     = aws_kms_key.main.arn
    }
    api_gateway = {
      name           = "/aws/apigateway/${module.api_gateway.api_gateway_id}"
      retention_days = 30
      kms_key_id     = aws_kms_key.main.arn
    }
    ecs_web = {
      name           = "/aws/ecs/${module.ecs.cluster_name}/web"
      retention_days = 30
      kms_key_id     = aws_kms_key.main.arn
    }
    ecs_api = {
      name           = "/aws/ecs/${module.ecs.cluster_name}/api"
      retention_days = 30
      kms_key_id     = aws_kms_key.main.arn
    }
    ecs_worker = {
      name           = "/aws/ecs/${module.ecs.cluster_name}/worker"
      retention_days = 30
      kms_key_id     = aws_kms_key.main.arn
    }
  }

  # Metric filters for business metrics
  metric_filters = {
    api_errors = {
      name             = "APIErrors"
      log_group_name   = "/aws/lambda/${module.lambda_api.lambda_function_name}"
      pattern          = "[timestamp, request_id, \"ERROR\"]"
      metric_name      = "APIErrorCount"
      metric_namespace = "${var.project_name}/API"
      metric_value     = "1"
    }
    user_signups = {
      name             = "UserSignups"
      log_group_name   = "/aws/ecs/${module.ecs.cluster_name}/api"
      pattern          = "[timestamp, request_id, \"USER_SIGNUP\"]"
      metric_name      = "UserSignupCount"
      metric_namespace = "${var.project_name}/Business"
      metric_value     = "1"
    }
    critical_errors = {
      name             = "CriticalErrors"
      log_group_name   = "/aws/ecs/${module.ecs.cluster_name}/api"
      pattern          = "[timestamp, request_id, \"CRITICAL\"]"
      metric_name      = "CriticalErrorCount"
      metric_namespace = "${var.project_name}/Alerts"
      metric_value     = "1"
    }
  }

  # SNS notifications
  create_sns_topic      = true
  alert_email_addresses = var.alert_email_addresses
  alert_phone_numbers   = var.alert_phone_numbers

  # Enhanced monitoring
  enable_default_alarms   = true
  load_balancer_full_name = module.ecs.load_balancer_arn_suffix
  error_rate_threshold    = 2 # Strict threshold for production
  response_time_threshold = 1

  # Service monitoring
  ecs_services = {
    web = {
      service_name = "web"
      cluster_name = module.ecs.cluster_name
    }
    api = {
      service_name = "api"
      cluster_name = module.ecs.cluster_name
    }
    worker = {
      service_name = "worker"
      cluster_name = module.ecs.cluster_name
    }
  }
  ecs_cpu_threshold    = 70
  ecs_memory_threshold = 75

  # Lambda monitoring
  lambda_functions = {
    api = {
      function_name      = module.lambda_api.lambda_function_name
      duration_threshold = 10000
    }
    processor = {
      function_name      = module.lambda_processor.lambda_function_name
      duration_threshold = 60000
    }
  }

  # DynamoDB monitoring
  dynamodb_tables = {
    users = {
      table_name = module.dynamodb_users.table_name
    }
    sessions = {
      table_name = module.dynamodb_sessions.table_name
    }
    audit_logs = {
      table_name = module.dynamodb_audit_logs.table_name
    }
  }

  # API Gateway monitoring
  api_gateways = {
    main = {
      api_name   = module.api_gateway.api_gateway_id
      stage_name = "v1"
    }
  }

  # Custom alarms for business metrics
  custom_alarms = {
    high_user_signup_rate = {
      name                = "high-user-signup-rate"
      comparison_operator = "GreaterThanThreshold"
      evaluation_periods  = 2
      metric_name         = "UserSignupCount"
      namespace           = "${var.project_name}/Business"
      period              = 300
      statistic           = "Sum"
      threshold           = 100
      description         = "High user signup rate detected"
      treat_missing_data  = "notBreaching"
    }
    critical_error_rate = {
      name                = "critical-error-rate"
      comparison_operator = "GreaterThanThreshold"
      evaluation_periods  = 1
      metric_name         = "CriticalErrorCount"
      namespace           = "${var.project_name}/Alerts"
      period              = 60
      statistic           = "Sum"
      threshold           = 0
      description         = "Critical errors detected"
    }
  }

  # Dashboard and insights
  create_dashboard            = true
  create_log_insights_queries = true

  common_tags = local.common_tags
}