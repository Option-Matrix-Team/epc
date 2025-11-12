"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    Home,
    Settings,
    Users,
    Calendar,
    UserCircle,
    Stethoscope,
    LogOut,
} from "lucide-react"
import { toast } from "sonner"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
    SidebarFooter,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"

const items = [
    {
        title: "Dashboard",
        url: "/",
        icon: Home,
    },
    {
        title: "Patients",
        url: "/patients",
        icon: UserCircle,
    },
    {
        title: "Doctors",
        url: "/doctors",
        icon: Stethoscope,
    },
    {
        title: "Appointments",
        url: "/appointments",
        icon: Calendar,
    },
    {
        title: "Staff",
        url: "/staff",
        icon: Users,
    },
    {
        title: "Settings",
        url: "/settings",
        icon: Settings,
    },
]

export function AppSidebar() {
    const router = useRouter()
    const supabase = createClient()
    const { user, profile, loading } = useAuth()

    async function handleSignOut() {
        const { error } = await supabase.auth.signOut()

        if (error) {
            toast.error('Failed to sign out')
        } else {
            toast.success('Signed out successfully')
            router.push('/login')
            router.refresh()
        }
    }

    return (
        <Sidebar>
            <SidebarHeader className="border-b px-6 py-4">
                <h2 className="text-lg font-semibold">EMR System</h2>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <a href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t p-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <UserCircle className="h-5 w-5" />
                        </div>
                        <div className="flex-1 text-sm">
                            <p className="font-medium">
                                {loading ? 'Loading...' : user?.email || 'Not logged in'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {loading ? '...' : profile?.user_type || 'No profile'}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleSignOut}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}
