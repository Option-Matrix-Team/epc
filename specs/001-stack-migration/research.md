# Research: Authentication & Access Control

**Feature**: 001-stack-migration  
**Phase**: Phase 0 - Research & Decisions  
**Date**: 2025-11-12

## Overview

This document consolidates research findings and architectural decisions for implementing authentication in the Option Matrix using Supabase Auth with Next.js 16 App Router.

## Research Areas

### 1. Supabase Auth Integration with Next.js App Router

**Decision**: Use `@supabase/ssr` package for Next.js App Router compatibility

**Rationale**:
- Supabase SSR package provides Next.js-specific helpers for Server Components and Server Actions
- Handles cookie-based session management automatically
- Supports both client and server-side auth checks
- Compatible with Next.js 13+ App Router and middleware
- Provides createServerClient and createBrowserClient utilities

**Alternatives Considered**:
- `@supabase/auth-helpers-nextjs`: Deprecated in favor of @supabase/ssr
- Custom auth implementation: Rejected due to complexity and security concerns
- NextAuth.js: Rejected because Supabase Auth already exists in legacy system

**Implementation Pattern**:
```typescript
// Browser client (use in Client Components)
import { createBrowserClient } from '@supabase/ssr'

// Server client (use in Server Components, Server Actions, Route Handlers)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
```

**References**:
- https://supabase.com/docs/guides/auth/server-side/nextjs
- https://github.com/supabase/supabase/tree/master/examples/auth/nextjs

---

### 2. Route Protection Strategy

**Decision**: Implement Next.js middleware for route protection + per-route server-side checks

**Rationale**:
- Middleware runs before page rendering, preventing flash of protected content
- Server Components can revalidate auth state for additional security
- Route groups `(auth)` and `(dashboard)` provide clear separation
- Middleware is the recommended Next.js pattern for auth guards

