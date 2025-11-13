# Pre-Production Checklist for Authentication System

## ✅ Implementation Complete

All authentication features have been implemented. Use this checklist before deploying to production.

---

## 🔐 Security Review

### Database Security
- [ ] Run `migrations/create_password_reset_otps.sql` in production database
- [ ] Verify RLS (Row Level Security) policies are enabled on `password_reset_otps` table
- [ ] Confirm Supabase auth settings are production-ready
- [ ] Enable email confirmation in Supabase auth settings (if required)
- [ ] Set appropriate session timeout values

### API Security
- [ ] Remove development OTP console logging from production
- [ ] Remove OTP in API response (only for dev mode)
- [ ] Implement rate limiting on OTP endpoints (prevent brute force)
- [ ] Add CSRF protection if not using Next.js built-in protection
- [ ] Verify all API routes use proper authentication

### Password Security
- [ ] Confirm minimum password requirements (8+ chars, mixed case, numbers, special chars)
- [ ] Verify password strength indicator thresholds
- [ ] Test password hashing via Supabase (bcrypt)
- [ ] Ensure password reset tokens expire appropriately

---

## 📧 Email Service Integration

### Choose Email Provider
- [ ] Decide on email service: Resend, SendGrid, AWS SES, or other
- [ ] Sign up and verify domain
- [ ] Obtain API keys
- [ ] Add environment variables:
  ```env
  # Example for Resend
  RESEND_API_KEY=re_xxxxxxxxxxxxx
  
  # Example for SendGrid
  SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
  
  # Example for AWS SES
  AWS_ACCESS_KEY_ID=xxxxxxxxxxxxx
  AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxx
  AWS_REGION=us-east-1
  ```

### Email Templates
- [ ] Create branded HTML email template for OTP
- [ ] Create email template for password reset link
- [ ] Test email templates across major email clients
- [ ] Add unsubscribe link (if required by regulations)
- [ ] Include security tips in emails

### Email Content
- [ ] Set appropriate "From" address (e.g., noreply@yourdomain.com)
- [ ] Write clear subject lines
- [ ] Include company branding (logo, colors)
- [ ] Add contact information for support
- [ ] Test email deliverability

### Update API Routes
- [ ] Update `/api/auth/request-otp/route.ts` to send actual emails
- [ ] Update `/api/auth/resend-otp/route.ts` to send actual emails
- [ ] Remove console.log statements
- [ ] Add error handling for email failures
- [ ] Add retry logic for transient failures

