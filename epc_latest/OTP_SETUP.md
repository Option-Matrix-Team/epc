# OTP Verification Setup

## Database Migration Required

Before using the OTP verification feature, you need to create the `password_reset_otps` table in your Supabase database.

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `migrations/create_password_reset_otps.sql`
4. Paste into the SQL Editor
5. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
cd epc_latest
supabase db push
```

Or apply the migration directly:

```bash
supabase db execute -f migrations/create_password_reset_otps.sql
```

### Option 3: Manual SQL Execution

Connect to your database and run:

```sql
-- See migrations/create_password_reset_otps.sql for the full SQL
```

## Features Implemented

### 1. **OTP Verification Form** (`/verify-otp`)
- 6-digit OTP input with individual boxes
- Auto-focus on next input
- Paste support for 6-digit codes
- 60-second countdown timer
- Resend OTP functionality
- Email masking for privacy

### 2. **API Endpoints**

#### Request OTP
```
POST /api/auth/request-otp
Body: { "email": "user@example.com" }
```

#### Verify OTP
```
POST /api/auth/verify-otp
Body: { "email": "user@example.com", "otp": "123456" }
```

#### Resend OTP
```
POST /api/auth/resend-otp
Body: { "email": "user@example.com" }
```

### 3. **Security Features**
- OTPs expire after 10 minutes
- One-time use only (marked as used after verification)
- Old OTPs are invalidated when new ones are requested
- Row Level Security (RLS) policies enabled
- Email masking in UI (e.g., us***@example.com)

### 4. **Development Mode**
- In development, OTP is logged to console
- OTP is returned in API response for testing
- **Remove in production** - use email service instead

## Integration with Forgot Password Flow

The OTP verification can be integrated into the password reset flow:

1. User enters email → `/forgot-password`
2. System sends OTP → API: `/api/auth/request-otp`
3. User enters OTP → `/verify-otp?email=user@example.com`
4. OTP verified → Redirect to `/reset-password`
5. User sets new password

## TODO: Email Service Integration

Currently, OTPs are only logged to console. In production, integrate with an email service:

### Option 1: Resend (Recommended)
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: email,
  subject: 'Your OTP Code',
  html: `<p>Your OTP code is: <strong>${otp}</strong></p>`
})
```

### Option 2: SendGrid
```typescript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

await sgMail.send({
  to: email,
  from: 'noreply@yourdomain.com',
  subject: 'Your OTP Code',
  html: `<p>Your OTP code is: <strong>${otp}</strong></p>`
})
```

### Option 3: AWS SES
```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const client = new SESClient({ region: 'us-east-1' })

await client.send(new SendEmailCommand({
  Source: 'noreply@yourdomain.com',
  Destination: { ToAddresses: [email] },
  Message: {
    Subject: { Data: 'Your OTP Code' },
    Body: { Html: { Data: `<p>Your OTP code is: <strong>${otp}</strong></p>` } }
  }
}))
```

## Testing

### Manual Testing (Development Mode)

1. Request OTP:
```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

2. Check console logs for the OTP

3. Verify OTP:
```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'
```

### UI Testing

1. Navigate to `/verify-otp?email=test@example.com`
2. Enter the 6-digit OTP from console logs
3. Click Submit
4. Should redirect to `/reset-password` on success

## Database Schema

```sql
CREATE TABLE public.password_reset_otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    CONSTRAINT valid_otp_length CHECK (LENGTH(otp) = 6)
);
```

## Notes

- OTPs are 6 digits (100000-999999)
- Valid for 10 minutes from creation
- Only the most recent unused OTP is valid
- Previous OTPs are automatically invalidated
