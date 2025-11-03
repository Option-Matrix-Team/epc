import { NextResponse } from 'next/server';
import getSupabaseAdmin from '@/lib/supabaseAdmin';

const ADMIN_SECRET = process.env.ADMIN_API_SECRET;

export async function GET(req: Request) {
    try {
        const supabase = getSupabaseAdmin();
        const url = new URL(req.url);
        const userType = url.searchParams.get('userType');

        if (userType === 'Nurse') {
            const { data: nurses, error: nursesErr } = await supabase
                .from('nurses')
                // include role_id and address fields so client can display and pre-select
                .select('user_id,is_active,is_deleted,role_id,address,zip,state_id,city_id')
                .eq('is_deleted', false);

            if (nursesErr) throw nursesErr;

            const users: any[] = [];
            for (const p of nurses || []) {
                const userId = p?.user_id;
                if (!userId) continue;
                try {
                    const userRes: any = await (supabase as any).auth.admin.getUserById(userId);
                    const authUser = userRes?.data?.user ?? null;
                    let profile = null;
                    try {
                        const { data: pr } = await supabase.from('profiles').select('id,user_type,created_at').eq('id', userId).single();
                        profile = pr ?? null;
                    } catch (pe) { /* ignore missing profile */ }

                    if (authUser) {
                        users.push({
                            ...authUser,
                            profile,
                            nurse: {
                                is_active: p.is_active,
                                is_deleted: p.is_deleted,
                                role_id: p.role_id,
                                address: p.address ?? null,
                                zip: p.zip ?? null,
                                state_id: p.state_id ?? null,
                                city_id: p.city_id ?? null,
                            }
                        });
                    }
                } catch (e) {
                    console.warn('Failed to fetch auth user for nurse', userId, e);
                }
            }

            return NextResponse.json({ users });
        }

        const res: any = await (supabase as any).auth.admin.listUsers();
        return NextResponse.json({ users: res?.data ?? res?.users ?? [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        if (ADMIN_SECRET) {
            const header = (req as any).headers?.get?.('x-admin-secret') || (req as any).headers?.['x-admin-secret'];
            if (!header || header !== ADMIN_SECRET) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const body = await req.json();
        const { email, password, name, role, userType, role_id, address, zip, state_id, city_id } = body;
        const supabase = getSupabaseAdmin();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }
        if (!name || String(name).trim().length < 2) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }
        const emailOk = /.+@.+\..+/.test(String(email));
        if (!emailOk) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }
        if (!role_id && !role) {
            return NextResponse.json({ error: 'Role is required' }, { status: 400 });
        }

        const tempPassword = password || Math.random().toString(36).slice(2, 10) + 'A1!';

        const createRes: any = await (supabase as any).auth.admin.createUser({
            email,
            password: tempPassword,
            user_metadata: { name, role, user_type: userType },
            email_confirm: false,
        });

        if (createRes?.error) {
            return NextResponse.json({ error: createRes.error.message || createRes.error }, { status: 400 });
        }

        try {
            const userId = createRes?.data?.user?.id ?? createRes?.user?.id ?? createRes?.id ?? (createRes?.data ?? createRes)?.id;
            if (userId && userType === 'Nurse') {
                try {
                    const roleId = body?.role_id ?? body?.roleId ?? null;
                    const upsertPayload: any = { user_id: userId };
                    if (roleId !== undefined && roleId !== null && String(roleId).length) upsertPayload.role_id = roleId;
                    if (typeof address !== 'undefined') upsertPayload.address = address ?? null;
                    if (typeof zip !== 'undefined') upsertPayload.zip = zip ?? null;
                    if (typeof state_id !== 'undefined') upsertPayload.state_id = state_id ?? null;
                    if (typeof city_id !== 'undefined') upsertPayload.city_id = city_id ?? null;
                    const upsertProvider: any = await supabase.from('nurses').upsert([
                        upsertPayload
                    ], { onConflict: 'user_id' });
                    if (upsertProvider?.error) {
                        console.warn('Failed to upsert into nurses table:', upsertProvider.error);
                    }
                } catch (pe) {
                    console.warn('Error upserting into nurses table (likely table missing):', pe);
                }
            }
        } catch (ie) {
            console.warn('Failed to ensure nurses row:', ie);
        }

        try {
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            if (anonKey && supabaseUrl) {
                let redirectTo = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? undefined;
                if (!redirectTo) {
                    try {
                        const origin = (req as any).headers?.get?.('origin');
                        const host = (req as any).headers?.get?.('host');
                        const proto = (req as any).headers?.get?.('x-forwarded-proto') || 'http';
                        if (origin) redirectTo = origin;
                        else if (host) redirectTo = `${proto}://${host}`;
                    } catch (e) { }
                }
                let resolvedRedirect = redirectTo;
                if (!resolvedRedirect) {
                    const origin = (req as any).headers?.get?.('origin');
                    const host = (req as any).headers?.get?.('host');
                    const proto = (req as any).headers?.get?.('x-forwarded-proto') || 'http';
                    if (origin) resolvedRedirect = origin;
                    else if (host) resolvedRedirect = `${proto}://${host}`;
                }
                if (!resolvedRedirect) resolvedRedirect = 'https://epc.dhruv.tech';

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
        } catch (e) { console.warn('Failed to send magic link:', e); }

        return NextResponse.json({ user: createRes?.data ?? createRes?.user ?? createRes });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const supabase = getSupabaseAdmin();
        const body = await req.json();
        const { action, patientId, isActive, name, email, role, password, role_id, address, zip, state_id, city_id } = body || {};

        if (!action || !patientId) {
            return NextResponse.json({ error: 'action and patientId are required' }, { status: 400 });
        }

        if (action === 'toggle_active') {
            const { data, error } = await supabase.from('nurses').update({ is_active: !!isActive }).eq('user_id', patientId);
            if (error) return NextResponse.json({ error: error.message || error }, { status: 400 });
            return NextResponse.json({ ok: true, data });
        }

        if (action === 'soft_delete') {
            const { data, error } = await supabase.from('nurses').update({ is_deleted: true, is_active: false }).eq('user_id', patientId);
            if (error) return NextResponse.json({ error: error.message || error }, { status: 400 });
            return NextResponse.json({ ok: true, data });
        }

        if (action === 'edit') {
            try {
                const updateReq: any = {};
                if (email) {
                    const emailOk = /.+@.+\..+/.test(String(email));
                    if (!emailOk) return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
                    updateReq.email = email;
                }
                if (name) {
                    if (String(name).trim().length < 2) return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
                }
                if (name || role) updateReq.user_metadata = { ...(name ? { name } : {}), ...(role ? { role } : {}) };
                if (Object.keys(updateReq).length > 0) {
                    try {
                        const updateRes: any = await (supabase as any).auth.admin.updateUserById(patientId, updateReq);
                        if (updateRes?.error) console.warn('Auth update warning', updateRes.error);
                    } catch (e) { console.warn('Auth admin update failed or not available:', e); }
                }

                try {
                    // If role_id or address/location supplied in edit, include them when upserting the nurses row
                    const incomingRoleId = (body as any)?.role_id ?? (body as any)?.roleId ?? null;
                    const payload: any = { user_id: patientId };
                    if (incomingRoleId !== undefined && incomingRoleId !== null && String(incomingRoleId).length) payload.role_id = incomingRoleId;
                    if (typeof address !== 'undefined') payload.address = address ?? null;
                    if (typeof zip !== 'undefined') payload.zip = zip ?? null;
                    if (typeof state_id !== 'undefined') payload.state_id = state_id ?? null;
                    if (typeof city_id !== 'undefined') payload.city_id = city_id ?? null;
                    const upsertRes: any = await supabase.from('nurses').upsert([payload], { onConflict: 'user_id' });
                    if (upsertRes?.error) console.warn('Failed to upsert into nurses table:', upsertRes.error);
                } catch (pe) {
                    console.warn('Error upserting into nurses table (likely table missing):', pe);
                }

                try {
                    const { data: existingProfile, error: existErr } = await supabase.from('profiles').select('id').eq('id', patientId).maybeSingle();
                    if (existErr) console.warn('Failed to check existing profile', existErr);
                } catch (e) { /* ignore */ }

                return NextResponse.json({ ok: true });
            } catch (e: any) {
                return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
            }
        }

        if (action === 'reset_password') {
            const { password: newPassword } = body || {};
            if (!newPassword) return NextResponse.json({ error: 'password is required' }, { status: 400 });
            if (String(newPassword).length < 8) return NextResponse.json({ error: 'password must be at least 8 characters' }, { status: 400 });
            try {
                // @ts-ignore
                const updateRes: any = await (supabase as any).auth.admin.updateUserById(patientId, { password: newPassword });
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
