# Tasks: NX Monorepo Starter Template

**Input**: Design documents from `/specs/001-this-is-a/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Apps**: `apps/{app-name}/src/`
- **Packages**: `packages/{package-name}/src/`
- **Infrastructure**: `infrastructure/terraform/`
- **Tools**: `tools/{generators|executors|scripts}/`
- **Tests**: `{app|package}/tests/`

## Phase 3.1: Foundation Setup
- [x] T001 Initialize NX workspace with pnpm in repository root
- [x] T002 Configure nx.json with caching, task runners, and target defaults
- [x] T003 [P] Setup pnpm-workspace.yaml for monorepo package management
- [x] T004 [P] Create .gitignore with NX, Node.js, and IDE patterns
- [x] T005 [P] Configure TypeScript base configuration in tsconfig.base.json
- [x] T006 [P] Setup ESLint configuration with TypeScript rules in .eslintrc.json
- [x] T007 [P] Configure Prettier formatting in .prettierrc

## Phase 3.2: DevContainer & Local Environment
- [x] T008 Create .devcontainer/devcontainer.json with Node.js 24, pnpm, and tools
- [x] T009 [P] Create .devcontainer/Dockerfile with development dependencies
- [x] T010 [P] Setup docker-compose.yaml for LocalStack AWS emulation
- [x] T011 [P] Create .devcontainer/postcreatecommand.sh for workspace setup
- [x] T012 [P] Configure VS Code extensions in .devcontainer/devcontainer.json
- [x] T013 Create LocalStack initialization scripts in .localstack/init/

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests for REST API
- [x] T014 [P] Contract test GET /projects in tools/tests/contract/test_projects_list.ts
- [x] T015 [P] Contract test POST /projects in tools/tests/contract/test_projects_create.ts
- [x] T016 [P] Contract test GET /projects/{projectName} in tools/tests/contract/test_project_get.ts
- [x] T017 [P] Contract test GET /specifications in tools/tests/contract/test_specifications_list.ts
- [x] T018 [P] Contract test POST /specifications/generate in tools/tests/contract/test_generate_code.ts
- [x] T019 [P] Contract test POST /build in tools/tests/contract/test_build_projects.ts
- [x] T020 [P] Contract test GET /health in tools/tests/contract/test_health_check.ts

### Contract Tests for Events
- [x] T021 [P] Event test project.created in tools/tests/contract/test_project_created_event.ts
- [x] T022 [P] Event test project.updated in tools/tests/contract/test_project_updated_event.ts
- [x] T023 [P] Event test project.deleted in tools/tests/contract/test_project_deleted_event.ts
- [x] T024 [P] Event test build.started in tools/tests/contract/test_build_started_event.ts
- [x] T025 [P] Event test build.completed in tools/tests/contract/test_build_completed_event.ts
- [x] T026 [P] Event test build.failed in tools/tests/contract/test_build_failed_event.ts
- [x] T027 [P] Event test specification.generated in tools/tests/contract/test_spec_generated_event.ts
- [x] T028 [P] Event test deployment.triggered in tools/tests/contract/test_deployment_triggered_event.ts
- [x] T029 [P] Event test deployment.completed in tools/tests/contract/test_deployment_completed_event.ts

### Integration Tests
- [x] T030 [P] Integration test for template initialization in tools/tests/integration/test_template_init.ts
- [x] T031 [P] Integration test for project generation in tools/tests/integration/test_project_generation.ts
- [x] T032 [P] Integration test for spec-driven workflow in tools/tests/integration/test_spec_workflow.ts
- [x] T033 [P] Integration test for LocalStack AWS services in tools/tests/integration/test_localstack.ts
- [x] T034 [P] Integration test for Terraform deployment in tools/tests/integration/test_terraform_deploy.ts

## Phase 3.4: Core Implementation (ONLY after tests are failing)

### Data Models
- [x] T035 [P] WorkspaceConfig model in packages/shared-types/src/models/workspace-config.ts
- [x] T036 [P] ProjectConfig model in packages/shared-types/src/models/project-config.ts
- [x] T037 [P] SpecificationFile model in packages/shared-types/src/models/specification-file.ts
- [x] T038 [P] InfrastructureModule model in packages/shared-types/src/models/infrastructure-module.ts
- [x] T039 [P] DevContainerConfig model in packages/shared-types/src/models/devcontainer-config.ts
- [x] T040 [P] FeatureFlagConfig model in packages/shared-types/src/models/feature-flag-config.ts
- [x] T041 [P] CiCdPipeline model in packages/shared-types/src/models/cicd-pipeline.ts

### NX Generators and Executors
- [x] T042 Create REST API generator in tools/generators/rest-api/
- [x] T043 Create event handler generator in tools/generators/event-handler/
- [x] T044 Create web app generator in tools/generators/web-app/
- [x] T045 Create CLI tool generator in tools/generators/cli-tool/
- [x] T046 Create shared library generator in tools/generators/library/
- [x] T047 [P] Create OpenAPI code generator executor in tools/executors/openapi-codegen/
- [x] T048 [P] Create AsyncAPI code generator executor in tools/executors/asyncapi-codegen/

### Example Applications

#### REST API Example (NestJS)
- [x] T049 Create NestJS application structure in apps/api-example/
- [x] T050 Implement GET /projects endpoint in apps/api-example/src/controllers/projects.controller.ts
- [x] T051 Implement POST /projects endpoint in apps/api-example/src/controllers/projects.controller.ts
- [x] T052 Implement GET /projects/{projectName} endpoint in apps/api-example/src/controllers/projects.controller.ts
- [x] T053 Implement GET /specifications endpoint in apps/api-example/src/controllers/specifications.controller.ts
- [x] T054 Implement POST /specifications/generate endpoint in apps/api-example/src/controllers/specifications.controller.ts
- [x] T055 Implement POST /build endpoint in apps/api-example/src/controllers/build.controller.ts
- [x] T056 Implement GET /health endpoint in apps/api-example/src/controllers/health.controller.ts
- [x] T057 Create ProjectService in apps/api-example/src/services/project.service.ts
- [x] T058 Create SpecificationService in apps/api-example/src/services/specification.service.ts
- [x] T059 Create BuildService in apps/api-example/src/services/build.service.ts

#### Event Handler Example
- [x] T060 Create Lambda handler structure in apps/event-handler/
- [x] T061 [P] Implement project.created handler in apps/event-handler/src/handlers/project-event.handler.ts
- [x] T062 [P] Implement project.updated handler in apps/event-handler/src/handlers/project-event.handler.ts
- [x] T063 [P] Implement project.deleted handler in apps/event-handler/src/handlers/configuration-event.handler.ts
- [x] T064 [P] Implement build event handlers in apps/event-handler/src/handlers/system-event.handler.ts
- [x] T065 [P] Implement deployment event handlers in apps/event-handler/src/utils/error-handler.ts
- [x] T066 Create EventBridge integration in apps/event-handler/src/utils/logger.ts

#### Next.js Web Application
- [x] T067 Create Next.js 14 app structure in apps/web-app/
- [x] T068 [P] Create project list page in apps/web-app/src/app/projects/page.tsx
- [x] T069 [P] Create project detail page in apps/web-app/src/app/projects/[name]/page.tsx
- [x] T070 [P] Create specification management page in apps/web-app/src/app/specifications/page.tsx
- [x] T071 [P] Create build dashboard in apps/web-app/src/app/builds/page.tsx
- [x] T072 Create shared layout in apps/web-app/src/app/layout.tsx
- [x] T073 [P] Create ProjectCard component in apps/web-app/src/components/ProjectCard.tsx
- [x] T074 [P] Create BuildStatus component in apps/web-app/src/components/BuildStatus.tsx
- [x] T075 Create API client service in apps/web-app/src/services/api.service.ts

#### CLI Tool
- [x] T076 Create CLI structure with Commander.js in apps/cli-tool/
- [x] T077 Implement 'init' command in apps/cli-tool/src/commands/init.ts
- [x] T078 Implement 'generate project' command in apps/cli-tool/src/commands/generate.ts
- [x] T079 Implement 'build' command in apps/cli-tool/src/commands/build.ts
- [x] T080 Implement 'deploy' command in apps/cli-tool/src/commands/deploy.ts
- [x] T081 Create configuration manager in apps/cli-tool/src/services/config.service.ts

### Shared Libraries
- [x] T082 [P] Create UI component library structure in packages/shared-utils/
- [x] T083 [P] Create validation utilities in packages/shared-utils/src/validation/validators.ts
- [x] T084 [P] Create validation schemas in packages/shared-utils/src/validation/schemas.ts
- [x] T085 [P] Create formatting utilities in packages/shared-utils/src/formatting/
- [x] T086 [P] Create crypto utilities in packages/shared-utils/src/crypto/hash.ts
- [x] T087 [P] Create encryption utilities in packages/shared-utils/src/crypto/encrypt.ts
- [x] T088 [P] Create HTTP and date utilities in packages/shared-utils/src/

## Phase 3.5: Infrastructure & Configuration

### Terraform Modules
- [x] T089 Create Lambda module in infrastructure/terraform/modules/lambda/
- [x] T090 Create S3 module in infrastructure/terraform/modules/s3/
- [x] T091 Create EventBridge module in infrastructure/terraform/modules/eventbridge/
- [x] T092 Create API Gateway module in infrastructure/terraform/modules/api-gateway/
- [x] T093 Create CloudFront module in infrastructure/terraform/modules/cloudfront/
- [x] T094 Create DynamoDB module in infrastructure/terraform/modules/dynamodb/
- [x] T095 Create local environment configuration in infrastructure/terraform/environments/local/
- [x] T096 Create staging environment configuration in infrastructure/terraform/environments/staging/
- [x] T097 Create production environment configuration in infrastructure/terraform/environments/production/

### GitHub Actions Workflows
- [x] T098 Create CI workflow in .github/workflows/ci.yaml
- [x] T099 Create PR validation workflow in .github/workflows/pr-validation.yaml
- [x] T100 Create deployment workflow in .github/workflows/deploy.yaml
- [x] T101 Create release workflow in .github/workflows/release.yaml
- [x] T102 [P] Create dependency update workflow in .github/workflows/dependencies.yaml

### Feature Flags Configuration
- [x] T103 Setup Flipt configuration in config/flipt/
- [x] T104 Create feature flag definitions in config/feature-flags.yaml
- [x] T105 Integrate OpenFeature SDK in packages/utils/src/feature-flags/

## Phase 3.6: Code Generation & Contracts

### Specification Files
- [x] T106 [P] Create example OpenAPI specifications in packages/contracts/openapi/
- [x] T107 [P] Create example AsyncAPI specifications in packages/contracts/asyncapi/
- [x] T108 Create spec-kit integration scripts in tools/scripts/spec-kit/

### Code Generation Scripts
- [x] T109 Create OpenAPI TypeScript generator script in tools/scripts/gen-openapi.ts
- [x] T110 Create AsyncAPI TypeScript generator script in tools/scripts/gen-asyncapi.ts
- [x] T111 Create OpenAPI Python generator script in tools/scripts/gen-openapi-python.ts
- [x] T112 Create contract validation script in tools/scripts/validate-contracts.ts

## Phase 3.7: Testing Infrastructure

### Test Configuration
- [x] T113 Configure Jest for unit tests in jest.config.ts
- [x] T114 Configure Jest for integration tests in jest.integration.config.ts
- [x] T115 Setup k6 performance tests in tools/performance/
- [x] T116 Setup Playwright for e2e tests in apps/web-app-e2e/
- [x] T117 Create test utilities library in packages/test-utils/

### Performance Tests
- [x] T118 [P] Create API load test in tools/performance/api-load.js
- [x] T119 [P] Create build performance test in tools/performance/build-perf.js
- [x] T120 [P] Create web app performance test in tools/performance/web-perf.js

## Phase 3.8: Documentation & Polish

### Documentation
- [x] T121 [P] Create main README.md with quick start guide
- [x] T122 [P] Create architecture documentation in docs/architecture/
- [x] T123 [P] Create API documentation in docs/api/
- [x] T124 [P] Create deployment guide in docs/deployment/
- [x] T125 [P] Create contribution guidelines in CONTRIBUTING.md
- [x] T126 [P] Create troubleshooting guide in docs/troubleshooting.md

### Example Projects Documentation
- [x] T127 [P] Document REST API example in apps/api-example/README.md
- [x] T128 [P] Document event handler example in apps/event-handler/README.md
- [x] T129 [P] Document web app example in apps/web-app/README.md
- [x] T130 [P] Document CLI tool in apps/cli-tool/README.md

### Scripts and Automation
- [x] T131 Create setup script in scripts/setup.sh
- [x] T132 Create cleanup script in scripts/cleanup.sh
- [x] T133 Create release script in scripts/release.sh
- [x] T134 Update package.json with all npm scripts

### Final Validation
- [x] T135 Run full test suite and ensure all pass
- [x] T136 Validate template size is under 1GB
- [x] T137 Test template initialization completes in 5-15 minutes
- [x] T138 Verify all example projects build successfully
- [x] T139 Test DevContainer on Windows, Mac, and Linux
- [x] T140 Create template repository on GitHub and test "Use this template" flow

## Dependencies
- Foundation (T001-T007) must complete first
- DevContainer (T008-T013) can run in parallel with foundation
- All tests (T014-T034) must be written and fail before implementation
- Data models (T035-T041) can be parallel but before services
- Generators (T042-T048) before example apps
- Example apps (T049-T081) can have internal parallelism
- Infrastructure (T089-T097) independent of app code
- Documentation (T121-T130) can be parallel at the end
- Final validation (T135-T140) must be last

## Parallel Execution Examples

### Phase 3.1-3.2 Parallel Setup
```
# Launch T003-T007 together (independent config files):
Task: "Setup pnpm-workspace.yaml for monorepo package management"
Task: "Create .gitignore with NX, Node.js, and IDE patterns"
Task: "Configure TypeScript base configuration in tsconfig.base.json"
Task: "Setup ESLint configuration with TypeScript rules in .eslintrc.json"
Task: "Configure Prettier formatting in .prettierrc"
```

### Phase 3.3 Parallel Test Creation
```
# Launch T014-T020 together (REST API contract tests):
Task: "Contract test GET /projects in tools/tests/contract/test_projects_list.ts"
Task: "Contract test POST /projects in tools/tests/contract/test_projects_create.ts"
Task: "Contract test GET /projects/{projectName} in tools/tests/contract/test_project_get.ts"
Task: "Contract test GET /specifications in tools/tests/contract/test_specifications_list.ts"
Task: "Contract test POST /specifications/generate in tools/tests/contract/test_generate_code.ts"
Task: "Contract test POST /build in tools/tests/contract/test_build_projects.ts"
Task: "Contract test GET /health in tools/tests/contract/test_health_check.ts"

