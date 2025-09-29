# Outputs for CloudWatch Module

# Log Groups
output "log_group_names" {
  description = "Names of the created CloudWatch log groups"
  value       = { for k, v in aws_cloudwatch_log_group.application_logs : k => v.name }
}

output "log_group_arns" {
  description = "ARNs of the created CloudWatch log groups"
  value       = { for k, v in aws_cloudwatch_log_group.application_logs : k => v.arn }
}

# SNS Topic
output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = var.create_sns_topic ? aws_sns_topic.alerts[0].arn : null
}

output "sns_topic_name" {
  description = "Name of the SNS topic for alerts"
  value       = var.create_sns_topic ? aws_sns_topic.alerts[0].name : null
}

# Metric Filters
output "metric_filter_names" {
  description = "Names of the created metric filters"
  value       = { for k, v in aws_cloudwatch_log_metric_filter.application_metrics : k => v.name }
}

# Custom Alarms
output "custom_alarm_arns" {
  description = "ARNs of the custom CloudWatch alarms"
  value       = { for k, v in aws_cloudwatch_metric_alarm.custom_alarms : k => v.arn }
}

output "custom_alarm_names" {
  description = "Names of the custom CloudWatch alarms"
  value       = { for k, v in aws_cloudwatch_metric_alarm.custom_alarms : k => v.alarm_name }
}

# Default Alarms
output "high_error_rate_alarm_arn" {
  description = "ARN of the high error rate alarm"
  value       = var.enable_default_alarms ? aws_cloudwatch_metric_alarm.high_error_rate[0].arn : null
}

output "high_response_time_alarm_arn" {
  description = "ARN of the high response time alarm"
  value       = var.enable_default_alarms ? aws_cloudwatch_metric_alarm.high_response_time[0].arn : null
}

# ECS Alarms
output "ecs_cpu_alarm_arns" {
  description = "ARNs of ECS CPU utilization alarms"
  value       = { for k, v in aws_cloudwatch_metric_alarm.ecs_service_cpu_high : k => v.arn }
}

output "ecs_memory_alarm_arns" {
  description = "ARNs of ECS memory utilization alarms"
  value       = { for k, v in aws_cloudwatch_metric_alarm.ecs_service_memory_high : k => v.arn }
}

# Lambda Alarms
output "lambda_error_alarm_arns" {
  description = "ARNs of Lambda error alarms"
  value       = { for k, v in aws_cloudwatch_metric_alarm.lambda_errors : k => v.arn }
}

output "lambda_duration_alarm_arns" {
  description = "ARNs of Lambda duration alarms"
  value       = { for k, v in aws_cloudwatch_metric_alarm.lambda_duration : k => v.arn }
}

# DynamoDB Alarms
output "dynamodb_throttle_alarm_arns" {
  description = "ARNs of DynamoDB throttle alarms"
  value       = { for k, v in aws_cloudwatch_metric_alarm.dynamodb_throttles : k => v.arn }
}

# API Gateway Alarms
output "api_gateway_4xx_alarm_arns" {
  description = "ARNs of API Gateway 4XX error alarms"
  value       = { for k, v in aws_cloudwatch_metric_alarm.api_gateway_4xx_errors : k => v.arn }
}

output "api_gateway_5xx_alarm_arns" {
  description = "ARNs of API Gateway 5XX error alarms"
  value       = { for k, v in aws_cloudwatch_metric_alarm.api_gateway_5xx_errors : k => v.arn }
}

# Dashboard
output "dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = var.create_dashboard ? "https://console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#dashboards:name=${aws_cloudwatch_dashboard.main[0].dashboard_name}" : null
}

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = var.create_dashboard ? aws_cloudwatch_dashboard.main[0].dashboard_name : null
}

# Log Insights Queries
output "log_insights_query_names" {
  description = "Names of the CloudWatch Logs Insights queries"
  value = var.create_log_insights_queries ? [
    aws_cloudwatch_query_definition.error_analysis[0].name,
    aws_cloudwatch_query_definition.performance_analysis[0].name
  ] : []
}

# Summary Information
output "monitoring_summary" {
  description = "Summary of monitoring resources created"
  value = {
    log_groups_count        = length(aws_cloudwatch_log_group.application_logs)
    metric_filters_count    = length(aws_cloudwatch_log_metric_filter.application_metrics)
    custom_alarms_count     = length(aws_cloudwatch_metric_alarm.custom_alarms)
    ecs_alarms_count       = length(var.ecs_services) * 2
    lambda_alarms_count    = length(var.lambda_functions) * 2
    dynamodb_alarms_count  = length(var.dynamodb_tables)
    api_gateway_alarms_count = length(var.api_gateways) * 2
    sns_topic_created      = var.create_sns_topic
    dashboard_created      = var.create_dashboard
    log_insights_created   = var.create_log_insights_queries
  }
}