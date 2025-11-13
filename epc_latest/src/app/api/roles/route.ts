import { NextResponse } from 'next/server';
import getSupabaseAdmin from '@/lib/supabase/admin';

const ADMIN_SECRET = process.env.ADMIN_API_SECRET || process.env.NEXT_PUBLIC_ADMIN_API_SECRET;

export async function GET(req: Request) {
    try {
        const supabase = getSupabaseAdmin();
        const url = new URL(req.url);
        const includeDeleted = url.searchParams.get('includeDeleted') === '1';

        const q = supabase.from('roles').select('id,role_name,user_type,is_active,is_deleted,created_at,created_by');
        if (!includeDeleted) q.eq('is_deleted', false);
        const { data, error } = await q;
        if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
        return NextResponse.json({ roles: data ?? [] });
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
        const { role_name, user_type, created_by } = body || {};
        if (!role_name) return NextResponse.json({ error: 'role_name is required' }, { status: 400 });
        if (!user_type) return NextResponse.json({ error: 'user_type is required' }, { status: 400 });

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.from('roles').insert([{ role_name, user_type, created_by: created_by ?? null }]).select().single();
        if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
        return NextResponse.json({ role: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        // optional admin secret protection
        if (ADMIN_SECRET) {
            const header = req.headers.get('x-admin-secret');
            if (!header || header !== ADMIN_SECRET) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const body = await req.json();
        const { action, roleId, role_name, user_type, is_active } = body || {};
        if (!action || !roleId) return NextResponse.json({ error: 'action and roleId are required' }, { status: 400 });

        const supabase = getSupabaseAdmin();

        if (action === 'edit') {
            const update: any = {};
            if (typeof role_name !== 'undefined') update.role_name = role_name;
            if (typeof user_type !== 'undefined') update.user_type = user_type;
            if (typeof is_active !== 'undefined') update.is_active = is_active;
            const { data, error } = await supabase.from('roles').update(update).eq('id', roleId).select().single();
            if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
            return NextResponse.json({ role: data });
        }

        if (action === 'soft_delete') {
            const { data, error } = await supabase.from('roles').update({ is_deleted: true, is_active: false }).eq('id', roleId).select().single();
            if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: 'unsupported action' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        if (ADMIN_SECRET) {
            const header = req.headers.get('x-admin-secret');
            if (!header || header !== ADMIN_SECRET) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }
        const url = new URL(req.url);
        const id = url.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
        const supabase = getSupabaseAdmin();
        const { error } = await supabase.from('roles').delete().eq('id', id);
        if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
}
