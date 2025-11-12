# Quickstart: Authentication & Access Control

**Feature**: 001-stack-migration  
**Phase**: Phase 1 - Setup & Testing Guide  
**Date**: 2025-11-12

## Overview

This guide provides step-by-step instructions for setting up, implementing, and manually testing the authentication system for the EMR application.

---

## Prerequisites

- Node.js 18.17 or later installed
- Supabase account with project created
- Access to Supabase project URL and anon key
- Git repository cloned locally
- VS Code or similar code editor

---

## Phase 1A: Setup & Dependencies

### Step 1: Install Dependencies

```bash
cd epc_latest

# Install Supabase packages
npm install @supabase/supabase-js @supabase/ssr

# Install form management
npm install react-hook-form @hookform/resolvers zod

# Install toast notifications
npm install sonner

# Install development types (if not already installed)
npm install -D @types/node
```

### Step 2: Add shadcn/ui Form Components

```bash
# Add form components
npx shadcn@latest add form
npx shadcn@latest add label

# Verify components added
ls src/components/ui/form.tsx
ls src/components/ui/label.tsx
```

### Step 3: Configure Environment Variables

Create `.env.local` in `epc_latest/` directory:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Get these values from**:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Settings → API
4. Copy "Project URL" and "anon public" key

### Step 4: Update .gitignore

Ensure `.env.local` is ignored:

```bash
# Add to epc_latest/.gitignore if not present
.env.local
.env*.local
```

### Step 5: Create .env.local.example Template

```bash
# epc_latest/.env.local.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Commit this file** to repository as a template for other developers.

---

## Phase 1B: Database Setup

### Step 6: Apply RLS Policies to Profiles Table

Run this SQL in Supabase SQL Editor (Dashboard → SQL Editor → New Query):

```sql
-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

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
      AND is_active = true
      AND is_deleted = false
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
      AND is_active = true
      AND is_deleted = false
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
      AND is_active = true
      AND is_deleted = false
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active) WHERE is_deleted = false;
```

**Verify**: Go to Authentication → Policies in Supabase dashboard, check that policies are listed.

### Step 7: Create Test Users

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to Authentication → Users → Add User
2. Create test users:
   - Admin: `admin@hospital.com` / `AdminPass123`
   - Doctor: `doctor@hospital.com` / `DoctorPass123`
   - Nurse: `nurse@hospital.com` / `NursePass123`
3. Enable "Auto Confirm User" checkbox
4. Click "Create User"

**Option B: Via SQL (After creating auth.users)**

After creating users in dashboard, add profiles:

```sql
-- Get user IDs from auth.users first
SELECT id, email FROM auth.users;

-- Insert profiles (replace UUIDs with actual user IDs from above query)
INSERT INTO public.profiles (id, user_type, is_active, is_deleted, created_at)
VALUES 
  ('uuid-of-admin-user', 'Admin', true, false, now()),
  ('uuid-of-doctor-user', 'Provider', true, false, now()),
  ('uuid-of-nurse-user', 'Nurse', true, false, now())
ON CONFLICT (id) DO NOTHING;
```

**Verify**: Query profiles table:
```sql
SELECT p.id, u.email, p.user_type, p.is_active
FROM public.profiles p
JOIN auth.users u ON p.id = u.id;
```

---

## Phase 1C: Implementation

### Step 8: Create Directory Structure

```bash
cd epc_latest/src

# Create auth-related directories
mkdir -p app/\(auth\)/login
mkdir -p app/\(dashboard\)
mkdir -p app/api/auth/callback
mkdir -p app/api/auth/signout
mkdir -p components/auth
mkdir -p lib/supabase
mkdir -p hooks
mkdir -p types
```

### Step 9: Implement Files (See Implementation Section Below)

Files to create (implementation code provided in separate section):
1. `src/lib/supabase/client.ts` - Browser Supabase client
2. `src/lib/supabase/server.ts` - Server Supabase client
3. `src/lib/supabase/middleware.ts` - Middleware helper
4. `src/types/auth.ts` - TypeScript types
5. `src/hooks/use-auth.ts` - Auth hook
6. `src/components/auth/login-form.tsx` - Login form component
7. `src/app/(auth)/login/page.tsx` - Login page
8. `src/app/(auth)/layout.tsx` - Auth layout (no sidebar)
9. `middleware.ts` - Route protection middleware
10. `src/app/(dashboard)/page.tsx` - Move existing page here
11. `src/app/(dashboard)/layout.tsx` - Dashboard layout with sidebar
12. `src/app/api/auth/callback/route.ts` - Auth callback handler

### Step 10: Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` - should redirect to `/login`

---

## Manual Testing Guide

### Test Case 1: Valid Login

**Steps**:
1. Open `http://localhost:3000`
2. Verify redirect to `/login`
3. Enter valid credentials: `nurse@hospital.com` / `NursePass123`
4. Click "Sign In"

