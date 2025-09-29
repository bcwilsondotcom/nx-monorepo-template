# Outputs for DynamoDB Module

output "table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.main.name
}

output "table_id" {
  description = "ID of the DynamoDB table"
  value       = aws_dynamodb_table.main.id
}

output "table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.main.arn
}

output "table_stream_arn" {
  description = "ARN of the DynamoDB table stream"
  value       = aws_dynamodb_table.main.stream_arn
}

output "table_stream_label" {
  description = "Timestamp, in ISO 8601 format, for this stream"
  value       = aws_dynamodb_table.main.stream_label
}

output "table_hash_key" {
  description = "Hash key of the DynamoDB table"
  value       = aws_dynamodb_table.main.hash_key
}

output "table_range_key" {
  description = "Range key of the DynamoDB table"
  value       = aws_dynamodb_table.main.range_key
}

output "table_billing_mode" {
  description = "Billing mode of the DynamoDB table"
  value       = aws_dynamodb_table.main.billing_mode
}

output "table_read_capacity" {
  description = "Read capacity of the DynamoDB table"
  value       = aws_dynamodb_table.main.read_capacity
}

output "table_write_capacity" {
  description = "Write capacity of the DynamoDB table"
  value       = aws_dynamodb_table.main.write_capacity
}

output "global_secondary_indexes" {
  description = "Global secondary indexes of the DynamoDB table"
  value       = aws_dynamodb_table.main.global_secondary_index
}

output "local_secondary_indexes" {
  description = "Local secondary indexes of the DynamoDB table"
  value       = aws_dynamodb_table.main.local_secondary_index
}

output "point_in_time_recovery_enabled" {
  description = "Whether point-in-time recovery is enabled"
  value       = aws_dynamodb_table.main.point_in_time_recovery[0].enabled
}

output "server_side_encryption_enabled" {
  description = "Whether server-side encryption is enabled"
  value       = var.encryption_enabled
}

output "server_side_encryption_kms_key_id" {
  description = "KMS key ID used for server-side encryption"
  value       = var.kms_key_id
}

output "ttl_enabled" {
  description = "Whether TTL is enabled"
  value       = var.ttl_enabled
}

output "ttl_attribute_name" {
  description = "TTL attribute name"
  value       = var.ttl_enabled ? var.ttl_attribute_name : null
}

output "stream_enabled" {
  description = "Whether DynamoDB streams are enabled"
  value       = var.stream_enabled
}

output "stream_view_type" {
  description = "Stream view type"
  value       = var.stream_enabled ? var.stream_view_type : null
}

# Auto Scaling Outputs
output "read_autoscaling_target_arn" {
  description = "ARN of the read capacity auto scaling target"
  value       = var.enable_autoscaling && var.billing_mode == "PROVISIONED" ? aws_appautoscaling_target.read_target[0].arn : null
}

output "write_autoscaling_target_arn" {
  description = "ARN of the write capacity auto scaling target"
  value       = var.enable_autoscaling && var.billing_mode == "PROVISIONED" ? aws_appautoscaling_target.write_target[0].arn : null
}

output "read_autoscaling_policy_arn" {
  description = "ARN of the read capacity auto scaling policy"
  value       = var.enable_autoscaling && var.billing_mode == "PROVISIONED" ? aws_appautoscaling_policy.read_policy[0].arn : null
}

output "write_autoscaling_policy_arn" {
  description = "ARN of the write capacity auto scaling policy"
  value       = var.enable_autoscaling && var.billing_mode == "PROVISIONED" ? aws_appautoscaling_policy.write_policy[0].arn : null
}

# Backup Outputs
output "backup_vault_arn" {
  description = "ARN of the backup vault"
  value       = var.enable_continuous_backups ? aws_backup_vault.dynamodb[0].arn : null
}

output "backup_plan_arn" {
  description = "ARN of the backup plan"
  value       = var.enable_continuous_backups ? aws_backup_plan.dynamodb[0].arn : null
}

output "backup_plan_id" {
  description = "ID of the backup plan"
  value       = var.enable_continuous_backups ? aws_backup_plan.dynamodb[0].id : null
}

output "backup_selection_id" {
  description = "ID of the backup selection"
  value       = var.enable_continuous_backups ? aws_backup_selection.dynamodb[0].id : null
}

# CloudWatch Alarm Outputs
output "read_throttle_alarm_arn" {
  description = "ARN of the read throttle CloudWatch alarm"
  value       = var.enable_cloudwatch_alarms ? aws_cloudwatch_metric_alarm.read_throttled_requests[0].arn : null
}

output "write_throttle_alarm_arn" {
  description = "ARN of the write throttle CloudWatch alarm"
  value       = var.enable_cloudwatch_alarms ? aws_cloudwatch_metric_alarm.write_throttled_requests[0].arn : null
}

output "consumed_read_capacity_alarm_arn" {
  description = "ARN of the consumed read capacity CloudWatch alarm"
  value       = var.enable_cloudwatch_alarms && var.billing_mode == "PROVISIONED" ? aws_cloudwatch_metric_alarm.consumed_read_capacity[0].arn : null
}

output "consumed_write_capacity_alarm_arn" {
  description = "ARN of the consumed write capacity CloudWatch alarm"
  value       = var.enable_cloudwatch_alarms && var.billing_mode == "PROVISIONED" ? aws_cloudwatch_metric_alarm.consumed_write_capacity[0].arn : null
}