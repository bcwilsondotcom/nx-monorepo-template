# Variables for Staging Environment

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
  default     = "engineering"
}

# Networking
variable "allowed_origins" {
  description = "List of allowed origins for CORS"
  type        = list(string)
  default     = ["https://staging.example.com"]
}

variable "cors_origin" {
  description = "CORS origin for API Gateway"
  type        = string
  default     = "https://staging.example.com"
}

# CloudFront
variable "cloudfront_aliases" {
  description = "CloudFront distribution aliases"
  type        = list(string)
  default     = []
}

# SSL/TLS
variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS"
  type        = string
  default     = null
}

# Lambda Deployment
variable "lambda_deployment_bucket" {
  description = "S3 bucket containing Lambda deployment packages"
  type        = string
}

variable "lambda_deployment_key" {
  description = "S3 key for Lambda API deployment package"
  type        = string
  default     = "lambda/api.zip"
}

variable "lambda_processor_deployment_key" {
  description = "S3 key for Lambda processor deployment package"
  type        = string
  default     = "lambda/processor.zip"
}

# Container Images
variable "web_image_tag" {
  description = "Tag for the web application container image"
  type        = string
  default     = "latest"
}

variable "api_image_tag" {
  description = "Tag for the API service container image"
  type        = string
  default     = "latest"
}

# Secrets
variable "database_password_arn" {
  description = "ARN of the database password secret"
  type        = string
  default     = ""
}

variable "jwt_secret_arn" {
  description = "ARN of the JWT secret"
  type        = string
  default     = ""
}

# Monitoring
variable "alert_email_addresses" {
  description = "List of email addresses for CloudWatch alerts"
  type        = list(string)
  default     = []
}