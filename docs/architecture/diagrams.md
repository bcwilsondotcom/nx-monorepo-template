# Architecture Diagrams and Flow Charts

This document contains visual representations of the system architecture, data flows, and key processes.

## System Overview Diagram

```mermaid
graph TB
    subgraph "Client Applications"
        WEB[Web App<br/>Next.js]
        CLI[CLI Tool<br/>Commander.js]
        MOB[Mobile App<br/>React Native]
    end

    subgraph "API Gateway"
        GW[AWS API Gateway<br/>Load Balancer]
    end

    subgraph "Microservices"
        API[REST API<br/>NestJS]
        EH[Event Handler<br/>AWS Lambda]
        PROC[Background Processor<br/>AWS Lambda]
    end

    subgraph "Event Bus"
        EB[AWS EventBridge<br/>Event Router]
        SQS[AWS SQS<br/>Message Queue]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Primary DB)]
        DDB[(DynamoDB<br/>Event Store)]
        S3[(AWS S3<br/>File Storage)]
        REDIS[(Redis<br/>Cache)]
    end

    subgraph "External Services"
        AUTH[Authentication<br/>Cognito]
        MON[Monitoring<br/>CloudWatch]
        SEC[Secrets<br/>AWS Secrets Manager]
    end

    WEB --> GW
    CLI --> GW
    MOB --> GW

    GW --> API

    API --> EB
    API --> PG
    API --> REDIS
    API --> AUTH

    EB --> EH
    EB --> PROC
    EB --> SQS

    EH --> DDB
    EH --> S3
    PROC --> PG
    PROC --> DDB

    API --> SEC
    EH --> SEC
    PROC --> SEC

    API --> MON
    EH --> MON
    PROC --> MON

    classDef client fill:#e1f5fe
    classDef gateway fill:#f3e5f5
    classDef service fill:#e8f5e8
    classDef event fill:#fff3e0
    classDef data fill:#fce4ec
    classDef external fill:#f1f8e9

    class WEB,CLI,MOB client
    class GW gateway
    class API,EH,PROC service
    class EB,SQS event
    class PG,DDB,S3,REDIS data
    class AUTH,MON,SEC external
```

## Service Interaction Flow

```mermaid
sequenceDiagram
    participant Client
    participant API Gateway
    participant REST API
    participant EventBridge
    participant Event Handler
    participant Database
    participant Cache

    Client->>API Gateway: HTTP Request
    API Gateway->>REST API: Route Request

    REST API->>Cache: Check Cache
    alt Cache Hit
        Cache-->>REST API: Return Cached Data
        REST API-->>API Gateway: Response
        API Gateway-->>Client: HTTP Response
    else Cache Miss
        REST API->>Database: Query Data
        Database-->>REST API: Return Data
        REST API->>Cache: Store in Cache
        REST API->>EventBridge: Publish Event
        REST API-->>API Gateway: Response
        API Gateway-->>Client: HTTP Response

        EventBridge->>Event Handler: Trigger Handler
        Event Handler->>Database: Process Event
        Database-->>Event Handler: Confirm
    end
```

## Event-Driven Architecture Flow

```mermaid
graph LR
    subgraph "Event Sources"
        API[REST API]
        CLI[CLI Tool]
        EXT[External Systems]
        SCHED[Scheduled Jobs]
    end

    subgraph "Event Bus"
        EB[EventBridge<br/>Central Router]
        RULES[Event Rules<br/>Routing Logic]
    end

    subgraph "Event Handlers"
        PROC[Data Processor<br/>Lambda]
        NOTIF[Notification<br/>Lambda]
        SYNC[Data Sync<br/>Lambda]
        AUDIT[Audit Logger<br/>Lambda]
    end

    subgraph "Data Stores"
        ES[(Event Store<br/>DynamoDB)]
        ANAL[(Analytics<br/>S3)]
        LOGS[(Logs<br/>CloudWatch)]
    end

    API --> EB
    CLI --> EB
    EXT --> EB
    SCHED --> EB

    EB --> RULES
    RULES --> PROC
    RULES --> NOTIF
    RULES --> SYNC
    RULES --> AUDIT

    PROC --> ES
    NOTIF --> LOGS
    SYNC --> ES
    AUDIT --> ANAL

    classDef source fill:#e3f2fd
    classDef bus fill:#f3e5f5
    classDef handler fill:#e8f5e8
    classDef store fill:#fce4ec

    class API,CLI,EXT,SCHED source
    class EB,RULES bus
    class PROC,NOTIF,SYNC,AUDIT handler
    class ES,ANAL,LOGS store
```

