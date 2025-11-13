'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field'

export function ForgotPasswordForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [emailSent, setEmailSent] = useState(false)
    const supabase = createClient()

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsLoading(true)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (error) {
                toast.error(error.message)
                return
            }

            setEmailSent(true)
            toast.success('Password reset email sent! Please check your inbox.')
        } catch (error) {
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    if (emailSent) {
        return (
            <div className={cn("flex flex-col gap-6", className)} {...props}>
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl">Check your email</CardTitle>
                        <CardDescription>
                            We sent a password reset link to {email}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground text-center">
                                Click the link in the email to reset your password. If you don't see the email, check your spam folder.
                            </p>
                            <Link href="/login">
                                <Button className="w-full" variant="outline">
                                    Back to Login
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">Forgot Password</CardTitle>
                    <CardDescription>
                        No worries, we'll send you reset instructions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email">Email Address</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="user@hospital.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                    required
                                />
                            </Field>
                            <Field>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? 'Sending...' : 'Reset Password'}
                                </Button>
                                <FieldDescription className="text-center">
                                    Return to{" "}
                                    <Link href="/login" className="hover-a underline">
                                        Login
                                    </Link>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
