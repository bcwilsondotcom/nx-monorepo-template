# Lambda Module
terraform {
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
}

# Data source for current AWS region and account
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days

  tags = var.common_tags
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda" {
  name = "${var.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

# Basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# VPC execution policy (if VPC is enabled)
resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  count = var.vpc_config != null ? 1 : 0

  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Custom IAM policy for additional permissions
resource "aws_iam_role_policy" "lambda_custom" {
  count = var.custom_policy != null ? 1 : 0

  name = "${var.function_name}-custom-policy"
  role = aws_iam_role.lambda.id

  policy = var.custom_policy
}

# IAM policy for DynamoDB access
resource "aws_iam_role_policy" "dynamodb" {
  count = length(var.dynamodb_tables) > 0 ? 1 : 0

  name = "${var.function_name}-dynamodb-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
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
        Resource = var.dynamodb_tables
      }
    ]
  })
}

# IAM policy for S3 access
resource "aws_iam_role_policy" "s3" {
  count = length(var.s3_buckets) > 0 ? 1 : 0

  name = "${var.function_name}-s3-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = flatten([
          var.s3_buckets,
          [for bucket in var.s3_buckets : "${bucket}/*"]
        ])
      }
    ]
  })
}

# IAM policy for SQS access (for dead letter queue)
resource "aws_iam_role_policy" "sqs" {
  count = var.enable_dead_letter_queue ? 1 : 0

  name = "${var.function_name}-sqs-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.dead_letter[0].arn
      }
    ]
  })
}

# Dead Letter Queue
resource "aws_sqs_queue" "dead_letter" {
  count = var.enable_dead_letter_queue ? 1 : 0

  name                      = "${var.function_name}-dlq"
  message_retention_seconds = var.dlq_message_retention_seconds

  tags = var.common_tags
}

# Lambda deployment package (if source code is provided)
data "archive_file" "lambda_zip" {
  count = var.source_code_path != "" ? 1 : 0

  type        = "zip"
  source_dir  = var.source_code_path
  output_path = "${path.module}/lambda_function.zip"
}

# Lambda Function
resource "aws_lambda_function" "main" {
  function_name = var.function_name
  description   = var.description
  role          = aws_iam_role.lambda.arn

  # Code configuration
  filename         = var.source_code_path != "" ? data.archive_file.lambda_zip[0].output_path : null
  source_code_hash = var.source_code_path != "" ? data.archive_file.lambda_zip[0].output_base64sha256 : null
  s3_bucket        = var.s3_bucket != "" ? var.s3_bucket : null
  s3_key           = var.s3_key != "" ? var.s3_key : null
  s3_object_version = var.s3_object_version != "" ? var.s3_object_version : null

  # Runtime configuration
  handler       = var.handler
  runtime       = var.runtime
  timeout       = var.timeout
  memory_size   = var.memory_size
  architectures = var.architectures

  # Environment variables
  dynamic "environment" {
    for_each = length(var.environment_variables) > 0 ? [1] : []
    content {
      variables = var.environment_variables
    }
  }

  # VPC configuration
  dynamic "vpc_config" {
    for_each = var.vpc_config != null ? [var.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }

  # Dead letter queue configuration
  dynamic "dead_letter_config" {
    for_each = var.enable_dead_letter_queue ? [1] : []
    content {
      target_arn = aws_sqs_queue.dead_letter[0].arn
    }
  }

  # Tracing configuration
  dynamic "tracing_config" {
    for_each = var.enable_xray_tracing ? [1] : []
    content {
      mode = "Active"
    }
  }

  # Reserved concurrency
  reserved_concurrency = var.reserved_concurrency

  # Layers
  layers = var.layers

  tags = var.common_tags

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
    aws_iam_role_policy_attachment.lambda_vpc,
    aws_cloudwatch_log_group.lambda,
  ]
}

# Lambda Function URL (if enabled)
resource "aws_lambda_function_url" "main" {
  count = var.enable_function_url ? 1 : 0

  function_name      = aws_lambda_function.main.function_name
  authorization_type = var.function_url_auth_type

  dynamic "cors" {
    for_each = var.function_url_cors != null ? [var.function_url_cors] : []
    content {
      allow_credentials = cors.value.allow_credentials
      allow_headers     = cors.value.allow_headers
      allow_methods     = cors.value.allow_methods
      allow_origins     = cors.value.allow_origins
      expose_headers    = cors.value.expose_headers
      max_age          = cors.value.max_age
    }
  }
}

# Lambda Alias
resource "aws_lambda_alias" "main" {
  count = var.create_alias ? 1 : 0

  name             = var.alias_name
  description      = "Alias for ${var.function_name}"
  function_name    = aws_lambda_function.main.arn
  function_version = var.alias_function_version

  dynamic "routing_config" {
    for_each = var.alias_routing_config != null ? [var.alias_routing_config] : []
    content {
      additional_version_weights = routing_config.value.additional_version_weights
    }
  }
}

# CloudWatch Metric Alarm for Errors
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  count = var.enable_error_alarm ? 1 : 0

  alarm_name          = "${var.function_name}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "60"
  statistic           = "Sum"
  threshold           = var.error_alarm_threshold
  alarm_description   = "This metric monitors lambda errors"
  alarm_actions       = var.alarm_actions

  dimensions = {
    FunctionName = aws_lambda_function.main.function_name
  }

  tags = var.common_tags
}

# CloudWatch Metric Alarm for Duration
resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  count = var.enable_duration_alarm ? 1 : 0

  alarm_name          = "${var.function_name}-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "60"
  statistic           = "Average"
  threshold           = var.duration_alarm_threshold
  alarm_description   = "This metric monitors lambda duration"
  alarm_actions       = var.alarm_actions

  dimensions = {
    FunctionName = aws_lambda_function.main.function_name
  }

  tags = var.common_tags
}

# Lambda Provisioned Concurrency (if enabled)
resource "aws_lambda_provisioned_concurrency_config" "main" {
  count = var.provisioned_concurrency > 0 ? 1 : 0

  function_name                     = aws_lambda_function.main.function_name
  provisioned_concurrent_executions = var.provisioned_concurrency
  qualifier                         = var.create_alias ? aws_lambda_alias.main[0].name : "$LATEST"
}