## Data Flow Architecture

```mermaid
graph TD
    subgraph "Data Sources"
        USER[User Actions]
        API[API Calls]
        BATCH[Batch Jobs]
        STREAM[Real-time Streams]
    end

    subgraph "Ingestion Layer"
        GATEWAY[API Gateway]
        KINESIS[Kinesis Streams]
        SQS[SQS Queues]
    end

    subgraph "Processing Layer"
        LAMBDA[Lambda Functions]
        ECS[ECS Tasks]
        GLUE[AWS Glue]
    end

    subgraph "Storage Layer"
        PG[(PostgreSQL<br/>OLTP)]
        DDB[(DynamoDB<br/>NoSQL)]
        S3[(S3<br/>Data Lake)]
        REDSHIFT[(Redshift<br/>Data Warehouse)]
    end

    subgraph "Analytics Layer"
        ATHENA[Athena<br/>Ad-hoc Queries]
        QUICKSIGHT[QuickSight<br/>Dashboards]
        SAGE[SageMaker<br/>ML Models]
    end

    USER --> GATEWAY
    API --> GATEWAY
    BATCH --> KINESIS
    STREAM --> KINESIS

    GATEWAY --> LAMBDA
    KINESIS --> LAMBDA
    SQS --> LAMBDA

    LAMBDA --> PG
    LAMBDA --> DDB
    ECS --> S3
    GLUE --> REDSHIFT

    S3 --> ATHENA
    REDSHIFT --> QUICKSIGHT
    S3 --> SAGE

    classDef source fill:#e1f5fe
    classDef ingestion fill:#f3e5f5
    classDef processing fill:#e8f5e8
    classDef storage fill:#fce4ec
    classDef analytics fill:#fff3e0

    class USER,API,BATCH,STREAM source
    class GATEWAY,KINESIS,SQS ingestion
    class LAMBDA,ECS,GLUE processing
    class PG,DDB,S3,REDSHIFT storage
    class ATHENA,QUICKSIGHT,SAGE analytics
```

## Security Architecture

```mermaid
graph TB
    subgraph "External Zone"
        INT[Internet]
        CDN[CloudFront CDN]
    end

    subgraph "DMZ Zone"
        WAF[AWS WAF]
        ALB[Application Load Balancer]
        SHIELD[AWS Shield]
    end

    subgraph "Application Zone"
        API[REST API Service]
        WEB[Web Application]
        LAMBDA[Lambda Functions]
    end

    subgraph "Data Zone"
        RDS[(RDS PostgreSQL)]
        DDB[(DynamoDB)]
        S3[(S3 Buckets)]
    end

    subgraph "Security Services"
        COGNITO[AWS Cognito<br/>Authentication]
        IAM[IAM Roles<br/>Authorization]
        KMS[AWS KMS<br/>Encryption]
        SECRETS[Secrets Manager]
        GUARD[GuardDuty<br/>Threat Detection]
    end

    INT --> CDN
    CDN --> WAF
    WAF --> SHIELD
    SHIELD --> ALB
    ALB --> API
    ALB --> WEB

    API --> LAMBDA
    API --> RDS
    LAMBDA --> DDB
    LAMBDA --> S3

    API <--> COGNITO
    API <--> IAM
    RDS <--> KMS
    DDB <--> KMS
    S3 <--> KMS
    API <--> SECRETS
    LAMBDA <--> SECRETS

    GUARD -.-> API
    GUARD -.-> LAMBDA
    GUARD -.-> RDS

    classDef external fill:#ffebee
    classDef dmz fill:#fff3e0
    classDef app fill:#e8f5e8
    classDef data fill:#e3f2fd
    classDef security fill:#f3e5f5

    class INT,CDN external
    class WAF,ALB,SHIELD dmz
    class API,WEB,LAMBDA app
    class RDS,DDB,S3 data
    class COGNITO,IAM,KMS,SECRETS,GUARD security
```

