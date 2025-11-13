import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { email, otp } = await request.json()

        if (!email || !otp) {
            return NextResponse.json(
                { message: 'Email and OTP are required' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Verify OTP from database
        const { data: otpRecord, error: fetchError } = await supabase
            .from('password_reset_otps')
            .select('*')
            .eq('email', email)
            .eq('otp', otp)
            .eq('is_used', false)
            .single()

        if (fetchError || !otpRecord) {
            return NextResponse.json(
                { message: 'Invalid or expired OTP' },
                { status: 400 }
            )
        }

        // Check if OTP is expired (valid for 10 minutes)
        const expiryTime = new Date(otpRecord.created_at)
        expiryTime.setMinutes(expiryTime.getMinutes() + 10)

        if (new Date() > expiryTime) {
            return NextResponse.json(
                { message: 'OTP has expired' },
                { status: 400 }
            )
        }

        // Mark OTP as used
        const { error: updateError } = await supabase
            .from('password_reset_otps')
            .update({
                is_used: true,
                verified_at: new Date().toISOString()
            })
            .eq('id', otpRecord.id)

        if (updateError) {
            throw updateError
        }

        return NextResponse.json(
            {
                message: 'OTP verified successfully',
                verified: true
            },
            { status: 200 }
        )
    } catch (error: any) {
        console.error('OTP verification error:', error)
        return NextResponse.json(
            { message: error.message || 'Failed to verify OTP' },
            { status: 500 }
        )
    }
}