**Example Code (Resend)**:
```typescript
// In request-otp/route.ts and resend-otp/route.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Replace console.log with:
await resend.emails.send({
  from: 'Option Matrix <noreply@yourdomain.com>',
  to: email,
  subject: 'Your OTP Code - Option Matrix',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your OTP Code</h2>
      <p>Your one-time password is:</p>
      <div style="font-size: 32px; font-weight: bold; color: #3b82f6; padding: 20px; background: #f9fafb; border-radius: 8px; text-align: center;">
        ${otp}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
    </div>
  `
})
```

---

## 🗄️ Database Migration

### Production Database
- [ ] Connect to production Supabase project
- [ ] Run migration: `migrations/create_password_reset_otps.sql`
- [ ] Verify table created: `password_reset_otps`
- [ ] Check indexes are created
- [ ] Confirm RLS policies are active
- [ ] Test INSERT, SELECT, UPDATE operations

### Staging/Testing Database (if applicable)
- [ ] Run same migration on staging
- [ ] Test OTP flow end-to-end
- [ ] Verify email sending works
- [ ] Test OTP expiry (wait 10+ minutes)
- [ ] Test OTP one-time use
- [ ] Test resend functionality

---

## 🧪 Testing Checklist

### Manual Testing - Login Flow
- [ ] Login with valid credentials → Success
- [ ] Login with invalid email → Error message
- [ ] Login with wrong password → Error message
- [ ] Login with inactive account → Error message (if applicable)
- [ ] Login redirects to correct dashboard based on user_type

### Manual Testing - Forgot Password
- [ ] Enter valid email → Success message
- [ ] Enter invalid email → Success message (don't reveal if exists)
- [ ] Click reset link in email → Opens reset password page
- [ ] Reset link with valid token → Success
- [ ] Reset link with expired token → Error

### Manual Testing - Reset Password
- [ ] Enter password < 8 chars → Error
- [ ] Enter weak password → Strength indicator shows "Weak"
- [ ] Enter good password → Strength indicator shows "Good/Strong"
- [ ] Passwords don't match → Error
- [ ] Valid password and match → Success, redirect to login
- [ ] Try reusing same reset link → Error (already used)

### Manual Testing - OTP Flow
- [ ] Request OTP → Receive email
- [ ] Enter correct OTP → Success
- [ ] Enter incorrect OTP → Error
- [ ] Enter expired OTP (10+ min old) → Error
- [ ] Try using same OTP twice → Error
- [ ] Resend OTP → Old OTP invalidated, new one works
- [ ] Timer counts down from 60 seconds
- [ ] Resend button disabled until timer expires
- [ ] Paste 6-digit code → Auto-fills inputs
- [ ] Backspace navigation works between inputs

### Automated Testing (Recommended)
- [ ] Write E2E tests with Playwright/Cypress
- [ ] Write API tests for all auth endpoints
- [ ] Write unit tests for form validation
- [ ] Write unit tests for password strength calculation
- [ ] Set up CI/CD to run tests automatically

---

## 🚀 Deployment

### Environment Variables
Ensure all required environment variables are set in production:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # For admin operations

# Email Service (choose one)
RESEND_API_KEY=re_xxxxxxxxxxxxx
# OR
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
# OR
AWS_ACCESS_KEY_ID=xxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxx

# App Config
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

### Vercel/Deployment Platform
- [ ] Add environment variables to Vercel dashboard
- [ ] Verify build succeeds
- [ ] Check deployment logs for errors
- [ ] Test deployed application
- [ ] Verify emails are sent in production
- [ ] Check Supabase connection works

---

## 📊 Monitoring & Logging

### Error Tracking
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Monitor authentication failures
- [ ] Track OTP verification attempts
- [ ] Alert on high failure rates

### Analytics
- [ ] Track login success/failure rates
- [ ] Monitor password reset usage
- [ ] Track OTP verification rates
- [ ] Set up user journey funnels

### Logs
- [ ] Review API logs for authentication errors
- [ ] Monitor email delivery rates
- [ ] Check database logs for performance issues
- [ ] Set up alerts for suspicious activity

---

## 🔒 Compliance & Legal

### Data Privacy
- [ ] Add privacy policy link to auth pages
- [ ] Ensure GDPR compliance (if applicable)
- [ ] Add terms of service acceptance (if required)
- [ ] Implement data retention policies for OTPs

### Security Compliance
- [ ] Document password policies
- [ ] Document OTP expiry and security measures
- [ ] Ensure encryption at rest and in transit
- [ ] Regular security audits scheduled

---

## 📚 Documentation

### Internal Documentation
- [ ] Update team documentation with new auth flow
- [ ] Document environment variables needed
- [ ] Create runbook for common auth issues
- [ ] Document database schema changes

### User Documentation
- [ ] Create user guide for password reset
- [ ] Create FAQ for common auth issues
- [ ] Add troubleshooting guide
- [ ] Document support contact information

---

## ✨ Optional Enhancements

### Rate Limiting
- [ ] Implement rate limiting on login endpoint (prevent brute force)
- [ ] Implement rate limiting on OTP endpoints (max 5 requests per email per hour)
- [ ] Implement rate limiting on password reset requests
- [ ] Add CAPTCHA for repeated failures

### Additional Security
- [ ] Implement account lockout after N failed attempts
- [ ] Add IP-based access controls (if needed)
- [ ] Implement device fingerprinting
- [ ] Add suspicious activity alerts

### User Experience
- [ ] Add "Remember me" functionality
- [ ] Add social login options (Google, Microsoft, etc.)
- [ ] Add biometric authentication support
- [ ] Implement password manager integration

### Monitoring
- [ ] Set up uptime monitoring
- [ ] Monitor authentication API response times
- [ ] Track email delivery success rates
- [ ] Set up alerts for anomalies

---

## 🎯 Pre-Launch Final Checks

**24 Hours Before Launch:**
- [ ] All tests passing
- [ ] Email sending working in staging
- [ ] Database migration applied
- [ ] Environment variables set
- [ ] Error tracking configured
- [ ] Team trained on new auth flow

**Launch Day:**
- [ ] Deploy to production
- [ ] Verify login works
- [ ] Test password reset end-to-end
- [ ] Test OTP flow end-to-end
- [ ] Monitor error rates
- [ ] Have rollback plan ready

**Post-Launch (First 48 Hours):**
- [ ] Monitor authentication success rates
- [ ] Check email delivery rates
- [ ] Review error logs
- [ ] Gather user feedback
- [ ] Fix any critical issues immediately

---

## 📞 Support & Troubleshooting

### Common Issues

**OTP Not Received:**
- Check spam/junk folder
- Verify email service is working
- Check email service logs
- Verify domain is not blacklisted

**Password Reset Link Not Working:**
- Check link expiry time
- Verify Supabase auth settings
- Check redirect URL configuration
- Test with different browsers

**Login Failures:**
- Verify Supabase is accessible
- Check user credentials
- Verify profile exists in database
- Check RLS policies

### Emergency Contacts
- [ ] Document on-call engineer contact
- [ ] Document Supabase support contact
- [ ] Document email service support contact
- [ ] Create incident response plan

---

## ✅ Sign-Off

**Before marking complete, ensure:**
- [ ] All critical items above are completed
- [ ] All team members are aware of changes
- [ ] Documentation is up to date
- [ ] Monitoring is in place
- [ ] Support team is trained
- [ ] Rollback plan exists

**Approved by:**
- [ ] Technical Lead: _________________ Date: _______
- [ ] Security Team: _________________ Date: _______
- [ ] QA Team: ______________________ Date: _______
- [ ] Product Owner: ________________ Date: _______

---

**Notes:**
- Keep this checklist updated as requirements change
- Review quarterly for security updates
- Update based on production incidents
- Share learnings with team
