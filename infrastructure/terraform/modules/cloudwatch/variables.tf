# Variables for CloudWatch Module

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "application_name" {
  description = "Name of the application"
  type        = string
}

# Log Groups
variable "log_groups" {
  description = "Map of CloudWatch log groups to create"
  type = map(object({
    name           = string
    retention_days = number
    kms_key_id     = optional(string)
    tags           = optional(map(string), {})
  }))
  default = {}
}

# Metric Filters
variable "metric_filters" {
  description = "Map of CloudWatch log metric filters"
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

# SNS Configuration
variable "create_sns_topic" {
  description = "Create SNS topic for CloudWatch alarms"
  type        = bool
  default     = true
}

variable "alert_email_addresses" {
  description = "List of email addresses to receive CloudWatch alerts"
  type        = list(string)
  default     = []
}

variable "alert_phone_numbers" {
  description = "List of phone numbers to receive CloudWatch SMS alerts"
  type        = list(string)
  default     = []
}

# Default Alarms
variable "enable_default_alarms" {
  description = "Enable default application-level alarms"
  type        = bool
  default     = true
}

variable "default_alarm_actions" {
  description = "Default alarm actions if SNS topic is not created"
  type        = list(string)
  default     = []
}

# Application Load Balancer
variable "load_balancer_full_name" {
  description = "Full name of the Application Load Balancer"
  type        = string
  default     = ""
}

variable "error_rate_threshold" {
  description = "Threshold for error rate alarm (percentage)"
  type        = number
  default     = 5
}

variable "response_time_threshold" {
  description = "Threshold for response time alarm (seconds)"
  type        = number
  default     = 2
}

# ECS Services
variable "ecs_services" {
  description = "Map of ECS services to monitor"
  type = map(object({
    service_name = string
    cluster_name = string
  }))
  default = {}
}

variable "ecs_cpu_threshold" {
  description = "CPU utilization threshold for ECS services (percentage)"
  type        = number
  default     = 80
}

variable "ecs_memory_threshold" {
  description = "Memory utilization threshold for ECS services (percentage)"
  type        = number
  default     = 80
}

# Lambda Functions
variable "lambda_functions" {
  description = "Map of Lambda functions to monitor"
  type = map(object({
    function_name      = string
    duration_threshold = number
  }))
  default = {}
}

variable "lambda_error_threshold" {
  description = "Error count threshold for Lambda functions"
  type        = number
  default     = 5
}

# DynamoDB Tables
variable "dynamodb_tables" {
  description = "Map of DynamoDB tables to monitor"
  type = map(object({
    table_name = string
  }))
  default = {}
}

variable "dynamodb_throttle_threshold" {
  description = "Throttle threshold for DynamoDB tables"
  type        = number
  default     = 0
}

# API Gateway
variable "api_gateways" {
  description = "Map of API Gateways to monitor"
  type = map(object({
    api_name   = string
    stage_name = string
  }))
  default = {}
}

variable "api_gateway_4xx_threshold" {
  description = "4XX error threshold for API Gateway"
  type        = number
  default     = 10
}

variable "api_gateway_5xx_threshold" {
  description = "5XX error threshold for API Gateway"
  type        = number
  default     = 5
}

# Custom Alarms
variable "custom_alarms" {
  description = "Map of custom CloudWatch alarms"
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

# Dashboard
variable "create_dashboard" {
  description = "Create CloudWatch dashboard"
  type        = bool
  default     = true
}

# Log Insights
variable "create_log_insights_queries" {
  description = "Create predefined CloudWatch Logs Insights queries"
  type        = bool
  default     = true
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}