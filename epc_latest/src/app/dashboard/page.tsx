import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from 'sonner'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export default async function DashboardPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <>
            <SidebarProvider>
                <AppSidebar />
                <main className="flex-1 w-full">
                    <div className="border-b p-4">
                        <SidebarTrigger />
                    </div>
                    <div className="p-6">
                        <div className="space-y-6">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">EMR Dashboard</h1>
                                <p className="text-muted-foreground mt-2">
                                    Welcome to the Electronic Medical Records system
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <div className="rounded-lg border bg-card p-6 shadow-sm">
                                    <h3 className="font-semibold text-lg mb-2">Patients</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Manage patient records and information
                                    </p>
                                </div>

                                <div className="rounded-lg border bg-card p-6 shadow-sm">
                                    <h3 className="font-semibold text-lg mb-2">Appointments</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Schedule and manage patient appointments
                                    </p>
                                </div>

                                <div className="rounded-lg border bg-card p-6 shadow-sm">
                                    <h3 className="font-semibold text-lg mb-2">Doctors</h3>
                                    <p className="text-sm text-muted-foreground">
                                        View and manage healthcare providers
                                    </p>
                                </div>

                                <div className="rounded-lg border bg-card p-6 shadow-sm">
                                    <h3 className="font-semibold text-lg mb-2">Staff</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Manage hospital staff and roles
                                    </p>
                                </div>

                                <div className="rounded-lg border bg-card p-6 shadow-sm">
                                    <h3 className="font-semibold text-lg mb-2">Reports</h3>
                                    <p className="text-sm text-muted-foreground">
                                        View analytics and reports
                                    </p>
                                </div>

                                <div className="rounded-lg border bg-card p-6 shadow-sm">
                                    <h3 className="font-semibold text-lg mb-2">Settings</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Configure system preferences
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-lg border bg-muted/50 p-6">
                                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                                    <li>Register a new patient</li>
                                    <li>Schedule an appointment</li>
                                    <li>View today&apos;s schedule</li>
                                    <li>Access patient records</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </main>
            </SidebarProvider>
            <Toaster position="top-right" />
        </>
    )
}
