import { NextResponse } from 'next/server';
import getSupabaseAdmin from '@/lib/supabase/admin';

const ADMIN_SECRET = process.env.ADMIN_API_SECRET || process.env.NEXT_PUBLIC_ADMIN_API_SECRET;

export async function GET(req: Request) {
    try {
        const supabase = getSupabaseAdmin();
        const url = new URL(req.url);
        const includeDeleted = url.searchParams.get('includeDeleted') === '1';
        const q = supabase.from('states').select('id,name,abbreviation,is_active,is_deleted,created_at,created_by');
        if (!includeDeleted) q.eq('is_deleted', false);
        const { data, error } = await q;
        if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
        return NextResponse.json({ states: data ?? [] });
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
        const { name, abbreviation, created_by } = body || {};
        if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
        // compute a simple abbreviation fallback if not provided
        const abbr = (abbreviation && String(abbreviation).trim()) ? String(abbreviation).trim().toUpperCase().slice(0, 3) : String((name || '').replace(/\s+/g, '')).toUpperCase().slice(0, 3);
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.from('states').insert([{ name, abbreviation: abbr, created_by: created_by ?? null }]).select().single();
        if (error) {
            // friendly message for unique constraint violations
            const msg = (error.message || String(error)).toString();
            if (/unique_state_abbreviation|duplicate key value/.test(msg)) {
                return NextResponse.json({ error: 'Abbreviation already exists for another state. Choose a different abbreviation.' }, { status: 400 });
            }
            return NextResponse.json({ error: msg }, { status: 500 });
        }

        return NextResponse.json({ state: data });
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
        const { action, stateId, name, abbreviation, is_active } = body || {};
        if (!action || !stateId) return NextResponse.json({ error: 'action and stateId are required' }, { status: 400 });
        const supabase = getSupabaseAdmin();
        if (action === 'edit') {
            const update: any = {};
            if (typeof name !== 'undefined') update.name = name;
            if (typeof abbreviation !== 'undefined') update.abbreviation = (abbreviation && String(abbreviation).trim()) ? String(abbreviation).trim().toUpperCase().slice(0, 3) : null;
            if (typeof is_active !== 'undefined') update.is_active = is_active;
            const { data, error } = await supabase.from('states').update(update).eq('id', stateId).select().single();
            if (error) {
                const msg = (error.message || String(error)).toString();
                if (/unique_state_abbreviation|duplicate key value/.test(msg)) {
                    return NextResponse.json({ error: 'Abbreviation already exists for another state. Choose a different abbreviation.' }, { status: 400 });
                }
                return NextResponse.json({ error: msg }, { status: 500 });
            }
            return NextResponse.json({ state: data });
        }
        if (action === 'soft_delete') {
            const { data, error } = await supabase.from('states').update({ is_deleted: true, is_active: false }).eq('id', stateId).select().single();
            if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
            return NextResponse.json({ ok: true });
        }
        if (action === 'toggle_active') {
            const { isActive } = body || {};
            if (typeof isActive === 'undefined') return NextResponse.json({ error: 'isActive is required for toggle_active' }, { status: 400 });
            const { data, error } = await supabase.from('states').update({ is_active: isActive }).eq('id', stateId).select().single();
            if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
            return NextResponse.json({ state: data });
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
        const { error } = await supabase.from('states').delete().eq('id', id);
        if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
}
