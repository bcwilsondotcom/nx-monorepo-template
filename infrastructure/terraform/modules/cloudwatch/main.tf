# CloudWatch Module
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Data sources
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "application_logs" {
  for_each = var.log_groups

  name              = each.value.name
  retention_in_days = each.value.retention_days
  kms_key_id        = each.value.kms_key_id

  tags = merge(var.common_tags, each.value.tags)
}

# CloudWatch Metric Filters
resource "aws_cloudwatch_log_metric_filter" "application_metrics" {
  for_each = var.metric_filters

  name           = each.value.name
  log_group_name = each.value.log_group_name
  pattern        = each.value.pattern

  metric_transformation {
    name      = each.value.metric_name
    namespace = each.value.metric_namespace
    value     = each.value.metric_value
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  count = var.create_sns_topic ? 1 : 0

  name         = "${var.environment}-${var.application_name}-alerts"
  display_name = "CloudWatch Alerts for ${var.application_name}"

  tags = var.common_tags
}

resource "aws_sns_topic_policy" "alerts" {
  count = var.create_sns_topic ? 1 : 0

  arn = aws_sns_topic.alerts[0].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudWatchAlarmsToPublish"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.alerts[0].arn
      }
    ]
  })
}

# SNS Topic Subscriptions
resource "aws_sns_topic_subscription" "email_alerts" {
  for_each = var.create_sns_topic ? toset(var.alert_email_addresses) : toset([])

  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = each.value
}

