# Event-Driven Architecture Documentation

## Overview

The NX Monorepo Template implements an event-driven architecture using AWS EventBridge as the central event bus. This enables loose coupling between services, improved scalability, and better fault tolerance through asynchronous communication patterns.

## Event Bus Architecture

### AWS EventBridge Configuration
```yaml
EventBridge:
  DefaultEventBus: nx-monorepo-events
  CustomEventBuses:
    - ProjectEvents: nx-monorepo-project-events
    - BuildEvents: nx-monorepo-build-events
    - DeploymentEvents: nx-monorepo-deployment-events
```

### Event Sources
- **REST API**: User actions and API operations
- **CLI Tool**: Command-line operations
- **Lambda Functions**: Background processing
- **External Systems**: Third-party integrations
- **Scheduled Jobs**: Cron-based triggers

### Event Targets
- **Lambda Functions**: Event processors
- **SQS Queues**: Reliable message delivery
- **SNS Topics**: Notification distribution
- **Step Functions**: Workflow orchestration
- **CloudWatch**: Monitoring and alerting

## Event Schema Standards

### Base Event Structure
All events follow the CloudEvents specification with additional metadata:

```json
{
  "specversion": "1.0",
  "type": "com.nx-monorepo.project.created",
  "source": "api-example",
  "id": "evt_123456789",
  "time": "2024-01-15T10:30:00Z",
  "datacontenttype": "application/json",
  "subject": "projects/proj_123",
  "data": {
    // Event-specific payload
  },
  "metadata": {
    "correlation_id": "corr_123456789",
    "user_id": "user_456",
    "session_id": "sess_789",
    "source_version": "1.0.0",
    "environment": "production"
  }
}
```

### Event Naming Convention
Events follow the pattern: `com.nx-monorepo.{domain}.{action}`

**Examples:**
- `com.nx-monorepo.project.created`
- `com.nx-monorepo.build.started`
- `com.nx-monorepo.deployment.completed`
- `com.nx-monorepo.specification.updated`

## Project Events

### Project Created Event
Triggered when a new project is created in the monorepo.

```json
{
  "type": "com.nx-monorepo.project.created",
  "source": "api-example",
  "subject": "projects/proj_123",
  "data": {
    "project": {
      "id": "proj_123",
      "name": "user-service",
      "type": "api",
      "template": "nestjs",
      "path": "apps/user-service",
      "options": {
        "database": "postgresql",
        "auth": true,
        "swagger": true
      },
      "created_by": "user_456",
      "created_at": "2024-01-15T10:30:00Z"
    },
    "dependencies": ["shared-types", "shared-utils"],
    "initial_files": [
      "apps/user-service/src/main.ts",
      "apps/user-service/project.json",
      "apps/user-service/tsconfig.json"
    ]
  }
}
```

**Event Handlers:**
- **Dependency Analyzer**: Analyzes project dependencies
- **Code Generator**: Generates initial scaffolding
- **Documentation Generator**: Creates initial documentation
- **Test Generator**: Sets up test framework

### Project Updated Event
Triggered when project configuration or metadata is updated.

```json
{
  "type": "com.nx-monorepo.project.updated",
  "source": "api-example",
  "subject": "projects/proj_123",
  "data": {
    "project_id": "proj_123",
    "changes": {
      "description": {
        "old": "Old description",
        "new": "Updated description"
      },
      "status": {
        "old": "active",
        "new": "maintenance"
      }
    },
    "updated_by": "user_456",
    "updated_at": "2024-01-15T15:45:00Z"
  }
}
```

### Project Deleted Event
Triggered when a project is deleted from the monorepo.

```json
{
  "type": "com.nx-monorepo.project.deleted",
  "source": "api-example",
  "subject": "projects/proj_123",
  "data": {
    "project": {
      "id": "proj_123",
      "name": "user-service",
      "type": "api",
      "path": "apps/user-service"
    },
    "deleted_by": "user_456",
    "deleted_at": "2024-01-15T16:00:00Z",
    "cleanup_tasks": [
      "remove_dependencies",
      "update_nx_config",
      "cleanup_artifacts"
    ]
  }
}
```

## Build Events

### Build Started Event
Triggered when a build process begins.

