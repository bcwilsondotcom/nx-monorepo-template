# ECS/Fargate Module

This Terraform module creates a complete Amazon ECS (Elastic Container Service) infrastructure with Fargate launch type, including ECR repositories, Application Load Balancer, and auto-scaling capabilities.

## Features

- ECS Cluster with Fargate capacity providers
- ECR repositories for container images
- Application Load Balancer with target groups
- ECS services with auto-scaling
- IAM roles and policies for ECS tasks
- CloudWatch logging
- Health checks and service discovery
- Container image lifecycle management
- SSL/TLS support

## Usage

### Basic ECS Setup

```hcl
module "ecs" {
  source = "./modules/ecs"

  cluster_name = "my-app-cluster"
  vpc_id       = module.networking.vpc_id

  # Networking
  ecs_subnets         = module.networking.private_subnet_ids
  ecs_security_group_id = module.networking.ecs_security_group_id

  # Load Balancer
  create_load_balancer     = true
  load_balancer_subnets    = module.networking.public_subnet_ids
  alb_security_group_id    = module.networking.alb_security_group_id

  # ECR Repositories
  ecr_repositories = {
    web_app = {
      name             = "my-app/web"
      max_image_count  = 20
      scan_on_push     = true
    }
  }

  # Services
  services = {
    web = {
      ecr_repository = "web_app"
      image_tag      = "latest"
      cpu            = 512
      memory         = 1024
      container_port = 3000
      desired_count  = 2

      health_check = {
        path                = "/health"
        healthy_threshold   = 2
        unhealthy_threshold = 3
        timeout             = 5
        interval           = 30
        matcher            = "200"
      }

      autoscaling = {
        min_capacity     = 2
        max_capacity     = 10
        cpu_target_value = 70
        memory_target_value = 80
      }

      environment_variables = {
        NODE_ENV = "production"
        PORT     = "3000"
      }
    }
  }

  common_tags = {
    Environment = "production"
    Project     = "my-app"
  }
}
```

### Multi-Service Setup with HTTPS

```hcl
module "ecs_multi_service" {
  source = "./modules/ecs"

  cluster_name = "microservices-cluster"
  vpc_id       = module.networking.vpc_id

  # Networking
  ecs_subnets           = module.networking.private_subnet_ids
  ecs_security_group_id = module.networking.ecs_security_group_id

  # Load Balancer with SSL
  create_load_balancer    = true
  load_balancer_subnets   = module.networking.public_subnet_ids
  alb_security_group_id   = module.networking.alb_security_group_id
  alb_listener_port       = 443
  alb_listener_protocol   = "HTTPS"
  alb_certificate_arn     = aws_acm_certificate.main.arn

  # ECR Repositories
  ecr_repositories = {
    frontend = {
      name            = "microservices/frontend"
      max_image_count = 15
      scan_on_push    = true
    }
    api = {
      name            = "microservices/api"
      max_image_count = 20
      scan_on_push    = true
    }
    worker = {
      name            = "microservices/worker"
      max_image_count = 10
      scan_on_push    = true
    }
  }

  # Services
  services = {
    frontend = {
      ecr_repository         = "frontend"
      image_tag              = "v1.0.0"
      cpu                    = 256
      memory                 = 512
      container_port         = 80
      desired_count          = 3
      listener_rule_priority = 100
      path_patterns          = ["/", "/static/*"]

      health_check = {
        path = "/"
        matcher = "200"
      }

      autoscaling = {
        min_capacity              = 2
        max_capacity              = 20
        cpu_target_value          = 60
        memory_target_value       = 70
        request_count_target_value = 500
      }

      environment_variables = {
        API_URL = "https://api.example.com"
      }
    }

    api = {
      ecr_repository         = "api"
      image_tag              = "v2.1.0"
      cpu                    = 512
      memory                 = 1024
      container_port         = 8080
      desired_count          = 2
      listener_rule_priority = 200
      path_patterns          = ["/api/*"]

      health_check = {
        path                = "/api/health"
        healthy_threshold   = 2
        unhealthy_threshold = 5
        timeout             = 10
        interval           = 30
      }

      autoscaling = {
        min_capacity     = 2
        max_capacity     = 15
        cpu_target_value = 70
        memory_target_value = 80
      }

      environment_variables = {
        DATABASE_URL = "postgresql://..."
        REDIS_URL    = "redis://..."
      }

      secrets = {
        DATABASE_PASSWORD = "arn:aws:secretsmanager:region:account:secret:db-password"
        API_KEY          = "arn:aws:ssm:region:account:parameter/api-key"
      }

      task_role_policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect = "Allow"
            Action = [
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:DeleteItem"
            ]
            Resource = "arn:aws:dynamodb:region:account:table/my-table"
          }
        ]
      })
    }

    worker = {
      ecr_repository = "worker"
      image_tag      = "v1.5.0"
      cpu            = 256
      memory         = 512
      container_port = 8080
      desired_count  = 1

      # Worker doesn't need load balancer exposure
      listener_rule_priority = null
      path_patterns          = null

      health_check = {
        path = "/health"
      }

      autoscaling = {
        min_capacity     = 1
        max_capacity     = 5
        cpu_target_value = 80
      }

      environment_variables = {
        QUEUE_URL = "https://sqs.region.amazonaws.com/account/queue-name"
        LOG_LEVEL = "info"
      }
    }
  }

  # Logging
  log_retention_days = 30

  common_tags = {
    Environment = "production"
    Project     = "microservices"
    Owner       = "platform-team"
  }
}
```

