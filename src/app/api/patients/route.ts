import { NextResponse } from 'next/server';
import getSupabaseAdmin from '@/lib/supabaseAdmin';

const ADMIN_SECRET = process.env.ADMIN_API_SECRET;

export async function GET(req: Request) {
    try {
        const supabase = getSupabaseAdmin();
        const url = new URL(req.url);
        const userType = url.searchParams.get('userType');

        // If caller specifically requests patients, read from the `patients` table
        // as the canonical source for patient users, then resolve auth users and
        // attach profile rows.
        if (userType === 'Patient') {
            const { data: patients, error: patientsErr } = await supabase
                .from('patients')
                .select('user_id,is_active,is_deleted,date_of_birth,address,zip,state_id,city_id')
                .eq('is_deleted', false);

            if (patientsErr) throw patientsErr;

            const users: any[] = [];
            for (const p of patients || []) {
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
                        // expose application patient fields both inside .patient and at top-level for clients
                        users.push({
                            ...authUser,
                            date_of_birth: p.date_of_birth ?? null,
                            profile,
                            patient: {
                                is_active: p.is_active,
                                is_deleted: p.is_deleted,
                                date_of_birth: p.date_of_birth ?? null,
                                address: p.address ?? null,
                                zip: p.zip ?? null,
                                state_id: p.state_id ?? null,
                                city_id: p.city_id ?? null,
                            }
                        });
                    }
                } catch (e) {
                    console.warn('Failed to fetch auth user for patient', userId, e);
                }
            }

            return NextResponse.json({ users });
        }

        // Default fallback: list auth users (rarely used)
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
        const { email, password, name, role, userType, date_of_birth, address, zip, state_id, city_id } = body;
        const supabase = getSupabaseAdmin();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
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

        // Ensure a patients row exists when userType === 'Patient' (best-effort)
        try {
            const userId = createRes?.data?.user?.id ?? createRes?.user?.id ?? createRes?.id ?? (createRes?.data ?? createRes)?.id;
            if (userId && userType === 'Patient') {
                try {
                    const upsertPayload: any = { user_id: userId, date_of_birth: date_of_birth ?? null };
                    if (typeof address !== 'undefined') upsertPayload.address = address ?? null;
                    if (typeof zip !== 'undefined') upsertPayload.zip = zip ?? null;
                    if (typeof state_id !== 'undefined') upsertPayload.state_id = state_id ?? null;
                    if (typeof city_id !== 'undefined') upsertPayload.city_id = city_id ?? null;
                    const upsertPatient: any = await supabase.from('patients').upsert([
                        upsertPayload
                    ], { onConflict: 'user_id' });
                    if (upsertPatient?.error) {
                        console.warn('Failed to upsert into patients table:', upsertPatient.error);
                    }
                } catch (pe) {
                    console.warn('Error upserting into patients table (likely table missing):', pe);
                }
            }
        } catch (ie) {
            console.warn('Failed to ensure patients row:', ie);
        }

        // Best-effort: request magic link via anon key if available
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
                if (!resolvedRedirect) resolvedRedirect = 'http://localhost:3000';

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
        const { action, patientId, isActive, name, email, role, password, date_of_birth, address, zip, state_id, city_id } = body || {};

        if (!action || !patientId) {
            return NextResponse.json({ error: 'action and patientId are required' }, { status: 400 });
        }

        if (action === 'toggle_active') {
            const { data, error } = await supabase.from('patients').update({ is_active: !!isActive }).eq('user_id', patientId);
            if (error) return NextResponse.json({ error: error.message || error }, { status: 400 });
            return NextResponse.json({ ok: true, data });
        }

        if (action === 'soft_delete') {
            const { data, error } = await supabase.from('patients').update({ is_deleted: true, is_active: false }).eq('user_id', patientId);
            if (error) return NextResponse.json({ error: error.message || error }, { status: 400 });
            return NextResponse.json({ ok: true, data });
        }

        if (action === 'edit') {
            try {
                const updateReq: any = {};
                if (email) updateReq.email = email;
                if (name || role) updateReq.user_metadata = { ...(name ? { name } : {}), ...(role ? { role } : {}) };
                if (Object.keys(updateReq).length > 0) {
                    try {
                        const updateRes: any = await (supabase as any).auth.admin.updateUserById(patientId, updateReq);
                        if (updateRes?.error) console.warn('Auth update warning', updateRes.error);
                    } catch (e) { console.warn('Auth admin update failed or not available:', e); }
                }

                // If patient-specific fields provided, persist them into the patients table (best-effort)
                try {
                    const upsertPayload: any = { user_id: patientId };
                    if (typeof date_of_birth !== 'undefined') upsertPayload.date_of_birth = date_of_birth ?? null;
                    if (typeof address !== 'undefined') upsertPayload.address = address ?? null;
                    if (typeof zip !== 'undefined') upsertPayload.zip = zip ?? null;
                    if (typeof state_id !== 'undefined') upsertPayload.state_id = state_id ?? null;
                    if (typeof city_id !== 'undefined') upsertPayload.city_id = city_id ?? null;
                    // Only call upsert if there's something to persist beyond user_id
                    if (Object.keys(upsertPayload).length > 1) {
                        const upsertRes: any = await supabase.from('patients').upsert([upsertPayload], { onConflict: 'user_id' });
                        if (upsertRes?.error) console.warn('Failed to upsert patient fields into patients table:', upsertRes.error);
                    }
                } catch (pe) {
                    console.warn('Error upserting patient fields into patients table (likely table missing):', pe);
                }

                try {
                    const { data: existingProfile, error: existErr } = await supabase.from('profiles').select('id').eq('id', patientId).maybeSingle();
                    if (existErr) console.warn('Failed to check existing profile', existErr);
                    // if profile exists, leave it; if not, skip creating it here
                } catch (e) { /* ignore */ }

                return NextResponse.json({ ok: true });
            } catch (e: any) {
                return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
            }
        }

        if (action === 'reset_password') {
            const { password: newPassword } = body || {};
            if (!newPassword) return NextResponse.json({ error: 'password is required' }, { status: 400 });
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