**Expected Result**:
- ✅ Form submits without errors
- ✅ Loading state shown briefly
- ✅ Success toast: "Welcome back!"
- ✅ Redirect to dashboard (`/`)
- ✅ Dashboard content visible
- ✅ Sidebar visible with navigation items

**Actual Result**: ___________

---

### Test Case 2: Invalid Email Format

**Steps**:
1. Go to `/login`
2. Enter: `invalid-email` (no @ symbol)
3. Enter any password
4. Click "Sign In"

**Expected Result**:
- ✅ Inline error below email field: "Invalid email address"
- ✅ Form does NOT submit
- ✅ Email field highlighted with error border

**Actual Result**: ___________

---

### Test Case 3: Empty Fields

**Steps**:
1. Go to `/login`
2. Leave both fields empty
3. Click "Sign In"

**Expected Result**:
- ✅ Email error: "Email is required"
- ✅ Password error: "Password is required"
- ✅ Both fields highlighted with error borders
- ✅ Form does NOT submit

**Actual Result**: ___________

---

### Test Case 4: Wrong Password

**Steps**:
1. Go to `/login`
2. Enter: `nurse@hospital.com` / `WrongPassword123`
3. Click "Sign In"

**Expected Result**:
- ✅ Form submits
- ✅ Toast error: "Invalid login credentials"
- ✅ User remains on login page
- ✅ Form is cleared or retains email

**Actual Result**: ___________

---

### Test Case 5: Non-existent User

**Steps**:
1. Go to `/login`
2. Enter: `nobody@hospital.com` / `Password123`
3. Click "Sign In"

**Expected Result**:
- ✅ Form submits
- ✅ Toast error: "Invalid login credentials"
- ✅ User remains on login page

**Actual Result**: ___________

---

### Test Case 6: Logout

**Steps**:
1. Log in with valid credentials
2. Navigate to dashboard
3. Click "Sign Out" button (in sidebar or header)

**Expected Result**:
- ✅ User logged out
- ✅ Toast: "Signed out successfully"
- ✅ Redirect to `/login`
- ✅ Attempting to visit `/` redirects back to `/login`

**Actual Result**: ___________

---

### Test Case 7: Protected Route Access (Logged Out)

**Steps**:
1. Ensure logged out (clear cookies or use incognito)
2. Try to access `http://localhost:3000/`

**Expected Result**:
- ✅ Immediately redirects to `/login`
- ✅ No flash of dashboard content
- ✅ URL changes to `/login`

**Actual Result**: ___________

---

### Test Case 8: Login Page Access (Logged In)

**Steps**:
1. Log in with valid credentials
2. Navigate to dashboard
3. Manually visit `http://localhost:3000/login`

**Expected Result**:
- ✅ Redirects to `/` (dashboard)
- ✅ Cannot access login page while authenticated

**Actual Result**: ___________

---

### Test Case 9: Session Persistence

**Steps**:
1. Log in with valid credentials
2. Navigate to dashboard
3. Refresh the page (F5 or Cmd+R)

**Expected Result**:
- ✅ User remains logged in
- ✅ Dashboard loads without redirect to login
- ✅ No flash of unauthenticated content
- ✅ Sidebar and user info persists

**Actual Result**: ___________

---

### Test Case 10: Session Across Tabs

**Steps**:
1. Log in in Tab 1
2. Open Tab 2 to `http://localhost:3000`

**Expected Result**:
- ✅ Tab 2 shows dashboard (already authenticated)
- ✅ No need to log in again

**Log out in Tab 1, then check Tab 2**:
- ✅ Tab 2 redirects to login (session invalidated)

**Actual Result**: ___________

---

### Test Case 11: Different User Roles

**Steps**:
1. Log in as Admin: `admin@hospital.com` / `AdminPass123`
2. Check dashboard
3. Log out
4. Log in as Provider: `doctor@hospital.com` / `DoctorPass123`
5. Check dashboard
6. Log out
7. Log in as Nurse: `nurse@hospital.com` / `NursePass123`

**Expected Result** (Phase 1):
- ✅ All users can log in successfully
- ✅ All users see the same dashboard (role-specific views deferred to Phase 2)
- ✅ User profile loaded with correct `user_type`

**Future** (Phase 2): Different dashboards based on role

**Actual Result**: ___________

---

### Test Case 12: Network Error Handling

**Steps**:
1. Open DevTools → Network tab
2. Set network to "Offline"
3. Try to log in

**Expected Result**:
- ✅ Toast error: "Network error" or similar
- ✅ No unhandled errors in console
- ✅ Form remains usable

**Actual Result**: ___________

---

### Test Case 13: Browser Back Button

**Steps**:
1. Log in successfully → Dashboard loads
2. Click browser back button

**Expected Result**:
- ✅ Does NOT go back to login page
- ✅ Stays on dashboard or goes to previous protected page