```json
{
  "type": "com.nx-monorepo.build.started",
  "source": "build-system",
  "subject": "builds/build_123",
  "data": {
    "build": {
      "id": "build_123",
      "project_id": "proj_123",
      "type": "full",
      "triggered_by": "user_456",
      "trigger_reason": "manual",
      "started_at": "2024-01-15T16:00:00Z"
    },
    "configuration": {
      "target": "build",
      "executor": "@nx/node:build",
      "options": {
        "outputPath": "dist/apps/user-service",
        "main": "apps/user-service/src/main.ts"
      }
    },
    "affected_projects": ["user-service", "shared-types"]
  }
}
```

### Build Completed Event
Triggered when a build process completes successfully.

```json
{
  "type": "com.nx-monorepo.build.completed",
  "source": "build-system",
  "subject": "builds/build_123",
  "data": {
    "build": {
      "id": "build_123",
      "project_id": "proj_123",
      "status": "completed",
      "started_at": "2024-01-15T16:00:00Z",
      "completed_at": "2024-01-15T16:02:30Z",
      "duration": 150
    },
    "results": {
      "exit_code": 0,
      "tests_passed": 45,
      "tests_failed": 0,
      "coverage": 85.5
    },
    "artifacts": [
      {
        "name": "build-output",
        "path": "dist/apps/user-service",
        "size": 1024000,
        "checksum": "sha256:abc123..."
      }
    ],
    "metrics": {
      "build_time": 120,
      "test_time": 30,
      "bundle_size": 1024000
    }
  }
}
```

### Build Failed Event
Triggered when a build process fails.

```json
{
  "type": "com.nx-monorepo.build.failed",
  "source": "build-system",
  "subject": "builds/build_123",
  "data": {
    "build": {
      "id": "build_123",
      "project_id": "proj_123",
      "status": "failed",
      "started_at": "2024-01-15T16:00:00Z",
      "failed_at": "2024-01-15T16:01:15Z",
      "duration": 75
    },
    "error": {
      "code": "COMPILATION_ERROR",
      "message": "TypeScript compilation failed",
      "details": [
        {
          "file": "src/user.service.ts",
          "line": 25,
          "column": 10,
          "message": "Property 'id' does not exist on type 'User'"
        }
      ]
    },
    "failed_step": "compile",
    "logs_url": "s3://build-logs/build_123/logs.txt"
  }
}
```

## Deployment Events

### Deployment Triggered Event
Triggered when a deployment process starts.

```json
{
  "type": "com.nx-monorepo.deployment.triggered",
  "source": "deployment-system",
  "subject": "deployments/deploy_123",
  "data": {
    "deployment": {
      "id": "deploy_123",
      "project_id": "proj_123",
      "environment": "staging",
      "version": "1.2.0",
      "triggered_by": "user_456",
      "trigger_reason": "manual",
      "triggered_at": "2024-01-15T17:00:00Z"
    },
    "artifact": {
      "build_id": "build_123",
      "path": "s3://artifacts/proj_123/build_123.zip",
      "checksum": "sha256:def456..."
    },
    "configuration": {
      "strategy": "blue_green",
      "rollback_enabled": true,
      "health_checks": true
    }
  }
}
```

### Deployment Completed Event
Triggered when deployment completes successfully.

```json
{
  "type": "com.nx-monorepo.deployment.completed",
  "source": "deployment-system",
  "subject": "deployments/deploy_123",
  "data": {
    "deployment": {
      "id": "deploy_123",
      "project_id": "proj_123",
      "environment": "staging",
      "status": "completed",
      "triggered_at": "2024-01-15T17:00:00Z",
      "completed_at": "2024-01-15T17:05:00Z",
      "duration": 300
    },
    "endpoints": [
      {
        "name": "api",
        "url": "https://user-service-staging.example.com",
        "health_check": "https://user-service-staging.example.com/health"
      }
    ],
    "metrics": {
      "deployment_time": 300,
      "health_check_time": 15,
      "instances_deployed": 3
    }
  }
}
```

## Specification Events

### Specification Updated Event
Triggered when API or AsyncAPI specifications are updated.

```json
{
  "type": "com.nx-monorepo.specification.updated",
  "source": "spec-manager",
  "subject": "specifications/spec_123",
  "data": {
    "specification": {
      "id": "spec_123",
      "name": "user-api",
      "type": "openapi",
      "version": "1.1.0",
      "project_id": "proj_123",
      "file_path": "specs/openapi/user-api.yaml"
    },
    "changes": {
      "version": {
        "old": "1.0.0",
        "new": "1.1.0"
      },
      "endpoints": {
        "added": ["/users/{id}/preferences"],
        "modified": ["/users/{id}"],
        "removed": []
      }
    },
    "updated_by": "user_456",
    "updated_at": "2024-01-15T14:30:00Z"
  }
}
```

