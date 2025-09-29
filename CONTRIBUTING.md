# Contributing to NX Monorepo Template

Thank you for your interest in contributing to the NX Monorepo Template! This document provides guidelines and information for contributors to help maintain code quality, consistency, and a positive collaborative environment.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Message Conventions](#commit-message-conventions)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Review Guidelines](#review-guidelines)
- [Issue Reporting](#issue-reporting)
- [Documentation](#documentation)
- [Performance Considerations](#performance-considerations)
- [Security Guidelines](#security-guidelines)
- [Release Process](#release-process)
- [Community and Support](#community-and-support)

## Code of Conduct

### Our Pledge

We are committed to making participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

Examples of unacceptable behavior include:

- The use of sexualized language or imagery and unwelcome sexual attention or advances
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

### Enforcement

Project maintainers are responsible for clarifying the standards of acceptable behavior and are expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior.

## Getting Started

### Prerequisites

Before contributing, ensure you have the following installed:

- Node.js 20+ (LTS recommended)
- pnpm 9+
- Docker and Docker Compose
- Git
- VS Code (recommended)

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/nx-monorepo-template.git
   cd nx-monorepo-template
   ```

3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/nx-monorepo-template.git
   ```

### Development Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Set up the development environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your local configuration
   ```

3. **Start local services**:
   ```bash
   pnpm local:up
   ```

4. **Run the development server**:
   ```bash
   pnpm dev
   ```

5. **Verify setup**:
   ```bash
   pnpm test
   pnpm build
   ```

## Development Workflow

### Branch Naming Convention

Use descriptive branch names that follow this pattern:

- **Feature branches**: `feature/description` or `feat/description`
- **Bug fixes**: `fix/description` or `bugfix/description`
- **Documentation**: `docs/description`
- **Refactoring**: `refactor/description`
- **Performance**: `perf/description`
- **Chores**: `chore/description`

Examples:
- `feature/user-authentication`
- `fix/database-connection-leak`
- `docs/api-documentation`
- `refactor/event-handler-structure`

### Workflow Steps

1. **Create a new branch** from `main`:
   ```bash
   git checkout main
   git pull upstream main
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Write tests** for your changes

4. **Run the test suite**:
   ```bash
   pnpm test
   pnpm test:integration
   pnpm lint
   pnpm typecheck
   ```

5. **Commit your changes** using conventional commit messages

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** from your fork to the main repository

### Keeping Your Fork Updated

Regularly sync your fork with the upstream repository:

```bash
git checkout main
git pull upstream main
git push origin main
```

Rebase your feature branch on the latest main:

```bash
git checkout feature/your-feature-name
git rebase main
```

## Coding Standards

### TypeScript Guidelines

#### Type Safety
- Use strict TypeScript configuration
- Avoid `any` type; use proper typing
- Prefer interfaces over type aliases for object shapes
- Use generic types when appropriate

```typescript
// Good
interface User {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
}

function getUser(id: string): Promise<User | null> {
  // Implementation
}

// Avoid
function getUser(id: any): any {
  // Implementation
}
```

#### Naming Conventions
- **Variables and functions**: camelCase
- **Classes and interfaces**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Files**: kebab-case
- **Directories**: kebab-case

```typescript
// Variables and functions
const userId = 'user-123';
const apiKey = process.env.API_KEY;

function getUserById(id: string): User {
  // Implementation
}

// Classes and interfaces
class UserService {
  // Implementation
}

interface ApiResponse<T> {
  data: T;
  status: number;
}

// Constants
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT = 5000;
```

### Code Organization

#### File Structure
```
src/
├── controllers/     # API controllers
├── services/        # Business logic
├── models/          # Data models
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── middleware/      # Express middleware
├── config/          # Configuration files
└── __tests__/       # Test files
```

#### Import Order
```typescript
// 1. Node.js built-in modules
import { readFile } from 'fs/promises';
import path from 'path';

// 2. External libraries
import express from 'express';
import { z } from 'zod';

// 3. Internal modules (absolute imports)
import { UserService } from '@/services/user.service';
import { ApiResponse } from '@/types/api';

// 4. Relative imports
import { validateUser } from './validation';
import { UserController } from '../controllers/user.controller';
```

### ESLint and Prettier Configuration

The project uses ESLint and Prettier for code quality and formatting. Configuration is in:
- `.eslintrc.json` - ESLint rules
- `.prettierrc` - Prettier formatting rules

#### Key Rules
- Use single quotes for strings
- Use semicolons
- 2-space indentation
- Trailing commas in multiline objects/arrays
- No unused variables
- Prefer const over let when possible

### React/Next.js Guidelines

#### Component Structure
```typescript
// Good component structure
import { FC, useState, useEffect } from 'react';
import { User } from '@/types/user';

interface UserProfileProps {
  userId: string;
  onUserUpdate?: (user: User) => void;
}

export const UserProfile: FC<UserProfileProps> = ({
  userId,
  onUserUpdate
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Implementation
  }, [userId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="user-profile">
      {/* Component JSX */}
    </div>
  );
};
```

#### Hooks Guidelines
- Use custom hooks for reusable logic
- Follow the "Rules of Hooks"
- Use proper dependency arrays in useEffect

```typescript
// Custom hook example
function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        const userData = await userService.getById(userId);
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId]);

  return { user, loading, error };
}
```

## Commit Message Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for consistent commit messages.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries

### Scopes

Use descriptive scopes to indicate the area of change:
- **api**: API-related changes
- **web**: Web application changes
- **cli**: CLI tool changes
- **docs**: Documentation changes
- **ci**: CI/CD pipeline changes
- **deps**: Dependency updates

### Examples

```bash
# Feature
feat(api): add user authentication endpoint

# Bug fix
fix(web): resolve navigation menu overflow on mobile

# Documentation
docs(readme): update installation instructions

# Refactoring
refactor(api): extract user validation logic into service

# Performance
perf(web): optimize image loading with lazy loading

# Test
test(api): add integration tests for user endpoints

# Chore
chore(deps): update dependencies to latest versions
```

### Breaking Changes

For breaking changes, add `BREAKING CHANGE:` in the footer:

```
feat(api): change user endpoint response format

BREAKING CHANGE: User endpoint now returns { user: User } instead of User directly
```

## Testing Requirements

### Test Coverage Requirements

- **Minimum coverage**: 80% for all code
- **Critical paths**: 95% coverage required
- **New features**: Must include comprehensive tests
- **Bug fixes**: Must include regression tests

### Test Types

#### Unit Tests
- Test individual functions and classes
- Use Jest as the testing framework
- Mock external dependencies
- Fast execution (< 10ms per test)

```typescript
// Example unit test
describe('UserService', () => {
  let userService: UserService;
  let mockRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    userService = new UserService(mockRepository);
  });

  describe('getById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      mockRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getById('1');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should return null when user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await userService.getById('1');

      expect(result).toBeNull();
    });
  });
});
```

#### Integration Tests
- Test interactions between components
- Use real database connections (with test data)
- Test API endpoints end-to-end

```typescript
// Example integration test
describe('POST /api/users', () => {
  beforeEach(async () => {
    await testDb.clearTables();
  });

  it('should create a new user', async () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
    };

    const response = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      email: userData.email,
      name: userData.name,
    });

    // Verify in database
    const user = await testDb.users.findByEmail(userData.email);
    expect(user).toBeTruthy();
  });
});
```

#### End-to-End Tests
- Test complete user workflows
- Use Playwright for browser automation
- Test critical user journeys

```typescript
// Example E2E test
test('user can sign up and login', async ({ page }) => {
  // Navigate to signup page
  await page.goto('/signup');

  // Fill out signup form
  await page.fill('[data-testid=email]', 'test@example.com');
  await page.fill('[data-testid=password]', 'securepassword');
  await page.fill('[data-testid=name]', 'Test User');

  // Submit form
  await page.click('[data-testid=submit]');

  // Verify redirect to dashboard
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('[data-testid=welcome]')).toContainText('Welcome, Test User');
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

## Pull Request Process

### Before Creating a PR

1. **Ensure your branch is up to date** with main
2. **Run all tests** and ensure they pass
3. **Run linting** and fix any issues
4. **Update documentation** if necessary
5. **Test your changes locally** thoroughly

### PR Title and Description

#### Title Format
Use the same format as commit messages:
```
<type>[optional scope]: <description>
```

#### Description Template
```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring (no functional changes)

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Include screenshots or GIFs for UI changes.

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### PR Size Guidelines

- **Small PRs** (< 200 lines): Preferred for faster review
- **Medium PRs** (200-500 lines): Acceptable with good description
- **Large PRs** (> 500 lines): Should be broken down into smaller PRs

### Automated Checks

All PRs must pass:
- ✅ **Unit tests** (Jest)
- ✅ **Integration tests**
- ✅ **E2E tests** (Playwright)
- ✅ **Linting** (ESLint)
- ✅ **Type checking** (TypeScript)
- ✅ **Security scanning** (CodeQL)
- ✅ **Dependency audit**

## Review Guidelines

### For Authors

#### Self-Review Checklist
- [ ] Code follows project conventions
- [ ] All tests pass locally
- [ ] Documentation is updated
- [ ] No console.log or debug statements
- [ ] No commented-out code
- [ ] Error handling is appropriate
- [ ] Performance implications considered

#### Responding to Reviews
- **Be responsive** to feedback
- **Ask questions** if feedback is unclear
- **Explain your reasoning** for decisions
- **Be open** to suggestions and changes
- **Update the PR** based on feedback

### For Reviewers

#### Review Focus Areas

1. **Functionality**: Does the code do what it's supposed to do?
2. **Code Quality**: Is the code readable, maintainable, and well-structured?
3. **Performance**: Are there any performance implications?
4. **Security**: Are there any security concerns?
5. **Testing**: Are there adequate tests?
6. **Documentation**: Is documentation updated/adequate?

#### Review Etiquette
- **Be constructive** in feedback
- **Explain the "why"** behind suggestions
- **Suggest improvements** rather than just pointing out problems
- **Acknowledge good code** when you see it
- **Be timely** with reviews (within 24-48 hours)

#### Review Comments Format
```markdown
# For issues that must be fixed
**Issue**: Brief description of the problem
**Suggestion**: Specific recommendation for improvement

# For suggestions/improvements
**Suggestion**: Consider using X instead of Y because...

# For questions
**Question**: Why did you choose this approach over...?

# For praise
**Nice**: Great use of the builder pattern here!
```

### Approval Process

1. **At least one approval** required from a maintainer
2. **All automated checks** must pass
3. **No unresolved conversations** (or explicit approval to resolve later)
4. **Up-to-date** with main branch

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. macOS, Windows, Linux]
 - Browser [e.g. chrome, safari] (if applicable)
 - Node.js version: [e.g. 20.10.0]
 - Project version: [e.g. 1.2.3]

**Additional context**
Add any other context about the problem here.
```

### Feature Requests

Use the feature request template:

```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

### Issue Labels

- **bug**: Something isn't working
- **enhancement**: New feature or request
- **documentation**: Improvements or additions to documentation
- **good first issue**: Good for newcomers
- **help wanted**: Extra attention is needed
- **question**: Further information is requested
- **wontfix**: This will not be worked on

## Documentation

### Documentation Standards

#### API Documentation
- Use OpenAPI 3.1 specifications
- Include request/response examples
- Document error codes and responses
- Keep documentation in sync with code

#### Code Documentation
- Use JSDoc for functions and classes
- Explain complex algorithms
- Document public APIs thoroughly
- Include usage examples

```typescript
/**
 * Retrieves a user by their unique identifier.
 *
 * @param id - The unique identifier for the user
 * @returns Promise that resolves to the user object or null if not found
 * @throws {ValidationError} When the id format is invalid
 * @throws {DatabaseError} When database connection fails
 *
 * @example
 * ```typescript
 * const user = await getUserById('user-123');
 * if (user) {
 *   console.log(`Found user: ${user.name}`);
 * }
 * ```
 */
async function getUserById(id: string): Promise<User | null> {
  // Implementation
}
```

#### README Updates
- Keep installation instructions current
- Update feature lists when adding functionality
- Include troubleshooting sections
- Add examples for new features

### Documentation Tools

- **API Docs**: OpenAPI/Swagger UI
- **Code Docs**: TSDoc/JSDoc
- **Architecture**: Mermaid diagrams
- **User Docs**: Markdown in `/docs`

## Performance Considerations

### Performance Guidelines

#### Database Queries
- Use proper indexing
- Avoid N+1 queries
- Implement pagination for large datasets
- Use connection pooling

```typescript
// Good: Single query with join
const usersWithProjects = await db.query(`
  SELECT u.*, p.name as project_name
  FROM users u
  LEFT JOIN projects p ON u.id = p.user_id
  WHERE u.active = true
`);

// Avoid: N+1 query pattern
const users = await db.query('SELECT * FROM users WHERE active = true');
for (const user of users) {
  user.projects = await db.query('SELECT * FROM projects WHERE user_id = ?', [user.id]);
}
```

#### API Responses
- Implement caching where appropriate
- Use compression (gzip)
- Minimize response payload size
- Implement rate limiting

```typescript
// Cache expensive operations
const getCachedUserStats = memoize(
  async (userId: string) => {
    return await calculateUserStatistics(userId);
  },
  { ttl: 300000 } // 5 minutes
);
```

#### Frontend Performance
- Implement code splitting
- Lazy load components
- Optimize images
- Use React.memo for expensive components

```typescript
// Lazy loading
const UserDashboard = lazy(() => import('./UserDashboard'));

// Memoized component
const UserCard = memo(({ user }: { user: User }) => {
  return (
    <div className="user-card">
      {/* Component content */}
    </div>
  );
});
```

### Performance Testing

Run performance tests before submitting PRs:

```bash
# API load testing
pnpm test:performance:api

# Database performance
pnpm test:performance:db

# Frontend performance
pnpm test:performance:web
```

## Security Guidelines

### Security Best Practices

#### Input Validation
- Validate all user inputs
- Use schema validation (Zod, Joi)
- Sanitize data before database operations
- Implement rate limiting

```typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
});

app.post('/users', async (req, res) => {
  try {
    const validatedData = CreateUserSchema.parse(req.body);
    // Process validated data
  } catch (error) {
    return res.status(400).json({ error: 'Invalid input' });
  }
});
```

#### Authentication and Authorization
- Use strong password hashing (bcrypt)
- Implement proper JWT handling
- Use HTTPS in production
- Implement proper session management

```typescript
// Password hashing
const hashedPassword = await bcrypt.hash(password, 12);

// JWT token validation
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

#### Data Protection
- Encrypt sensitive data at rest
- Use environment variables for secrets
- Implement proper error handling (don't leak info)
- Log security events

### Security Testing

- Run security scans on dependencies
- Test for common vulnerabilities (OWASP Top 10)
- Implement automated security testing

```bash
# Dependency audit
pnpm audit

# Security scanning
pnpm test:security
```

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Workflow

1. **Create release branch**: `release/v1.2.0`
2. **Update version numbers** in package.json files
3. **Update CHANGELOG.md** with release notes
4. **Run full test suite** including performance tests
5. **Create release PR** to main branch
6. **After approval and merge**, create and push tag
7. **GitHub Actions** will automatically:
   - Build and test
   - Create GitHub release
   - Deploy to staging for verification
   - Deploy to production (with approval)

### Changelog Format

```markdown
# Changelog

## [1.2.0] - 2024-01-15

### Added
- New user authentication system
- API rate limiting
- Performance monitoring dashboard

### Changed
- Updated database schema for better performance
- Improved error handling in API endpoints

### Fixed
- Fixed memory leak in event processing
- Resolved CSS layout issues on mobile

### Security
- Updated dependencies with security vulnerabilities
- Implemented additional input validation

### Deprecated
- Old authentication endpoints (will be removed in v2.0.0)

### Removed
- Removed unused legacy code
```

## Community and Support

### Getting Help

- **GitHub Discussions**: Ask questions and get help from the community
- **Discord**: Join our Discord server for real-time chat
- **Stack Overflow**: Tag questions with `nx-monorepo-template`
- **Documentation**: Check the docs folder for detailed guides

### Contributing Beyond Code

#### Documentation
- Improve existing documentation
- Write tutorials and guides
- Translate documentation

#### Community Support
- Answer questions in discussions
- Help review pull requests
- Mentor new contributors

#### Testing
- Report bugs
- Test new features
- Improve test coverage

### Recognition

Contributors are recognized in:
- **CONTRIBUTORS.md** file
- **GitHub releases** changelog
- **Annual contributor highlights**

### Maintainer Responsibilities

#### Core Maintainers
- Review and merge pull requests
- Manage releases
- Set project direction
- Maintain code quality standards

#### Area Maintainers
- **API**: Focus on backend API development
- **Frontend**: Focus on web application
- **DevOps**: Focus on CI/CD and infrastructure
- **Documentation**: Focus on documentation quality

### Contact

- **Email**: maintainers@nx-monorepo-template.com
- **Discord**: [Join our server](https://discord.gg/nx-monorepo)
- **GitHub**: [@nx-monorepo-template](https://github.com/nx-monorepo-template)

---

Thank you for contributing to the NX Monorepo Template! Your contributions help make this project better for everyone.

**Last Updated**: January 15, 2024