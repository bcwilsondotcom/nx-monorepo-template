# Variables for ECS Module

variable "cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "cluster_kms_key_id" {
  description = "KMS key ID for ECS cluster encryption"
  type        = string
  default     = null
}

variable "capacity_providers" {
  description = "List of capacity providers for the ECS cluster"
  type        = list(string)
  default     = ["FARGATE", "FARGATE_SPOT"]
}

variable "default_capacity_provider_strategy" {
  description = "Default capacity provider strategy for the cluster"
  type = list(object({
    capacity_provider = string
    weight           = number
    base             = number
  }))
  default = [
    {
      capacity_provider = "FARGATE"
      weight           = 1
      base             = 0
    }
  ]
}

# ECR Configuration
variable "ecr_repositories" {
  description = "Map of ECR repositories to create"
  type = map(object({
    name                 = string
    image_tag_mutability = optional(string, "MUTABLE")
    scan_on_push        = optional(bool, true)
    encryption_type     = optional(string, "AES256")
    kms_key             = optional(string, null)
    max_image_count     = optional(number, 10)
  }))
  default = {}
}

# Networking
variable "vpc_id" {
  description = "VPC ID where resources will be created"
  type        = string
}

variable "ecs_subnets" {
  description = "List of subnet IDs for ECS services"
  type        = list(string)
}

variable "ecs_security_group_id" {
  description = "Security group ID for ECS services"
  type        = string
}

variable "assign_public_ip" {
  description = "Assign public IP to ECS tasks"
  type        = bool
  default     = false
}

# Load Balancer
variable "create_load_balancer" {
  description = "Create Application Load Balancer"
  type        = bool
  default     = true
}

variable "load_balancer_internal" {
  description = "Make load balancer internal"
  type        = bool
  default     = false
}

variable "load_balancer_subnets" {
  description = "List of subnet IDs for the load balancer"
  type        = list(string)
  default     = []
}

variable "alb_security_group_id" {
  description = "Security group ID for the Application Load Balancer"
  type        = string
  default     = ""
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for the load balancer"
  type        = bool
  default     = false
}

variable "alb_access_logs_enabled" {
  description = "Enable access logs for the ALB"
  type        = bool
  default     = false
}

variable "alb_access_logs_bucket" {
  description = "S3 bucket for ALB access logs"
  type        = string
  default     = ""
}

variable "alb_access_logs_prefix" {
  description = "Prefix for ALB access logs"
  type        = string
  default     = "alb-access-logs"
}

variable "alb_listener_port" {
  description = "Port for the ALB listener"
  type        = number
  default     = 80
}

variable "alb_listener_protocol" {
  description = "Protocol for the ALB listener"
  type        = string
  default     = "HTTP"
}

variable "alb_certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS listener"
  type        = string
  default     = null
}

# Services Configuration
variable "services" {
  description = "Map of ECS services to create"
  type = map(object({
    # Container Configuration
    ecr_repository    = string
    image_tag         = optional(string, "latest")
    cpu               = optional(number, 256)
    memory            = optional(number, 512)
    container_port    = number
    desired_count     = optional(number, 1)

    # Environment and Secrets
    environment_variables = optional(map(string), {})
    secrets              = optional(map(string), {})

    # Health Check
    health_check = object({
      healthy_threshold   = optional(number, 2)
      interval           = optional(number, 30)
      matcher            = optional(string, "200")
      path               = optional(string, "/health")
      timeout            = optional(number, 5)
      unhealthy_threshold = optional(number, 2)
    })
    health_check_command = optional(list(string), null)

    # Load Balancer Configuration
    listener_rule_priority = optional(number, 100)
    path_patterns         = optional(list(string), null)
    host_headers          = optional(list(string), null)

    # Auto Scaling
    autoscaling = object({
      min_capacity              = optional(number, 1)
      max_capacity              = optional(number, 10)
      cpu_target_value          = optional(number, 70)
      memory_target_value       = optional(number, 80)
      request_count_target_value = optional(number, 1000)
    })

    # IAM
    task_role_policy = optional(string, null)

    # Service Discovery
    service_discovery_arn = optional(string, null)
  }))
}

# Logging
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}