**Implementation Pattern**:
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(/* ... */)
  const { data: { session } } = await supabase.auth.getSession()
  
  // Redirect unauthenticated users from protected routes
  if (!session && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Redirect authenticated users away from login
  if (session && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
```

**Alternatives Considered**:
- Client-side only protection: Rejected due to security concerns (page flash, bypassed redirects)
- HOC pattern: Less idiomatic for App Router, middleware is preferred
- Per-page auth checks: Verbose and error-prone without middleware layer

---

### 3. Session Management

**Decision**: Use Supabase cookie-based sessions with automatic refresh

**Rationale**:
- Supabase handles JWT refresh tokens automatically
- Cookies are HTTP-only, secure, and sameSite protected
- Session duration: configurable (default 3600s with refresh)
- Automatic token refresh before expiration

**Session Timeout Configuration**:
```typescript
// Supabase dashboard configuration:
// - JWT expiry: 3600 seconds (1 hour)
// - Refresh token expiry: 604800 seconds (7 days)
// - Auto-confirm users: true (for admin-created accounts)
```

**15-Minute Inactivity Timeout** (Constitution requirement):
- Will be implemented via client-side activity tracking in Phase 2
- Track last activity timestamp in localStorage
- Check on every user interaction
- Force logout if > 15 minutes since last activity

**Alternatives Considered**:
- LocalStorage tokens: Rejected due to security concerns (XSS vulnerable)
- Session storage: Rejected (lost on tab close)
- Redis-based sessions: Unnecessary complexity for Supabase Auth

---

### 4. Form Validation & UI Components

**Decision**: Use React Hook Form + Zod + shadcn/ui Form components

**Rationale**:
- React Hook Form: Performant, minimal re-renders, excellent TypeScript support
- Zod: Type-safe schema validation, integrates with RHF via @hookform/resolvers
- shadcn/ui Form components: Pre-built accessible form primitives
- Consistent with existing UI component library (shadcn/ui already in use)

**Form Schema Example**:
```typescript
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>
```

**Alternatives Considered**:
- Formik: Larger bundle size, less TypeScript-friendly than RHF
- Uncontrolled forms: Less validation control, harder to provide UX feedback
- Custom validation: Reinventing the wheel, Zod provides better type safety

---

### 5. Error Handling & User Feedback

**Decision**: Use toast notifications (shadcn/ui Sonner) + inline form errors

**Rationale**:
- Toast for global feedback (login success, session expired, server errors)
- Inline errors for field-specific validation (email format, password length)
- Consistent with healthcare UX patterns (clear, immediate feedback)
- Non-blocking (toasts auto-dismiss)

**Error Categories**:
1. **Validation Errors**: Shown inline below form fields (immediate)
2. **Authentication Errors**: Toast notification (invalid credentials, account locked)
3. **Network Errors**: Toast notification (connection timeout, server unavailable)
4. **Session Errors**: Toast + redirect (session expired, forced logout)

**Implementation**:
```typescript
import { toast } from 'sonner'

// On auth error
toast.error('Invalid email or password')

// On auth success
toast.success('Welcome back!')
```

**Alternatives Considered**:
- Modal dialogs: Rejected (too intrusive, blocks workflow)
- Alert banners: Rejected (persists too long, clutters UI)
- Console errors only: Rejected (poor UX, users won't see them)

---

### 6. Role-Based Access Control (RBAC) Foundation

**Decision**: Store user_type in profiles table, check in middleware + components

**Rationale**:
- profiles.user_type enum already exists (Admin, Patient, Provider, Nurse, Technician)
- Single source of truth for user roles
- Can be queried in middleware for route-level protection
- Enables role-based UI customization

**Implementation Pattern**:
```typescript
// Get user profile with role
const { data: profile } = await supabase
  .from('profiles')
  .select('user_type, is_active')
  .eq('id', session.user.id)
  .single()

// Check role
if (profile.user_type === 'Admin') {
  // Allow admin-only actions
}
```

**Phase 1 Scope**:
- Store and retrieve user_type
- Redirect to role-appropriate dashboard after login
- No fine-grained permission checks (defer to Phase 2)

**Future Enhancements** (Phase 2+):
- Permission-based access control (PBAC)
- Role hierarchy
- Dynamic permissions table
- Resource-level permissions

---

### 7. User Account Creation (Admin-Only)

**Decision**: No signup page - use Supabase Admin API for user creation

**Rationale**:
- Healthcare requirement: staff must be vetted before system access
- Admins create users via Supabase dashboard or future admin panel
- Prevents unauthorized account creation
- Users receive email invitation with password setup link

**Admin User Creation Flow**:
1. Admin creates user in Supabase dashboard (or future admin UI)
2. Supabase sends confirmation email with "Set Password" link
3. User clicks link, sets password, confirms email
4. User can now log in

**Alternatives Considered**:
- Open signup with approval: Rejected (introduces workflow complexity)
- Invite-only signup: Possible future enhancement, but not needed for MVP

---

### 8. Password Reset Flow

**Decision**: Use Supabase built-in password reset (defer to Phase 1.5 or Phase 2)

**Rationale**:
- Supabase provides secure password reset out of the box
- Email-based reset link with token expiration
- Not critical for initial auth implementation
- Can be added incrementally

**Implementation**:
```typescript
// Trigger password reset
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`,
})
```

**Phase 1 Scope**: Not included (can users contact admin to reset password manually)  
**Phase 2 Scope**: Add "Forgot Password" link and reset flow

---

### 9. Security Best Practices

**Decisions**:
1. **HTTPS Only**: Enforce in production (Supabase requires HTTPS)
2. **CORS Configuration**: Whitelist only application domain
3. **Rate Limiting**: Use Supabase built-in rate limiting for auth endpoints
4. **SQL Injection**: Protected by Supabase parameterized queries
5. **XSS Protection**: React escapes by default, avoid dangerouslySetInnerHTML
6. **CSRF Protection**: Supabase PKCE flow provides CSRF protection

**Environment Variables**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

- `NEXT_PUBLIC_*` prefix: Safe to expose in browser
- Anon key: Public-facing, RLS policies protect data
- Service role key: Server-only (not used in this implementation)

---

### 10. Testing Strategy (Manual)

**Decision**: Document manual test cases in quickstart.md

**Test Scenarios**:
1. Valid login → Redirects to dashboard
2. Invalid email format → Show inline validation error
3. Wrong password → Show auth error toast
4. Empty fields → Show required field errors
5. Network error → Show connection error toast
6. Successful logout → Redirect to login page
7. Access protected route while logged out → Redirect to login
8. Access login while logged in → Redirect to dashboard
9. Session persistence → Refresh page, still logged in
10. Different roles → Redirect to appropriate dashboard

**No Automated Tests**: Per project requirements

---

## Technology Stack Summary

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Framework | Next.js | 16.0.1 | React framework with App Router |
| Auth Provider | Supabase Auth | 2.x | Authentication backend |
| Auth Library | @supabase/ssr | Latest | Next.js SSR auth helpers |
| Database | PostgreSQL (Supabase) | 15+ | User and profile storage |
| Form Management | React Hook Form | 7.x | Form state management |
| Validation | Zod | 3.x | Schema validation |
| UI Components | shadcn/ui | Latest | Form, Button, Input components |
| Styling | Tailwind CSS | 4.x | UI styling |
| Toast Notifications | Sonner | Latest | User feedback |
| TypeScript | TypeScript | 5.x | Type safety |

---

## Implementation Phases

### Phase 1A: Foundation
- Install dependencies (@supabase/ssr, react-hook-form, zod, @hookform/resolvers, sonner)
- Setup Supabase clients (browser, server)
- Create environment variables template
- Add shadcn/ui form components (form, label)

### Phase 1B: Authentication UI
- Create login page (`app/(auth)/login/page.tsx`)
- Create login form component with validation
- Create auth layout (no sidebar)
- Style with Tailwind and shadcn/ui

### Phase 1C: Protected Routes
- Implement middleware for route protection
- Move existing dashboard to `(dashboard)` route group
- Add dashboard layout with sidebar
- Create auth guard wrapper component

### Phase 1D: Session Management
- Implement sign-out functionality
- Add auth callback route handler
- Create useAuth hook for client-side auth state
- Add user profile fetch logic

### Phase 1E: Integration & Testing
- Test all auth flows manually
- Update documentation
- Deploy to staging
- Validate with stakeholders

---

## Decision Summary

| Decision Point | Chosen Approach | Deferred to Phase 2 |
|----------------|-----------------|---------------------|
| Auth Provider | Supabase Auth | - |
| Next.js Integration | @supabase/ssr | - |
| Route Protection | Middleware + Server checks | - |
| Session Storage | HTTP-only cookies | - |
| Form Validation | React Hook Form + Zod | - |
| UI Components | shadcn/ui | - |
| Error Handling | Toast + inline errors | - |
| RBAC | user_type enum | Fine-grained permissions |
| Account Creation | Admin-only | - |
| Password Reset | - | Add reset flow |
| MFA | - | Implement MFA |
| Session Timeout | - | 15-min inactivity tracker |
| Account Lockout | - | Failed attempt tracking |
| Automated Testing | - | Excluded per project requirements |

---

## Open Questions

None - all decisions finalized for Phase 1 implementation.

---

## References

1. [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
2. [Supabase Next.js Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
3. [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
4. [React Hook Form](https://react-hook-form.com/)
5. [Zod](https://zod.dev/)
6. [shadcn/ui](https://ui.shadcn.com/)
