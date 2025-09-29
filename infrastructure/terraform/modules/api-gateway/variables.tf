# Variables for API Gateway Module

variable "api_name" {
  description = "Name of the API Gateway"
  type        = string
}

variable "api_description" {
  description = "Description of the API Gateway"
  type        = string
  default     = ""
}

variable "stage_name" {
  description = "Name of the API Gateway stage"
  type        = string
  default     = "v1"
}

variable "endpoint_type" {
  description = "Type of API Gateway endpoint"
  type        = string
  default     = "REGIONAL"
  validation {
    condition     = contains(["EDGE", "REGIONAL", "PRIVATE"], var.endpoint_type)
    error_message = "Endpoint type must be one of: EDGE, REGIONAL, PRIVATE."
  }
}

variable "authorization_type" {
  description = "Authorization type for API methods"
  type        = string
  default     = "NONE"
  validation {
    condition     = contains(["NONE", "AWS_IAM", "CUSTOM", "COGNITO_USER_POOLS"], var.authorization_type)
    error_message = "Authorization type must be one of: NONE, AWS_IAM, CUSTOM, COGNITO_USER_POOLS."
  }
}

variable "lambda_function_name" {
  description = "Name of the Lambda function to integrate with"
  type        = string
  default     = ""
}

variable "lambda_invoke_arn" {
  description = "Lambda function invoke ARN"
  type        = string
}

variable "binary_media_types" {
  description = "List of binary media types supported by the API"
  type        = list(string)
  default     = []
}

# Throttling
variable "throttle_rate_limit" {
  description = "API Gateway throttle rate limit"
  type        = number
  default     = 10000
}

variable "throttle_burst_limit" {
  description = "API Gateway throttle burst limit"
  type        = number
  default     = 5000
}

# API Key and Usage Plan
variable "api_key_required" {
  description = "Whether API key is required for API access"
  type        = bool
  default     = false
}

variable "create_api_key" {
  description = "Whether to create an API key"
  type        = bool
  default     = false
}

variable "usage_plan_quota_limit" {
  description = "Maximum number of requests per quota period"
  type        = number
  default     = 10000
}

variable "usage_plan_quota_period" {
  description = "Quota period (DAY, WEEK, MONTH)"
  type        = string
  default     = "MONTH"
  validation {
    condition     = contains(["DAY", "WEEK", "MONTH"], var.usage_plan_quota_period)
    error_message = "Quota period must be one of: DAY, WEEK, MONTH."
  }
}

variable "usage_plan_throttle_rate_limit" {
  description = "Usage plan throttle rate limit"
  type        = number
  default     = 1000
}

variable "usage_plan_throttle_burst_limit" {
  description = "Usage plan throttle burst limit"
  type        = number
  default     = 2000
}

# CORS
variable "enable_cors" {
  description = "Enable CORS for the API"
  type        = bool
  default     = true
}

variable "cors_origin" {
  description = "CORS allowed origin"
  type        = string
  default     = "*"
}

variable "cors_headers" {
  description = "CORS allowed headers"
  type        = list(string)
  default = [
    "Content-Type",
    "X-Amz-Date",
    "Authorization",
    "X-Api-Key",
    "X-Amz-Security-Token"
  ]
}

variable "cors_methods" {
  description = "CORS allowed methods"
  type        = list(string)
  default     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}

# Logging and Monitoring
variable "enable_access_logging" {
  description = "Enable API Gateway access logging"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "enable_xray_tracing" {
  description = "Enable X-Ray tracing"
  type        = bool
  default     = false
}

# Integration
variable "integration_timeout" {
  description = "Integration timeout in milliseconds"
  type        = number
  default     = 29000
  validation {
    condition     = var.integration_timeout >= 50 && var.integration_timeout <= 29000
    error_message = "Integration timeout must be between 50 and 29000 milliseconds."
  }
}

# Security
variable "waf_acl_arn" {
  description = "ARN of WAF Web ACL to associate with the API"
  type        = string
  default     = ""
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}