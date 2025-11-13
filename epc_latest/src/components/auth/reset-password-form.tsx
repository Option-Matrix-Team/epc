'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field'
import { Eye, EyeOff } from 'lucide-react'

export function ResetPasswordForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const [isLoading, setIsLoading] = useState(false)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [strength, setStrength] = useState(0)
    const router = useRouter()
    const supabase = createClient()

    // Password strength calculation
    useEffect(() => {
        let score = 0
        if (password.length >= 8) score += 1
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
        if (/[0-9]/.test(password)) score += 1
        if (/[^A-Za-z0-9]/.test(password)) score += 1
        setStrength(score)
    }, [password])

    const getStrengthLabel = () => {
        if (strength <= 1) return 'Weak'
        if (strength === 2) return 'Fair'
        if (strength === 3) return 'Good'
        return 'Strong'
    }

    const getStrengthColor = () => {
        if (strength <= 1) return 'bg-red-500'
        if (strength === 2) return 'bg-yellow-500'
        if (strength === 3) return 'bg-blue-500'
        return 'bg-green-500'
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!password) {
            toast.error('Password is required')
            return
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (strength < 2) {
            toast.error('Please use a stronger password')
            return
        }

        setIsLoading(true)

        try {
            // Ensure there's an authenticated user/session first
            const userRes = await supabase.auth.getUser()
            const user = userRes?.data?.user ?? null

            if (!user) {
                throw new Error('No authenticated session found. Please open the reset link from your email and try again.')
            }

            // Update the password
            const { error } = await supabase.auth.updateUser({
                password,
                data: { password_set: true }
            })

            if (error) throw error

            toast.success('Password updated successfully!')

            // Clear URL fragments for safety
            try {
                window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
            } catch (e) {
                console.error('Failed to clear URL fragments', e)
            }

            setTimeout(() => {
                router.push('/login')
            }, 1200)
        } catch (err: any) {
            toast.error(err.message || 'Failed to reset password')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">Set your password</CardTitle>
                    <CardDescription>
                        Choose a strong password for your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="password">New Password</FieldLabel>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="Confirm your password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        disabled={isLoading}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </Field>

                            {password && (
                                <div className="space-y-2">
                                    <FieldLabel>Password Strength</FieldLabel>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                                            style={{ width: `${(strength / 4) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {getStrengthLabel()}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Link href="/login" className="flex-1">
                                    <Button type="button" variant="outline" className="w-full">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={isLoading} className="flex-1">
                                    {isLoading ? 'Saving...' : 'Save Password'}
                                </Button>
                            </div>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
