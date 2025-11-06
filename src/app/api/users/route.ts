import { NextResponse } from 'next/server';
import getSupabaseAdmin from '@/lib/supabaseAdmin';

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
                // only non-deleted admins; include role_id, phone_number and address/location fields so client can read it
                .select('user_id,is_active,is_deleted,role_id,phone_number,address,zip,state_id,city_id')
                .eq('is_deleted', false);

            if (adminsErr) throw adminsErr;

            const users: any[] = [];
            for (const a of admins || []) {
                const userId = a?.user_id;
                if (!userId) continue;
                try {
                    // fetch auth user
                    const userRes: any = await (supabase as any).auth.admin.getUserById(userId);
                    const authUser = userRes?.data?.user ?? null;
                    // fetch profile row for this user if present
                    let profile = null;
                    try {
                        const { data: p } = await supabase.from('profiles').select('id,user_type,created_at').eq('id', userId).single();
                        profile = p ?? null;
                    } catch (pe) {
                        // ignore missing profile
                    }

                    if (authUser) {
                        users.push({
                            ...authUser,
                            profile,
                            admin: {
                                is_active: a.is_active,
                                is_deleted: a.is_deleted,
                                role_id: a.role_id,
                                phone_number: (a as any).phone_number ?? null,
                                address: (a as any).address ?? null,
                                zip: (a as any).zip ?? null,
                                state_id: (a as any).state_id ?? null,
                                city_id: (a as any).city_id ?? null,
                            }
                        });
                    }
                } catch (e) {
                    console.warn('Failed to fetch auth user for admin', userId, e);
                }
            }

            return NextResponse.json({ users });
        }

        // default: return all auth users (fallback)
        const res: any = await (supabase as any).auth.admin.listUsers();
        return NextResponse.json({ users: res?.data ?? res?.users ?? [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        // optional admin secret protection
        if (ADMIN_SECRET) {
            const header = (req as any).headers?.get?.('x-admin-secret') || (req as any).headers?.['x-admin-secret'];
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
        const createRes: any = await (supabase as any).auth.admin.createUser({
            email,
            password: tempPassword,
            user_metadata: { name, role, user_type: userType },
            email_confirm: false,
        });

        if (createRes?.error) {
            return NextResponse.json({ error: createRes.error.message || createRes.error }, { status: 400 });
        }

        // After creating the auth user, ensure an `admins` row exists when
        // the userType is Admin. This keeps the `admins` table in sync so
        // the Manage Users screen (which reads `admins`) can rely on it.
        // This is best-effort and non-fatal if the table doesn't exist.
        try {
            const userId = createRes?.data?.user?.id ?? createRes?.user?.id ?? createRes?.id ?? (createRes?.data ?? createRes)?.id;
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

        // We rely on the Supabase `auth.users` trigger (your DB function)
        // to populate the application `profiles`/admins rows when a new
        // auth user is created. Avoid writing directly to application
        // tables here to prevent duplication and let the DB trigger be
        // the single source of truth.

        // Try to send a magic link / invite via Supabase REST auth endpoint if anon key is available.
        // We avoid importing the client-side wrapper here because server code must not call client modules.
        try {
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            if (anonKey && supabaseUrl) {
                // POST to Supabase auth OTP endpoint to trigger magic link email
                // Optionally include a redirect_to so the magic link returns to the app where the user can set a password.
                // Prefer explicit env var, otherwise try to derive from the request origin/host.
                let redirectTo = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? undefined;
                if (!redirectTo) {
                    try {
                        const origin = (req as any).headers?.get?.('origin');
                        const host = (req as any).headers?.get?.('host');
                        const proto = (req as any).headers?.get?.('x-forwarded-proto') || 'http';
                        if (origin) redirectTo = origin;
                        else if (host) redirectTo = `${proto}://${host}`;
                    } catch (e) {
                        // ignore
                    }
                }
                // Always set redirect_to to point to the app's /set-password path.
                // This will instruct Supabase to include that redirect in the magic link.
                let resolvedRedirect = redirectTo;
                if (!resolvedRedirect) {
                    // Try derive from request headers one more time
                    const origin = (req as any).headers?.get?.('origin');
                    const host = (req as any).headers?.get?.('host');
                    const proto = (req as any).headers?.get?.('x-forwarded-proto') || 'http';
                    if (origin) resolvedRedirect = origin;
                    else if (host) resolvedRedirect = `${proto}://${host}`;
                }

                if (!resolvedRedirect) {
                    // As a last resort, fallback to localhost dev URL and log a warning.
                    resolvedRedirect = 'https://epc.dhruv.tech';
                    console.warn('Could not determine application origin for redirect_to; falling back to https://epc.dhruv.tech. Set NEXT_PUBLIC_APP_URL in env to avoid this.');
                }

                const body: any = { email, redirect_to: `${resolvedRedirect.replace(/\/$/, '')}/set-password` };

                const resp = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/otp`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        apikey: anonKey,
                        Authorization: `Bearer ${anonKey}`,
                    },
                    body: JSON.stringify(body),
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

        return NextResponse.json({ user: createRes?.data ?? createRes?.user ?? createRes });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const supabase = getSupabaseAdmin();
        const body = await req.json();
        const { action, userId, isActive, name, email, role } = body || {};
        const phone_number = (body as any)?.phone_number ?? (body as any)?.phoneNumber ?? undefined;
        const address = (body as any)?.address;
        const zip = (body as any)?.zip;
        const state_id = (body as any)?.state_id;
        const city_id = (body as any)?.city_id;

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
                        const updateRes: any = await (supabase as any).auth.admin.updateUserById(userId, updateReq);
                        if (updateRes?.error) {
                            console.warn('Auth update warning', updateRes.error);
                        }
                    } catch (e) {
                        console.warn('Auth admin update failed or not available:', e);
                    }
                }

                try {
                    const { data: existingProfile, error: existErr } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
                    if (existErr) {
                        console.warn('Failed to check existing profile', existErr);
                    } else if (existingProfile) {
                        // No-op: profile exists.
                    } else {
                        // Profile doesn't exist — skip creating it here to avoid inserting rows with null required columns.
                    }
                } catch (e) { /* ignore */ }

                // Update admins row with role_id, phone_number, and address/location fields (best-effort)
                try {
                    const incomingRoleId = (body as any)?.role_id ?? (body as any)?.roleId ?? undefined;
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
                // @ts-ignore
                const updateRes: any = await (supabase as any).auth.admin.updateUserById(userId, { password });
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
