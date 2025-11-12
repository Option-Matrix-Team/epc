import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
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
                        {children}
                    </div>
                </main>
            </SidebarProvider>
            <Toaster />
        </>
    )
}