## CI/CD Pipeline Flow

```mermaid
graph LR
    subgraph "Development"
        DEV[Developer]
        IDE[IDE/DevContainer]
        LOCAL[Local Testing]
    end

    subgraph "Source Control"
        GIT[Git Repository]
        PR[Pull Request]
        REVIEW[Code Review]
    end

    subgraph "CI Pipeline"
        BUILD[Build & Test]
        LINT[Code Quality]
        SECURITY[Security Scan]
        ARTIFACT[Build Artifacts]
    end

    subgraph "CD Pipeline"
        STAGING[Deploy Staging]
        TEST[Integration Tests]
        PROD[Deploy Production]
        ROLLBACK[Rollback Strategy]
    end

    subgraph "Monitoring"
        METRICS[Metrics Collection]
        ALERTS[Alert Management]
        LOGS[Log Aggregation]
    end

    DEV --> IDE
    IDE --> LOCAL
    LOCAL --> GIT
    GIT --> PR
    PR --> REVIEW
    REVIEW --> BUILD

    BUILD --> LINT
    LINT --> SECURITY
    SECURITY --> ARTIFACT
    ARTIFACT --> STAGING

    STAGING --> TEST
    TEST --> PROD
    PROD --> ROLLBACK

    STAGING --> METRICS
    PROD --> METRICS
    METRICS --> ALERTS
    METRICS --> LOGS

    classDef dev fill:#e8f5e8
    classDef source fill:#e3f2fd
    classDef ci fill:#fff3e0
    classDef cd fill:#fce4ec
    classDef monitor fill:#f3e5f5

    class DEV,IDE,LOCAL dev
    class GIT,PR,REVIEW source
    class BUILD,LINT,SECURITY,ARTIFACT ci
    class STAGING,TEST,PROD,ROLLBACK cd
    class METRICS,ALERTS,LOGS monitor
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development Environment"
        DEV_API[API Service]
        DEV_WEB[Web App]
        DEV_DB[(Local DB)]
        LOCALSTACK[LocalStack]
    end

    subgraph "Staging Environment"
        STAGE_API[API Service]
        STAGE_WEB[Web App]
        STAGE_DB[(RDS Staging)]
        STAGE_CACHE[(Redis)]
    end

    subgraph "Production Environment"
        PROD_API[API Service]
        PROD_WEB[Web App]
        PROD_DB[(RDS Production)]
        PROD_CACHE[(Redis Cluster)]
        PROD_CDN[CloudFront]
    end

    subgraph "Shared Services"
        COGNITO[AWS Cognito]
        SECRETS[Secrets Manager]
        MONITORING[CloudWatch]
        TERRAFORM[Terraform State]
    end

    DEV_API --> LOCALSTACK
    DEV_WEB --> DEV_API
    DEV_API --> DEV_DB

    STAGE_API --> STAGE_DB
    STAGE_API --> STAGE_CACHE
    STAGE_WEB --> STAGE_API

    PROD_API --> PROD_DB
    PROD_API --> PROD_CACHE
    PROD_WEB --> PROD_API
    PROD_CDN --> PROD_WEB

    STAGE_API --> COGNITO
    PROD_API --> COGNITO
    STAGE_API --> SECRETS
    PROD_API --> SECRETS
    STAGE_API --> MONITORING
    PROD_API --> MONITORING

    classDef dev fill:#e8f5e8
    classDef staging fill:#fff3e0
    classDef prod fill:#ffebee
    classDef shared fill:#f3e5f5

    class DEV_API,DEV_WEB,DEV_DB,LOCALSTACK dev
    class STAGE_API,STAGE_WEB,STAGE_DB,STAGE_CACHE staging
    class PROD_API,PROD_WEB,PROD_DB,PROD_CACHE,PROD_CDN prod
    class COGNITO,SECRETS,MONITORING,TERRAFORM shared
```

## NX Dependency Graph

