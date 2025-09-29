# Outputs for Lambda Module

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.main.arn
}

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.main.function_name
}

output "lambda_function_qualified_arn" {
  description = "Qualified ARN of the Lambda function"
  value       = aws_lambda_function.main.qualified_arn
}

output "lambda_invoke_arn" {
  description = "Invoke ARN of the Lambda function"
  value       = aws_lambda_function.main.invoke_arn
}

output "lambda_function_version" {
  description = "Version of the Lambda function"
  value       = aws_lambda_function.main.version
}

output "lambda_function_last_modified" {
  description = "Last modified date of the Lambda function"
  value       = aws_lambda_function.main.last_modified
}

output "lambda_function_source_code_hash" {
  description = "Source code hash of the Lambda function"
  value       = aws_lambda_function.main.source_code_hash
}

output "lambda_function_source_code_size" {
  description = "Source code size of the Lambda function"
  value       = aws_lambda_function.main.source_code_size
}

output "lambda_role_arn" {
  description = "ARN of the Lambda IAM role"
  value       = aws_iam_role.lambda.arn
}

output "lambda_role_name" {
  description = "Name of the Lambda IAM role"
  value       = aws_iam_role.lambda.name
}

output "lambda_cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda.name
}

output "lambda_cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda.arn
}

output "lambda_dead_letter_queue_arn" {
  description = "ARN of the dead letter queue"
  value       = var.enable_dead_letter_queue ? aws_sqs_queue.dead_letter[0].arn : null
}

output "lambda_dead_letter_queue_url" {
  description = "URL of the dead letter queue"
  value       = var.enable_dead_letter_queue ? aws_sqs_queue.dead_letter[0].url : null
}

output "lambda_function_url" {
  description = "Lambda function URL"
  value       = var.enable_function_url ? aws_lambda_function_url.main[0].function_url : null
}

output "lambda_function_url_creation_time" {
  description = "Creation time of the Lambda function URL"
  value       = var.enable_function_url ? aws_lambda_function_url.main[0].creation_time : null
}

output "lambda_alias_arn" {
  description = "ARN of the Lambda alias"
  value       = var.create_alias ? aws_lambda_alias.main[0].arn : null
}

output "lambda_alias_name" {
  description = "Name of the Lambda alias"
  value       = var.create_alias ? aws_lambda_alias.main[0].name : null
}

output "lambda_alias_invoke_arn" {
  description = "Invoke ARN of the Lambda alias"
  value       = var.create_alias ? aws_lambda_alias.main[0].invoke_arn : null
}

output "error_alarm_arn" {
  description = "ARN of the error CloudWatch alarm"
  value       = var.enable_error_alarm ? aws_cloudwatch_metric_alarm.lambda_errors[0].arn : null
}

output "duration_alarm_arn" {
  description = "ARN of the duration CloudWatch alarm"
  value       = var.enable_duration_alarm ? aws_cloudwatch_metric_alarm.lambda_duration[0].arn : null
}