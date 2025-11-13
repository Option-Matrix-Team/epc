'use client'

import { useState, useEffect, useRef } from 'react'
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
import { cn } from '@/lib/utils'
import {
    Field,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field'

interface OTPVerificationFormProps extends React.ComponentProps<"div"> {
    email?: string
    onSuccess?: () => void
}

export function OTPVerificationForm({
    className,
    email,
    onSuccess,
    ...props
}: OTPVerificationFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [seconds, setSeconds] = useState(60)
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])
    const router = useRouter()

    // Timer countdown
    useEffect(() => {
        if (seconds <= 0) return

        const intervalId = setInterval(() => {
            setSeconds((prevSeconds) => {
                if (prevSeconds <= 1) {
                    clearInterval(intervalId)
                    return 0
                }
                return prevSeconds - 1
            })
        }, 1000)

        return () => clearInterval(intervalId)
    }, [seconds])

    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60)
        const secs = totalSeconds % 60
        return `${minutes < 10 ? "0" + minutes : minutes}:${secs < 10 ? "0" + secs : secs}`
    }

    const handleChange = (index: number, value: string) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return

        const newOtp = [...otp]
        newOtp[index] = value
        setOtp(newOtp)

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault()
        const pastedData = e.clipboardData.getData('text/plain').slice(0, 6)

        if (!/^\d+$/.test(pastedData)) return

        const newOtp = [...otp]
        pastedData.split('').forEach((char, index) => {
            if (index < 6) {
                newOtp[index] = char
            }
        })
        setOtp(newOtp)

        // Focus the next empty input or last input
        const nextEmptyIndex = newOtp.findIndex(val => !val)
        const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : 5
        inputRefs.current[focusIndex]?.focus()
    }

    async function handleResendOTP() {
        if (seconds > 0) return

        setIsLoading(true)
        try {
            // Call API to resend OTP
            const response = await fetch('/api/auth/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to resend OTP')
            }

            toast.success('OTP resent successfully!')
            setSeconds(60)
            setOtp(['', '', '', '', '', ''])
            inputRefs.current[0]?.focus()
        } catch (err: any) {
            toast.error(err.message || 'Failed to resend OTP')
        } finally {
            setIsLoading(false)
        }
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()

        const otpValue = otp.join('')
        if (otpValue.length !== 6) {
            toast.error('Please enter all 6 digits')
            return
        }

        setIsLoading(true)

        try {
            // Verify OTP via API
            const response = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpValue }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Invalid OTP')
            }

            toast.success('OTP verified successfully!')

            if (onSuccess) {
                onSuccess()
            } else {
                setTimeout(() => {
                    router.push('/reset-password')
                }, 1200)
            }
        } catch (err: any) {
            toast.error(err.message || 'Invalid or expired OTP')
            setOtp(['', '', '', '', '', ''])
            inputRefs.current[0]?.focus()
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">2-Step Verification</CardTitle>
                    <CardDescription>
                        Please enter the OTP received to confirm your account ownership.
                        {email && (
                            <>
                                {' '}A code has been sent to{' '}
                                <span className="font-medium text-foreground">
                                    {email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}
                                </span>
                            </>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>Enter OTP Code</FieldLabel>
                                <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                                    {otp.map((digit, index) => (
                                        <Input
                                            key={index}
                                            ref={(el) => {
                                                inputRefs.current[index] = el
                                            }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            disabled={isLoading}
                                            className="w-12 h-12 text-center text-lg font-semibold"
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </div>
                            </Field>

                            <div className="flex justify-center items-center gap-2 text-sm">
                                <span className="text-muted-foreground">
                                    Didn't receive code?
                                </span>
                                <Button
                                    type="button"
                                    variant="link"
                                    className="p-0 h-auto"
                                    onClick={handleResendOTP}
                                    disabled={seconds > 0 || isLoading}
                                >
                                    Resend Code
                                </Button>
                                {seconds > 0 && (
                                    <span className="text-destructive font-medium">
                                        {formatTime(seconds)}
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Link href="/login" className="flex-1">
                                    <Button type="button" variant="outline" className="w-full">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={isLoading} className="flex-1">
                                    {isLoading ? 'Verifying...' : 'Submit'}
                                </Button>
                            </div>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
