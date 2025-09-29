# S3 Module

This Terraform module creates an AWS S3 bucket with comprehensive configuration options including versioning, lifecycle policies, CORS, website hosting, CloudFront distribution, and security settings.

## Features

- S3 bucket with configurable name and settings
- Versioning support
- Server-side encryption (AES256 or KMS)
- Public access block settings
- Lifecycle policies for cost optimization
- CORS configuration for web applications
- Website hosting configuration
- Access logging
- Event notifications (Lambda, SNS, SQS)
- CloudFront distribution integration
- Origin Access Control (OAC) for secure CloudFront access

## Usage

### Basic S3 Bucket

```hcl
module "s3_bucket" {
  source = "./modules/s3"

  bucket_name        = "my-app-bucket"
  versioning_enabled = true
  force_destroy      = false

  # Encryption
  sse_algorithm = "AES256"

  # Lifecycle rules
  lifecycle_rules = [
    {
      id      = "delete_old_versions"
      enabled = true
      noncurrent_version_expiration = {
        days = 30
      }
    },
    {
      id      = "archive_old_objects"
      enabled = true
      transitions = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        }
      ]
    }
  ]

  common_tags = {
    Environment = "production"
    Project     = "myapp"
  }
}
```

### S3 Bucket for Static Website with CloudFront

```hcl
module "s3_website" {
  source = "./modules/s3"

  bucket_name = "my-website-bucket"

  # Website configuration
  website_configuration = {
    index_document = {
      suffix = "index.html"
    }
    error_document = {
      key = "error.html"
    }
  }

  # CORS for web applications
  cors_rules = [
    {
      allowed_headers = ["*"]
      allowed_methods = ["GET", "HEAD"]
      allowed_origins = ["https://example.com"]
      max_age_seconds = 3000
    }
  ]

  # CloudFront distribution
  create_cloudfront_distribution = true
  cloudfront_aliases             = ["www.example.com"]
  cloudfront_acm_certificate_arn = aws_acm_certificate.main.arn
  cloudfront_default_root_object = "index.html"
  cloudfront_price_class         = "PriceClass_100"

  # Security settings
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false

  common_tags = {
    Environment = "production"
    Project     = "website"
  }
}
```

### S3 Bucket with KMS Encryption and Logging

```hcl
module "s3_secure" {
  source = "./modules/s3"

  bucket_name = "my-secure-bucket"

  # KMS encryption
  sse_algorithm      = "aws:kms"
  kms_master_key_id  = aws_kms_key.s3.arn
  bucket_key_enabled = true

  # Access logging
  access_logging_enabled    = true
  access_log_target_prefix  = "access-logs/"

  # Event notifications
  lambda_notifications = [
    {
      lambda_function_arn = aws_lambda_function.processor.arn
      events              = ["s3:ObjectCreated:*"]
      filter_prefix       = "uploads/"
      filter_suffix       = ".jpg"
    }
  ]

  # Lifecycle rules for cost optimization
  lifecycle_rules = [
    {
      id      = "intelligent_tiering"
      enabled = true
      transitions = [
        {
          days          = 0
          storage_class = "INTELLIGENT_TIERING"
        }
      ]
    }
  ]

  common_tags = {
    Environment = "production"
    Project     = "myapp"
    Sensitive   = "true"
  }
}
```

### S3 Bucket with Custom Bucket Policy