### Specification Generated Event
Triggered when code is generated from specifications.

```json
{
  "type": "com.nx-monorepo.specification.generated",
  "source": "code-generator",
  "subject": "specifications/spec_123",
  "data": {
    "specification": {
      "id": "spec_123",
      "name": "user-api",
      "type": "openapi",
      "version": "1.1.0"
    },
    "generation": {
      "id": "gen_456",
      "target": "typescript-client",
      "output_path": "packages/generated/user-client",
      "status": "completed",
      "started_at": "2024-01-15T14:35:00Z",
      "completed_at": "2024-01-15T14:36:30Z"
    },
    "generated_files": [
      "packages/generated/user-client/src/api.ts",
      "packages/generated/user-client/src/models.ts",
      "packages/generated/user-client/README.md"
    ]
  }
}
```

## Event Processing Patterns

### Event Handler Lambda Function
```typescript
import { EventBridgeEvent, Context } from 'aws-lambda';
import { ProjectCreatedEvent } from '@nx-monorepo-template/shared-types';

export const handler = async (
  event: EventBridgeEvent<'com.nx-monorepo.project.created', ProjectCreatedEvent>,
  context: Context
) => {
  console.log('Processing project created event:', event.id);

  try {
    const { project, dependencies } = event.detail;

    // Process the event
    await processProjectCreation(project, dependencies);

    // Emit follow-up events if needed
    await emitEvent('com.nx-monorepo.project.dependencies.analyzed', {
      project_id: project.id,
      dependencies: dependencies,
      analysis_completed_at: new Date().toISOString()
    });

    return { statusCode: 200, body: 'Event processed successfully' };
  } catch (error) {
    console.error('Event processing failed:', error);

    // Emit error event
    await emitEvent('com.nx-monorepo.project.creation.failed', {
      project_id: event.detail.project.id,
      error: error.message,
      failed_at: new Date().toISOString()
    });

    throw error;
  }
};
```

### Event Publishing
```typescript
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

class EventPublisher {
  private eventBridge: EventBridgeClient;

  constructor() {
    this.eventBridge = new EventBridgeClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  async publishEvent(eventType: string, data: any, source: string) {
    const event = {
      Source: source,
      DetailType: eventType,
      Detail: JSON.stringify(data),
      EventBusName: 'nx-monorepo-events',
      Time: new Date()
    };

    const command = new PutEventsCommand({
      Entries: [event]
    });

    return await this.eventBridge.send(command);
  }
}
```

### Event Subscription and Routing
```yaml
# EventBridge Rules Configuration
Rules:
  ProjectCreatedRule:
    EventPattern:
      source: ["api-example"]
      detail-type: ["com.nx-monorepo.project.created"]
    Targets:
      - ProjectCreatedHandler
      - DependencyAnalyzer
      - DocumentationGenerator

  BuildCompletedRule:
    EventPattern:
      source: ["build-system"]
      detail-type: ["com.nx-monorepo.build.completed"]
    Targets:
      - DeploymentTrigger
      - NotificationService
      - MetricsCollector

  BuildFailedRule:
    EventPattern:
      source: ["build-system"]
      detail-type: ["com.nx-monorepo.build.failed"]
    Targets:
      - AlertingService
      - FailureAnalyzer
```

## Error Handling and Dead Letter Queues

### Dead Letter Queue Configuration
```yaml
DeadLetterQueues:
  ProjectEventsDLQ:
    MessageRetentionPeriod: 1209600  # 14 days
    VisibilityTimeoutSeconds: 60
    MaxReceiveCount: 3

  BuildEventsDLQ:
    MessageRetentionPeriod: 604800   # 7 days
    VisibilityTimeoutSeconds: 30
    MaxReceiveCount: 5
```

### Retry Configuration
```typescript
const retryConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  exponentialBackoff: true,
  maxDelayMs: 10000
};
```

### Error Event Schema
```json
{
  "type": "com.nx-monorepo.system.error",
  "source": "event-processor",
  "subject": "events/evt_123",
  "data": {
    "original_event": {
      "id": "evt_123",
      "type": "com.nx-monorepo.project.created",
      "source": "api-example"
    },
    "error": {
      "code": "PROCESSING_ERROR",
      "message": "Failed to process project creation",
      "stack_trace": "Error: ...",
      "retry_count": 3
    },
    "processor": {
      "function_name": "project-creation-handler",
      "version": "1.0.0",
      "execution_id": "exec_456"
    },
    "occurred_at": "2024-01-15T10:35:00Z"
  }
}
```

