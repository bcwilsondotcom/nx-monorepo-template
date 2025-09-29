# Variables for Local Environment

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "nx-monorepo"
}

variable "aws_region" {
  description = "AWS region for LocalStack"
  type        = string
  default     = "us-east-1"
}

variable "lambda_source_path" {
  description = "Path to Lambda function source code for local development"
  type        = string
  default     = ""
}