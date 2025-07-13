# Nakksha Consulting Platform - API Documentation

## Overview

The Nakksha Consulting Platform API is a RESTful API built with Express.js and TypeScript, providing authentication, consultant management, session booking, and admin approval workflows.

**Base URL**: `http://localhost:8000/api/v1`  
**API Version**: v1  
**Authentication**: JWT Bearer tokens

---

## Authentication System

### Core Concepts

1. **Separate Authentication**: Different auth flows for consultants vs admins
2. **Admin Approval Workflow**: Consultants require admin approval to access dashboard
3. **Email Verification**: Required for all consultant accounts
4. **JWT Tokens**: Access tokens (15min) + Refresh tokens for session management

### Authentication States

| State | Description | Can Login | Can Access Dashboard |
|-------|-------------|-----------|---------------------|
| `REGISTERED` | Just signed up | ✅ | ❌ |
| `EMAIL_VERIFIED` | Email confirmed | ✅ | ❌ |
| `ADMIN_APPROVED` | Admin approved | ✅ | ✅ |
| `PROFILE_COMPLETE` | Ready for business | ✅ | ✅ |

---

## API Endpoints

### Authentication Endpoints

#### `POST /api/v1/auth/signup`
Register a new consultant account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com", 
  "password": "SecurePass123!"
}
```

**Smart Name Parsing** (CEO Specification):
- 1 word: `firstName = word`, `lastName = ""`
- 2 words: `firstName = first`, `lastName = second`
- 3+ words: `firstName = first`, `lastName = "remaining words"`

**Response:**
```json
{
  "message": "Account created successfully",
  "data": {
    "consultant": {
      "id": "uuid",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe", 
      "slug": "john-doe-1",
      "isApprovedByAdmin": false,
      "profileCompleted": false
    },
    "nextSteps": {
      "verifyEmail": true,
      "completeProfile": true,
      "awaitAdminApproval": true
    }
  }
}
```

**Validation Rules:**
- Name: 2-100 chars, letters and spaces only
- Email: Valid email format
- Password: 8+ chars, must contain uppercase, lowercase, number, special char

---

#### `POST /api/v1/auth/login`
Authenticate consultant and get access tokens.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "data": {
    "consultant": {
      "id": "uuid",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "slug": "john-doe-1",
      "isEmailVerified": false,
      "isApprovedByAdmin": false,
      "profileCompleted": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    },
    "permissions": {
      "canLogin": true,
      "canAccessDashboard": false,
      "canCompleteProfile": true,
      "needsEmailVerification": true,
      "needsProfileCompletion": true,
      "needsAdminApproval": true
    }
  }
}
```

**Business Logic:**
- ✅ `canLogin: true` - User can authenticate
- ❌ `canAccessDashboard: false` - Needs admin approval first
- ⚠️ `needsAdminApproval: true` - Core business requirement

---

#### `POST /api/v1/auth/admin/login`
Admin authentication (separate from consultant auth).

**Request Body:**
```json
{
  "email": "admin@company.com",
  "password": "AdminPass123!"
}
```

---

#### `GET /api/v1/auth/me`
Get current user profile information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "data": {
    "consultant": {
      "id": "uuid",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "slug": "john-doe-1",
      "profilePhotoUrl": null,
      "isEmailVerified": true,
      "isApprovedByAdmin": true,
      "profileCompleted": true,
      "subscriptionPlan": "free",
      "subscriptionExpiresAt": null,
      "createdAt": "2024-06-24T12:00:00Z"
    }
  }
}
```

---

#### `POST /api/v1/auth/refresh`
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "15m"
  }
}
```

---

#### `POST /api/v1/auth/logout`
Logout user and invalidate session.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

---

