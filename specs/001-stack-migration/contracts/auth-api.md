# Authentication API Contracts

**Feature**: 001-stack-migration  
**Phase**: Phase 1 - API Contracts  
**Date**: 2025-11-12

## Overview

This document defines the API contracts for authentication operations. The Option Matrix uses Supabase Auth as the backend, so most authentication is handled via Supabase client SDK calls rather than custom API routes. This document covers both Supabase SDK methods and our custom API routes.

---

## Authentication Methods

### 1. Login (Supabase SDK)

**Method**: Client SDK Call  
**Function**: `supabase.auth.signInWithPassword()`

**Request**:
```typescript
{
  email: string      // Valid email format
  password: string   // Min 8 characters
}
```

**Success Response** (200):
```typescript
{
  data: {
    user: {
      id: string (uuid)
      email: string
      email_confirmed_at: string (ISO 8601)
      last_sign_in_at: string (ISO 8601)
      role: string
      created_at: string (ISO 8601)
      updated_at: string (ISO 8601)
      user_metadata: object
      app_metadata: object
    },
    session: {
      access_token: string (JWT)
      token_type: "bearer"
      expires_in: number (seconds)
      expires_at: number (unix timestamp)
      refresh_token: string
      user: User (same as above)
    }
  },
  error: null
}
```

**Error Responses**:

| Status | Error Object | Description |
|--------|--------------|-------------|
| 400 | `{ message: "Invalid login credentials", status: 400 }` | Wrong email/password |
| 400 | `{ message: "Email not confirmed", status: 400 }` | Email verification required |
| 429 | `{ message: "Too many requests", status: 429 }` | Rate limit exceeded |
| 500 | `{ message: "Internal server error", status: 500 }` | Server error |

**Example Usage**:
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'doctor@hospital.com',
  password: 'SecurePass123',
})

if (error) {
  // Handle error
  console.error(error.message)
} else {
  // Login successful
  console.log('Logged in:', data.user.email)
}
```

**Side Effects**:
- Sets HTTP-only cookies (`sb-access-token`, `sb-refresh-token`)
- Creates session in `auth.sessions` table
- Updates `auth.users.last_sign_in_at`
- Logs event in `auth.audit_log_entries`

---

### 2. Logout (Supabase SDK)

**Method**: Client SDK Call  
**Function**: `supabase.auth.signOut()`

**Request**: None (uses cookies)

**Success Response** (200):
```typescript
{
  error: null
}
```

**Error Response** (rarely fails):
```typescript
{
  error: {
    message: string
    status: number
  }
}
```

**Example Usage**:
```typescript
const { error } = await supabase.auth.signOut()

if (error) {
  console.error('Logout failed:', error.message)
} else {
  // Redirect to login page
  router.push('/login')
}
```

**Side Effects**:
- Clears auth cookies
- Invalidates session in `auth.sessions`
- Logs event in `auth.audit_log_entries`

---

### 3. Get Session (Supabase SDK)

**Method**: Client SDK Call  
**Function**: `supabase.auth.getSession()`

**Request**: None (reads from cookies)

**Success Response** (200):
```typescript
{
  data: {
    session: Session | null  // Session object or null if not authenticated
  },
  error: null
}
```

**Example Usage**:
```typescript
const { data: { session }, error } = await supabase.auth.getSession()

if (session) {
  console.log('User is logged in:', session.user.email)
} else {
  console.log('User is not logged in')
}
```

**Side Effects**: None (read-only)

---

### 4. Get User Profile

**Method**: Database Query (Supabase SDK)  
**Table**: `public.profiles`

**Request**:
```typescript
// Query
.from('profiles')
.select('id, user_type, is_active, is_deleted, created_at')
.eq('id', userId)
.single()
```

**Success Response** (200):
```typescript
{
  data: {
    id: string (uuid)
    user_type: 'Admin' | 'Patient' | 'Provider' | 'Nurse' | 'Technician'
    is_active: boolean
    is_deleted: boolean
    created_at: string (ISO 8601)
  },
  error: null
}
```

**Error Responses**:

| Error | Description |
|-------|-------------|
| `PGRST116` | Profile not found (no rows returned) |
| `PGRST301` | RLS policy violation (unauthorized) |

**Example Usage**:
```typescript
const { data: profile, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', session.user.id)
  .single()

if (error) {
  console.error('Profile fetch failed:', error.message)
} else {
  console.log('User role:', profile.user_type)
}
```

**Side Effects**: None (read-only)

**RLS Policy**: User can only read their own profile, or any profile if they're an Admin

---

## Custom API Routes

### 5. POST /api/auth/callback

**Purpose**: Handle Supabase auth redirects (OAuth, magic links, etc.)

**Method**: GET  
**Route**: `/api/auth/callback`

**Query Parameters**:
```typescript
{
  code?: string          // Auth code from Supabase
  error?: string         // Error if auth failed
  error_description?: string
}
```

**Success Response** (302 Redirect):
```
Location: / (dashboard)
Set-Cookie: sb-access-token=...; HttpOnly; Secure; SameSite=Lax
Set-Cookie: sb-refresh-token=...; HttpOnly; Secure; SameSite=Lax
```

**Error Response** (302 Redirect):
```
Location: /login?error=auth_failed
```

**Implementation**:
```typescript
// app/api/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
```

**Use Cases**:
- OAuth callback (future)
- Magic link login (future)
- Email confirmation (future)

**Phase 1 Scope**: Implementation prepared, but not actively used (no OAuth/magic links yet)

---

### 6. POST /api/auth/signout

**Purpose**: Server-side logout endpoint (alternative to client SDK)

**Method**: POST  
**Route**: `/api/auth/signout`

**Request Body**: None

**Success Response** (200):
```json
{
  "success": true,
  "message": "Signed out successfully"
}
```

**Error Response** (500):
```json
{
  "success": false,
  "error": "Failed to sign out"
}
```

**Implementation**:
```typescript
// app/api/auth/signout/route.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options })
        },
      },
    }
  )

  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, message: 'Signed out successfully' })
}
```

**Use Cases**:
- Server-side logout (e.g., from middleware)
- API-driven logout (e.g., admin forcing logout)

**Phase 1 Scope**: Optional endpoint, client SDK `signOut()` is preferred

---

## Error Codes Reference

### Supabase Auth Error Codes

| Code | Message | HTTP Status | Description |
|------|---------|-------------|-------------|
| `invalid_credentials` | Invalid login credentials | 400 | Wrong email or password |
| `email_not_confirmed` | Email not confirmed | 400 | User must verify email |
| `user_not_found` | User not found | 400 | Email doesn't exist |
| `invalid_grant` | Invalid grant | 400 | Refresh token invalid |
| `over_request_rate_limit` | Over request rate limit | 429 | Too many requests |
| `email_exists` | User already registered | 422 | Email already in use |

### Database Error Codes (PostgreSQL)

| Code | Description |
|------|-------------|
| `PGRST116` | No rows returned (e.g., profile not found) |
| `PGRST301` | RLS policy violation |
| `23505` | Unique constraint violation |
| `23503` | Foreign key violation |

---

## Request/Response Examples

### Successful Login Flow

**1. Client calls login**:
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'nurse@hospital.com',
  password: 'NursePass123',
})
```

