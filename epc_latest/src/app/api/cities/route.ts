import { NextResponse } from 'next/server';
import getSupabaseAdmin from '@/lib/supabase/admin';

const ADMIN_SECRET = process.env.ADMIN_API_SECRET || process.env.NEXT_PUBLIC_ADMIN_API_SECRET;

export async function GET(req: Request) {
    try {
        const supabase = getSupabaseAdmin();
        const url = new URL(req.url);
        const includeDeleted = url.searchParams.get('includeDeleted') === '1';
        const stateId = url.searchParams.get('state_id');

        // select cities and include state name via relationship
        let q = supabase.from('cities').select('id,name,state_id,is_active,is_deleted,created_at,states(id,name)');
        if (!includeDeleted) q = q.eq('is_deleted', false);
        if (stateId) q = q.eq('state_id', stateId);

        const { data, error } = await q;
        if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
        // normalize state_name on each row
        const rows = (data || []).map((r: any) => ({ ...r, state_name: r.states?.name ?? null }));
        return NextResponse.json({ cities: rows });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        if (ADMIN_SECRET) {
            const header = req.headers.get('x-admin-secret');
            if (!header || header !== ADMIN_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await req.json();
        const { name, state_id, created_by } = body || {};
        if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
        if (!state_id) return NextResponse.json({ error: 'state_id is required' }, { status: 400 });
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.from('cities').insert([{ name, state_id, created_by: created_by ?? null }]).select().single();
        if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
        return NextResponse.json({ city: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        if (ADMIN_SECRET) {
            const header = req.headers.get('x-admin-secret');
            if (!header || header !== ADMIN_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await req.json();
        const { action, cityId, name, state_id, is_active } = body || {};
        if (!action || !cityId) return NextResponse.json({ error: 'action and cityId are required' }, { status: 400 });
        const supabase = getSupabaseAdmin();
        if (action === 'edit') {
            const update: any = {};
            if (typeof name !== 'undefined') update.name = name;
            if (typeof state_id !== 'undefined') update.state_id = state_id;
            if (typeof is_active !== 'undefined') update.is_active = is_active;
            const { data, error } = await supabase.from('cities').update(update).eq('id', cityId).select().single();
            if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
            return NextResponse.json({ city: data });
        }
        if (action === 'soft_delete') {
            const { data, error } = await supabase.from('cities').update({ is_deleted: true, is_active: false }).eq('id', cityId).select().single();
            if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
            return NextResponse.json({ ok: true });
        }
        if (action === 'toggle_active') {
            const { isActive } = body || {};
            if (typeof isActive === 'undefined') return NextResponse.json({ error: 'isActive is required for toggle_active' }, { status: 400 });
            const { data, error } = await supabase.from('cities').update({ is_active: isActive }).eq('id', cityId).select().single();
            if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
            return NextResponse.json({ city: data });
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
            if (!header || header !== ADMIN_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const url = new URL(req.url);
        const id = url.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
        const supabase = getSupabaseAdmin();
        const { error } = await supabase.from('cities').delete().eq('id', id);
        if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
}
