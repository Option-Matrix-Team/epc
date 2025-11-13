# Data Model: Authentication & Access Control

**Feature**: 001-stack-migration  
**Phase**: Phase 1 - Data Model & Flows  
**Date**: 2025-11-12

## Overview

This document defines the database schema, data flows, and state management for authentication in the Option Matrix.

## Database Schema

### Existing Tables (Supabase Managed)

#### auth.users
*Managed by Supabase Auth - do not modify directly*

```sql
-- Key columns we interact with:
id                   uuid PRIMARY KEY
email                varchar
encrypted_password   varchar          -- bcrypt hashed by Supabase
created_at           timestamptz
last_sign_in_at      timestamptz
email_confirmed_at   timestamptz
raw_user_meta_data   jsonb           -- Custom user metadata
is_super_admin       boolean
```

**Usage**:
- Created automatically on user signup/admin creation
- Email and password managed by Supabase Auth
- Session tokens tied to auth.users.id
- Metadata can store additional user preferences

**We do NOT**:
- Insert/update directly (use Supabase Auth API)
- Store PHI in this table
- Modify encrypted_password field

---

#### auth.sessions
*Managed by Supabase Auth - read-only for us*

```sql
id            uuid PRIMARY KEY
user_id       uuid REFERENCES auth.users(id)
created_at    timestamptz
updated_at    timestamptz
```

**Usage**:
- Tracks active user sessions
- Queried by middleware for session validation
- Automatically managed by Supabase

---

### Application Tables (We Manage)

#### public.profiles
*User profile and role information*

```sql
-- Existing schema (already in database):
CREATE TABLE public.profiles (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type         user_role NOT NULL,           -- Enum: Admin, Patient, Provider, Nurse, Technician
  created_at        timestamptz DEFAULT now(),
  is_active         boolean DEFAULT true,
  is_deleted        boolean DEFAULT false,
  created_by        uuid REFERENCES auth.users(id),
  modified_by       uuid REFERENCES auth.users(id),
  modified_at       timestamptz
);

-- Enum type (already exists):
CREATE TYPE user_role AS ENUM ('Admin', 'Patient', 'Provider', 'Nurse', 'Technician');
```

**Fields**:
- `id`: Links to auth.users (one-to-one)
- `user_type`: Role for RBAC (Admin, Patient, Provider, Nurse, Technician)
- `is_active`: Soft enable/disable flag
- `is_deleted`: Soft delete flag (never hard delete)
- `created_by`, `modified_by`: Audit trail
- `created_at`, `modified_at`: Timestamps

**Validation Rules**:
- `id` must exist in auth.users
- `user_type` must be one of enum values
- `is_active` and `is_deleted` cannot both be true
- `created_by` and `modified_by` must be valid user IDs

**Relationships**:
- **auth.users** (1:1) - Profile extends auth user
- **admins** (1:1) - Admin-specific data (if user_type = 'Admin')
- **patients** (1:1) - Patient-specific data (if user_type = 'Patient')
- **providers** (1:1) - Provider-specific data (if user_type = 'Provider')
- **nurses** (1:1) - Nurse-specific data (if user_type = 'Nurse')
- **technicians** (1:1) - Technician-specific data (if user_type = 'Technician')

---

#### public.admins, public.patients, public.providers, public.nurses, public.technicians
*Role-specific extended data tables*

**Note**: These tables already exist in the database. For authentication purposes, we only need the `profiles` table. Role-specific tables will be used in future phases (Patient Management, Doctor Management, etc.).

Example structure (admins table):
```sql
CREATE TABLE public.admins (
  id               serial PRIMARY KEY,
  user_id          uuid UNIQUE REFERENCES public.profiles(id),
  permission_level integer,
  -- ... other admin-specific fields
);
```

**Phase 1 Scope**: We do NOT populate these tables yet. Focus is solely on authentication and profile creation.

---

## Authentication Flow Diagrams

### 1. Login Flow

```
User enters email/password
        ↓
Client: Form validation (Zod schema)
        ↓
Client: Call supabase.auth.signInWithPassword()
        ↓
Supabase: Verify credentials
        ↓
   Success? ───No──→ Return error (Invalid login credentials)
        ↓
       Yes
        ↓
Supabase: Generate JWT + refresh token
        ↓
Supabase: Set HTTP-only cookies
        ↓
Client: Fetch user profile from public.profiles
        ↓
Client: Redirect to role-appropriate dashboard
        ↓
Done
```

**API Call**:
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
})
```

**Success Response**:
```typescript
{
  user: {
    id: 'uuid',
    email: 'user@example.com',
    user_metadata: {},
    ...
  },
  session: {
    access_token: 'jwt-token',
    refresh_token: 'refresh-token',
    ...
  }
}
```

**Error Response**:
```typescript
{
  error: {
    message: 'Invalid login credentials',
    status: 400
  }
}
```

---

### 2. Protected Route Access Flow

```
User navigates to protected route
        ↓
Next.js middleware intercepts request
        ↓
Middleware: Create Supabase server client
        ↓
Middleware: Call supabase.auth.getSession()
        ↓
   Session exists? ───No──→ Redirect to /login
        ↓
       Yes
        ↓
Middleware: Allow request to continue
        ↓
Server Component: Fetch user profile if needed
        ↓
Server Component: Render page
        ↓
Done
```

**Middleware Code**:
```typescript
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(/* ... */)
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}
```

---

### 3. Logout Flow

```
User clicks "Sign Out"
        ↓
