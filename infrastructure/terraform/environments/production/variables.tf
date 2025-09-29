# Variables for Production Environment

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "nx-monorepo"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "production"
}

# Retention Policies
variable "log_retention_years" {
  description = "Log retention period in years"
  type        = number
  default     = 7
}

variable "backup_retention_years" {
  description = "Backup retention period in years"
  type        = number
  default     = 7
}

# Networking and Security
variable "allowed_origins" {
  description = "List of allowed origins for CORS"
  type        = list(string)
  default     = ["https://example.com", "https://www.example.com"]
}

variable "cors_origin" {
  description = "CORS origin for API Gateway"
  type        = string
  default     = "https://example.com"
}

# CloudFront and CDN
variable "cloudfront_aliases" {
  description = "CloudFront distribution aliases"
  type        = list(string)
  default     = ["cdn.example.com", "assets.example.com"]
}

variable "cloudfront_certificate_arn" {
  description = "ARN of the ACM certificate for CloudFront (must be in us-east-1)"
  type        = string
}

# SSL/TLS Certificates
variable "alb_certificate_arn" {
  description = "ARN of the ACM certificate for ALB HTTPS"
  type        = string
}

# WAF
variable "waf_acl_arn" {
  description = "ARN of the WAF Web ACL for API Gateway"
  type        = string
  default     = ""
}

# DynamoDB Configuration
variable "dynamodb_billing_mode" {
  description = "DynamoDB billing mode (PROVISIONED or PAY_PER_REQUEST)"
  type        = string
  default     = "PAY_PER_REQUEST"
  validation {
    condition     = contains(["PROVISIONED", "PAY_PER_REQUEST"], var.dynamodb_billing_mode)
    error_message = "DynamoDB billing mode must be either PROVISIONED or PAY_PER_REQUEST."
  }
}

# Lambda Deployment
variable "lambda_deployment_bucket" {
  description = "S3 bucket containing Lambda deployment packages"
  type        = string
}

variable "lambda_deployment_key" {
  description = "S3 key for Lambda API deployment package"
  type        = string
  default     = "lambda/api/production.zip"
}

variable "lambda_processor_deployment_key" {
  description = "S3 key for Lambda processor deployment package"
  type        = string
  default     = "lambda/processor/production.zip"
}

# Container Images
variable "web_image_tag" {
  description = "Tag for the web application container image"
  type        = string
}

variable "api_image_tag" {
  description = "Tag for the API service container image"
  type        = string
}

variable "worker_image_tag" {
  description = "Tag for the worker service container image"
  type        = string
}

# External Services
variable "sqs_queue_url" {
  description = "URL of the SQS queue for background processing"
  type        = string
  default     = ""
}

variable "sqs_queue_arn" {
  description = "ARN of the SQS queue for background processing"
  type        = string
  default     = ""
}

# Secrets Management
variable "database_password_arn" {
  description = "ARN of the database password secret in Secrets Manager"
  type        = string
}

variable "jwt_secret_arn" {
  description = "ARN of the JWT secret in Secrets Manager"
  type        = string
}

variable "api_keys_arn" {
  description = "ARN of the API keys secret in Secrets Manager"
  type        = string
}

variable "queue_access_key_arn" {
  description = "ARN of the queue access key secret"
  type        = string
  default     = ""
}

# Monitoring and Alerting
variable "alert_email_addresses" {
  description = "List of email addresses for CloudWatch alerts"
  type        = list(string)
  default     = []
}

variable "alert_phone_numbers" {
  description = "List of phone numbers for critical CloudWatch SMS alerts"
  type        = list(string)
  default     = []
}

# Disaster Recovery
variable "enable_cross_region_backup" {
  description = "Enable cross-region backup for disaster recovery"
  type        = bool
  default     = false
}

variable "backup_region" {
  description = "AWS region for cross-region backups"
  type        = string
  default     = "us-west-2"
}

# Compliance and Governance
variable "compliance_tags" {
  description = "Additional tags required for compliance"
  type        = map(string)
  default = {
    Classification = "Internal"
    DataRetention  = "7years"
    BackupRequired = "true"
  }
}