**2. Supabase response**:
```json
{
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "nurse@hospital.com",
      "email_confirmed_at": "2025-11-12T10:00:00Z",
      "last_sign_in_at": "2025-11-12T14:30:00Z"
    },
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "v1:a1b2c3d4...",
      "expires_at": 1731424200
    }
  },
  "error": null
}
```

**3. Client fetches profile**:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('user_type')
  .eq('id', data.user.id)
  .single()
```

**4. Profile response**:
```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "user_type": "Nurse",
    "is_active": true,
    "is_deleted": false
  },
  "error": null
}
```

**5. Client redirects**:
```typescript
router.push('/') // Dashboard
```

---

### Failed Login Flow

**1. Client calls login with wrong password**:
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'nurse@hospital.com',
  password: 'WrongPassword',
})
```

**2. Supabase error response**:
```json
{
  "data": {
    "user": null,
    "session": null
  },
  "error": {
    "message": "Invalid login credentials",
    "status": 400
  }
}
```

**3. Client shows error**:
```typescript
if (error) {
  toast.error(error.message) // "Invalid login credentials"
}
```

---

## Rate Limiting

**Supabase Auth Rate Limits** (default):
- Sign in: 10 requests per 10 seconds per IP
- Sign up: 10 requests per 10 seconds per IP
- Password reset: 10 requests per 10 seconds per IP

**Exceeded Rate Limit Response**:
```json
{
  "error": {
    "message": "Too many requests",
    "status": 429
  }
}
```

**Recommendation**: Display user-friendly message:
```
"Too many login attempts. Please wait a moment and try again."
```

---

## Security Considerations

### Authentication Headers

**Cookies** (Set automatically by Supabase):
```
sb-access-token: <JWT>
  - HttpOnly: true
  - Secure: true (production)
  - SameSite: Lax
  - Path: /
  - Max-Age: 3600 (1 hour)

sb-refresh-token: <refresh-token>
  - HttpOnly: true
  - Secure: true (production)
  - SameSite: Lax
  - Path: /
  - Max-Age: 604800 (7 days)
```

### Authorization Header (Alternative)

For API requests (not used in Phase 1):
```
Authorization: Bearer <access_token>
```

### CORS Configuration

Supabase CORS settings (configured in Supabase dashboard):
- Allowed Origins: `https://yourdomain.com` (production)
- Allowed Origins: `http://localhost:3000` (development)

---

## Testing Endpoints

### Manual Testing Checklist

1. **Login with valid credentials**
   - ✅ Returns session
   - ✅ Sets cookies
   - ✅ Can fetch profile

2. **Login with invalid email**
   - ✅ Returns error: "Invalid login credentials"

3. **Login with invalid password**
   - ✅ Returns error: "Invalid login credentials"

4. **Logout**
   - ✅ Clears cookies
   - ✅ Invalidates session

5. **Access protected route without auth**
   - ✅ Redirects to /login

6. **Access protected route with valid auth**
   - ✅ Loads page successfully

7. **Session expiry**
   - ✅ Automatically refreshes token
   - ✅ Forces logout if refresh fails

---

## Summary

**Key Endpoints**:
- **Login**: `supabase.auth.signInWithPassword()` (SDK call)
- **Logout**: `supabase.auth.signOut()` (SDK call)
- **Get Session**: `supabase.auth.getSession()` (SDK call)
- **Get Profile**: Query `public.profiles` table
- **Auth Callback**: `GET /api/auth/callback` (route handler)
- **Signout API**: `POST /api/auth/signout` (optional route handler)

**Authentication Flow**:
1. User submits login form
2. Client calls Supabase SDK
3. Supabase validates credentials
4. Returns session + sets cookies
5. Client fetches user profile
6. Redirects to dashboard

**Security**:
- HTTP-only cookies prevent XSS attacks
- HTTPS required in production
- Rate limiting prevents brute force
- RLS policies protect profile data
- CORS configured for allowed origins
