# Resend Email Setup Guide

## ✅ Installation Complete

Resend has been installed and integrated with your OTP verification system.

## 🔑 Environment Variables Required

Add these to your `.env.local` file (create it if it doesn't exist):

```env
# Resend Configuration
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=Option Matrix <noreply@yourdomain.com>
```

### Getting Your Resend API Key

1. Go to [https://resend.com/api-keys](https://resend.com/api-keys)
2. Click "Create API Key"
3. Give it a name (e.g., "Option Matrix - Production")
4. Copy the API key
5. Add it to your `.env.local` file

### Setting Up Your From Email

**Option 1: Use Resend's Test Domain (Development)**
```env
RESEND_FROM_EMAIL=Option Matrix <onboarding@resend.dev>
```

**Option 2: Use Your Own Domain (Production)**

1. Go to [https://resend.com/domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the required DNS records (SPF, DKIM, DMARC)
5. Wait for verification (usually takes a few minutes)
6. Use your domain in the from email:
```env
RESEND_FROM_EMAIL=Option Matrix <noreply@yourdomain.com>
```

## 📧 Email Template

The OTP emails now include:
- **Option Matrix branding**
- **Large, centered 6-digit OTP code**
- **Expiry notice** (10 minutes)
- **Security message** (if not requested, ignore)
- **Responsive design** (works on all devices)

### Email Preview:
```
┌─────────────────────────────────────┐
│           Option Matrix                │
│                                     │
│   Your Verification Code            │
│   Enter this code to verify:        │
│                                     │
│        1 2 3 4 5 6                 │
│                                     │
│   This code will expire in          │
│   10 minutes.                       │
│                                     │
│   If you didn't request this...    │
└─────────────────────────────────────┘
```

## 🧪 Testing

### Development Mode

In development, OTPs are both:
1. **Sent via email** (if RESEND_API_KEY is configured)
2. **Logged to console** (for easy testing)
3. **Returned in API response** (for automated testing)

### Production Mode

In production (`NODE_ENV=production`):
1. **Only sent via email**
2. **NOT logged to console**
3. **NOT returned in API response**

### Test the Integration

1. Start your development server:
```bash
npm run dev
```

2. Navigate to: `http://localhost:3000/verify-otp?email=your-test-email@example.com`

3. Click "Resend Code" or make an API call:
```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@example.com"}'
```

4. Check:
   - Your email inbox for the OTP email
   - Console logs for the OTP code
   - API response (in development) for the OTP

## 🔒 Security Features

### Email Sending
- ✅ Uses secure Resend API
- ✅ TLS/SSL encryption
- ✅ SPF, DKIM, DMARC support
- ✅ Professional email template

### OTP Security
- ✅ 6-digit random codes (1 in 1 million)
- ✅ 10-minute expiry
- ✅ One-time use only
- ✅ Old OTPs invalidated on new request
- ✅ Stored securely in database

### Privacy
- ✅ Doesn't reveal if email exists
- ✅ Email masked in UI (us***@example.com)
- ✅ No OTP exposed in production responses

## 📊 Rate Limiting (Recommended)

To prevent abuse, consider adding rate limiting:

```typescript
// Example using upstash/ratelimit
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '60 s'), // 3 requests per minute
})

// In your API route:
const identifier = email
const { success } = await ratelimit.limit(identifier)

if (!success) {
  return NextResponse.json(
    { message: 'Too many requests. Please try again later.' },
    { status: 429 }
  )
}
```

## 🐛 Troubleshooting

### Email Not Received?

1. **Check spam/junk folder**
2. **Verify RESEND_API_KEY is correct**
3. **Check Resend dashboard logs**: [https://resend.com/logs](https://resend.com/logs)
4. **Verify domain is verified** (if using custom domain)
5. **Check email address is valid**

### API Key Error?

```
Error: Missing API key
```

**Solution**: Add `RESEND_API_KEY` to your `.env.local` file

### Domain Not Verified?

```
Error: Domain not verified
```

**Solution**: 
1. Use `onboarding@resend.dev` for testing
2. Or verify your custom domain in Resend dashboard

### Console Logs Show Error?

Check the error message:
- `401 Unauthorized` = Invalid API key
- `403 Forbidden` = Domain not verified
- `429 Too Many Requests` = Rate limit exceeded

## 📈 Monitoring

### Resend Dashboard

Monitor your email sending:
- **Logs**: [https://resend.com/logs](https://resend.com/logs)
- **Analytics**: [https://resend.com/analytics](https://resend.com/analytics)
- **Domains**: [https://resend.com/domains](https://resend.com/domains)

### What to Monitor

- **Delivery rate** (should be >95%)
- **Bounce rate** (should be <5%)
- **Complaint rate** (should be <0.1%)
- **Send volume** (track usage)

## 🚀 Production Checklist

Before deploying to production:

- [ ] Add `RESEND_API_KEY` to production environment variables
- [ ] Verify custom domain in Resend
- [ ] Update `RESEND_FROM_EMAIL` to use your domain
- [ ] Test email delivery in production
- [ ] Set `NODE_ENV=production`
- [ ] Remove development OTP logging
- [ ] Set up monitoring/alerts
- [ ] Test with real user email addresses
- [ ] Verify spam score is good (<5)

## 💰 Resend Pricing

**Free Tier**:
- 3,000 emails/month
- 100 emails/day
- Perfect for small applications

**Pro Tier** ($20/month):
- 50,000 emails/month
- More for additional emails

See: [https://resend.com/pricing](https://resend.com/pricing)

## 🆘 Support

- **Resend Docs**: [https://resend.com/docs](https://resend.com/docs)
- **Resend Support**: support@resend.com
- **OTP Implementation**: See `AUTH_IMPLEMENTATION.md`

## ✨ What's Next?

Your OTP system is now fully functional with email delivery! 🎉

**Optional Enhancements**:
1. Add custom email templates with your branding
2. Implement rate limiting per email address
3. Add SMS backup (using Twilio)
4. Track email open rates
5. A/B test email templates