## Event Monitoring and Observability

### CloudWatch Metrics
- **Event Volume**: Number of events published/processed
- **Processing Latency**: Time from event publication to processing
- **Error Rate**: Percentage of failed event processing
- **Dead Letter Queue Depth**: Number of messages in DLQ

### CloudWatch Dashboards
```yaml
EventMetrics:
  Widgets:
    - EventVolumeChart:
        Metrics:
          - EventBridge.PublishedEvents
          - EventBridge.ProcessedEvents
    - ErrorRateChart:
        Metrics:
          - EventBridge.FailedEvents
          - EventBridge.DeadLetterQueueMessages
    - LatencyChart:
        Metrics:
          - Lambda.Duration
          - Lambda.Invocations
```

### X-Ray Tracing
Events are traced end-to-end using AWS X-Ray to visualize:
- Event flow between services
- Processing latency and bottlenecks
- Error propagation and impact
- Service dependencies and interactions

## Event Schema Registry

### Schema Validation
```typescript
import Ajv from 'ajv';
import { projectCreatedSchema } from './schemas/project-created.json';

const ajv = new Ajv();
const validateProjectCreated = ajv.compile(projectCreatedSchema);

export function validateEvent(eventType: string, data: any): boolean {
  switch (eventType) {
    case 'com.nx-monorepo.project.created':
      return validateProjectCreated(data);
    default:
      throw new Error(`Unknown event type: ${eventType}`);
  }
}
```

### Schema Evolution
- **Backward Compatibility**: New fields are optional
- **Version Management**: Schema versions tracked in registry
- **Migration Support**: Automatic data migration for schema changes
- **Validation**: All events validated against schema before publishing

## Testing Event-Driven Flows

### Integration Testing
```typescript
import { EventBridgeTestHarness } from '@nx-monorepo-template/test-utils';

describe('Project Creation Flow', () => {
  let eventHarness: EventBridgeTestHarness;

  beforeEach(async () => {
    eventHarness = new EventBridgeTestHarness();
    await eventHarness.setup();
  });

  it('should process project creation event', async () => {
    // Arrange
    const projectData = {
      id: 'proj_test',
      name: 'test-project',
      type: 'api'
    };

    // Act
    await eventHarness.publishEvent('com.nx-monorepo.project.created', projectData);

    // Assert
    const dependencyEvent = await eventHarness.waitForEvent(
      'com.nx-monorepo.project.dependencies.analyzed',
      5000
    );

    expect(dependencyEvent.detail.project_id).toBe('proj_test');
  });
});
```

### Local Event Testing
```bash
# Start LocalStack with EventBridge
docker-compose up -d localstack

# Publish test event
aws --endpoint-url=http://localhost:4566 events put-events \
  --entries '[{
    "Source": "test",
    "DetailType": "com.nx-monorepo.project.created",
    "Detail": "{\"project\":{\"id\":\"test\",\"name\":\"test-project\"}}"
  }]'
```

## Best Practices

### Event Design
1. **Immutable Events**: Events should never be modified after creation
2. **Rich Context**: Include sufficient data to avoid additional lookups
3. **Idempotency**: Event handlers should be idempotent
4. **Ordering**: Don't rely on event ordering unless guaranteed
5. **Versioning**: Plan for schema evolution from the start

### Performance Optimization
1. **Batch Processing**: Process multiple events in batches when possible
2. **Parallel Processing**: Use concurrent Lambda executions
3. **Circuit Breakers**: Implement circuit breakers for external dependencies
4. **Caching**: Cache frequently accessed data
5. **Connection Pooling**: Reuse database connections

### Security Considerations
1. **Encryption**: Encrypt sensitive data in events
2. **Access Control**: Use IAM roles for event access
3. **Audit Logging**: Log all event processing activities
4. **Data Masking**: Mask PII in event logs
5. **Compliance**: Ensure events meet regulatory requirements

## References

- [AWS EventBridge Documentation](https://docs.aws.amazon.com/eventbridge/)
- [CloudEvents Specification](https://cloudevents.io/)
- [Event-Driven Architecture Patterns](https://aws.amazon.com/event-driven-architecture/)
- [AsyncAPI Specification](https://www.asyncapi.com/docs/specifications/v2.6.0)

---

**Last Updated**: January 15, 2024
**Schema Version**: v1.0.0