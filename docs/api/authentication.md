# Authentication and Authorization Guide

## Overview

The NX Monorepo Template implements a comprehensive authentication and authorization system using JWT tokens, role-based access control (RBAC), and AWS Cognito for user management. This guide covers all authentication methods, security practices, and implementation details.

## Authentication Methods

### 1. JWT Bearer Token Authentication

#### Token Structure
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-id-123"
  },
  "payload": {
    "sub": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["developer", "admin"],
    "permissions": ["projects:read", "projects:write", "builds:execute"],
    "iss": "https://auth.nx-monorepo.example.com",
    "aud": "nx-monorepo-api",
    "exp": 1640995200,
    "iat": 1640908800,
    "jti": "token-123",
    "session_id": "session-456"
  }
}
```

#### Token Usage
```bash
curl -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
     https://api.example.com/api/v1/projects
```

#### Token Lifecycle
- **Access Token**: Short-lived (1 hour)
- **Refresh Token**: Long-lived (30 days)
- **ID Token**: User identity information
- **Session Token**: Server-side session management

### 2. API Key Authentication

#### API Key Format
```
nxmr_live_1234567890abcdef1234567890abcdef
```

#### Usage
```bash
curl -H "X-API-Key: nxmr_live_1234567890abcdef1234567890abcdef" \
     https://api.example.com/api/v1/projects
```

#### API Key Types
- **Live Keys**: Production environment (`nxmr_live_`)
- **Test Keys**: Development/testing (`nxmr_test_`)
- **Limited Keys**: Restricted permissions (`nxmr_limited_`)

### 3. Service-to-Service Authentication

#### AWS IAM Roles
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/nx-monorepo-service"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

#### Service Account Tokens
```typescript
import { getServiceToken } from '@nx-monorepo-template/auth';

const token = await getServiceToken({
  service: 'build-system',
  scopes: ['projects:read', 'builds:execute']
});
```

## User Authentication Flow

### 1. Login Process

#### Email/Password Login
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123!",
  "remember_me": true
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_expires_in": 2592000,
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["developer"],
    "last_login": "2024-01-15T10:30:00Z"
  }
}
```

#### Multi-Factor Authentication (MFA)
```bash
POST /api/v1/auth/mfa/verify
Content-Type: application/json

{
  "session_token": "temp_session_token",
  "mfa_code": "123456",
  "mfa_type": "totp"
}
```

#### Social Login (OAuth 2.0)
```bash
GET /api/v1/auth/oauth/google?redirect_uri=https://app.example.com/callback
```

### 2. Token Refresh

#### Refresh Access Token
```bash
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 3. Logout

#### Single Logout
```bash
POST /api/v1/auth/logout
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...

