# Outputs for ECS Module

# ECS Cluster
output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

# ECR Repositories
output "ecr_repository_urls" {
  description = "URLs of the ECR repositories"
  value       = { for k, v in aws_ecr_repository.main : k => v.repository_url }
}

output "ecr_repository_arns" {
  description = "ARNs of the ECR repositories"
  value       = { for k, v in aws_ecr_repository.main : k => v.arn }
}

output "ecr_repository_registry_ids" {
  description = "Registry IDs of the ECR repositories"
  value       = { for k, v in aws_ecr_repository.main : k => v.registry_id }
}

# Load Balancer
output "load_balancer_arn" {
  description = "ARN of the Application Load Balancer"
  value       = var.create_load_balancer ? aws_lb.main[0].arn : null
}

output "load_balancer_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = var.create_load_balancer ? aws_lb.main[0].dns_name : null
}

output "load_balancer_hosted_zone_id" {
  description = "Hosted zone ID of the Application Load Balancer"
  value       = var.create_load_balancer ? aws_lb.main[0].zone_id : null
}

output "load_balancer_arn_suffix" {
  description = "ARN suffix of the Application Load Balancer"
  value       = var.create_load_balancer ? aws_lb.main[0].arn_suffix : null
}

# Target Groups
output "target_group_arns" {
  description = "ARNs of the target groups"
  value       = { for k, v in aws_lb_target_group.services : k => v.arn }
}

output "target_group_arn_suffixes" {
  description = "ARN suffixes of the target groups"
  value       = { for k, v in aws_lb_target_group.services : k => v.arn_suffix }
}

# ALB Listener
output "alb_listener_arn" {
  description = "ARN of the ALB listener"
  value       = var.create_load_balancer ? aws_lb_listener.main[0].arn : null
}

# ECS Services
output "service_names" {
  description = "Names of the ECS services"
  value       = { for k, v in aws_ecs_service.services : k => v.name }
}

output "service_arns" {
  description = "ARNs of the ECS services"
  value       = { for k, v in aws_ecs_service.services : k => v.id }
}

output "service_cluster_arns" {
  description = "Cluster ARNs of the ECS services"
  value       = { for k, v in aws_ecs_service.services : k => v.cluster }
}

# Task Definitions
output "task_definition_arns" {
  description = "ARNs of the task definitions"
  value       = { for k, v in aws_ecs_task_definition.services : k => v.arn }
}

output "task_definition_families" {
  description = "Families of the task definitions"
  value       = { for k, v in aws_ecs_task_definition.services : k => v.family }
}

output "task_definition_revisions" {
  description = "Revisions of the task definitions"
  value       = { for k, v in aws_ecs_task_definition.services : k => v.revision }
}

# IAM Roles
output "task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "task_execution_role_name" {
  description = "Name of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution_role.name
}

output "task_role_arns" {
  description = "ARNs of the ECS task roles"
  value       = { for k, v in aws_iam_role.ecs_task_role : k => v.arn }
}

output "task_role_names" {
  description = "Names of the ECS task roles"
  value       = { for k, v in aws_iam_role.ecs_task_role : k => v.name }
}

# CloudWatch Log Groups
output "log_group_names" {
  description = "Names of the CloudWatch log groups"
  value = merge(
    { cluster = aws_cloudwatch_log_group.ecs_cluster.name },
    { for k, v in aws_cloudwatch_log_group.services : k => v.name }
  )
}

output "log_group_arns" {
  description = "ARNs of the CloudWatch log groups"
  value = merge(
    { cluster = aws_cloudwatch_log_group.ecs_cluster.arn },
    { for k, v in aws_cloudwatch_log_group.services : k => v.arn }
  )
}

# Auto Scaling
output "autoscaling_target_arns" {
  description = "ARNs of the auto scaling targets"
  value       = { for k, v in aws_appautoscaling_target.ecs_services : k => v.arn }
}

output "autoscaling_cpu_policy_arns" {
  description = "ARNs of the CPU auto scaling policies"
  value       = { for k, v in aws_appautoscaling_policy.ecs_cpu : k => v.arn }
}

output "autoscaling_memory_policy_arns" {
  description = "ARNs of the memory auto scaling policies"
  value       = { for k, v in aws_appautoscaling_policy.ecs_memory : k => v.arn }
}

output "autoscaling_request_count_policy_arns" {
  description = "ARNs of the request count auto scaling policies"
  value       = { for k, v in aws_appautoscaling_policy.ecs_request_count : k => v.arn }
}

# Service URLs (if load balancer is created)
output "service_urls" {
  description = "URLs to access the services through the load balancer"
  value = var.create_load_balancer ? {
    for k, v in var.services : k => "http://${aws_lb.main[0].dns_name}${v.path_patterns != null ? v.path_patterns[0] : ""}"
  } : {}
}

# Summary Information
output "deployment_summary" {
  description = "Summary of the ECS deployment"
  value = {
    cluster_name          = aws_ecs_cluster.main.name
    services_count        = length(var.services)
    ecr_repositories_count = length(var.ecr_repositories)
    load_balancer_created = var.create_load_balancer
    load_balancer_dns     = var.create_load_balancer ? aws_lb.main[0].dns_name : null
    capacity_providers    = var.capacity_providers
  }
}