```mermaid
graph TD
    subgraph "Applications"
        API[api-example]
        WEB[web-app]
        CLI[cli-tool]
        EVENT[event-handler]
        E2E[web-app-e2e]
    end

    subgraph "Shared Libraries"
        TYPES[shared-types]
        UTILS[shared-utils]
        UI[ui-components]
        CONTRACTS[contracts]
        TEST_UTILS[test-utils]
    end

    subgraph "Tools & Generators"
        GENERATORS[generators]
        EXECUTORS[executors]
        SCRIPTS[scripts]
    end

    API --> TYPES
    API --> UTILS
    API --> CONTRACTS

    WEB --> TYPES
    WEB --> UTILS
    WEB --> UI
    WEB --> CONTRACTS

    CLI --> TYPES
    CLI --> UTILS

    EVENT --> TYPES
    EVENT --> UTILS
    EVENT --> CONTRACTS

    E2E --> WEB

    UI --> TYPES
    UTILS --> TYPES
    CONTRACTS --> TYPES

    API --> TEST_UTILS
    WEB --> TEST_UTILS
    CLI --> TEST_UTILS
    EVENT --> TEST_UTILS

    classDef app fill:#e3f2fd
    classDef lib fill:#e8f5e8
    classDef tool fill:#fff3e0

    class API,WEB,CLI,EVENT,E2E app
    class TYPES,UTILS,UI,CONTRACTS,TEST_UTILS lib
    class GENERATORS,EXECUTORS,SCRIPTS tool
```

## Monitoring and Observability

```mermaid
graph TB
    subgraph "Application Layer"
        API[REST API]
        WEB[Web App]
        LAMBDA[Lambda Functions]
    end

    subgraph "Infrastructure Layer"
        ALB[Load Balancer]
        RDS[Database]
        CACHE[Redis Cache]
    end

    subgraph "Metrics Collection"
        CW[CloudWatch Metrics]
        XRAY[AWS X-Ray Tracing]
        LOGS[CloudWatch Logs]
    end

    subgraph "Monitoring Tools"
        DASH[CloudWatch Dashboards]
        ALARMS[CloudWatch Alarms]
        SNS[SNS Notifications]
    end

    subgraph "External Tools"
        PAGER[PagerDuty]
        SLACK[Slack Alerts]
        EMAIL[Email Notifications]
    end

    API --> CW
    WEB --> CW
    LAMBDA --> CW
    ALB --> CW
    RDS --> CW
    CACHE --> CW

    API --> XRAY
    LAMBDA --> XRAY

    API --> LOGS
    WEB --> LOGS
    LAMBDA --> LOGS

    CW --> DASH
    CW --> ALARMS
    XRAY --> DASH
    LOGS --> DASH

    ALARMS --> SNS
    SNS --> PAGER
    SNS --> SLACK
    SNS --> EMAIL

    classDef app fill:#e3f2fd
    classDef infra fill:#e8f5e8
    classDef metrics fill:#fff3e0
    classDef monitoring fill:#fce4ec
    classDef external fill:#f3e5f5

    class API,WEB,LAMBDA app
    class ALB,RDS,CACHE infra
    class CW,XRAY,LOGS metrics
    class DASH,ALARMS,SNS monitoring
    class PAGER,SLACK,EMAIL external
```

## Error Handling and Recovery

```mermaid
graph TD
    subgraph "Error Sources"
        CLIENT[Client Errors<br/>4xx]
        SERVER[Server Errors<br/>5xx]
        NETWORK[Network Failures]
        DEPS[Dependency Failures]
    end

    subgraph "Error Detection"
        HEALTH[Health Checks]
        METRICS[Error Metrics]
        LOGS[Error Logs]
        TRACES[Error Traces]
    end

    subgraph "Error Handling"
        RETRY[Retry Logic]
        CIRCUIT[Circuit Breaker]
        FALLBACK[Fallback Responses]
        QUEUE[Dead Letter Queues]
    end

    subgraph "Recovery Actions"
        ALERT[Alert Teams]
        SCALE[Auto Scaling]
        ROLLBACK[Automated Rollback]
        MANUAL[Manual Intervention]
    end

    CLIENT --> HEALTH
    SERVER --> HEALTH
    NETWORK --> HEALTH
    DEPS --> HEALTH

    HEALTH --> METRICS
    HEALTH --> LOGS
    HEALTH --> TRACES

    METRICS --> RETRY
    METRICS --> CIRCUIT
    METRICS --> FALLBACK
    METRICS --> QUEUE

    RETRY --> ALERT
    CIRCUIT --> SCALE
    FALLBACK --> ROLLBACK
    QUEUE --> MANUAL

    classDef error fill:#ffebee
    classDef detection fill:#fff3e0
    classDef handling fill:#e8f5e8
    classDef recovery fill:#e3f2fd

    class CLIENT,SERVER,NETWORK,DEPS error
    class HEALTH,METRICS,LOGS,TRACES detection
    class RETRY,CIRCUIT,FALLBACK,QUEUE handling
    class ALERT,SCALE,ROLLBACK,MANUAL recovery
```

