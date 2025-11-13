'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { OTPVerificationForm } from '@/components/auth/otp-verification-form'

export default function VerifyOTPPage() {
    const searchParams = useSearchParams()
    const email = searchParams.get('email') || undefined

    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <Link href="/" className="flex items-center gap-2 self-center font-medium">
                    <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-md">
                        <span className="text-xl font-bold">EMR</span>
                    </div>
                    <span className="text-xl">Option Matrix</span>
                </Link>
                <OTPVerificationForm email={email} />
            </div>
        </div>
    )
}