{
  "refresh_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

#### Global Logout (All Sessions)
```bash
POST /api/v1/auth/logout/all
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

## Authorization Model

### Role-Based Access Control (RBAC)

#### Predefined Roles
```typescript
enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  VIEWER = 'viewer',
  GUEST = 'guest'
}
```

#### Role Hierarchy
```
super_admin > admin > developer > viewer > guest
```

#### Role Permissions
```json
{
  "roles": {
    "super_admin": {
      "permissions": ["*:*"],
      "description": "Full system access"
    },
    "admin": {
      "permissions": [
        "projects:*",
        "users:*",
        "builds:*",
        "deployments:*",
        "settings:*"
      ],
      "description": "Administrative access"
    },
    "developer": {
      "permissions": [
        "projects:read",
        "projects:write",
        "builds:read",
        "builds:execute",
        "deployments:read",
        "specs:*"
      ],
      "description": "Development access"
    },
    "viewer": {
      "permissions": [
        "projects:read",
        "builds:read",
        "deployments:read",
        "specs:read"
      ],
      "description": "Read-only access"
    },
    "guest": {
      "permissions": [
        "projects:read:public",
        "specs:read:public"
      ],
      "description": "Limited public access"
    }
  }
}
```

### Permission System

#### Permission Format
```
resource:action:scope
```

**Examples:**
- `projects:read` - Read all projects
- `projects:write:own` - Write only own projects
- `builds:execute:project_123` - Execute builds for specific project

#### Resource Types
- **projects**: Project management
- **builds**: Build operations
- **deployments**: Deployment operations
- **specs**: Specification management
- **users**: User management
- **settings**: System settings

#### Actions
- **read**: View/list resources
- **write**: Create/update resources
- **delete**: Remove resources
- **execute**: Perform operations
- **admin**: Administrative actions

#### Scopes
- **all**: All resources (default)
- **own**: User's own resources
- **team**: Team resources
- **project_id**: Specific project
- **public**: Publicly accessible

### Dynamic Permissions

#### Project-Level Permissions
```json
{
  "user_id": "user-123",
  "project_permissions": {
    "project-456": ["read", "write", "build"],
    "project-789": ["read"]
  }
}
```

#### Team-Based Permissions
```json
{
  "teams": [
    {
      "id": "team-frontend",
      "name": "Frontend Team",
      "members": ["user-123", "user-456"],
      "permissions": {
        "projects": ["web-app", "ui-components"],
        "actions": ["read", "write", "build"]
      }
    }
  ]
}
```

## Implementation Examples

### Backend Authorization Middleware

#### NestJS Guard
```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload;

      // Check permissions
      const requiredPermissions = this.reflector.get<string[]>(
        'permissions',
        context.getHandler()
      );

      if (requiredPermissions) {
        return this.checkPermissions(payload, requiredPermissions);
      }

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private checkPermissions(user: any, requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission =>
      user.permissions?.includes(permission)
    );
  }
}
```

#### Permission Decorator
```typescript
import { SetMetadata } from '@nestjs/common';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

// Usage
@Get('/projects')
@RequirePermissions('projects:read')
async getProjects() {
  // Implementation
}
```

### Frontend Authentication

#### React Hook
```typescript
import { useState, useEffect, createContext, useContext } from 'react';
import { AuthService } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const userData = await AuthService.verifyToken(token);
          setUser(userData);
        }
      } catch (error) {
        localStorage.removeItem('access_token');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await AuthService.login(email, password);
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    AuthService.logout();
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      hasPermission,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

#### Protected Route Component
```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole
}) => {
  const { user, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredRole && !user.roles.includes(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
```

## Security Best Practices

### Token Security

#### Secure Storage
```typescript
// Use secure HTTP-only cookies for sensitive tokens
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
};

response.cookie('refresh_token', refreshToken, cookieOptions);
```

#### Token Validation
```typescript
class TokenValidator {
  async validateToken(token: string): Promise<boolean> {
    try {
      // 1. Verify signature
      const decoded = jwt.verify(token, publicKey, { algorithm: 'RS256' });

      // 2. Check expiration
      if (decoded.exp < Date.now() / 1000) {
        return false;
      }

      // 3. Verify issuer and audience
      if (decoded.iss !== expectedIssuer || decoded.aud !== expectedAudience) {
        return false;
      }

      // 4. Check token blacklist
      const isBlacklisted = await this.isTokenBlacklisted(decoded.jti);
      if (isBlacklisted) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}
```

### Password Security

#### Password Requirements
```typescript
const passwordRequirements = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  prohibitCommonPasswords: true,
  prohibitUserInfo: true
};

function validatePassword(password: string, userInfo: any): boolean {
  // Implementation of password validation
}
```

#### Password Hashing
```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### Rate Limiting

#### API Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1/auth', authLimiter);
```

#### Progressive Delays
```typescript
class AuthAttemptTracker {
  private attempts = new Map<string, number>();

  getDelay(identifier: string): number {
    const attemptCount = this.attempts.get(identifier) || 0;
    // Exponential backoff: 0s, 1s, 2s, 4s, 8s, 16s...
    return Math.min(Math.pow(2, attemptCount - 1) * 1000, 60000);
  }

  recordAttempt(identifier: string): void {
    const current = this.attempts.get(identifier) || 0;
    this.attempts.set(identifier, current + 1);
  }

  resetAttempts(identifier: string): void {
    this.attempts.delete(identifier);
  }
}
```

## Multi-Factor Authentication (MFA)

### TOTP (Time-based One-Time Password)

#### Setup TOTP
```bash
POST /api/v1/auth/mfa/totp/setup
Authorization: Bearer token

{
  "app_name": "NX Monorepo"
}
```

**Response:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "backup_codes": [
    "12345678",
    "87654321",
    "11223344"
  ]
}
```

#### Verify TOTP
```bash
POST /api/v1/auth/mfa/totp/verify
Authorization: Bearer token