```hcl
module "s3_custom_policy" {
  source = "./modules/s3"

  bucket_name = "my-public-bucket"

  # Custom bucket policy for public read access
  bucket_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "arn:aws:s3:::my-public-bucket/*"
      }
    ]
  })

  # Allow public access for this specific use case
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false

  common_tags = {
    Environment = "production"
    Project     = "public-assets"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| bucket_name | Name of the S3 bucket | `string` | n/a | yes |
| force_destroy | Allow the bucket to be destroyed even if it contains objects | `bool` | `false` | no |
| versioning_enabled | Enable versioning for the S3 bucket | `bool` | `true` | no |
| sse_algorithm | Server-side encryption algorithm | `string` | `"AES256"` | no |
| kms_master_key_id | KMS key ID for encryption | `string` | `null` | no |
| bucket_key_enabled | Enable S3 bucket key for KMS encryption | `bool` | `true` | no |
| block_public_acls | Block public ACLs | `bool` | `true` | no |
| block_public_policy | Block public bucket policies | `bool` | `true` | no |
| ignore_public_acls | Ignore public ACLs | `bool` | `true` | no |
| restrict_public_buckets | Restrict public bucket policies | `bool` | `true` | no |
| bucket_policy | JSON policy document for the bucket | `string` | `null` | no |
| lifecycle_rules | List of lifecycle rules for the bucket | `list(object)` | `[]` | no |
| cors_rules | List of CORS rules for the bucket | `list(object)` | `[]` | no |
| website_configuration | Website configuration for the bucket | `object` | `null` | no |
| access_logging_enabled | Enable access logging for the bucket | `bool` | `false` | no |
| access_log_target_bucket | Target bucket for access logs | `string` | `""` | no |
| access_log_target_prefix | Prefix for access log objects | `string` | `"access-logs/"` | no |
| lambda_notifications | Lambda function notifications for S3 events | `list(object)` | `[]` | no |
| sns_notifications | SNS topic notifications for S3 events | `list(object)` | `[]` | no |
| sqs_notifications | SQS queue notifications for S3 events | `list(object)` | `[]` | no |
| create_cloudfront_distribution | Create a CloudFront distribution for the S3 bucket | `bool` | `false` | no |
| cloudfront_aliases | CNAMEs for the CloudFront distribution | `list(string)` | `[]` | no |
| cloudfront_acm_certificate_arn | ARN of ACM certificate for CloudFront | `string` | `null` | no |
| cloudfront_price_class | Price class for CloudFront distribution | `string` | `"PriceClass_100"` | no |
| common_tags | Common tags to apply to all resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| bucket_name | Name of the S3 bucket |
| bucket_arn | ARN of the S3 bucket |
| bucket_id | ID of the S3 bucket |
| bucket_domain_name | Domain name of the S3 bucket |
| bucket_regional_domain_name | Regional domain name of the S3 bucket |
| bucket_hosted_zone_id | Hosted zone ID of the S3 bucket |
| bucket_region | Region of the S3 bucket |
| bucket_website_endpoint | Website endpoint of the S3 bucket |
| bucket_website_domain | Website domain of the S3 bucket |
| access_logs_bucket_name | Name of the access logs bucket |
| access_logs_bucket_arn | ARN of the access logs bucket |
| cloudfront_distribution_id | ID of the CloudFront distribution |
| cloudfront_distribution_arn | ARN of the CloudFront distribution |
| cloudfront_distribution_domain_name | Domain name of the CloudFront distribution |
| cloudfront_distribution_hosted_zone_id | Hosted zone ID of the CloudFront distribution |
| cloudfront_origin_access_control_id | ID of the CloudFront Origin Access Control |
| versioning_status | Versioning status of the S3 bucket |
| encryption_algorithm | Server-side encryption algorithm used |
| public_access_block_settings | Public access block settings for the bucket |

## Lifecycle Rules

The module supports comprehensive lifecycle rules including:

- Object expiration
- Non-current version expiration
- Transition to different storage classes (IA, Glacier, Deep Archive)
- Abort incomplete multipart uploads
- Filter by prefix or tags

## Storage Classes

Available storage classes for transitions:
- `STANDARD_IA` - Standard Infrequent Access
- `ONEZONE_IA` - One Zone Infrequent Access
- `INTELLIGENT_TIERING` - Intelligent Tiering
- `GLACIER` - Glacier
- `DEEP_ARCHIVE` - Glacier Deep Archive

## CloudFront Integration

When `create_cloudfront_distribution` is enabled, the module:
- Creates an Origin Access Control (OAC) for secure access
- Configures CloudFront distribution with the S3 bucket as origin
- Updates bucket policy to allow CloudFront access
- Supports custom domains with ACM certificates

## Security Best Practices

- Public access is blocked by default
- Server-side encryption is enabled by default
- Versioning is enabled by default
- Supports KMS encryption for sensitive data
- Origin Access Control (OAC) for CloudFront integration

## Cost Optimization

- Use lifecycle rules to transition objects to cheaper storage classes
- Enable Intelligent Tiering for unpredictable access patterns
- Use appropriate CloudFront price classes
- Consider One Zone IA for non-critical data
- Set up object expiration for temporary data