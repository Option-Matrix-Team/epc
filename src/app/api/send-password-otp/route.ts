// src/app/api/send-password-otp/route.ts
import { NextResponse } from 'next/server';
import getSupabaseAdmin from '@/lib/supabaseAdmin'; // Your admin client
import { Resend } from 'resend';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();

        // --- FIX: Use listUsers with 'as any' to bypass strict type check ---
        const { data: listData, error: userFetchError } = await supabaseAdmin.auth.admin.listUsers({
            email: email, // Filter by email
        } as any); // <-- Tell TypeScript this is okay
        // --- END FIX ---

        const user = listData?.users?.[0]; // Get the first user found

        if (userFetchError || !user) {
            console.error("OTP Send Error: User not found for email:", email, userFetchError);
            // Return a generic error to avoid user enumeration
            return NextResponse.json({ error: 'Failed to process request.' }, { status: 400 });
        }
        const userId = user.id;

        // 2. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const expiryMinutes = 5; // OTP valid for 5 minutes
        const expires_at = new Date(Date.now() + expiryMinutes * 60000).toISOString();

        // 3. Store OTP (Upsert)
        // Consider hashing 'otp' before storing in production for better security
        const { error: upsertError } = await supabaseAdmin
            .from('password_reset_otps')
            .upsert({ user_id: userId, otp_code: otp, expires_at: expires_at }, { onConflict: 'user_id' });

        if (upsertError) {
            console.error("OTP Send Error: Failed to store OTP", upsertError);
            throw new Error("Failed to prepare verification code.");
        }

        // 4. Send OTP via Resend (instantiate client safely at runtime)
        const resendApiKey = process.env.RESEND_API_KEY;
        const senderEmail = process.env.RESEND_SENDER_EMAIL;
        if (!resendApiKey || !senderEmail) {
            console.error("OTP Send Error: RESEND configuration is not set (RESEND_API_KEY or RESEND_SENDER_EMAIL).");
            throw new Error("Email configuration error.");
        }

        const resend = new Resend(resendApiKey);

        const { error: emailError } = await resend.emails.send({
            from: senderEmail, // Use the configured sender email
            to: email,         // Send to the user's email
            subject: 'Your Password Reset Verification Code',
            text: `Your verification code is: ${otp}`,
            // html: `<p>Your verification code is: <strong>${otp}</strong></p>` // Optional HTML version
        });

        if (emailError) {
            console.error("OTP Send Error: Resend failed", emailError);
            // Optional: Clean up OTP if email failed definitively
            // await supabaseAdmin.from('password_reset_otps').delete().eq('user_id', userId);
            throw new Error("Failed to send verification code email.");
        }

        console.log(`OTP sent successfully to ${email}`);
        return NextResponse.json({ message: 'Verification code sent to your email.' });

    } catch (err: any) {
        console.error("API Error in /api/send-password-otp:", err);
        return NextResponse.json({ error: err.message || 'Failed to send OTP.' }, { status: 500 });
    }
}