#### `POST /api/v1/auth/forgot-password`
Request password reset email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, we have sent password reset instructions"
}
```

---

#### `POST /api/v1/auth/reset-password`
Reset password using token from email.

**Request Body:**
```json
{
  "token": "uuid-token-from-email",
  "password": "NewSecurePass123!"
}
```

**Response:**
```json
{
  "message": "Password reset successful. You can now login with your new password."
}
```

---

#### `GET /api/v1/auth/verify-email/:token`
Verify email address using token from email.

**Response:**
```json
{
  "message": "Email verified successfully. You can now access your account."
}
```

---

## Protected Routes (Require Authentication)

All protected routes require the `Authorization: Bearer <access_token>` header.

### Consultant Management

#### `GET /api/v1/consultant/profile`
Get consultant profile details.

#### `PUT /api/v1/consultant/profile`
Update consultant profile information.

#### `GET /api/v1/consultant/:slug`
Get public consultant page data.

#### `POST /api/v1/consultant/availability`
Create availability slots.

#### `GET /api/v1/consultant/availability`
Get consultant's availability slots.

### Dashboard Routes

#### `GET /api/v1/dashboard/metrics`
Get dashboard metrics and analytics.

#### `GET /api/v1/dashboard/charts`
Get chart data for dashboard.

#### `GET /api/v1/dashboard/recent-activity`
Get recent activity feed.

#### `GET /api/v1/dashboard/summary`
Get quick summary statistics.

### Session Management

#### `GET /api/v1/sessions`
List consultant's sessions with pagination and filtering.

#### `POST /api/v1/sessions`
Create new session booking.

#### `GET /api/v1/sessions/:id`
Get detailed session information.

#### `PUT /api/v1/sessions/:id`
Update session details.

#### `DELETE /api/v1/sessions/:id`
Cancel/delete session.

### Client Management

#### `GET /api/v1/clients`
List consultant's clients.

#### `POST /api/v1/clients`
Create new client record.

#### `GET /api/v1/clients/:id`
Get client details and history.

#### `PUT /api/v1/clients/:id`
Update client information.

#### `DELETE /api/v1/clients/:id`
Remove client (soft delete).

### Quotation System

#### `GET /api/v1/quotations`
List quotations with filtering.

#### `POST /api/v1/quotations`
Create new quotation.

#### `GET /api/v1/quotations/:id`
Get quotation details.

#### `PUT /api/v1/quotations/:id`
Update quotation.

#### `DELETE /api/v1/quotations/:id`
Delete quotation.

#### `POST /api/v1/quotations/:id/send`
Send quotation to client via email.

---

## Microsoft Teams Integration

The Teams integration allows consultants to connect their Microsoft accounts and automatically create Teams meetings for their sessions.

### Teams Integration Workflow

1. **Connect Account**: Consultant connects Microsoft account via OAuth
2. **Store Tokens**: Access and refresh tokens stored securely 
3. **Create Sessions**: When Teams platform selected, automatic meeting creation
4. **Meeting Links**: Teams meeting links included in session confirmation emails

### Teams Integration Routes

#### `GET /api/v1/teams/status`
Check Teams integration status for consultant.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isConnected": true,
    "isExpired": false,
    "userEmail": "consultant@company.com",
    "connectedAt": "2024-01-15T10:30:00Z",
    "needsReconnection": false
  }
}
```

---

#### `GET /api/v1/teams/oauth-url`
Generate Microsoft OAuth URL for Teams integration.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "oauthUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=...",
    "debug": {
      "consultantId": "consultant-uuid",
      "redirectUri": "http://localhost:3000/auth/teams/callback",
      "clientId": "aKC8Q~P2..."
    }
  }
}
```

**Common Errors:**
- `TEAMS_CONFIG_ERROR` (500): Microsoft OAuth configuration missing
- `TEAMS_OAUTH_URL_ERROR` (500): Failed to generate OAuth URL

---

#### `POST /api/v1/teams/oauth-callback`
Handle Microsoft OAuth callback and exchange code for tokens.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "0.AXsA...",
  "redirectUri": "http://localhost:3000/auth/teams/callback"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Microsoft Teams integration connected successfully",
  "data": {
    "userEmail": "consultant@company.com",
    "displayName": "Consultant Name",
    "connectedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Common Errors:**
- `TEAMS_OAUTH_ERROR` (400): OAuth authorization failed
- `CONSULTANT_NOT_FOUND` (404): Consultant account not found
- `TEAMS_OAUTH_CALLBACK_ERROR` (500): Failed to complete OAuth flow

---

#### `POST /api/v1/teams/refresh-token`
Refresh expired Teams access token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Teams access token refreshed successfully",
  "data": {
    "expiresAt": "2024-01-15T11:30:00Z"
  }
}
```

**Common Errors:**
- `TEAMS_NO_REFRESH_TOKEN` (400): No refresh token found
- `TEAMS_REFRESH_ERROR` (400): Failed to refresh token

---