resource "aws_sns_topic_subscription" "sms_alerts" {
  for_each = var.create_sns_topic ? toset(var.alert_phone_numbers) : toset([])

  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "sms"
  endpoint  = each.value
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "custom_alarms" {
  for_each = var.custom_alarms

  alarm_name          = each.value.name
  comparison_operator = each.value.comparison_operator
  evaluation_periods  = each.value.evaluation_periods
  metric_name         = each.value.metric_name
  namespace           = each.value.namespace
  period              = each.value.period
  statistic           = each.value.statistic
  threshold           = each.value.threshold
  alarm_description   = each.value.description
  alarm_actions       = var.create_sns_topic ? [aws_sns_topic.alerts[0].arn] : each.value.alarm_actions
  ok_actions          = var.create_sns_topic ? [aws_sns_topic.alerts[0].arn] : each.value.ok_actions
  treat_missing_data  = each.value.treat_missing_data

  dynamic "dimensions" {
    for_each = each.value.dimensions != null ? [each.value.dimensions] : []
    content {
      for k, v in dimensions.value : k => v
    }
  }

  tags = var.common_tags
}

# High-Level Application Alarms
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  count = var.enable_default_alarms ? 1 : 0

  alarm_name          = "${var.application_name}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ErrorRate"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = var.error_rate_threshold
  alarm_description   = "High error rate detected"
  alarm_actions       = var.create_sns_topic ? [aws_sns_topic.alerts[0].arn] : var.default_alarm_actions

  dimensions = {
    LoadBalancer = var.load_balancer_full_name
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "high_response_time" {
  count = var.enable_default_alarms ? 1 : 0

  alarm_name          = "${var.application_name}-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = var.response_time_threshold
  alarm_description   = "High response time detected"
  alarm_actions       = var.create_sns_topic ? [aws_sns_topic.alerts[0].arn] : var.default_alarm_actions

  dimensions = {
    LoadBalancer = var.load_balancer_full_name
  }

  tags = var.common_tags
}

# ECS Service Alarms
resource "aws_cloudwatch_metric_alarm" "ecs_service_cpu_high" {
  for_each = var.ecs_services

  alarm_name          = "${each.key}-cpu-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.ecs_cpu_threshold
  alarm_description   = "ECS Service CPU utilization is high"
  alarm_actions       = var.create_sns_topic ? [aws_sns_topic.alerts[0].arn] : var.default_alarm_actions

  dimensions = {
    ServiceName = each.value.service_name
    ClusterName = each.value.cluster_name
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_service_memory_high" {
  for_each = var.ecs_services

  alarm_name          = "${each.key}-memory-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.ecs_memory_threshold
  alarm_description   = "ECS Service memory utilization is high"
  alarm_actions       = var.create_sns_topic ? [aws_sns_topic.alerts[0].arn] : var.default_alarm_actions

  dimensions = {
    ServiceName = each.value.service_name
    ClusterName = each.value.cluster_name
  }

  tags = var.common_tags
}

# Lambda Function Alarms
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = var.lambda_functions

  alarm_name          = "${each.key}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = var.lambda_error_threshold
  alarm_description   = "Lambda function error rate is high"
  alarm_actions       = var.create_sns_topic ? [aws_sns_topic.alerts[0].arn] : var.default_alarm_actions

  dimensions = {
    FunctionName = each.value.function_name
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  for_each = var.lambda_functions

  alarm_name          = "${each.key}-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Average"
  threshold           = each.value.duration_threshold
  alarm_description   = "Lambda function duration is high"
  alarm_actions       = var.create_sns_topic ? [aws_sns_topic.alerts[0].arn] : var.default_alarm_actions

  dimensions = {
    FunctionName = each.value.function_name
  }

  tags = var.common_tags
}

# DynamoDB Alarms
resource "aws_cloudwatch_metric_alarm" "dynamodb_throttles" {
  for_each = var.dynamodb_tables

  alarm_name          = "${each.key}-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = var.dynamodb_throttle_threshold
  alarm_description   = "DynamoDB table is being throttled"
  alarm_actions       = var.create_sns_topic ? [aws_sns_topic.alerts[0].arn] : var.default_alarm_actions

  dimensions = {
    TableName = each.value.table_name
  }

  tags = var.common_tags
}

# API Gateway Alarms
resource "aws_cloudwatch_metric_alarm" "api_gateway_4xx_errors" {
  for_each = var.api_gateways

  alarm_name          = "${each.key}-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = var.api_gateway_4xx_threshold
  alarm_description   = "API Gateway 4XX error rate is high"
  alarm_actions       = var.create_sns_topic ? [aws_sns_topic.alerts[0].arn] : var.default_alarm_actions

  dimensions = {
    ApiName = each.value.api_name
    Stage   = each.value.stage_name
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "api_gateway_5xx_errors" {
  for_each = var.api_gateways

  alarm_name          = "${each.key}-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = var.api_gateway_5xx_threshold
  alarm_description   = "API Gateway 5XX error rate is high"
  alarm_actions       = var.create_sns_topic ? [aws_sns_topic.alerts[0].arn] : var.default_alarm_actions

  dimensions = {
    ApiName = each.value.api_name
    Stage   = each.value.stage_name
  }

  tags = var.common_tags
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  count = var.create_dashboard ? 1 : 0

  dashboard_name = "${var.environment}-${var.application_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = concat(
      # Application Overview
      [
        {
          type   = "metric"
          x      = 0
          y      = 0
          width  = 12
          height = 6

          properties = {
            metrics = [
              ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.load_balancer_full_name],
              [".", "TargetResponseTime", ".", "."],
              [".", "HTTPCode_Target_4XX_Count", ".", "."],
              [".", "HTTPCode_Target_5XX_Count", ".", "."]
            ]
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            title   = "Application Load Balancer Metrics"
            period  = 300
          }
        }
      ],
      # ECS Services
      length(var.ecs_services) > 0 ? [
        {
          type   = "metric"
          x      = 0
          y      = 6
          width  = 12
          height = 6

          properties = {
            metrics = [
              for service_key, service in var.ecs_services : [
                "AWS/ECS", "CPUUtilization", "ServiceName", service.service_name, "ClusterName", service.cluster_name
              ]
            ]
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            title   = "ECS Service CPU Utilization"
            period  = 300
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 12
          width  = 12
          height = 6

          properties = {
            metrics = [
              for service_key, service in var.ecs_services : [
                "AWS/ECS", "MemoryUtilization", "ServiceName", service.service_name, "ClusterName", service.cluster_name
              ]
            ]
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            title   = "ECS Service Memory Utilization"
            period  = 300
          }
        }
      ] : [],
      # Lambda Functions
      length(var.lambda_functions) > 0 ? [
        {
          type   = "metric"
          x      = 0
          y      = 18
          width  = 12
          height = 6

          properties = {
            metrics = [
              for func_key, func in var.lambda_functions : [
                "AWS/Lambda", "Duration", "FunctionName", func.function_name
              ]
            ]
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            title   = "Lambda Function Duration"
            period  = 300
          }
        },
        {
          type   = "metric"
          x      = 0
          y      = 24
          width  = 12
          height = 6

          properties = {
            metrics = [
              for func_key, func in var.lambda_functions : [
                "AWS/Lambda", "Errors", "FunctionName", func.function_name
              ]
            ]
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            title   = "Lambda Function Errors"
            period  = 300
          }
        }
      ] : [],
      # DynamoDB Tables
      length(var.dynamodb_tables) > 0 ? [
        {
          type   = "metric"
          x      = 0
          y      = 30
          width  = 12
          height = 6

          properties = {
            metrics = [
              for table_key, table in var.dynamodb_tables : [
                "AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", table.table_name
              ]
            ]
            view    = "timeSeries"
            stacked = false
            region  = data.aws_region.current.name
            title   = "DynamoDB Read Capacity"
            period  = 300
          }
        }
      ] : []
    )
  })
}

# CloudWatch Logs Insights Queries
resource "aws_cloudwatch_query_definition" "error_analysis" {
  count = var.create_log_insights_queries ? 1 : 0

  name = "${var.application_name}-error-analysis"

  log_group_names = [
    for log_group in var.log_groups : log_group.name
  ]

  query_string = <<EOF
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by bin(5m)
| sort @timestamp desc
EOF
}

resource "aws_cloudwatch_query_definition" "performance_analysis" {
  count = var.create_log_insights_queries ? 1 : 0

  name = "${var.application_name}-performance-analysis"

  log_group_names = [
    for log_group in var.log_groups : log_group.name
  ]

  query_string = <<EOF
fields @timestamp, @duration, @requestId
| filter @type = "REPORT"
| stats avg(@duration), max(@duration), min(@duration) by bin(5m)
| sort @timestamp desc
EOF
}