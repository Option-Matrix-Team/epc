// Server-side Supabase admin client. Import this only in server code (API routes, server actions).
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRole) {
        throw new Error(
            "Missing server Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your server environment."
        );
    }

    // createClient with service role key for admin operations
    return createClient(url, serviceRole, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

export default getSupabaseAdmin;
