import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight">
                        EMR System Login
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Enter your credentials to access the system
                    </p>
                </div>

                <div className="mt-8">
                    <LoginForm />
                </div>
            </div>
        </div>
    )
}
