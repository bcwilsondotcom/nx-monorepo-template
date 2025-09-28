<!-- Sync Impact Report
Version Change: New → 1.0.0
Modified Principles: Initial constitution creation
Added Sections: All sections are new
Removed Sections: None
Templates Requiring Updates:
- ✅ plan-template.md (references to constitution validated)
- ✅ spec-template.md (quality standards aligned)
- ✅ tasks-template.md (TDD enforcement aligned)
- ✅ agent-file-template.md (technology tracking aligned)
Follow-up TODOs:
- RATIFICATION_DATE: Set to today as initial adoption
-->

# Spec-Driven NX Template Constitution

## Core Principles

### I. Specification-First Development
All features and services MUST begin with formal specifications using appropriate contract languages. OpenAPI specifications define synchronous REST APIs and service contracts. AsyncAPI specifications define event-driven architectures and asynchronous messaging patterns with AWS EventBridge. Every implementation MUST be directly traceable to its governing specification through spec-kit tooling. No code shall be written without a corresponding approved specification that defines its behavior, interfaces, and constraints.

### II. Test-Driven Development (NON-NEGOTIABLE)
TDD is mandatory without exception. The Red-Green-Refactor cycle MUST be strictly enforced: tests are written first, reviewed and approved by stakeholders, verified to fail with meaningful assertions, then implementation follows to make tests pass. Integration tests are required for all contract changes, inter-service communication, shared schemas, and library boundaries. Performance tests using k6 MUST validate all performance-critical paths. Browser tests using Playwright MUST validate all user-facing interactions. Jest provides the foundation for unit and integration testing across TypeScript and JavaScript codebases.

### III. Infrastructure as Code
All infrastructure MUST be defined, versioned, and deployed through Terraform. No manual infrastructure changes are permitted in any environment. Infrastructure code follows the same review, testing, and quality standards as application code. All infrastructure changes MUST be validated in isolated environments before production deployment. Infrastructure modules MUST be reusable, parameterized, and documented with clear input/output contracts.

### IV. Scale-to-Zero Architecture
Systems MUST be designed to scale to zero when not in use, optimizing for cost and resource efficiency. AWS Lambda functions are the default compute choice for all workloads unless specific technical constraints require alternatives. Always-on compute (ECS, EKS, containers) requires explicit architectural justification and approval. Static web assets MUST be served through S3/CloudFront for Apollo-based sites. Next.js applications may use managed serverless deployments. All services MUST implement appropriate cold-start optimizations and warm-up strategies.

### V. Code Quality Standards
TypeScript SHALL be used for all web applications, shared libraries, and Node.js services where type safety provides clear value. Python SHALL be used for data processing, machine learning workloads, and infrastructure automation where its ecosystem provides advantages. All code MUST follow established linting rules without suppression except for documented edge cases. Code generation from specifications is preferred over manual implementation for API clients, server stubs, and type definitions. Contract testing MUST validate all generated code against its source specifications.

### VI. Feature Flag Governance
All new features MUST be deployed behind feature flags using OpenFeature standards with Flipt as the provider. Feature flags enable progressive rollouts, A/B testing, and instant rollback capabilities. Flag configuration MUST be version-controlled and environment-specific. Deprecated flags MUST be removed within one sprint of reaching 100% rollout. Emergency kill switches MUST be implemented for all critical user paths.

### VII. User Experience Consistency
All user-facing interfaces MUST maintain consistent design patterns, interaction models, and accessibility standards. Component libraries MUST be shared across applications to ensure visual and behavioral consistency. Accessibility MUST meet WCAG 2.1 AA standards minimum. Performance budgets MUST be established and enforced: initial page load under 3 seconds on 3G, interaction response under 100ms. Error messages MUST be actionable, user-friendly, and include recovery paths.

## Development Standards

### Technology Stack Requirements
- **API Design**: OpenAPI 3.1+ for REST, AsyncAPI 2.0+ for events
- **Event Architecture**: AWS EventBridge for event routing and choreography
- **Infrastructure**: Terraform for all infrastructure definitions
- **Languages**: TypeScript for type-safe applications, Python for data/ML workloads
- **Testing**: Jest (unit/integration), k6 (performance), Playwright (browser)
- **Web Frameworks**: Apollo for static sites, Next.js for dynamic applications
- **Compute**: AWS Lambda preferred, containers only when justified
- **Feature Management**: OpenFeature with Flipt provider
- **Code Generation**: Automated from specifications wherever possible

### Performance Requirements
- Lambda cold starts MUST be under 1 second for user-facing functions
- API response times MUST be under 200ms for p95 latency
- Static assets MUST be served with cache headers and CDN distribution
- Database queries MUST use indexes and avoid N+1 patterns
- Batch operations MUST implement pagination and rate limiting

## Quality Gates

### Code Review Requirements
1. All code MUST pass automated linting and type checking
2. Test coverage MUST meet or exceed 80% for new code
3. Integration tests MUST pass in isolation and in sequence
4. Performance tests MUST validate no regression from baseline
5. Security scanning MUST identify no high/critical vulnerabilities
6. Specification compliance MUST be validated through contract tests

### Deployment Gates
1. All tests MUST pass in CI/CD pipeline
2. Infrastructure changes MUST be reviewed by platform team
3. Feature flags MUST be configured for progressive rollout
4. Rollback plan MUST be documented and tested
5. Monitoring and alerting MUST be configured before deployment

## Governance

This constitution supersedes all project practices and development decisions. It serves as the single source of truth for technical standards and principles. Any deviation from constitutional requirements MUST be documented with justification, approved by technical leadership, and include a remediation timeline.

All pull requests and code reviews MUST verify constitutional compliance. Violations discovered post-merge MUST be addressed in the immediate next sprint. Repeated violations trigger mandatory team training and process review.

### Amendment Process
1. Proposed amendments MUST include rationale and impact analysis
2. Team discussion period of minimum 3 business days
3. Requires 2/3 majority approval from technical stakeholders
4. Breaking changes require migration plan and grace period
5. Version increments follow semantic versioning:
   - MAJOR: Removing principles or backward-incompatible changes
   - MINOR: Adding new principles or substantial expansions
   - PATCH: Clarifications, corrections, and refinements

### Compliance Review
- Quarterly constitutional compliance audits
- Automated scanning for common violations
- Team retrospectives include constitutional effectiveness review
- Annual constitution review for relevance and completeness

**Version**: 1.0.0 | **Ratified**: 2025-09-28 | **Last Amended**: 2025-09-28