### Cost-Optimized Setup with Spot Instances

```hcl
module "ecs_spot" {
  source = "./modules/ecs"

  cluster_name = "cost-optimized-cluster"
  vpc_id       = module.networking.vpc_id

  # Use Fargate Spot as default
  default_capacity_provider_strategy = [
    {
      capacity_provider = "FARGATE_SPOT"
      weight           = 3
      base             = 0
    },
    {
      capacity_provider = "FARGATE"
      weight           = 1
      base             = 1
    }
  ]

  # ECR with smaller image retention
  ecr_repositories = {
    app = {
      name            = "cost-optimized/app"
      max_image_count = 5
    }
  }

  # Services
  services = {
    app = {
      ecr_repository = "app"
      cpu            = 256
      memory         = 512
      container_port = 3000
      desired_count  = 1

      autoscaling = {
        min_capacity     = 1
        max_capacity     = 5
        cpu_target_value = 80
      }

      health_check = {
        path = "/health"
      }
    }
  }

  # Shorter log retention
  log_retention_days = 3

  common_tags = {
    Environment = "development"
    CostCenter  = "engineering"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| cluster_name | Name of the ECS cluster | `string` | n/a | yes |
| vpc_id | VPC ID where resources will be created | `string` | n/a | yes |
| ecs_subnets | List of subnet IDs for ECS services | `list(string)` | n/a | yes |
| ecs_security_group_id | Security group ID for ECS services | `string` | n/a | yes |
| services | Map of ECS services to create | `map(object)` | n/a | yes |
| cluster_kms_key_id | KMS key ID for ECS cluster encryption | `string` | `null` | no |
| capacity_providers | List of capacity providers for the ECS cluster | `list(string)` | `["FARGATE", "FARGATE_SPOT"]` | no |
| default_capacity_provider_strategy | Default capacity provider strategy for the cluster | `list(object)` | Fargate only | no |
| ecr_repositories | Map of ECR repositories to create | `map(object)` | `{}` | no |
| assign_public_ip | Assign public IP to ECS tasks | `bool` | `false` | no |
| create_load_balancer | Create Application Load Balancer | `bool` | `true` | no |
| load_balancer_internal | Make load balancer internal | `bool` | `false` | no |
| load_balancer_subnets | List of subnet IDs for the load balancer | `list(string)` | `[]` | no |
| alb_security_group_id | Security group ID for the Application Load Balancer | `string` | `""` | no |
| enable_deletion_protection | Enable deletion protection for the load balancer | `bool` | `false` | no |
| alb_access_logs_enabled | Enable access logs for the ALB | `bool` | `false` | no |
| alb_access_logs_bucket | S3 bucket for ALB access logs | `string` | `""` | no |
| alb_listener_port | Port for the ALB listener | `number` | `80` | no |
| alb_listener_protocol | Protocol for the ALB listener | `string` | `"HTTP"` | no |
| alb_certificate_arn | ARN of the ACM certificate for HTTPS listener | `string` | `null` | no |
| log_retention_days | CloudWatch log retention in days | `number` | `7` | no |
| common_tags | Common tags to apply to all resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| cluster_name | Name of the ECS cluster |
| cluster_id | ID of the ECS cluster |
| cluster_arn | ARN of the ECS cluster |
| ecr_repository_urls | URLs of the ECR repositories |
| ecr_repository_arns | ARNs of the ECR repositories |
| load_balancer_arn | ARN of the Application Load Balancer |
| load_balancer_dns_name | DNS name of the Application Load Balancer |
| load_balancer_hosted_zone_id | Hosted zone ID of the Application Load Balancer |
| target_group_arns | ARNs of the target groups |
| service_names | Names of the ECS services |
| service_arns | ARNs of the ECS services |
| task_definition_arns | ARNs of the task definitions |
| task_execution_role_arn | ARN of the ECS task execution role |
| task_role_arns | ARNs of the ECS task roles |
| log_group_names | Names of the CloudWatch log groups |
| autoscaling_target_arns | ARNs of the auto scaling targets |
| service_urls | URLs to access the services through the load balancer |
| deployment_summary | Summary of the ECS deployment |

## Service Configuration

Each service in the `services` map supports:

- **Container Configuration**: CPU, memory, port, image tag
- **Environment Variables**: Key-value pairs
- **Secrets**: ARNs from Secrets Manager or SSM Parameter Store
- **Health Checks**: Path, thresholds, timeouts
- **Auto Scaling**: CPU, memory, and request count based scaling
- **Load Balancer**: Path patterns, host headers, priority
- **IAM**: Custom task role policies

## Auto Scaling

The module supports three types of auto scaling:
1. **CPU Utilization**: Scales based on average CPU usage
2. **Memory Utilization**: Scales based on average memory usage
3. **Request Count**: Scales based on ALB target request count

## ECR Lifecycle Management

ECR repositories include automatic lifecycle policies:
- Keep the last N tagged images (configurable)
- Delete untagged images older than 1 day

## Security Best Practices

- Services run in private subnets by default
- IAM roles follow least privilege principle
- Container images are scanned for vulnerabilities
- Secrets are managed through AWS services
- CloudWatch logging is enabled for all services

## Cost Optimization

- Use Fargate Spot instances for non-critical workloads
- Configure appropriate CPU and memory allocations
- Set reasonable auto scaling limits
- Use shorter log retention for development environments
- Implement ECR lifecycle policies to manage storage costs