**Log out, then click back button**:
- ✅ Redirects to `/login` (protected pages not accessible)

**Actual Result**: ___________

---

### Test Case 14: Direct URL Access

**Steps**:
1. While logged out, try accessing: `http://localhost:3000/settings` (if created)
2. Log in when redirected
3. Verify redirect back to originally requested URL

**Expected Result** (Phase 1):
- ✅ Redirects to `/login`
- ⚠️ After login, may redirect to `/` instead of `/settings` (callback URL not preserved yet)

**Future Enhancement**: Preserve return URL in query params

**Actual Result**: ___________

---

### Test Case 15: Console Errors Check

**Steps**:
1. Log in successfully
2. Open DevTools → Console
3. Check for errors

**Expected Result**:
- ✅ No errors or warnings in console
- ✅ No CORS errors
- ✅ No 404 errors for auth endpoints
- ✅ Clean console output

**Actual Result**: ___________

---

## Performance Testing

### Page Load Times

**Measure with DevTools → Network → DOMContentLoaded time**

| Page | Target | Actual |
|------|--------|--------|
| Login page load | < 2s | _____ |
| Login submission | < 500ms | _____ |
| Dashboard load (after login) | < 2s | _____ |
| Session check (middleware) | < 200ms | _____ |

**How to Measure**:
1. Open DevTools → Network
2. Enable "Disable cache"
3. Refresh page
4. Check "DOMContentLoaded" time at bottom of Network tab

---

## Troubleshooting

### Issue: "Invalid API key"

**Cause**: Wrong Supabase URL or anon key in `.env.local`

**Solution**:
1. Check `.env.local` values match Supabase dashboard
2. Restart dev server: `npm run dev`
3. Clear browser cache

---

### Issue: "Profile not found" after login

**Cause**: User exists in `auth.users` but not in `public.profiles`

**Solution**:
```sql
-- Get user ID
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Insert profile
INSERT INTO public.profiles (id, user_type, is_active, is_deleted)
VALUES ('user-id-from-above', 'Nurse', true, false);
```

---

### Issue: Infinite redirect loop

**Cause**: Middleware configuration error

**Solution**:
1. Check `middleware.ts` matcher excludes `/login` route
2. Verify middleware is not blocking auth callback routes
3. Check Supabase cookies are being set (DevTools → Application → Cookies)

---

### Issue: "CORS policy" error

**Cause**: Supabase project not configured for localhost

**Solution**:
1. Supabase Dashboard → Settings → API
2. Add `http://localhost:3000` to allowed origins
3. Restart dev server

---

### Issue: Session not persisting across refreshes

**Cause**: Cookies not being set

**Solution**:
1. Check cookies in DevTools (Application → Cookies → localhost)
2. Verify `sb-access-token` and `sb-refresh-token` exist
3. Check Supabase client configuration in `lib/supabase/client.ts`
4. Ensure `createBrowserClient` is used in client components

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Update `.env` with production Supabase URL and keys
- [ ] Enable HTTPS (required by Supabase)
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` to production URL
- [ ] Configure Supabase allowed origins for production domain
- [ ] Test authentication on staging environment
- [ ] Verify RLS policies are active
- [ ] Remove or secure test user accounts
- [ ] Set up proper password policies in Supabase dashboard
- [ ] Configure email templates for password reset (future)
- [ ] Enable Supabase log drains for monitoring
- [ ] Set up error tracking (Sentry, LogRocket, etc.)

---

## Next Steps

After completing Phase 1 authentication:

**Phase 2 Features** (future):
- [ ] Password reset flow ("Forgot Password" link)
- [ ] Multi-factor authentication (MFA)
- [ ] 15-minute inactivity timeout
- [ ] Account lockout after 5 failed attempts
- [ ] Single session enforcement (logout other devices)
- [ ] Role-specific dashboards and navigation
- [ ] Admin panel for user management
- [ ] Audit log viewer for authentication events

**Phase 3 Features** (future):
- [ ] Patient Management (User Story 2)
- [ ] Doctor Management (User Story 3)
- [ ] Appointment Scheduling (User Story 4)

---

## Summary

**Phase 1 Deliverables Completed**:
- ✅ Supabase Auth integration
- ✅ Login page with form validation
- ✅ Protected routes via middleware
- ✅ Session management
- ✅ User profile fetching
- ✅ Logout functionality
- ✅ RLS policies on profiles table
- ✅ Manual test cases documented
- ✅ Error handling and user feedback

**Manual Testing Status**: _____ / 15 test cases passed

**Ready for**: Phase 2 feature implementation (Patient Management) or Phase 1.5 enhancements (password reset, MFA)

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review Supabase docs: https://supabase.com/docs/guides/auth
3. Check Supabase logs in dashboard
4. Review browser console for errors
5. Verify environment variables are set correctly
