import { NextResponse } from 'next/server';
import getSupabaseAdmin from '@/lib/supabase/admin';

const ADMIN_SECRET = process.env.ADMIN_API_SECRET;

export async function GET(req: Request) {
    try {
        const supabase = getSupabaseAdmin();
        const url = new URL(req.url);
        const userType = url.searchParams.get('userType');

        // If userType is requested and equals 'Admin', read from the `admins` table
        // as the canonical source for admin users, then resolve auth users and
        // attach profile rows. This ensures Manage Users reads the admins table.
        if (userType === 'Admin') {
            const { data: admins, error: adminsErr } = await supabase
                .from('admins')
                // only non-deleted admins; include role_id, phone_number and address/location fields
                .select('user_id,is_active,is_deleted,role_id,phone_number,address,zip,state_id,city_id')
                .eq('is_deleted', false);

            if (adminsErr) throw adminsErr;

            const userIds = (admins || []).map(a => a?.user_id).filter(Boolean);

            if (userIds.length === 0) {
                return NextResponse.json({ users: [] });
            }

            // Fetch all auth users in ONE call using listUsers with pagination
            const allAuthUsers: any[] = [];
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                const listRes: any = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
                const pageUsers = listRes?.data?.users ?? listRes?.users ?? [];
                allAuthUsers.push(...pageUsers);
                hasMore = pageUsers.length === 1000;
                page++;
            }

            // Create a map of userId -> authUser for fast lookup
            const authUserMap = new Map();
            allAuthUsers.forEach(user => {
                if (user?.id) authUserMap.set(user.id, user);
            });

            // Fetch all profiles in ONE query
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id,user_type,created_at')
                .in('id', userIds);

            // Create a map of userId -> profile for fast lookup
            const profileMap = new Map();
            (profiles || []).forEach(p => {
                if (p?.id) profileMap.set(p.id, p);
            });

            // Build the users array by combining data from maps
            const users: any[] = [];
            for (const a of admins || []) {
                const userId = a?.user_id;
                if (!userId) continue;

                const authUser = authUserMap.get(userId);
                if (authUser) {
                    users.push({
                        ...authUser,
                        profile: profileMap.get(userId) || null,
                        admin: {
                            is_active: a.is_active,
                            is_deleted: a.is_deleted,
                            role_id: a.role_id,
                            phone_number: a.phone_number ?? null,
                            address: a.address ?? null,
                            zip: a.zip ?? null,
                            state_id: a.state_id ?? null,
                            city_id: a.city_id ?? null,
                        }
                    });
                }
            }

            return NextResponse.json({ users });
        }

        // default: return all auth users (fallback)
        const res: any = await supabase.auth.admin.listUsers();
        return NextResponse.json({ users: res?.data?.users ?? res?.users ?? [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        // optional admin secret protection
        if (ADMIN_SECRET) {
            const header = req.headers.get('x-admin-secret');
            if (!header || header !== ADMIN_SECRET) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const body = await req.json();
        const { email, password, name, role, userType } = body;
        const phone_number = body?.phone_number ?? body?.phoneNumber ?? null;
        // Address/location fields (best-effort, optional)
        const address = body?.address ?? null;
        const zip = body?.zip ?? null;
        const state_id = body?.state_id ?? null;
        const city_id = body?.city_id ?? null;
        const supabase = getSupabaseAdmin();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // create user via admin API; provide a temporary password if none supplied
        const tempPassword = password || Math.random().toString(36).slice(2, 10) + 'A1!';

        // create the user
        const createRes: any = await supabase.auth.admin.createUser({
            email,
            password: tempPassword,
            user_metadata: { name, role, user_type: userType },
            email_confirm: false,
        });

        if (createRes?.error) {
            return NextResponse.json({ error: createRes.error.message || createRes.error }, { status: 400 });
        }

        // After creating the auth user, ensure an `admins` row exists when
        // the userType is Admin. This keeps the `admins` table in sync.
        try {
            const userId = createRes?.data?.user?.id ?? createRes?.user?.id;
            if (userId && userType === 'Admin') {
                try {
                    // if caller provided a role_id, persist it to the admins row as well
                    const roleId = body?.role_id ?? body?.roleId ?? null;
                    const upsertPayload: any = { user_id: userId };
                    if (roleId !== undefined && roleId !== null && String(roleId).length) upsertPayload.role_id = roleId;
                    if (phone_number !== undefined && phone_number !== null && String(phone_number).length) upsertPayload.phone_number = String(phone_number);
                    if (typeof address !== 'undefined') upsertPayload.address = address ?? null;
                    if (typeof zip !== 'undefined') upsertPayload.zip = zip ?? null;
                    if (typeof state_id !== 'undefined') upsertPayload.state_id = state_id ?? null;
                    if (typeof city_id !== 'undefined') upsertPayload.city_id = city_id ?? null;
                    const upsertAdmin: any = await supabase.from('admins').upsert([upsertPayload], { onConflict: 'user_id' });
                    if (upsertAdmin?.error) {
                        console.warn('Failed to upsert into admins table:', upsertAdmin.error);
                    }
                } catch (ae) {
                    console.warn('Error upserting into admins table (likely table missing):', ae);
                }
            }
        } catch (ie) {
            console.warn('Failed to ensure admins row:', ie);
        }

        // Try to send a magic link / invite via Supabase REST auth endpoint
        try {
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            if (anonKey && supabaseUrl) {
                let redirectTo = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? undefined;
                if (!redirectTo) {
                    try {
                        const origin = req.headers.get('origin');
                        const host = req.headers.get('host');
                        const proto = req.headers.get('x-forwarded-proto') || 'http';
                        if (origin) redirectTo = origin;
                        else if (host) redirectTo = `${proto}://${host}`;
                    } catch (e) {
                        // ignore
                    }
                }

                let resolvedRedirect = redirectTo || 'http://localhost:3000';
                if (!redirectTo) {
                    console.warn('Could not determine application origin for redirect_to; falling back to http://localhost:3000. Set NEXT_PUBLIC_APP_URL in env to avoid this.');
                }

                const emailBody: any = { email, redirect_to: `${resolvedRedirect.replace(/\/$/, '')}/set-password` };

                const resp = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/otp`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        apikey: anonKey,
                        Authorization: `Bearer ${anonKey}`,
                    },
                    body: JSON.stringify(emailBody),
                });

                if (!resp.ok) {
                    const text = await resp.text();
                    console.warn('Failed to request magic link from Supabase:', resp.status, text);
                }
            }
        } catch (e) {
            // ignore - best-effort only
            console.warn('Failed to send magic link:', e);
        }

        return NextResponse.json({ user: createRes?.data?.user ?? createRes?.user ?? createRes });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const supabase = getSupabaseAdmin();
        const body = await req.json();
        const { action, userId, isActive, name, email, role } = body || {};
        const phone_number = body?.phone_number ?? body?.phoneNumber ?? undefined;
        const address = body?.address;
        const zip = body?.zip;
        const state_id = body?.state_id;
        const city_id = body?.city_id;

        if (!action || !userId) {
            return NextResponse.json({ error: 'action and userId are required' }, { status: 400 });
        }

        if (action === 'toggle_active') {
            const { data, error } = await supabase.from('admins').update({ is_active: !!isActive }).eq('user_id', userId);
            if (error) return NextResponse.json({ error: error.message || error }, { status: 400 });
            return NextResponse.json({ ok: true, data });
        }

        if (action === 'soft_delete') {
            // soft delete: set is_deleted = true and deactivate
            const { data, error } = await supabase.from('admins').update({ is_deleted: true, is_active: false }).eq('user_id', userId);
            if (error) return NextResponse.json({ error: error.message || error }, { status: 400 });
            return NextResponse.json({ ok: true, data });
        }

        if (action === 'edit') {
            try {
                // update auth user email and metadata
                const updateReq: any = {};
                if (email) updateReq.email = email;
                if (name || role) updateReq.user_metadata = { ...(name ? { name } : {}), ...(role ? { role } : {}) };
                if (Object.keys(updateReq).length > 0) {
                    try {
                        const updateRes: any = await supabase.auth.admin.updateUserById(userId, updateReq);
                        if (updateRes?.error) {
                            console.warn('Auth update warning', updateRes.error);
                        }
                    } catch (e) {
                        console.warn('Auth admin update failed or not available:', e);
                    }
                }

                // Update admins row with role_id, phone_number, and address/location fields (best-effort)
                try {
                    const incomingRoleId = body?.role_id ?? body?.roleId ?? undefined;
                    const updateAdmin: any = {};
                    if (incomingRoleId !== undefined) updateAdmin.role_id = incomingRoleId;
                    if (phone_number !== undefined) updateAdmin.phone_number = phone_number;
                    if (typeof address !== 'undefined') updateAdmin.address = address ?? null;
                    if (typeof zip !== 'undefined') updateAdmin.zip = zip ?? null;
                    if (typeof state_id !== 'undefined') updateAdmin.state_id = state_id ?? null;
                    if (typeof city_id !== 'undefined') updateAdmin.city_id = city_id ?? null;
                    if (Object.keys(updateAdmin).length > 0) {
                        const { error: updErr } = await supabase.from('admins').update(updateAdmin).eq('user_id', userId);
                        if (updErr) console.warn('Failed to update admins row', updErr);
                    }
                } catch (uerr) { /* ignore */ }

                return NextResponse.json({ ok: true });
            } catch (e: any) {
                return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
            }
        }

        if (action === 'reset_password') {
            const { password } = body || {};
            if (!password) return NextResponse.json({ error: 'password is required' }, { status: 400 });
            try {
                // Use admin API to update user password
                const updateRes: any = await supabase.auth.admin.updateUserById(userId, { password });
                if (updateRes?.error) return NextResponse.json({ error: updateRes.error.message || updateRes.error }, { status: 400 });
                return NextResponse.json({ ok: true });
            } catch (e: any) {
                return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
            }
        }

        return NextResponse.json({ error: 'unsupported action' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
}
