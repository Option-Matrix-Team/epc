import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }

    // Clear all auth cookies
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()

    allCookies.forEach(cookie => {
        if (cookie.name.includes('sb-') || cookie.name.includes('auth')) {
            cookieStore.delete(cookie.name)
        }
    })

    const response = NextResponse.json({
        success: true,
        message: 'Signed out successfully'
    })

    // Set cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
}
