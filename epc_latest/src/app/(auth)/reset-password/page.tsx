import Link from 'next/link'
import Image from 'next/image'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default function ResetPasswordPage() {
    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <Link href="/" className="flex items-center justify-center">
                    <Image
                        src="/om_logo-rem.png"
                        alt="Option Matrix"
                        width={200}
                        height={80}
                        className="object-contain"
                        priority
                    />
                </Link>
                <ResetPasswordForm />
            </div>
        </div>
    )
}