Client: Call supabase.auth.signOut()
        ↓
Supabase: Invalidate session
        ↓
Supabase: Clear auth cookies
        ↓
Client: Redirect to /login
        ↓
Done
```

**API Call**:
```typescript
await supabase.auth.signOut()
router.push('/login')
```

---

### 4. Session Refresh Flow (Automatic)

```
User makes authenticated request
        ↓
Supabase client checks token expiry
        ↓
   Token expired? ───No──→ Use existing token
        ↓
       Yes
        ↓
Supabase: Use refresh token to get new access token
        ↓
   Refresh successful? ───No──→ Force logout
        ↓
       Yes
        ↓
Supabase: Update cookies with new tokens
        ↓
Continue with request
        ↓
Done
```

**Handled Automatically by @supabase/ssr**

---

### 5. User Profile Fetch Flow

```
User logs in successfully
        ↓
Client: Get session.user.id
        ↓
Client: Query public.profiles WHERE id = session.user.id
        ↓
   Profile exists? ───No──→ Error: Profile not found
        ↓
       Yes
        ↓
Client: Store profile in state/context
        ↓
Client: Use user_type for role-based UI
        ↓
Done
```

**Query**:
```typescript
const { data: profile, error } = await supabase
  .from('profiles')
  .select('id, user_type, is_active, is_deleted')
  .eq('id', session.user.id)
  .single()
```

---

## State Management

### Client-Side State

**Auth State Hook** (`src/hooks/use-auth.ts`):
```typescript
interface AuthState {
  user: User | null          // Supabase user object
  profile: Profile | null    // User profile from public.profiles
  loading: boolean           // Loading state
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}
```

**Implementation Strategy**:
- Use React Context for auth state
- Fetch profile after successful login
- Persist session via Supabase cookies (automatic)
- Re-fetch profile on mount (if session exists)

---

### Server-Side State

**No persistent state** - always fetch fresh from Supabase:
```typescript
// In Server Components or API Routes
const supabase = createServerClient(...)
const { data: { session } } = await supabase.auth.getSession()

if (session) {
  // Fetch profile if needed
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', session.user.id)
    .single()
}
```

---

## TypeScript Types

### Auth Types (`src/types/auth.ts`)

```typescript
import { User as SupabaseUser, Session } from '@supabase/supabase-js'

export type UserRole = 'Admin' | 'Patient' | 'Provider' | 'Nurse' | 'Technician'

export interface Profile {
  id: string
  user_type: UserRole
  is_active: boolean
  is_deleted: boolean
  created_at: string
  created_by: string | null
  modified_by: string | null
  modified_at: string | null
}

export interface AuthUser extends SupabaseUser {
  profile?: Profile
}

export interface AuthSession extends Session {
  user: AuthUser
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthError {
  message: string
  status?: number
}
```

---

## Data Validation

### Login Form Validation (Zod Schema)

```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
})

export type LoginFormValues = z.infer<typeof loginSchema>
```

**Validation Rules**:
- Email: Required, must be valid email format
- Password: Required, minimum 8 characters

**Error Messages**:
- Displayed inline below form fields
- Updated on blur or submit

---

### Profile Validation

**Server-Side Checks**:
```typescript
// Check if profile exists and is active
if (!profile) {
  throw new Error('User profile not found')
}

if (!profile.is_active || profile.is_deleted) {
  throw new Error('Account is disabled')
}
```

---

## Row Level Security (RLS) Policies

**Note**: Existing Supabase schema has RLS enabled on auth.users table. We need to add RLS policies for public.profiles table.

### Profiles Table RLS Policies

```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Admins can read all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'Admin'
    )
  );

-- Policy: Admins can create profiles
CREATE POLICY "Admins can create profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'Admin'
    )
  );

-- Policy: Admins can update profiles
CREATE POLICY "Admins can update profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'Admin'
    )
  );
```

**Note**: These policies will be applied via migration in implementation phase.

---

## Data Migrations

### Migration: Add RLS policies to profiles table

```sql
-- File: supabase/migrations/20251112_add_profiles_rls.sql

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

-- Create new policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'Admin'
      AND is_active = true
      AND is_deleted = false
    )
  );

CREATE POLICY "Admins can create profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'Admin'
      AND is_active = true
      AND is_deleted = false
    )
  );

CREATE POLICY "Admins can update profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'Admin'
      AND is_active = true
      AND is_deleted = false
    )
  );

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active) WHERE is_deleted = false;
```

---

## Data Seeding (Development Only)

### Create Test Users

```sql
-- NOTE: This is for development only
-- Production users are created via Supabase dashboard by admins

-- Example admin user (must be created via Supabase Auth first)
-- Then add profile:
INSERT INTO public.profiles (id, user_type, is_active, is_deleted, created_at)
VALUES 
  ('uuid-from-auth-users', 'Admin', true, false, now())
ON CONFLICT (id) DO NOTHING;
```

---

## Summary

**Key Data Points**:
- **auth.users**: Managed by Supabase, stores email and encrypted password
- **public.profiles**: We manage, stores user_type for RBAC
- **Sessions**: Stored in cookies, managed by Supabase
- **State**: Client-side React Context, server-side always fetch fresh
- **Validation**: Zod schemas for forms, RLS policies for database
- **Security**: RLS enabled, policies enforce user/admin access rules

**Phase 1 Deliverables**:
- ✅ profiles table with RLS policies
- ✅ Auth flow diagrams
- ✅ TypeScript types
- ✅ Validation schemas
- ✅ Migration scripts
