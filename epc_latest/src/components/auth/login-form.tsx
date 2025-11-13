'use client'

import { useState } from 'react'
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
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field'
import { Eye, EyeOff } from 'lucide-react'

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsLoading(true)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                toast.error(error.message)
                return
            }

            if (data.user) {
                // Fetch and persist user profile for menu filtering
                try {
                    const userId = data.user.id

                    // Try to get user_type from user_metadata first
                    let userType = data.user.user_metadata?.user_type || data.user.user_metadata?.userType || null

                    // If not in metadata, fetch from profiles table
                    if (!userType && userId) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('user_type')
                            .eq('id', userId)
                            .maybeSingle()

                        if (profile?.user_type) {
                            userType = profile.user_type
                            // Store full profile for later use
                            try {
                                localStorage.setItem('profile', JSON.stringify(profile))
                            } catch (e) {
                                console.debug('Failed to store profile', e)
                            }
                        }
                    }

                    // Persist user_type for sidebar menu filtering
                    if (userType) {
                        try {
                            localStorage.setItem('user_type', userType)
                        } catch (e) {
                            console.debug('Failed to store user_type', e)
                        }
                    }
                } catch (profileError) {
                    console.debug('Failed to fetch user profile', profileError)
                }

                toast.success('Welcome back!')
                // Redirect to dashboard after successful login
                router.push('/dashboard')
                router.refresh()
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">Welcome back</CardTitle>
                    <CardDescription>
                        Login to your Option Matrix account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
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
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">Password</FieldLabel>
                                    <Link
                                        href="/forgot-password"
                                        className="ml-auto text-sm underline-offset-4 hover:underline"
                                    >
                                        Forgot your password?
                                    </Link>
                                </div>
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
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? 'Signing in...' : 'Login'}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
            <FieldDescription className="px-6 text-center">
                By clicking login, you agree to our <Link href="#" className="underline">Terms of Service</Link>{" "}
                and <Link href="#" className="underline">Privacy Policy</Link>.
            </FieldDescription>
        </div>
    )
}