{
  "code": "123456"
}
```

### SMS Authentication

#### Send SMS Code
```bash
POST /api/v1/auth/mfa/sms/send
Content-Type: application/json

{
  "phone_number": "+1234567890"
}
```

#### Verify SMS Code
```bash
POST /api/v1/auth/mfa/sms/verify
Content-Type: application/json

{
  "phone_number": "+1234567890",
  "code": "123456"
}
```

## Session Management

### Session Configuration
```typescript
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  },
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:'
  })
};
```

### Session Validation
```typescript
class SessionService {
  async validateSession(sessionId: string): Promise<Session | null> {
    const session = await redis.get(`sess:${sessionId}`);

    if (!session) {
      return null;
    }

    const parsedSession = JSON.parse(session);

    // Check if session is expired
    if (parsedSession.expires < Date.now()) {
      await redis.del(`sess:${sessionId}`);
      return null;
    }

    // Update last activity
    parsedSession.lastActivity = Date.now();
    await redis.set(`sess:${sessionId}`, JSON.stringify(parsedSession));

    return parsedSession;
  }
}
```

## Error Handling

### Authentication Errors
```json
{
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid credentials",
    "details": {
      "reason": "invalid_password",
      "attempts_remaining": 3,
      "lockout_time": null
    }
  }
}
```

### Authorization Errors
```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Access denied",
    "details": {
      "required_permission": "projects:write",
      "user_permissions": ["projects:read"],
      "resource": "projects/proj_123"
    }
  }
}
```

## Monitoring and Auditing

### Authentication Events
- User login/logout
- Failed authentication attempts
- Password changes
- MFA setup/disable
- Token refresh
- Session timeouts

### Audit Log Format
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "event_type": "USER_LOGIN",
  "user_id": "user-123",
  "session_id": "session-456",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "success": true,
  "details": {
    "login_method": "email_password",
    "mfa_used": true
  }
}
```

### Security Alerts
```typescript
const securityAlerts = {
  MULTIPLE_FAILED_LOGINS: {
    threshold: 5,
    window: '15 minutes',
    action: 'lock_account'
  },
  LOGIN_FROM_NEW_LOCATION: {
    action: 'send_notification'
  },
  PRIVILEGE_ESCALATION: {
    action: 'immediate_alert'
  },
  UNUSUAL_API_ACTIVITY: {
    threshold: 100,
    window: '5 minutes',
    action: 'rate_limit'
  }
};
```

## Testing Authentication

### Unit Tests
```typescript
describe('AuthService', () => {
  it('should authenticate user with valid credentials', async () => {
    const result = await authService.login('user@example.com', 'password');

    expect(result.access_token).toBeDefined();
    expect(result.user.email).toBe('user@example.com');
  });

  it('should reject invalid credentials', async () => {
    await expect(
      authService.login('user@example.com', 'wrongpassword')
    ).rejects.toThrow('Invalid credentials');
  });
});
```

### Integration Tests
```typescript
describe('Authentication API', () => {
  it('should return 401 for protected route without token', async () => {
    const response = await request(app)
      .get('/api/v1/projects')
      .expect(401);

    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('should allow access with valid token', async () => {
    const token = await getValidToken();

    const response = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toBeDefined();
  });
});
```

## References

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OAuth 2.0 Security Best Current Practice](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)

---

**Last Updated**: January 15, 2024
**Version**: v1.0.0