#### `DELETE /api/v1/teams/disconnect`
Disconnect Teams integration and remove stored tokens.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Microsoft Teams integration disconnected successfully"
}
```

---

### Session Creation with Teams

When creating sessions with `platform: "TEAMS"`, the system will automatically:

1. Check if consultant has connected Teams integration
2. Create Microsoft Teams meeting using stored access token
3. Include meeting link in session confirmation emails
4. Store meeting ID and link in session record

**Example Session Creation:**
```json
{
  "title": "Business Strategy Consultation",
  "sessionType": "PERSONAL",
  "platform": "TEAMS",
  "scheduledDate": "2024-01-20",
  "scheduledTime": "14:00",
  "duration": 60,
  "clientEmail": "client@company.com",
  "clientName": "Client Name",
  "amount": 1500
}
```

### Teams Integration Errors

| Error Code | Status | Description | Resolution |
|------------|---------|-------------|------------|
| `TEAMS_CONFIG_ERROR` | 500 | Microsoft OAuth configuration missing | Check environment variables |
| `TEAMS_OAUTH_URL_ERROR` | 500 | Failed to generate OAuth URL | Check meetingService configuration |
| `TEAMS_OAUTH_ERROR` | 400 | OAuth authorization failed | User should try connecting again |
| `TEAMS_NO_REFRESH_TOKEN` | 400 | No refresh token found | User needs to reconnect Microsoft account |
| `TEAMS_OAUTH_CALLBACK_ERROR` | 500 | Failed to complete OAuth flow | Check Microsoft API configuration |

### Environment Variables Required

```env
# Microsoft Teams OAuth Configuration
MICROSOFT_CLIENT_ID="your-microsoft-app-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-app-client-secret"
MICROSOFT_TENANT_ID="common"
MICROSOFT_REDIRECT_URI="http://localhost:3000/auth/teams/callback"
```

### Testing with Postman

Import the comprehensive Postman collection: `Naksha-Teams-Integration.postman_collection.json`

**Key Test Endpoints:**
1. `GET /api/v1/teams/oauth-url` - Generate OAuth URL (should no longer fail!)
2. `GET /api/v1/teams/status` - Check integration status  
3. `POST /api/v1/sessions` with `platform: "TEAMS"` - Test meeting creation

---

## Admin Routes (Admin Authentication Required)

### Admin Dashboard

#### `GET /api/v1/admin/dashboard`
Admin overview and system metrics.

### Consultant Management (Admin)

#### `GET /api/v1/admin/consultants`
List all consultants with approval status.

#### `GET /api/v1/admin/consultants/:id`
Get detailed consultant information.

#### `POST /api/v1/admin/consultants/approve`
**CRITICAL BUSINESS ENDPOINT** - Approve or reject consultant access.

**Request Body:**
```json
{
  "consultantId": "uuid",
  "action": "approve", // or "reject"
  "reason": "Verified credentials and experience"
}
```

**Response:**
```json
{
  "message": "Consultant approved successfully",
  "data": {
    "consultantId": "uuid",
    "isApprovedByAdmin": true,
    "approvedAt": "2024-06-24T12:00:00Z",
    "approvedBy": "admin-uuid"
  }
}
```

#### `PUT /api/v1/admin/consultants/:id`
Update consultant information as admin.

### Admin Management

#### `POST /api/v1/admin/admins`
Create new admin account (Super Admin only).

#### `GET /api/v1/admin/admins`
List all admin accounts (Super Admin only).

#### `GET /api/v1/admin/system/health`
System health and monitoring data.

---

## Error Response Format

All API errors follow this consistent format:

```json
{
  "error": "ValidationError",
  "message": "Name must be at least 2 characters",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "timestamp": "2024-06-24T12:00:00Z",
  "path": "/api/v1/auth/signup",
  "method": "POST"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `NOT_AUTHENTICATED` | 401 | Missing/invalid token |
| `EMAIL_NOT_VERIFIED` | 403 | Email verification required |
| `ADMIN_APPROVAL_REQUIRED` | 403 | Admin approval needed |
| `EMAIL_EXISTS` | 409 | Account already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

- **General API**: 1000 requests per 15 minutes per IP
- **Auth Endpoints**: 5 attempts per 15 minutes per IP
- **Rate limit headers included in all responses**

---

## Development Testing

### Health Check
```bash
curl http://localhost:8000/health
```

### Test Signup
```bash
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"TestPassword123!"}'
```

### Test Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"TestPassword123!"}'
```

### Test Protected Route
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/auth/me
```

---

## Architecture Notes

### Smart Name Parsing Implementation
```typescript
function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const nameParts = fullName.trim().split(/\s+/).filter(part => part.length > 0);
  
  if (nameParts.length === 1) {
    return { firstName: nameParts[0], lastName: '' };
  } else if (nameParts.length === 2) {
    return { firstName: nameParts[0], lastName: nameParts[1] };
  } else {
    return { firstName: nameParts[0], lastName: nameParts.slice(1).join(' ') };
  }
}
```

### Admin Approval Workflow
1. Consultant signs up → `isApprovedByAdmin: false`
2. Consultant can login but cannot access dashboard
3. Admin approves via `/api/v1/admin/consultants/approve`
4. Consultant can now access full dashboard functionality

### Security Features
- **Password Requirements**: 8+ chars, uppercase, lowercase, number, special char
- **JWT Tokens**: Short-lived access tokens (15min) with refresh tokens
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Comprehensive Zod schema validation
- **SQL Injection Protection**: Prisma ORM with parameterized queries

---

*Last Updated: 2024-06-24*  
*API Version: 1.0.0*  
*Backend: Express.js + TypeScript + Prisma + PostgreSQL*