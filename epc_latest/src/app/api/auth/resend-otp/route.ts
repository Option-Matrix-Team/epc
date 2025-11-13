import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Generate 6-digit OTP
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json(
                { message: 'Email is required' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Check if user exists
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
            .single()

        if (!profile) {
            // For security, don't reveal if email exists
            return NextResponse.json(
                { message: 'If the email exists, an OTP will be sent' },
                { status: 200 }
            )
        }

        // Invalidate any existing unused OTPs for this email
        await supabase
            .from('password_reset_otps')
            .update({ is_used: true })
            .eq('email', email)
            .eq('is_used', false)

        // Generate new OTP
        const otp = generateOTP()

        // Store OTP in database
        const { error: insertError } = await supabase
            .from('password_reset_otps')
            .insert({
                email,
                otp,
                is_used: false,
                created_at: new Date().toISOString()
            })

        if (insertError) {
            throw insertError
        }

        // Send OTP via Resend
        try {
            await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'Option Matrix <onboarding@resend.dev>',
                to: email,
                subject: 'Your OTP Code - Option Matrix',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #3b82f6; margin: 0;">Option Matrix</h1>
                        </div>
                        <div style="background: #f9fafb; border-radius: 8px; padding: 30px; text-align: center;">
                            <h2 style="color: #1f2937; margin-top: 0;">Your Verification Code</h2>
                            <p style="color: #6b7280; font-size: 16px;">Enter this code to verify your identity:</p>
                            <div style="font-size: 48px; font-weight: bold; color: #3b82f6; letter-spacing: 8px; margin: 30px 0;">
                                ${otp}
                            </div>
                            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                                This code will expire in <strong>10 minutes</strong>.
                            </p>
                        </div>
                        <div style="margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
                            <p>If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
                            <p style="margin-top: 20px; color: #9ca3af;">
                                © ${new Date().getFullYear()} Option Matrix. All rights reserved.
                            </p>
                        </div>
                    </div>
                `
            })
        } catch (emailError: any) {
            console.error('Email sending error:', emailError)
            // Continue even if email fails - OTP is stored in DB
        }

        // In development, also log to console and return in response
        if (process.env.NODE_ENV === 'development') {
            console.log(`OTP for ${email}: ${otp}`)
        }

        return NextResponse.json(
            {
                message: 'OTP sent successfully',
                // Remove this in production - only for development
                ...(process.env.NODE_ENV === 'development' && { otp })
            },
            { status: 200 }
        )
    } catch (error: any) {
        console.error('Resend OTP error:', error)
        return NextResponse.json(
            { message: error.message || 'Failed to send OTP' },
            { status: 500 }
        )
    }
}
