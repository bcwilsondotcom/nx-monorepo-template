# Variables for Lambda Module

variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
}

variable "description" {
  description = "Description of the Lambda function"
  type        = string
  default     = ""
}

variable "handler" {
  description = "Lambda function handler"
  type        = string
  default     = "index.handler"
}

variable "runtime" {
  description = "Lambda function runtime"
  type        = string
  default     = "nodejs18.x"
}

variable "timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
  validation {
    condition     = var.timeout >= 1 && var.timeout <= 900
    error_message = "Timeout must be between 1 and 900 seconds."
  }
}

variable "memory_size" {
  description = "Lambda function memory size in MB"
  type        = number
  default     = 128
  validation {
    condition     = var.memory_size >= 128 && var.memory_size <= 10240
    error_message = "Memory size must be between 128 and 10240 MB."
  }
}

variable "architectures" {
  description = "Lambda function architectures"
  type        = list(string)
  default     = ["x86_64"]
  validation {
    condition = alltrue([
      for arch in var.architectures : contains(["x86_64", "arm64"], arch)
    ])
    error_message = "Architectures must be either 'x86_64' or 'arm64'."
  }
}

# Source Code Configuration
variable "source_code_path" {
  description = "Path to source code directory (for local builds)"
  type        = string
  default     = ""
}

variable "s3_bucket" {
  description = "S3 bucket containing the Lambda deployment package"
  type        = string
  default     = ""
}

variable "s3_key" {
  description = "S3 key of the Lambda deployment package"
  type        = string
  default     = ""
}

variable "s3_object_version" {
  description = "S3 object version of the Lambda deployment package"
  type        = string
  default     = ""
}

# Environment Variables
variable "environment_variables" {
  description = "Environment variables for the Lambda function"
  type        = map(string)
  default     = {}
}

# VPC Configuration
variable "vpc_config" {
  description = "VPC configuration for the Lambda function"
  type = object({
    subnet_ids         = list(string)
    security_group_ids = list(string)
  })
  default = null
}

# Dead Letter Queue
variable "enable_dead_letter_queue" {
  description = "Enable dead letter queue for the Lambda function"
  type        = bool
  default     = false
}

variable "dlq_message_retention_seconds" {
  description = "Message retention period for dead letter queue in seconds"
  type        = number
  default     = 1209600 # 14 days
}

# Concurrency
variable "reserved_concurrency" {
  description = "Reserved concurrency for the Lambda function"
  type        = number
  default     = -1
}

variable "provisioned_concurrency" {
  description = "Provisioned concurrency for the Lambda function"
  type        = number
  default     = 0
}

# Layers
variable "layers" {
  description = "List of Lambda layer ARNs"
  type        = list(string)
  default     = []
}

# Permissions
variable "custom_policy" {
  description = "Custom IAM policy JSON for additional Lambda permissions"
  type        = string
  default     = null
}

variable "dynamodb_tables" {
  description = "List of DynamoDB table ARNs the Lambda function needs access to"
  type        = list(string)
  default     = []
}

variable "s3_buckets" {
  description = "List of S3 bucket ARNs the Lambda function needs access to"
  type        = list(string)
  default     = []
}

# Function URL
variable "enable_function_url" {
  description = "Enable Lambda function URL"
  type        = bool
  default     = false
}

variable "function_url_auth_type" {
  description = "Authorization type for Lambda function URL"
  type        = string
  default     = "AWS_IAM"
  validation {
    condition     = contains(["AWS_IAM", "NONE"], var.function_url_auth_type)
    error_message = "Function URL auth type must be either 'AWS_IAM' or 'NONE'."
  }
}

variable "function_url_cors" {
  description = "CORS configuration for Lambda function URL"
  type = object({
    allow_credentials = optional(bool, false)
    allow_headers     = optional(list(string), [])
    allow_methods     = optional(list(string), [])
    allow_origins     = optional(list(string), [])
    expose_headers    = optional(list(string), [])
    max_age          = optional(number, 86400)
  })
  default = null
}

# Alias
variable "create_alias" {
  description = "Create a Lambda alias"
  type        = bool
  default     = false
}

variable "alias_name" {
  description = "Name of the Lambda alias"
  type        = string
  default     = "live"
}

variable "alias_function_version" {
  description = "Function version for the alias"
  type        = string
  default     = "$LATEST"
}

variable "alias_routing_config" {
  description = "Routing configuration for the alias"
  type = object({
    additional_version_weights = map(number)
  })
  default = null
}

# Monitoring
variable "enable_xray_tracing" {
  description = "Enable X-Ray tracing for the Lambda function"
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "enable_error_alarm" {
  description = "Enable CloudWatch alarm for Lambda errors"
  type        = bool
  default     = true
}

variable "error_alarm_threshold" {
  description = "Threshold for error alarm"
  type        = number
  default     = 5
}

variable "enable_duration_alarm" {
  description = "Enable CloudWatch alarm for Lambda duration"
  type        = bool
  default     = true
}

variable "duration_alarm_threshold" {
  description = "Threshold for duration alarm in milliseconds"
  type        = number
  default     = 10000
}

variable "alarm_actions" {
  description = "List of ARNs to notify when alarm triggers"
  type        = list(string)
  default     = []
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}