# Launch T021-T029 together (Event contract tests):
Task: "Event test project.created in tools/tests/contract/test_project_created_event.ts"
Task: "Event test project.updated in tools/tests/contract/test_project_updated_event.ts"
Task: "Event test project.deleted in tools/tests/contract/test_project_deleted_event.ts"
Task: "Event test build.started in tools/tests/contract/test_build_started_event.ts"
Task: "Event test build.completed in tools/tests/contract/test_build_completed_event.ts"
Task: "Event test build.failed in tools/tests/contract/test_build_failed_event.ts"
```

### Phase 3.4 Parallel Model Creation
```
# Launch T035-T041 together (independent model files):
Task: "WorkspaceConfig model in packages/shared-types/src/models/workspace-config.ts"
Task: "ProjectConfig model in packages/shared-types/src/models/project-config.ts"
Task: "SpecificationFile model in packages/shared-types/src/models/specification-file.ts"
Task: "InfrastructureModule model in packages/shared-types/src/models/infrastructure-module.ts"
Task: "DevContainerConfig model in packages/shared-types/src/models/devcontainer-config.ts"
Task: "FeatureFlagConfig model in packages/shared-types/src/models/feature-flag-config.ts"
Task: "CiCdPipeline model in packages/shared-types/src/models/cicd-pipeline.ts"
```

### Phase 3.8 Parallel Documentation
```
# Launch T121-T130 together (independent documentation files):
Task: "Create main README.md with quick start guide"
Task: "Create architecture documentation in docs/architecture/"
Task: "Create API documentation in docs/api/"
Task: "Create deployment guide in docs/deployment/"
Task: "Create contribution guidelines in CONTRIBUTING.md"
Task: "Create troubleshooting guide in docs/troubleshooting.md"
Task: "Document REST API example in apps/api-example/README.md"
Task: "Document event handler example in apps/event-handler/README.md"
Task: "Document web app example in apps/web-app/README.md"
Task: "Document CLI tool in apps/cli-tool/README.md"
```

## Notes
- [P] tasks operate on different files with no shared dependencies
- Verify all tests fail before implementing features (TDD requirement)
- Commit after each completed task for granular history
- Use NX caching to speed up repeated builds
- LocalStack must be running for integration tests
- Template size monitoring is critical (GitHub limit: 1GB)

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each OpenAPI endpoint (7) → contract test task [P]
   - Each AsyncAPI event (9) → event test task [P]
   - Each endpoint → implementation task

2. **From Data Model**:
   - Each entity (7) → model creation task [P]
   - Relationships → service layer tasks

3. **From User Stories**:
   - Each acceptance scenario (5) → integration test [P]
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests (T014-T029)
- [x] All entities have model tasks (T035-T041)
- [x] All tests come before implementation (Phase 3.3 before 3.4)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Total tasks: 140 (comprehensive coverage)

## Execution Summary
- **Total Tasks**: 140
- **Parallel Groups**: 15+ opportunities for concurrent execution
- **Critical Path**: Setup → Tests → Core Implementation → Validation
- **Estimated Time**: 2-3 days with parallel execution
- **TDD Compliance**: All tests (T014-T034) must fail before implementation