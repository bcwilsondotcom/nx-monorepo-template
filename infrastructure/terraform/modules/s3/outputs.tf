# Outputs for S3 Module

output "bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.main.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.main.arn
}

output "bucket_id" {
  description = "ID of the S3 bucket"
  value       = aws_s3_bucket.main.id
}

output "bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.main.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "Regional domain name of the S3 bucket"
  value       = aws_s3_bucket.main.bucket_regional_domain_name
}

output "bucket_hosted_zone_id" {
  description = "Hosted zone ID of the S3 bucket"
  value       = aws_s3_bucket.main.hosted_zone_id
}

output "bucket_region" {
  description = "Region of the S3 bucket"
  value       = aws_s3_bucket.main.region
}

output "bucket_website_endpoint" {
  description = "Website endpoint of the S3 bucket"
  value       = var.website_configuration != null ? aws_s3_bucket_website_configuration.main[0].website_endpoint : null
}

output "bucket_website_domain" {
  description = "Website domain of the S3 bucket"
  value       = var.website_configuration != null ? aws_s3_bucket_website_configuration.main[0].website_domain : null
}

# Access Logs Bucket
output "access_logs_bucket_name" {
  description = "Name of the access logs bucket"
  value       = var.access_logging_enabled && var.access_log_target_bucket == "" ? aws_s3_bucket.access_logs[0].id : null
}

output "access_logs_bucket_arn" {
  description = "ARN of the access logs bucket"
  value       = var.access_logging_enabled && var.access_log_target_bucket == "" ? aws_s3_bucket.access_logs[0].arn : null
}

# CloudFront Distribution
output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = var.create_cloudfront_distribution ? aws_cloudfront_distribution.main[0].id : null
}

output "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = var.create_cloudfront_distribution ? aws_cloudfront_distribution.main[0].arn : null
}

output "cloudfront_distribution_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = var.create_cloudfront_distribution ? aws_cloudfront_distribution.main[0].domain_name : null
}

output "cloudfront_distribution_hosted_zone_id" {
  description = "Hosted zone ID of the CloudFront distribution"
  value       = var.create_cloudfront_distribution ? aws_cloudfront_distribution.main[0].hosted_zone_id : null
}

output "cloudfront_distribution_etag" {
  description = "ETag of the CloudFront distribution"
  value       = var.create_cloudfront_distribution ? aws_cloudfront_distribution.main[0].etag : null
}

output "cloudfront_distribution_status" {
  description = "Status of the CloudFront distribution"
  value       = var.create_cloudfront_distribution ? aws_cloudfront_distribution.main[0].status : null
}

output "cloudfront_origin_access_control_id" {
  description = "ID of the CloudFront Origin Access Control"
  value       = var.create_cloudfront_distribution ? aws_cloudfront_origin_access_control.main[0].id : null
}

# Versioning Status
output "versioning_status" {
  description = "Versioning status of the S3 bucket"
  value       = aws_s3_bucket_versioning.main.versioning_configuration[0].status
}

# Encryption Information
output "encryption_algorithm" {
  description = "Server-side encryption algorithm used"
  value       = var.sse_algorithm
}

output "encryption_kms_key_id" {
  description = "KMS key ID used for encryption"
  value       = var.kms_master_key_id
}

# Public Access Block Settings
output "public_access_block_settings" {
  description = "Public access block settings for the bucket"
  value = {
    block_public_acls       = aws_s3_bucket_public_access_block.main.block_public_acls
    block_public_policy     = aws_s3_bucket_public_access_block.main.block_public_policy
    ignore_public_acls      = aws_s3_bucket_public_access_block.main.ignore_public_acls
    restrict_public_buckets = aws_s3_bucket_public_access_block.main.restrict_public_buckets
  }
}