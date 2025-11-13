# Authentication Pages Reference

## Visual Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                           LOGIN PAGE                                │
│                         /login                                      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                        Option Matrix                            │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  Email                                               │  │  │
│  │  │  [ user@example.com          ]                       │  │  │
│  │  │                                                       │  │  │
│  │  │  Password                                            │  │  │
│  │  │  [ ••••••••••                ] 👁                    │  │  │
│  │  │                                                       │  │  │
│  │  │  [Forgot password?]                                  │  │  │
│  │  │                                                       │  │  │
│  │  │  [         Sign in          ]                        │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              │ Click "Forgot password?"             │
│                              ▼                                      │
│                                                                     │
│                     FORGOT PASSWORD PAGE                            │
│                     /forgot-password                                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                        Option Matrix                            │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  Reset your password                                 │  │  │
│  │  │  Enter your email to receive a reset link           │  │  │
│  │  │                                                       │  │  │
│  │  │  Email                                               │  │  │
│  │  │  [ user@example.com          ]                       │  │  │
│  │  │                                                       │  │  │
│  │  │  [Cancel]  [Send reset link]                         │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              │ Email sent with magic link           │
│                              ▼                                      │
│                                                                     │
│                     RESET PASSWORD PAGE                             │
│                     /reset-password                                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                        Option Matrix                            │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  Set your password                                   │  │  │
│  │  │  Choose a strong password for your account          │  │  │
│  │  │                                                       │  │  │
│  │  │  New Password                                        │  │  │
│  │  │  [ ••••••••••                ] 👁                    │  │  │
│  │  │                                                       │  │  │
│  │  │  Confirm Password                                    │  │  │
│  │  │  [ ••••••••••                ] 👁                    │  │  │
│  │  │                                                       │  │  │
│  │  │  Password Strength                                   │  │  │
│  │  │  [████████────────] Good                             │  │  │
│  │  │                                                       │  │  │
│  │  │  [Cancel]  [Save Password]                           │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              │ Password updated                     │
│                              ▼                                      │
│                                                                     │
│                          LOGIN PAGE                                 │
│                     (Success - redirect)                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Optional: OTP Verification Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                     OTP VERIFICATION PAGE                           │
│                     /verify-otp?email=user@example.com              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                        Option Matrix                            │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  2-Step Verification                                 │  │  │
│  │  │  Please enter the OTP received to confirm your      │  │  │
│  │  │  account ownership. A code has been sent to          │  │  │
│  │  │  us***@example.com                                   │  │  │
│  │  │                                                       │  │  │
│  │  │  Enter OTP Code                                      │  │  │
│  │  │  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐               │  │  │
│  │  │  │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │               │  │  │
│  │  │  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘               │  │  │
│  │  │                                                       │  │  │
│  │  │  Didn't receive code? [Resend Code] 00:45           │  │  │
│  │  │                                                       │  │  │
│  │  │  [Cancel]  [Submit]                                  │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              │ OTP verified                         │
│                              ▼                                      │
│                                                                     │
│                     RESET PASSWORD PAGE                             │
│                     (Continue to set new password)                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Password Strength Indicator

```
Weak:    [████────────────] Red
         - Less than 8 characters OR
         - Only lowercase letters

Fair:    [████████────────] Yellow
         - 8+ characters AND
         - Mixed case OR numbers

Good:    [████████████────] Blue
         - 8+ characters AND
         - Mixed case AND
         - Numbers

Strong:  [████████████████] Green
         - 8+ characters AND
         - Mixed case AND
         - Numbers AND
         - Special characters (!@#$%^&*)
```

## Features Summary

### Login Page (`/login`)
✅ Email and password inputs  
✅ Password visibility toggle  
✅ Form validation with Zod  
✅ Error handling with toast  
✅ "Forgot password?" link  
✅ shadcn login-03 design  

### Forgot Password Page (`/forgot-password`)
✅ Email input with validation  
✅ Supabase password reset email  
✅ Success confirmation state  
✅ "Remember password?" link  
✅ Cancel button to login  

### Reset Password Page (`/reset-password`)
✅ New password input with toggle  
✅ Confirm password input with toggle  
✅ Real-time strength indicator  
✅ Visual strength meter (Weak/Fair/Good/Strong)  
✅ Color-coded feedback  
✅ Password match validation  
✅ Supabase auth update  

### OTP Verification Page (`/verify-otp`)
✅ 6-digit OTP input boxes  
✅ Auto-focus on next input  
✅ Backspace navigation  
✅ Paste support  
✅ 60-second countdown timer  
✅ Resend OTP button  
✅ Email masking  
✅ Cancel button  

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/request-otp` | POST | Generate and send new OTP |
| `/api/auth/verify-otp` | POST | Verify OTP code |
| `/api/auth/resend-otp` | POST | Resend OTP (invalidates old) |

## Database

### password_reset_otps Table
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| email | VARCHAR(255) | User email |
| otp | VARCHAR(6) | 6-digit code |
| is_used | BOOLEAN | Used flag |
| created_at | TIMESTAMPTZ | Creation time |
| verified_at | TIMESTAMPTZ | Verification time |

**Expiry**: 10 minutes from creation  
**One-time use**: Marked as used after verification  
**Security**: Previous OTPs invalidated on new request  

## Routes

```typescript
routes.login           // /login
routes.forgotPassword  // /forgot-password
routes.resetPassword   // /reset-password
routes.verifyOTP       // /verify-otp
```

## Component Hierarchy

```
AuthLayout (bg-muted, centered)
├── Logo (Option Matrix)
└── Auth Form Card
    ├── CardHeader (title, description)
    └── CardContent
        ├── Form Fields
        │   ├── Email Input
        │   ├── Password Input(s)
        │   └── OTP Inputs (verify-otp only)
        ├── Additional Info (strength meter, timer, etc.)
        └── Action Buttons
            ├── Cancel/Back Button (outline)
            └── Submit Button (primary)
```

## Color Scheme

- **Primary**: Blue (#3b82f6)
- **Muted**: Light gray background (#f9fafb)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)
- **Error**: Red (#ef4444)
- **Text**: Dark gray (#1f2937)

## Typography

- **Headings**: Inter, 600-700 weight
- **Body**: Inter, 400 weight
- **Inputs**: Inter, 400 weight
- **Labels**: Inter, 500 weight

## Responsive Design

- **Mobile**: Single column, full-width inputs
- **Tablet**: Same as mobile
- **Desktop**: Max-width 384px (sm), centered

All pages are fully responsive and mobile-friendly.
