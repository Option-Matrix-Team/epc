"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import {
    LogOut,
    UserCircle,
    ChevronDown,
    ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"

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
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { AdminSidebarData } from "@/lib/sidebar/sidebarDataAdmin"
import { PatientSidebarData } from "@/lib/sidebar/sidebarDataPatient"
import { ProviderSidebarData } from "@/lib/sidebar/sidebarDataProvider"
import { NurseSidebarData } from "@/lib/sidebar/sidebarDataNurse"
import { TechnicianSidebarData } from "@/lib/sidebar/sidebarDataTechnician"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"

export function AppSidebar() {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()
    const { user, profile, loading } = useAuth()
    const [menuData, setMenuData] = React.useState<any[]>([])
    const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({})
    const [showSignOutDialog, setShowSignOutDialog] = React.useState(false)
    const [cachedUserEmail, setCachedUserEmail] = React.useState<string | null>(null)
    const [cachedUserType, setCachedUserType] = React.useState<string | null>(null)

    // Load cached user data on mount
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedEmail = localStorage.getItem('user_email')
            const storedUserType = localStorage.getItem('user_type')
            setCachedUserEmail(storedEmail)
            setCachedUserType(storedUserType)
        }
    }, [])

    // Update cache when user data changes
    React.useEffect(() => {
        if (user?.email && typeof window !== 'undefined') {
            localStorage.setItem('user_email', user.email)
            setCachedUserEmail(user.email)
        }
        if (profile?.user_type && typeof window !== 'undefined') {
            localStorage.setItem('user_type', profile.user_type)
            setCachedUserType(profile.user_type)
        }
    }, [user, profile])

    // Load sidebar data based on user_type
    React.useEffect(() => {
        const loadSidebarData = () => {
            let userType: string | null = null

            if (typeof window !== 'undefined') {
                try {
                    // Try to get user_type from localStorage
                    userType = localStorage.getItem('user_type')

                    if (!userType && profile?.user_type) {
                        userType = profile.user_type
                    }

                    if (!userType) {
                        const rawProfile = localStorage.getItem('profile')
                        if (rawProfile) {
                            try {
                                const parsed = JSON.parse(rawProfile)
                                if (parsed?.user_type) {
                                    userType = parsed.user_type
                                }
                            } catch (e) {
                                console.error('Failed to parse profile from localStorage', e)
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error reading user type from localStorage', e)
                }
            }

            // Load the correct sidebar data based on user_type
            switch (String(userType).toLowerCase()) {
                case 'admin':
                    setMenuData(AdminSidebarData)
                    break
                case 'patient':
                    setMenuData(PatientSidebarData)
                    break
                case 'provider':
                    setMenuData(ProviderSidebarData)
                    break
                case 'nurse':
                    setMenuData(NurseSidebarData)
                    break
                case 'technician':
                    setMenuData(TechnicianSidebarData)
                    break
                default:
                    console.warn(
                        `Unknown or missing user type ('${userType}'), loading Admin menu as default.`
                    )
                    setMenuData(AdminSidebarData)
            }
        }

        loadSidebarData()
    }, [profile])

    // Toggle menu open/close
    const toggleMenu = (label: string) => {
        setOpenMenus(prev => ({
            ...prev,
            [label]: !prev[label]
        }))
    }

    const openSignOutDialog = () => {
        setShowSignOutDialog(true)
    }

    async function handleSignOut() {
        try {
            // Call server-side signout API
            const response = await fetch('/api/auth/signout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                toast.error('Failed to sign out')
                return
            }

            // Clear localStorage
            if (typeof window !== 'undefined') {
                try {
                    localStorage.removeItem('user_type')
                    localStorage.removeItem('profile')
                    localStorage.removeItem('savedSearches')
                    localStorage.removeItem('userTableColumns')
                    localStorage.clear()
                } catch (e) {
                    console.error('Failed to clear localStorage', e)
                }
            }

            toast.success('Signed out successfully')
            setShowSignOutDialog(false)

            // Redirect to login
            window.location.href = '/login'
        } catch (error) {
            console.error('Sign out error:', error)
            toast.error('Failed to sign out')
        }
    }

    return (
        <Sidebar>
            <SidebarHeader className="border-b px-6 py-4">
                <div className="flex items-center gap-3">
                    <Image
                        src="/epc-logo.png"
                        alt="Option Matrix"
                        width={53}
                        height={40}
                        className="object-contain"
                    />

                </div>
            </SidebarHeader>
            <SidebarContent>
                {menuData.map((section, sectionIndex) => (
                    <SidebarGroup key={sectionIndex}>
                        {section.tittle && (
                            <SidebarGroupLabel>{section.tittle}</SidebarGroupLabel>
                        )}
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {section.submenuItems?.map((item: any, itemIndex: number) => {
                                    const isActive = pathname === item.link ||
                                        (item.submenuItems && item.submenuItems.some((sub: any) => pathname === sub.link))

                                    if (item.submenu && item.submenuItems && item.submenuItems.length > 0) {
                                        return (
                                            <Collapsible
                                                key={itemIndex}
                                                open={openMenus[item.label]}
                                                onOpenChange={() => toggleMenu(item.label)}
                                            >
                                                <SidebarMenuItem>
                                                    <CollapsibleTrigger asChild>
                                                        <SidebarMenuButton className={isActive ? 'bg-accent' : ''}>
                                                            {item.icon && <i className={`ti ti-${item.icon}`} />}
                                                            <span>{item.label}</span>
                                                            {openMenus[item.label] ? (
                                                                <ChevronDown className="ml-auto h-4 w-4" />
                                                            ) : (
                                                                <ChevronRight className="ml-auto h-4 w-4" />
                                                            )}
                                                        </SidebarMenuButton>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent>
                                                        <SidebarMenuSub>
                                                            {item.submenuItems.map((subItem: any, subIndex: number) => (
                                                                <SidebarMenuSubItem key={subIndex}>
                                                                    <SidebarMenuSubButton
                                                                        asChild
                                                                        isActive={pathname === subItem.link}
                                                                    >
                                                                        <Link href={subItem.link}>
                                                                            <span>{subItem.label}</span>
                                                                        </Link>
                                                                    </SidebarMenuSubButton>
                                                                </SidebarMenuSubItem>
                                                            ))}
                                                        </SidebarMenuSub>
                                                    </CollapsibleContent>
                                                </SidebarMenuItem>
                                            </Collapsible>
                                        )
                                    }

                                    return (
                                        <SidebarMenuItem key={itemIndex}>
                                            <SidebarMenuButton asChild isActive={isActive}>
                                                <Link href={item.link}>
                                                    {item.icon && <i className={`ti ti-${item.icon}`} />}
                                                    <span>{item.label}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarFooter className="border-t p-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <UserCircle className="h-5 w-5" />
                        </div>
                        <div className="flex-1 text-sm">
                            <p className="font-medium">
                                {user?.email || cachedUserEmail || 'Not logged in'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {profile?.user_type || cachedUserType || 'No profile'}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full cursor-pointer"
                        onClick={openSignOutDialog}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </SidebarFooter>

            {/* Sign Out Confirmation Dialog */}
            <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Sign Out</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to sign out?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSignOutDialog(false)}>
                            No
                        </Button>
                        <Button onClick={handleSignOut}>
                            Yes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Sidebar>
    )
}