## Performance Optimization Strategy

```mermaid
graph LR
    subgraph "Frontend Optimization"
        LAZY[Code Splitting<br/>Lazy Loading]
        CDN[CDN Distribution]
        COMPRESS[Asset Compression]
        CACHE_FE[Browser Caching]
    end

    subgraph "Backend Optimization"
        CACHE_BE[Redis Caching]
        POOL[Connection Pooling]
        INDEX[Database Indexing]
        ASYNC[Async Processing]
    end

    subgraph "Infrastructure Optimization"
        SCALE[Auto Scaling]
        LB[Load Balancing]
        EDGE[Edge Computing]
        REGION[Multi-Region]
    end

    subgraph "Monitoring"
        APM[Application Performance Monitoring]
        PROF[Profiling Tools]
        BENCH[Benchmarking]
        TEST[Load Testing]
    end

    LAZY --> CDN
    CDN --> COMPRESS
    COMPRESS --> CACHE_FE

    CACHE_BE --> POOL
    POOL --> INDEX
    INDEX --> ASYNC

    SCALE --> LB
    LB --> EDGE
    EDGE --> REGION

    APM --> PROF
    PROF --> BENCH
    BENCH --> TEST

    classDef frontend fill:#e3f2fd
    classDef backend fill:#e8f5e8
    classDef infra fill:#fff3e0
    classDef monitor fill:#fce4ec

    class LAZY,CDN,COMPRESS,CACHE_FE frontend
    class CACHE_BE,POOL,INDEX,ASYNC backend
    class SCALE,LB,EDGE,REGION infra
    class APM,PROF,BENCH,TEST monitor
```

## Diagram Legend

### Color Coding
- **Blue** (e3f2fd): Client/Frontend components
- **Green** (e8f5e8): Backend services and processing
- **Orange** (fff3e0): Infrastructure and middleware
- **Pink** (fce4ec): Data storage and persistence
- **Purple** (f3e5f5): External services and security
- **Red** (ffebee): Critical or production components

### Symbol Meanings
- **Rectangles**: Services, applications, or processes
- **Cylinders**: Databases, storage, or data stores
- **Diamonds**: Decision points or gateways
- **Circles**: External systems or users
- **Dotted lines**: Optional or conditional connections
- **Solid arrows**: Direct dependencies or data flow
- **Dashed arrows**: Monitoring or observation relationships

## Tools for Diagram Creation

### Recommended Tools
1. **Mermaid**: For version-controlled diagrams in markdown
2. **Draw.io/Diagrams.net**: For detailed architectural diagrams
3. **Lucidchart**: For collaborative diagram creation
4. **PlantUML**: For UML and sequence diagrams
5. **AWS Architecture Icons**: For AWS-specific diagrams

### Diagram Maintenance
- **Version Control**: All diagrams stored in Git repository
- **Regular Updates**: Diagrams updated with architecture changes
- **Review Process**: Diagrams reviewed during architecture reviews
- **Automation**: Where possible, generate diagrams from code
- **Documentation**: Each diagram includes purpose and context

## References

- [Mermaid Documentation](https://mermaid-js.github.io/mermaid/)
- [AWS Architecture Center](https://aws.amazon.com/architecture/)
- [C4 Model for Software Architecture](https://c4model.com/)
- [ArchiMate Modeling Language](https://www.opengroup.org/archimate-forum)