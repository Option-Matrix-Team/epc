"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { all_routes } from "@/routes/all_routes";
import Link from "next/link";
import getSupabaseClient from "@/lib/supabaseClient";
import "@/style/css/admin-screens.css";
import SearchInput from '@/core/common/dataTable/dataTableSearch';
import { formatDateTime } from '@/core/common/dateTime';

// Lightweight searchable select (no external deps)
type SSOption = { value: string | number; label: string };
const SearchSelect: React.FC<{
    options: SSOption[];
    value: string | number | null | undefined;
    onChange: (val: string | number | null) => void;
    placeholder?: string;
    disabled?: boolean;
    allowClear?: boolean;
    inputClassName?: string;
}> = ({ options, value, onChange, placeholder = 'Select...', disabled, allowClear = true, inputClassName }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const wrapRef = useRef<HTMLDivElement | null>(null);

    const selected = useMemo(() => options.find(o => String(o.value) === String(value)) || null, [options, value]);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter(o => o.label.toLowerCase().includes(q));
    }, [options, query]);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const displayText = open ? query : (selected?.label ?? '');

    return (
        <div className="position-relative" ref={wrapRef}>
            <div className="d-flex align-items-center">
                <input
                    className={`form-control ${inputClassName || ''}`}
                    value={displayText}
                    onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                />
                {allowClear && value && !disabled && (
                    <button type="button" className="btn btn-sm btn-link text-muted position-absolute end-0 me-1" onClick={() => { onChange(null); setQuery(''); }} style={{ zIndex: 10 }}>
                        <i className="ti ti-x" />
                    </button>
                )}
            </div>
            {open && (
                <div className="dropdown-menu show w-100" style={{ maxHeight: 240, overflowY: 'auto' }}>
                    {filtered.length === 0 ? (
                        <div className="dropdown-item text-muted">No matches</div>
                    ) : (
                        filtered.map(opt => (
                            <button key={opt.value} type="button" className="dropdown-item" onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}>
                                {opt.label}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const NursesComponent = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [roleOptions, setRoleOptions] = useState<Array<{ label: string; value: string }>>([]);
    const [rolesMap, setRolesMap] = useState<Record<string, string>>({});
    const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [editEmail, setEditEmail] = useState("");
    const [editName, setEditName] = useState("");
    const [editRole, setEditRole] = useState("");
    const [addPhone, setAddPhone] = useState<string>("");
    const [editPhone, setEditPhone] = useState<string>("");
    const [states, setStates] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [addAddress, setAddAddress] = useState("");
    const [addZip, setAddZip] = useState("");
    const [addStateId, setAddStateId] = useState<number | null>(null);
    const [addCityId, setAddCityId] = useState<number | null>(null);
    const [editAddress, setEditAddress] = useState("");
    const [editZip, setEditZip] = useState("");
    const [editStateId, setEditStateId] = useState<number | null>(null);
    const [editCityId, setEditCityId] = useState<number | null>(null);
    const [resetUserId, setResetUserId] = useState<string | null>(null);
    const [resetPassword, setResetPassword] = useState("");
    const [resetConfirm, setResetConfirm] = useState("");
    const [resetShowPassword, setResetShowPassword] = useState(false);
    const [resetShowConfirm, setResetShowConfirm] = useState(false);
    // modal submit loading flags
    const [isAdding, setIsAdding] = useState(false);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Filters UI state
    type Filters = {
        roleId: string;
        address: string;
        zip: string;
        stateId: string;
        cityId: string;
        status: '' | 'active' | 'inactive';
    };
    const [showFilters, setShowFilters] = useState(false);
    const [filtersDraft, setFiltersDraft] = useState<Filters>({ roleId: '', address: '', zip: '', stateId: '', cityId: '', status: '' });
    const [appliedFilters, setAppliedFilters] = useState<Filters>({ roleId: '', address: '', zip: '', stateId: '', cityId: '', status: '' });
    const filtersPanelRef = useRef<HTMLDivElement | null>(null);
    const [searchText, setSearchText] = useState<string>("");

    // Search handler
    const handleSearch = (value: string) => {
        setSearchText(value);
        setCurrentPage(1);
    };

    // Sorting state
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name_flat', direction: 'asc' });

    // Pagination state
    const [pageSize, setPageSize] = useState<number>(25);
    const [currentPage, setCurrentPage] = useState<number>(1);

    // Horizontal scroll floaters
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // Saved Searches state
    const SCREEN_KEY = 'nurses';
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    type SavedSearch = { id: string; name: string; filters: Filters };
    const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
    const [selectedSavedSearch, setSelectedSavedSearch] = useState<string>('');
    const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
    const [saveSearchName, setSaveSearchName] = useState('');
    const [isSavingSearch, setIsSavingSearch] = useState(false);

    // Options for searchable selects
    const stateOptions = useMemo(() => (states || []).map(s => ({ value: String(s.id), label: s.name })), [states]);
    const cityOptionsFilter = useMemo(() => (cities || [])
        .filter(c => !filtersDraft.stateId || String(c.state_id) === String(filtersDraft.stateId))
        .map(c => ({ value: String(c.id), label: c.name })), [cities, filtersDraft.stateId]);
    const cityOptionsAdd = useMemo(() => (cities || [])
        .filter(c => !addStateId || String(c.state_id) === String(addStateId))
        .map(c => ({ value: String(c.id), label: c.name })), [cities, addStateId]);
    const cityOptionsEdit = useMemo(() => (cities || [])
        .filter(c => !editStateId || String(c.state_id) === String(editStateId))
        .map(c => ({ value: String(c.id), label: c.name })), [cities, editStateId]);

    // CSV helper functions
    const downloadCSV = () => {
        try {
            const headers = ['Name', 'Email', 'Phone', 'Role', 'Address', 'Zip', 'State', 'City'];
            const rows = data.map(record => {
                const roleId = record?.nurse?.role_id ?? record?.profile?.role_id ?? record?.user_metadata?.role_id ?? record?.role_id;
                const roleName = (roleId && rolesMap[String(roleId)]) ? rolesMap[String(roleId)] : (record.profile?.user_type ?? record?.user_metadata?.role ?? 'User');
                const stateId = record?.nurse?.state_id;
                const cityId = record?.nurse?.city_id;
                const stateName = stateId ? (states.find(s => s.id === stateId)?.name ?? '') : '';
                const cityName = cityId ? (cities.find(c => c.id === cityId)?.name ?? '') : '';
                return [
                    record.user_metadata?.name ?? record.email,
                    record.email ?? '',
                    record?.nurse?.phone_number ?? '',
                    roleName,
                    record?.nurse?.address ?? '',
                    record?.nurse?.zip ?? '',
                    stateName,
                    cityName
                ];
            });
            const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `nurses_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
            showToast('CSV downloaded successfully', 'success');
        } catch (e: any) {
            showToast('Failed to download CSV: ' + e.message, 'danger');
        }
    };

    const downloadTemplate = () => {
        try {
            const headers = ['Name', 'Email', 'Phone', 'Role', 'Address', 'Zip', 'State', 'City'];
            const sampleRow = ['Jane Smith', 'jane@example.com', '9876543210', 'Registered Nurse', '456 Oak Ave', '54321', 'Texas', 'Houston'];
            const csvContent = [headers, sampleRow].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'nurses_template.csv';
            link.click();
            URL.revokeObjectURL(link.href);
            showToast('Template downloaded successfully', 'success');
        } catch (e: any) {
            showToast('Failed to download template: ' + e.message, 'danger');
        }
    };

    const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length < 2) throw new Error('CSV file is empty or invalid');

            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const rows = lines.slice(1);

            let successCount = 0;
            let errorCount = 0;

            for (const row of rows) {
                const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                const [name, email, phone, roleName, address, zip, stateName, cityName] = values;

                if (!name || !email || !roleName) {
                    errorCount++;
                    continue;
                }

                try {
                    // Find role by name
                    const roleEntry = Object.entries(rolesMap).find(([_, rName]) => rName.toLowerCase() === roleName.toLowerCase());
                    const role_id = roleEntry ? roleEntry[0] : null;

                    // Find state by name
                    const state = states.find(s => s.name.toLowerCase() === stateName.toLowerCase());
                    const state_id = state?.id ?? null;

                    // Find city by name and state
                    const city = state_id ? cities.find(c => c.name.toLowerCase() === cityName.toLowerCase() && c.state_id === state_id) : null;
                    const city_id = city?.id ?? null;

                    const headers: any = { 'Content-Type': 'application/json' };
                    const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET) ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET : undefined;
                    if (adminSecret) headers['x-admin-secret'] = adminSecret;

                    const res = await fetch('/api/nurses', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            email,
                            name,
                            role: roleName,
                            role_id,
                            userType: 'Nurse',
                            phone_number: phone || null,
                            address: address || null,
                            zip: zip || null,
                            state_id,
                            city_id
                        })
                    });
                    const json = await res.json();
                    if (json.error) throw new Error(json.error);
                    successCount++;
                } catch (e: any) {
                    console.error(`Failed to import nurse ${email}:`, e);
                    errorCount++;
                }
            }

            await fetchNurses();
            showToast(`Import complete: ${successCount} nurses added, ${errorCount} failed`, successCount > 0 ? 'success' : 'danger');
        } catch (e: any) {
            showToast('Failed to upload CSV: ' + e.message, 'danger');
        } finally {
            setIsUploading(false);
            event.target.value = ''; // Reset file input
        }
    };

    const ensureToastContainer = () => {
        let container = document.getElementById('global_toast_container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'global_toast_container';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(container);
        }
        return container;
    };

    const showToast = (message: string, type: 'success' | 'danger' | 'info' = 'success') => {
        try {
            const container = ensureToastContainer();
            const toast = document.createElement('div');
            const variantClass = type === 'success' ? 'text-bg-success' : type === 'danger' ? 'text-bg-danger' : 'text-bg-info';
            toast.className = `toast align-items-center ${variantClass} border-0 mb-2 show`;
            toast.role = 'alert';
            toast.ariaLive = 'assertive';
            toast.ariaAtomic = 'true';
            toast.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button></div>`;
            const closeBtn = toast.querySelector('.btn-close') as HTMLElement | null;
            closeBtn?.addEventListener('click', () => { toast.remove(); });
            container.appendChild(toast);
            setTimeout(() => { toast.classList.remove('show'); try { toast.remove(); } catch (_) { } }, 4000);
        } catch (e) {
            // eslint-disable-next-line no-alert
            alert(message);
        }
    };

    const hideModalById = async (id: string) => {
        return new Promise<void>((resolve) => {
            try {
                const modalEl = document.getElementById(id);
                // @ts-ignore
                const bs = (window as any).bootstrap;
                if (!modalEl) return resolve();

                let resolved = false;
                const finish = () => {
                    if (resolved) return;
                    resolved = true;
                    try {
                        modalEl.classList.remove('show');
                        (modalEl as any).style.display = 'none';
                        modalEl.setAttribute('aria-hidden', 'true');
                        modalEl.removeAttribute('aria-modal');
                        modalEl.querySelectorAll('.show').forEach(el => el.classList.remove('show'));
                        try { document.body.classList.remove('modal-open'); (document.body as any).style.overflow = ''; (document.body as any).style.paddingRight = ''; } catch (_) { }
                        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                        try { const ev = new Event('hidden.bs.modal'); modalEl.dispatchEvent(ev); } catch (_) { }
                    } catch (cleanupErr) { console.debug('[nurses] hideModal cleanup', cleanupErr); }
                    resolve();
                };

                try {
                    if (bs && bs.Modal) {
                        // @ts-ignore
                        const inst = bs.Modal.getInstance(modalEl) ?? bs.Modal.getOrCreateInstance?.(modalEl) ?? new bs.Modal(modalEl);
                        const onHidden = () => { try { modalEl.removeEventListener('hidden.bs.modal', onHidden); } catch (_) { }; finish(); };
                        modalEl.addEventListener('hidden.bs.modal', onHidden);
                        try { inst?.hide?.(); } catch (hideErr) { console.debug('[nurses] bootstrap hide threw', hideErr); }
                        setTimeout(() => finish(), 600);
                        return;
                    }
                } catch (err) {
                    console.debug('[nurses] bootstrap modal hide failed', err);
                }

                finish();
            } catch (e) {
                console.debug('[nurses] hideModalById error', e);
                resolve();
            }
        });
    };

    const fetchNurses = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/nurses?userType=Nurse');
            const json = await res.json();
            setData(json.users || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoleOptions = async (userType: string) => {
        try {
            const res = await fetch(`/api/roles?userType=${encodeURIComponent(userType)}`);
            const json = await res.json();
            const list = json.roles || [];
            // Filter strictly by user_type / userType (defensive: support both keys)
            const filtered = list.filter((r: any) => {
                const rt = (r.user_type ?? r.userType ?? r.usertype ?? '').toString().toLowerCase();
                return rt === (userType || '').toString().toLowerCase();
            });
            const finalList = filtered.length ? filtered : [];
            const opts = finalList.map((r: any) => ({ label: r.role_name, value: String(r.id) }));
            const map: Record<string, string> = {};
            finalList.forEach((r: any) => { map[String(r.id)] = r.role_name; });
            setRoleOptions(opts);
            setRolesMap(map);
        } catch (e) {
            console.error('[nurses] fetchRoleOptions', e);
        }
    };

    useEffect(() => { fetchNurses(); fetchStatesAndCities(); }, []);
    useEffect(() => { fetchRoleOptions('Nurse'); }, []);

    const fetchStatesAndCities = async () => {
        try {
            const [sRes, cRes] = await Promise.all([fetch('/api/states'), fetch('/api/cities')]);
            const sJson = await sRes.json().catch(() => ({}));
            const cJson = await cRes.json().catch(() => ({}));
            setStates(sJson.states || []);
            setCities(cJson.cities || []);
        } catch (e) {
            console.debug('[nurses] failed to load states/cities', e);
        }
    };

    // Load current user
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const sb = getSupabaseClient();
                const { data: userData } = await sb.auth.getUser();
                const uid = userData?.user?.id ?? null;
                if (mounted) setCurrentUserId(uid);
            } catch (e) {
                console.debug('[nurses] failed to get user', e);
            }
        })();
        return () => { mounted = false; };
    }, []);

    // Saved Searches functions
    const loadSavedSearches = async () => {
        try {
            const sb = getSupabaseClient();
            if (!currentUserId) return;
            const { data, error } = await sb
                .from('saved_searches')
                .select('*')
                .eq('user_id', currentUserId)
                .eq('screen', SCREEN_KEY)
                .order('created_at', { ascending: false });
            if (error) throw error;
            const searches = (data || []).map((row: any) => ({
                id: row.id,
                name: row.name,
                filters: row.filters as Filters
            }));
            setSavedSearches(searches);
        } catch (e) {
            console.debug('[nurses] loadSavedSearches error', e);
        }
    };

    const handleSaveSearch = async () => {
        if (!saveSearchName.trim()) {
            showToast('Please enter a name for this search', 'danger');
            return;
        }
        try {
            setIsSavingSearch(true);
            const sb = getSupabaseClient();
            if (!currentUserId) throw new Error('User not logged in');

            const { data, error } = await sb
                .from('saved_searches')
                .insert({
                    user_id: currentUserId,
                    screen: SCREEN_KEY,
                    name: saveSearchName.trim(),
                    filters: filtersDraft
                })
                .select()
                .single();

            if (error) throw error;

            await loadSavedSearches();
            showToast('Search saved successfully', 'success');
            setShowSaveSearchModal(false);
            setSaveSearchName('');
        } catch (e: any) {
            showToast(e?.message || 'Failed to save search', 'danger');
        } finally {
            setIsSavingSearch(false);
        }
    };

    const handleApplySavedSearch = (searchId: string) => {
        const search = savedSearches.find(s => s.id === searchId);
        if (search) {
            setFiltersDraft(search.filters);
            setAppliedFilters(search.filters);
            setSelectedSavedSearch(searchId);
            showToast(`Applied saved search: ${search.name}`, 'info');
        }
    };

    const handleDeleteSavedSearch = async (searchId: string) => {
        const search = savedSearches.find(s => s.id === searchId);
        if (!search) return;

        const ok = confirm(`Are you sure you want to delete the saved search "${search.name}"?`);
        if (!ok) return;

        try {
            const sb = getSupabaseClient();
            const { error } = await sb
                .from('saved_searches')
                .delete()
                .eq('id', searchId);

            if (error) throw error;

            await loadSavedSearches();
            if (selectedSavedSearch === searchId) {
                setSelectedSavedSearch('');
            }
            showToast('Saved search deleted', 'success');
        } catch (e: any) {
            showToast(e?.message || 'Failed to delete saved search', 'danger');
        }
    };

    // Load saved searches when user is loaded
    useEffect(() => {
        if (currentUserId) {
            loadSavedSearches();
        }
    }, [currentUserId]);

    const columns = [
        {
            title: 'Actions', render: (v: any, r: any) => {
                const userId = r?.id ?? r?.user?.id ?? r?.user?.user?.id;
                const isLoading = !!(userId && loadingIds[userId]);
                if (isLoading) {
                    return <div><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span></div>;
                }
                return (
                    <div className="action-item">
                        <a href="#" onClick={(e) => e.preventDefault()} data-bs-toggle="dropdown"><i className="ti ti-dots-vertical" /></a>
                        <ul className="dropdown-menu p-2">
                            <li><a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); handleEditOpen(r); }}>Edit</a></li>
                            <li><a href="#" className="dropdown-item text-danger" onClick={async (e) => { e.preventDefault(); await handleSoftDelete(r); }}>Delete</a></li>
                        </ul>
                    </div>
                );
            }
        },
        {
            title: 'Status', dataIndex: 'nurse.is_active', sortKey: 'is_active_flat', render: (_: any, record: any) => {
                const isActive = record?.nurse?.is_active ?? false;
                const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id;
                const isLoading = !!(userId && loadingIds[userId]);
                return (
                    <span
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggleActive(record); } }}
                        onClick={async (e) => { e.preventDefault(); await handleToggleActive(record); }}
                        className={`badge ${isActive ? 'badge-soft-success' : 'badge-soft-danger'} border ${isActive ? 'border-success' : 'border-danger'} px-2 py-1 fs-13 fw-medium`}
                        style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
                        aria-disabled={isLoading}
                    >
                        {isLoading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : (isActive ? 'Active' : 'Inactive')}
                    </span>
                );
            }
        },
        {
            title: 'Name',
            dataIndex: 'user_metadata.name',
            sortKey: 'name_flat',
            sorter: (a: any, b: any) => (a.user_metadata?.name ?? a.email ?? '').localeCompare(b.user_metadata?.name ?? b.email ?? ''),
            render: (val: any, record: any) => record.user_metadata?.name ?? record.email
        },
        {
            title: 'Email',
            dataIndex: 'email',
            sortKey: 'email_flat',
            sorter: (a: any, b: any) => (a.email ?? '').localeCompare(b.email ?? '')
        },
        {
            title: 'Phone',
            dataIndex: 'nurse.phone_number',
            sortKey: 'phone_flat',
            sorter: (a: any, b: any) => (a?.nurse?.phone_number ?? '').localeCompare(b?.nurse?.phone_number ?? ''),
            render: (v: any, r: any) => r?.nurse?.phone_number ?? ''
        },
        {
            title: 'State',
            dataIndex: 'nurse.state_id',
            sorter: (a: any, b: any) => {
                const aSid = a?.nurse?.state_id ?? null;
                const bSid = b?.nurse?.state_id ?? null;
                const aSt = states.find(s => String(s.id) === String(aSid));
                const bSt = states.find(s => String(s.id) === String(bSid));
                return (aSt?.name ?? a?.nurse?.state_name ?? '').localeCompare(bSt?.name ?? b?.nurse?.state_name ?? '');
            },
            render: (v: any, r: any) => { const sid = r?.nurse?.state_id ?? null; const st = states.find(s => String(s.id) === String(sid)); return st ? st.name : (r?.nurse?.state_name ?? ''); }
        },
        {
            title: 'City',
            dataIndex: 'nurse.city_id',
            sorter: (a: any, b: any) => {
                const aCid = a?.nurse?.city_id ?? null;
                const bCid = b?.nurse?.city_id ?? null;
                const aCt = cities.find(c => String(c.id) === String(aCid));
                const bCt = cities.find(c => String(c.id) === String(bCid));
                return (aCt?.name ?? a?.nurse?.city_name ?? '').localeCompare(bCt?.name ?? b?.nurse?.city_name ?? '');
            },
            render: (v: any, r: any) => { const cid = r?.nurse?.city_id ?? null; const ct = cities.find(c => String(c.id) === String(cid)); return ct ? ct.name : (r?.nurse?.city_name ?? ''); }
        },
        {
            title: 'Zip',
            dataIndex: 'nurse.zip',
            sortKey: 'zip_flat',
            sorter: (a: any, b: any) => (a?.nurse?.zip ?? '').localeCompare(b?.nurse?.zip ?? ''),
            render: (v: any, r: any) => r?.nurse?.zip ?? ''
        },
        {
            title: 'Address',
            dataIndex: 'nurse.address',
            sortKey: 'address_flat',
            sorter: (a: any, b: any) => (a?.nurse?.address ?? '').localeCompare(b?.nurse?.address ?? ''),
            render: (v: any, r: any) => r?.nurse?.address ?? ''
        },
        {
            title: 'Role',
            dataIndex: 'user_metadata.role',
            sorter: (a: any, b: any) => {
                const aRoleId = a?.nurse?.role_id ?? a?.profile?.role_id ?? a?.user_metadata?.role_id ?? a?.role_id;
                const bRoleId = b?.nurse?.role_id ?? b?.profile?.role_id ?? b?.user_metadata?.role_id ?? b?.role_id;
                const aRole = (aRoleId && rolesMap[String(aRoleId)]) ? rolesMap[String(aRoleId)] : (a.profile?.user_type ?? a?.user_metadata?.role ?? 'User');
                const bRole = (bRoleId && rolesMap[String(bRoleId)]) ? rolesMap[String(bRoleId)] : (b.profile?.user_type ?? b?.user_metadata?.role ?? 'User');
                return aRole.localeCompare(bRole);
            },
            render: (val: any, record: any) => {
                const roleId = record?.nurse?.role_id ?? record?.profile?.role_id ?? record?.user_metadata?.role_id ?? record?.role_id;
                if (roleId && rolesMap[String(roleId)]) return rolesMap[String(roleId)];
                return record.profile?.user_type ?? val ?? 'User';
            }
        },
        {
            title: 'Reset Password', render: (v: any, r: any) => {
                const userId = r?.id ?? r?.user?.id ?? r?.user?.user?.id;
                return (
                    <div>
                        <a href="#" className="text-primary" onClick={(e) => { e.preventDefault(); handleResetOpen(r); }} title="Reset Password"><i className="ti ti-key" /></a>
                    </div>
                );
            }
        },
        {
            title: 'Date Created',
            dataIndex: 'created_at',
            sortKey: 'created_at_flat',
            sorter: (a: any, b: any) => {
                const aDate = a?.nurse?.created_at ?? a?.created_at ?? a?.user?.created_at ?? '';
                const bDate = b?.nurse?.created_at ?? b?.created_at ?? b?.user?.created_at ?? '';
                return aDate.localeCompare(bDate);
            },
            render: (v: any, r: any) => formatDateTime(r?.created_at_flat ?? r?.nurse?.created_at ?? r?.created_at ?? r?.user?.created_at)
        },
        {
            title: 'Last Updated',
            dataIndex: 'updated_at',
            sortKey: 'updated_at_flat',
            sorter: (a: any, b: any) => {
                const aDate = a?.nurse?.updated_at ?? a?.updated_at ?? a?.user?.updated_at ?? '';
                const bDate = b?.nurse?.updated_at ?? b?.updated_at ?? b?.user?.updated_at ?? '';
                return aDate.localeCompare(bDate);
            },
            render: (v: any, r: any) => formatDateTime(r?.updated_at_flat ?? r?.nurse?.updated_at ?? r?.updated_at ?? r?.user?.updated_at)
        }
    ];

    // Flatten fields for filtering
    const processedData = useMemo(() => {
        return (data || []).map((record: any) => {
            const roleId = record?.nurse?.role_id ?? record?.profile?.role_id ?? record?.user_metadata?.role_id ?? record?.role_id ?? null;
            return {
                ...record,
                name_flat: record?.user_metadata?.name ?? record?.email ?? '',
                email_flat: record?.email ?? '',
                phone_flat: record?.nurse?.phone_number ?? '',
                role_id_flat: roleId,
                address_flat: record?.nurse?.address ?? '',
                zip_flat: record?.nurse?.zip ?? '',
                state_id_flat: record?.nurse?.state_id ?? null,
                city_id_flat: record?.nurse?.city_id ?? null,
                is_active_flat: !!(record?.nurse?.is_active),
                created_at_flat: record?.nurse?.created_at ?? record?.created_at ?? record?.user?.created_at ?? '',
                updated_at_flat: record?.nurse?.updated_at ?? record?.updated_at ?? record?.user?.updated_at ?? ''
            };
        });
    }, [data]);

    // Apply filters when Go is clicked
    const filteredData = useMemo(() => {
        const f = appliedFilters;
        let rows = processedData;
        if (f.roleId) { rows = rows.filter((r: any) => String(r?.role_id_flat ?? '') === String(f.roleId)); }
        if (f.address.trim()) { const q = f.address.trim().toLowerCase(); rows = rows.filter((r: any) => (r?.address_flat || '').toLowerCase().includes(q)); }
        if (f.zip.trim()) { const q = f.zip.trim().toLowerCase(); rows = rows.filter((r: any) => (r?.zip_flat || '').toString().toLowerCase().includes(q)); }
        if (f.stateId) rows = rows.filter((r: any) => String(r?.state_id_flat ?? '') === String(f.stateId));
        if (f.cityId) rows = rows.filter((r: any) => String(r?.city_id_flat ?? '') === String(f.cityId));
        if (f.status) rows = rows.filter((r: any) => f.status === 'active' ? !!r?.is_active_flat : !r?.is_active_flat);
        return rows;
    }, [processedData, appliedFilters]);

    // Sorting
    const handleSort = (key: string) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedData = useMemo(() => {
        const sorted = [...filteredData];
        const { key, direction } = sortConfig;
        sorted.sort((a: any, b: any) => {
            const aVal = a[key] ?? '';
            const bVal = b[key] ?? '';
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filteredData, sortConfig]);

    // Pagination
    const totalItems = sortedData.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const pagedData = useMemo(() => sortedData.slice(startIndex, endIndex), [sortedData, startIndex, endIndex]);

    // Reset currentPage when filters or sort changes
    useEffect(() => {
        setCurrentPage(1);
    }, [appliedFilters, sortConfig]);

    useEffect(() => {
        // Clamp page if filters reduce total pages
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [totalPages, currentPage]);

    // Horizontal scroll detection
    const updateScrollButtons = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        updateScrollButtons();
        el.addEventListener('scroll', updateScrollButtons);
        const resizeObserver = new ResizeObserver(updateScrollButtons);
        resizeObserver.observe(el);
        return () => {
            el.removeEventListener('scroll', updateScrollButtons);
            resizeObserver.disconnect();
        };
    }, []);

    const scrollByAmount = (dir: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const amount = 300;
        scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
    };


    // Grid Columns: user-specific visibility
    const [visibleColIds, setVisibleColIds] = useState<Set<string> | null>(null);
    const [isSavingCols, setIsSavingCols] = useState(false);

    const getColId = (col: any) => {
        if (col?.key !== undefined && col?.key !== null) return String(col.key);
        if (col?.dataIndex !== undefined && col?.dataIndex !== null) return String(col.dataIndex);
        if (col?.title) return String(col.title).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\.]/gi, '');
        return Math.random().toString(36).slice(2, 9);
    };

    const allColIds = useMemo(() => columns.map(getColId), [columns]);
    const columnsFiltered = useMemo(() => {
        if (!visibleColIds || visibleColIds.size === 0) return columns;
        return columns.filter(c => visibleColIds.has(getColId(c)));
    }, [columns, visibleColIds]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const sb = (await import('@/lib/supabaseClient')).default();
                const { data: userData } = await sb.auth.getUser();
                const uid = userData?.user?.id ?? null;
                if (mounted) setCurrentUserId(uid);
                if (!uid) {
                    const ls = localStorage.getItem(`grid_columns_${SCREEN_KEY}`);
                    if (ls) { try { const arr = JSON.parse(ls); if (Array.isArray(arr)) setVisibleColIds(new Set(arr)); else setVisibleColIds(new Set(allColIds)); } catch { setVisibleColIds(new Set(allColIds)); } }
                    else setVisibleColIds(new Set(allColIds));
                    return;
                }
                const { data, error } = await sb.from('grid_columns_prefs').select('visible_columns').eq('user_id', uid).eq('screen', SCREEN_KEY).maybeSingle();
                if (error) throw error;
                const vis = Array.isArray(data?.visible_columns) && data?.visible_columns?.length ? new Set<string>(data!.visible_columns as any) : new Set(allColIds);
                if (mounted) setVisibleColIds(vis);
            } catch (e) {
                try {
                    const ls = localStorage.getItem(`grid_columns_${SCREEN_KEY}`);
                    if (ls) { const arr = JSON.parse(ls); setVisibleColIds(new Set(arr)); } else setVisibleColIds(new Set(allColIds));
                } catch { setVisibleColIds(new Set(allColIds)); }
            }
        })();
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [SCREEN_KEY, allColIds.join('|')]);

    const handleSaveGridColumns = async () => {
        try {
            setIsSavingCols(true);
            const ids = Array.from(visibleColIds ?? new Set(allColIds));
            try { localStorage.setItem(`grid_columns_${SCREEN_KEY}`, JSON.stringify(ids)); } catch { }
            try {
                const sb = (await import('@/lib/supabaseClient')).default();
                if (currentUserId) {
                    const { error } = await sb.from('grid_columns_prefs').upsert({ user_id: currentUserId, screen: SCREEN_KEY, visible_columns: ids }, { onConflict: 'user_id,screen' });
                    if (error) throw error;
                }
            } catch { }
            showToast('Grid columns saved', 'success');
            try { await hideModalById('grid_columns_nurses'); } catch (_) { }
        } catch (e: any) {
            showToast(e?.message || 'Failed to save grid columns', 'danger');
        } finally { setIsSavingCols(false); }
    };

    const resetGridColumns = () => setVisibleColIds(new Set(allColIds));

    const handleResetOpen = (record: any) => {
        const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id ?? null;
        setResetUserId(userId);
        setResetPassword('');
        setResetConfirm('');
        try {
            const modalEl = document.getElementById('reset_password');
            // @ts-ignore
            const bs = (window as any).bootstrap;
            if (modalEl && bs && bs.Modal) {
                // @ts-ignore
                const inst = bs.Modal.getOrCreateInstance(modalEl) ?? new bs.Modal(modalEl);
                inst.show();
                return;
            }
            if (modalEl) {
                modalEl.classList.add('show');
                (modalEl as any).style.display = 'block';
                document.body.classList.add('modal-open');
                if (!document.querySelector('.modal-backdrop')) {
                    const backdrop = document.createElement('div');
                    backdrop.className = 'modal-backdrop fade show';
                    document.body.appendChild(backdrop);
                }
            }
        } catch (e) { console.debug('[nurses] handleResetOpen error', e); }
    };

    const handleResetSubmit = async (e: any) => {
        e.preventDefault();
        const userId = resetUserId;
        if (!userId) return showToast('Nurse id missing', 'danger');
        if (!resetPassword || resetPassword.length < 8) return showToast('Password must be at least 8 characters', 'danger');
        if (resetPassword !== resetConfirm) return showToast('Passwords do not match', 'danger');
        try {
            setIsResetting(true);
            setLoadingIds(prev => ({ ...prev, [userId]: true }));
            const headers: any = { 'Content-Type': 'application/json' };
            const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET)
                ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET
                : undefined;
            if (adminSecret) headers['x-admin-secret'] = adminSecret;
            const res = await fetch('/api/nurses', { method: 'PATCH', headers, body: JSON.stringify({ action: 'reset_password', patientId: userId, password: resetPassword }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            try { await hideModalById('reset_password'); } catch (_) { }
            setResetUserId(null);
            setResetPassword('');
            setResetConfirm('');
            await fetchNurses();
            showToast('Password reset successfully', 'success');
        } catch (e: any) {
            showToast(e.message || 'Failed to reset password', 'danger');
        } finally {
            setIsResetting(false);
            if (userId) setLoadingIds(prev => { const c = { ...prev }; delete c[userId]; return c; });
        }
    };

    const isAddFormValid = useMemo(() => {
        const emailValid = !!email && email.includes('@');
        const nameValid = !!name && name.trim().length > 1;
        const roleValid = !!role && String(role).length > 0;
        const phoneValid = !!addPhone && addPhone.trim().length > 0;
        return emailValid && nameValid && roleValid && phoneValid;
    }, [email, name, role, addPhone]);

    const handleAddNurse = async (e: any) => {
        e.preventDefault();
        if (!isAddFormValid) {
            showToast('Please provide valid name, email, and role', 'danger');
            return;
        }
        try {
            setIsAdding(true);
            const headers: any = { 'Content-Type': 'application/json' };
            const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET)
                ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET
                : undefined;
            if (adminSecret) {
                headers['x-admin-secret'] = adminSecret;
            }
            const res = await fetch('/api/nurses', {
                method: 'POST',
                headers,
                body: JSON.stringify({ email, name, role: rolesMap[role] || role, role_id: role || null, userType: 'Nurse', phone_number: addPhone || null, address: addAddress, zip: addZip, state_id: addStateId, city_id: addCityId })
            });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            try {
                await hideModalById('add_user');
            } catch (e) {
                console.debug('[nurses] hide add_user failed', e);
            }

            setEmail(''); setName(''); setRole(''); setAddPhone('');
            setAddAddress(''); setAddZip(''); setAddStateId(null); setAddCityId(null);
            await fetchNurses();
            showToast('Nurse created. A confirmation email (magic link) was requested.', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to add nurse', 'danger');
        } finally {
            setIsAdding(false);
        }
    };

    const handleToggleActive = async (record: any) => {
        const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id;
        const current = record?.nurse?.is_active ?? true;
        if (!userId) return alert('Nurse id missing');
        const ok = confirm(`Are you sure you want to ${current ? 'deactivate' : 'activate'} this nurse?`);
        if (!ok) return;
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET)
                ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET
                : undefined;
            if (adminSecret) headers['x-admin-secret'] = adminSecret;
            setLoadingIds(prev => ({ ...prev, [userId]: true }));
            const res = await fetch('/api/nurses', { method: 'PATCH', headers, body: JSON.stringify({ action: 'toggle_active', patientId: userId, isActive: !current }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            await fetchNurses();
            setLoadingIds(prev => { const c = { ...prev }; delete c[userId]; return c; });
        } catch (e: any) {
            setLoadingIds(prev => { const c = { ...prev }; if (userId) delete c[userId]; return c; });
            alert(e.message || 'Failed to update active state');
        }
    };

    const handleSoftDelete = async (record: any) => {
        const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id;
        if (!userId) return alert('Nurse id missing');
        const ok = confirm('Are you sure you want to delete this nurse? This is a soft delete.');
        if (!ok) return;
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET)
                ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET
                : undefined;
            if (adminSecret) headers['x-admin-secret'] = adminSecret;
            setLoadingIds(prev => ({ ...prev, [userId]: true }));
            const res = await fetch('/api/nurses', { method: 'PATCH', headers, body: JSON.stringify({ action: 'soft_delete', patientId: userId }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            await fetchNurses();
            setLoadingIds(prev => { const c = { ...prev }; delete c[userId]; return c; });
        } catch (e: any) {
            setLoadingIds(prev => { const c = { ...prev }; if (userId) delete c[userId]; return c; });
            alert(e.message || 'Failed to delete nurse');
        }
    };

    const handleEditOpen = (record: any) => {
        const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id ?? record?.id;
        setEditingUser({ id: userId, record });
        setEditEmail(record?.email ?? '');
        setEditName(record?.user_metadata?.name ?? '');
        // prefer stored role_id for select, fallback to legacy role string
        const detectedRoleId = record?.nurse?.role_id ?? record?.profile?.role_id ?? record?.user_metadata?.role_id ?? record?.role_id ?? null;
        setEditRole(detectedRoleId ? String(detectedRoleId) : (record?.user_metadata?.role ?? ''));
        setEditAddress(record?.nurse?.address ?? '');
        setEditZip(record?.nurse?.zip ?? '');
        setEditStateId(record?.nurse?.state_id ?? null);
        setEditCityId(record?.nurse?.city_id ?? null);
        setEditPhone(record?.nurse?.phone_number ?? '');
        try {
            console.debug('[nurses] handleEditOpen', { userId, record });
            const modalEl = document.getElementById('edit_user');
            // @ts-ignore
            const bs = (window as any).bootstrap;

            try {
                const openMenus = Array.from(document.querySelectorAll('.dropdown-menu.show')) as HTMLElement[];
                openMenus.forEach(menu => {
                    const toggle = menu.parentElement?.querySelector('[data-bs-toggle="dropdown"]') as HTMLElement | null;
                    if (bs && bs.Dropdown && toggle) {
                        try {
                            // @ts-ignore
                            const dropInst = bs.Dropdown.getInstance(toggle) ?? new bs.Dropdown(toggle);
                            dropInst.hide?.();
                        } catch (ddErr) {
                            menu.classList.remove('show');
                            toggle.classList.remove('show');
                        }
                    } else {
                        menu.classList.remove('show');
                        const toggle = menu.parentElement?.querySelector('[data-bs-toggle="dropdown"]');
                        toggle?.classList?.remove('show');
                    }
                });
            } catch (err) {
                console.debug('[nurses] hide dropdowns failed', err);
            }

            if (modalEl) {
                try {
                    if (bs && bs.Modal) {
                        // @ts-ignore
                        const inst = bs.Modal.getOrCreateInstance(modalEl) ?? new bs.Modal(modalEl);
                        inst.show();
                        console.debug('[nurses] shown modal via bootstrap.Modal');
                        return;
                    }
                } catch (innerErr) {
                    console.debug('[nurses] bootstrap.Modal show failed', innerErr);
                }

                try {
                    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                    modalEl.classList.add('show');
                    (modalEl as any).style.display = 'block';
                    document.body.classList.add('modal-open');
                    if (!document.querySelector('.modal-backdrop')) {
                        const backdrop = document.createElement('div');
                        backdrop.className = 'modal-backdrop fade show';
                        document.body.appendChild(backdrop);
                    }
                    console.debug('[nurses] shown modal via DOM fallback');
                    return;
                } catch (domErr) {
                    console.error('[nurses] DOM fallback to show modal failed', domErr);
                }
            } else {
                console.error('[nurses] edit_user modal element not found');
            }
        } catch (e) {
            console.error('[nurses] handleEditOpen error', e);
        }
    };

    const isEditFormValid = useMemo(() => {
        const emailValid = !!editEmail && editEmail.includes('@');
        const nameValid = !!editName && editName.trim().length > 1;
        const roleValid = !!editRole && String(editRole).length > 0;
        const phoneValid = !!editPhone && editPhone.trim().length > 0;
        return emailValid && nameValid && roleValid && phoneValid;
    }, [editEmail, editName, editRole, editPhone]);

    const handleEditSubmit = async (e: any) => {
        e.preventDefault();
        if (!editingUser?.id) return alert('No editing nurse');
        const userId = editingUser.id;
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET)
                ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET
                : undefined;
            if (adminSecret) headers['x-admin-secret'] = adminSecret;
            setIsSavingEdit(true);
            setLoadingIds(prev => ({ ...prev, [userId]: true }));
            const res = await fetch('/api/nurses', { method: 'PATCH', headers, body: JSON.stringify({ action: 'edit', patientId: userId, email: editEmail, name: editName, role: rolesMap[editRole] || editRole, role_id: editRole || null, phone_number: editPhone || null, address: editAddress, zip: editZip, state_id: editStateId, city_id: editCityId }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            try {
                await hideModalById('edit_user');
            } catch (ee) { console.debug('[nurses] hide edit_user failed', ee); }
            setEditingUser(null);
            await fetchNurses();
            setLoadingIds(prev => { const c = { ...prev }; delete c[userId]; return c; });
            showToast('Nurse updated Success', 'success');
        } catch (e: any) {
            setLoadingIds(prev => { const c = { ...prev }; if (userId) delete c[userId]; return c; });
            showToast(e.message || 'Failed to update nurse', 'danger');
        } finally {
            setIsSavingEdit(false);
        }
    };

    return (
        <>
            <div className="page-wrapper">
                <div className="content">
                    <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 mb-3 pb-3 border-bottom">
                        <div className="flex-grow-1"><h4 className="fw-bold mb-0">Nurses <span className="badge badge-soft-primary fw-medium border py-1 px-2 border-primary fs-13 ms-1">
                            Total Nurses : {data.length}
                        </span></h4></div>
                    </div>

                    {/* SEARCH BAR + TOOLBAR IN ONE LINE */}
                    <div className="d-flex align-items-center justify-content-between flex-wrap mb-3">
                        {/* SEARCH INPUT ON THE LEFT */}
                        <div className="d-flex align-items-center flex-wrap">
                            <div className="table-search d-flex align-items-center mb-0">
                                <div className="search-input">
                                    <SearchInput value={searchText} onChange={handleSearch} />
                                </div>
                            </div>
                        </div>

                        {/* TOOLBAR BUTTONS TO THE RIGHT */}
                        <div className="patients-toolbar d-flex align-items-center flex-wrap gap-2">
                            {(
                                <div className="saved-search-dropdown dropdown">
                                    <button
                                        className="btn btn-darkish dropdown-toggle"
                                        type="button"
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                    >
                                        <i className="ti ti-bookmark me-1" />
                                        {selectedSavedSearch
                                            ? savedSearches.find(s => s.id === selectedSavedSearch)?.name || 'Saved Searches'
                                            : 'Saved Searches'}
                                    </button>
                                    <ul className="dropdown-menu" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        <li>
                                            <button
                                                className="dropdown-item text-muted"
                                                type="button"
                                                onClick={() => {
                                                    setSelectedSavedSearch('');
                                                    setFiltersDraft({ roleId: '', address: '', zip: '', stateId: '', cityId: '', status: '' });
                                                    setAppliedFilters({ roleId: '', address: '', zip: '', stateId: '', cityId: '', status: '' });
                                                }}
                                            >
                                                <i className="ti ti-x me-2" />
                                                Clear Selection
                                            </button>
                                        </li>
                                        <li><hr className="dropdown-divider" /></li>
                                        {savedSearches.map(search => (
                                            <li key={search.id}>
                                                <div
                                                    className="d-flex align-items-center justify-content-between px-3 py-2 saved-search-item"
                                                    style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <button
                                                        className="btn btn-link text-start text-decoration-none flex-grow-1 p-0"
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleApplySavedSearch(search.id);
                                                            const dropdown = e.currentTarget.closest('.dropdown');
                                                            if (dropdown) {
                                                                const btn = dropdown.querySelector('[data-bs-toggle="dropdown"]') as HTMLElement;
                                                                if (btn) btn.click();
                                                            }
                                                        }}
                                                        style={{
                                                            border: 'none',
                                                            background: 'none',
                                                            color: selectedSavedSearch === search.id ? '#0d6efd' : '#212529',
                                                            fontWeight: selectedSavedSearch === search.id ? '600' : '400'
                                                        }}
                                                    >
                                                        <i className={`ti ti-${selectedSavedSearch === search.id ? 'check' : 'bookmark'} me-2`} />
                                                        {search.name}
                                                    </button>
                                                    <button
                                                        className="btn btn-link text-danger p-0 ms-2"
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteSavedSearch(search.id);
                                                        }}
                                                        title="Delete this saved search"
                                                        style={{ border: 'none', background: 'none', fontSize: '16px' }}
                                                    >
                                                        <i className="ti ti-trash" />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                className="btn btn-darkish btn-sm"
                                onClick={() => setShowFilters(s => !s)}
                                title="Toggle filters"
                            >
                                <i className="ti ti-filter me-1" /> Filters
                            </button>

                            <button onClick={downloadTemplate} className="btn btn-light btn-sm" title="Download Template">
                                <i className="ti ti-download" />
                            </button>

                            <button onClick={downloadCSV} className="btn btn-darkish btn-sm" title="Download CSV">
                                <i className="ti ti-file-download" />
                            </button>

                            <label
                                className={`btn btn-darkish btn-sm ${isUploading ? 'disabled' : ''}`}
                                title="Upload CSV"
                                style={{ margin: 0 }}
                            >
                                {isUploading ? (
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                ) : (
                                    <i className="ti ti-upload" />
                                )}
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleCSVUpload}
                                    disabled={isUploading}
                                    style={{ display: 'none' }}
                                />
                            </label>

                            <button
                                className="btn btn-light btn-sm"
                                onClick={() => { try { const el = document.getElementById('grid_columns_nurses'); const bs = (window as any).bootstrap; if (el && bs?.Modal) { bs.Modal.getOrCreateInstance(el).show(); } else if (el) { el.classList.add('show'); (el as any).style.display = 'block'; document.body.classList.add('modal-open'); if (!document.querySelector('.modal-backdrop')) { const backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop fade show'; document.body.appendChild(backdrop); } } } catch { } }}
                                title="Grid Columns"
                            >
                                <i className="ti ti-columns-3" />
                            </button>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={(e) => { e.preventDefault(); try { const el = document.getElementById('add_user'); const bs = (window as any).bootstrap; if (el && bs?.Modal) { bs.Modal.getOrCreateInstance(el).show(); } else if (el) { el.classList.add('show'); (el as any).style.display = 'block'; document.body.classList.add('modal-open'); if (!document.querySelector('.modal-backdrop')) { const backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop fade show'; document.body.appendChild(backdrop); } } } catch { } }}
                            >
                                <i className="ti ti-plus me-1" /> <span>New Nurse</span>
                            </button>
                        </div>
                    </div>
                    {showFilters && (
                        <div ref={filtersPanelRef} className="filter-panel border rounded p-3 mb-3">
                            <div className="row g-3">
                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">Role</label>
                                    <select className="form-select" value={filtersDraft.roleId} onChange={e => setFiltersDraft(p => ({ ...p, roleId: e.target.value }))}>
                                        <option value="">All Roles</option>
                                        {roleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">Address</label>
                                    <input className="form-control" value={filtersDraft.address} onChange={e => setFiltersDraft(p => ({ ...p, address: e.target.value }))} placeholder="Street, area" />
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">Zip</label>
                                    <input className="form-control" value={filtersDraft.zip} onChange={e => setFiltersDraft(p => ({ ...p, zip: e.target.value }))} placeholder="e.g. 12345" />
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">State</label>
                                    <SearchSelect
                                        options={[{ value: '', label: 'All States' }, ...stateOptions]}
                                        value={filtersDraft.stateId}
                                        onChange={(val) => setFiltersDraft(p => ({ ...p, stateId: String(val || ''), cityId: '' }))}
                                        placeholder="Search state..."
                                    />
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">City</label>
                                    <SearchSelect
                                        options={[{ value: '', label: 'All Cities' }, ...cityOptionsFilter]}
                                        value={filtersDraft.cityId}
                                        onChange={(val) => setFiltersDraft(p => ({ ...p, cityId: String(val || '') }))}
                                        placeholder="Search city..."
                                    />
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" value={filtersDraft.status} onChange={e => setFiltersDraft(p => ({ ...p, status: e.target.value as Filters['status'] }))}>
                                        <option value="">All</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="d-flex justify-content-end mt-3">
                                <button type="button" className="btn btn-white border me-2" onClick={() => { setFiltersDraft({ roleId: '', address: '', zip: '', stateId: '', cityId: '', status: '' }); setAppliedFilters({ roleId: '', address: '', zip: '', stateId: '', cityId: '', status: '' }); setSelectedSavedSearch(''); }}>Clear</button>
                                <button type="button" className="btn btn-success me-2" onClick={() => { setShowSaveSearchModal(true); }} disabled={!filtersDraft.roleId && !filtersDraft.address && !filtersDraft.zip && !filtersDraft.stateId && !filtersDraft.cityId && !filtersDraft.status}>
                                    <i className="ti ti-device-floppy me-1" /> Save
                                </button>
                                <button type="button" className="btn btn-primary me-2" onClick={() => setAppliedFilters(filtersDraft)}>Go</button>
                                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowFilters(false)} title="Close filters">
                                    <i className="ti ti-chevron-up" />
                                </button>
                            </div>
                        </div>
                    )}
                    {/* CUSTOM HTML TABLE WITH SCROLL WRAPPER (dynamic columns) */}
                    <div className="nurses-table-container">
                        <div ref={scrollRef} className="table-responsive nurses-scroll">
                            <table className="table table-striped table-hover align-middle patients-table">
                                <thead className="table-dark">
                                    <tr>
                                        {columnsFiltered.map((col: any, i: number) => {
                                            const sortKey = (col as any).sortKey as string | undefined;
                                            const isSorted = sortKey && sortConfig.key === sortKey;
                                            const clickable = !!sortKey;
                                            return (
                                                <th key={`h-${i}`} onClick={clickable ? () => handleSort(sortKey!) : undefined} style={{ whiteSpace: 'nowrap', cursor: clickable ? 'pointer' as const : 'default' }}>
                                                    {col.title}{' '}
                                                    {clickable ? (
                                                        isSorted ? (sortConfig.direction === 'asc' ? <i className="ti ti-arrow-up" /> : <i className="ti ti-arrow-down" />) : <i className="ti ti-arrows-sort opacity-50" />
                                                    ) : null}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedData.length === 0 ? (
                                        <tr>
                                            <td colSpan={columnsFiltered.length} className="text-center py-4 text-muted">No nurses found</td>
                                        </tr>
                                    ) : (
                                        pagedData.map((r: any, idx: number) => (
                                            <tr key={r.id || idx}>
                                                {columnsFiltered.map((col: any, ci: number) => {
                                                    const getVal = (obj: any, path?: string) => {
                                                        if (!path) return undefined;
                                                        return path.split('.').reduce((o: any, k: string) => (o ? o[k] : undefined), obj);
                                                    };
                                                    const content = col.render ? col.render(getVal(r, col.dataIndex), r, idx) : (col.dataIndex ? (getVal(r, col.dataIndex) ?? '—') : '—');
                                                    return <td key={`c-${idx}-${ci}`}>{content}</td>;
                                                })}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination (left) */}
                    <div className="d-flex align-items-center gap-3 mt-2">
                        <div className="d-flex align-items-center gap-3">
                            <div className="d-flex align-items-center gap-2">
                                <span className="text-muted">Items per page:</span>
                                <select
                                    className="form-select form-select-sm"
                                    style={{ width: 80 }}
                                    value={pageSize}
                                    onChange={(e) => setPageSize(parseInt(e.target.value, 10) || 10)}
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                            <div className="text-muted">
                                {totalItems === 0 ? '0 – 0 of 0' : `${startIndex + 1} – ${endIndex} of ${totalItems}`}
                            </div>
                            <div className="pager-icons d-flex align-items-center gap-1">
                                <button className="icon-btn" disabled={safePage <= 1} onClick={() => setCurrentPage(1)} aria-label="First" title="First">
                                    <i className="ti ti-chevrons-left" />
                                </button>
                                <button className="icon-btn" disabled={safePage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} aria-label="Previous" title="Previous">
                                    <i className="ti ti-chevron-left" />
                                </button>
                                <button className="icon-btn" disabled={safePage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} aria-label="Next" title="Next">
                                    <i className="ti ti-chevron-right" />
                                </button>
                                <button className="icon-btn" disabled={safePage >= totalPages} onClick={() => setCurrentPage(totalPages)} aria-label="Last" title="Last">
                                    <i className="ti ti-chevrons-right" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Fixed bottom-right horizontal scroll floaters (double arrows) */}
                    {(canScrollLeft || canScrollRight) && (
                        <div className="hscroll-floaters">
                            {canScrollLeft && (
                                <button
                                    type="button"
                                    className="hscroll-btn"
                                    aria-label="Scroll left"
                                    onClick={() => scrollByAmount('left')}
                                >
                                    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" style={{ transform: 'scaleX(-1)' }}>
                                        <path d="M2 12L12 6v12L2 12zM12 12l10-6v12l-10-6z" fill="currentColor"></path>
                                    </svg>
                                </button>
                            )}
                            {canScrollRight && (
                                <button
                                    type="button"
                                    className="hscroll-btn"
                                    aria-label="Scroll right"
                                    onClick={() => scrollByAmount('right')}
                                >
                                    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
                                        <path d="M2 12L12 6v12L2 12zM12 12l10-6v12l-10-6z" fill="currentColor"></path>
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>


            {/* Grid Columns Modal */}
            <div id="grid_columns_nurses" className="modal fade" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content grid-columns-modal">
                        <div className="modal-header">
                            <h5 className="modal-title">Manage Grid Columns</h5>
                        </div>
                        <div className="modal-body">
                            {!visibleColIds ? (
                                <div className="d-flex align-items-center"><span className="spinner-border spinner-border-sm me-2" /> Loading…</div>
                            ) : (
                                <div className="row g-2">
                                    {columns.map((col, idx) => {
                                        const id = getColId(col);
                                        const title = String(col?.title ?? id);
                                        const checked = visibleColIds.has(id);
                                        return (
                                            <div className="col-6" key={`${id}-${idx}`}>
                                                <div className="form-check">
                                                    <input className="form-check-input" type="checkbox" id={`gc_${id}`} checked={checked} onChange={(e) => {
                                                        const next = new Set(visibleColIds);
                                                        if (e.target.checked) next.add(id); else next.delete(id);
                                                        setVisibleColIds(next);
                                                    }} />
                                                    <label className="form-check-label" htmlFor={`gc_${id}`}>{title}</label>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-white border" onClick={() => hideModalById('grid_columns_nurses')}>Cancel</button>
                            <button type="button" className="btn btn-primary" onClick={handleSaveGridColumns} disabled={isSavingCols}>
                                {isSavingCols ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="reset_password" className="modal fade">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content tw-form">
                        <div className="modal-header">
                            <h4 className="text-dark modal-title fw-bold">Reset Password</h4>
                            <button type="button" className="btn-close btn-close-modal custom-btn-close" data-bs-dismiss="modal" aria-label="Close"><i className="ti ti-x" /></button>
                        </div>
                        <form onSubmit={handleResetSubmit}>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">New Password</label>
                                    <div className="input-group">
                                        <input type={resetShowPassword ? 'text' : 'password'} className="form-control" value={resetPassword} onChange={e => setResetPassword(e.target.value)} />
                                        <button type="button" className="btn btn-light border" onClick={() => setResetShowPassword(s => !s)} aria-label="Toggle password visibility">
                                            <i className={resetShowPassword ? 'ti ti-eye-off' : 'ti ti-eye'} />
                                        </button>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Confirm Password</label>
                                    <div className="input-group">
                                        <input type={resetShowConfirm ? 'text' : 'password'} className="form-control" value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} />
                                        <button type="button" className="btn btn-light border" onClick={() => setResetShowConfirm(s => !s)} aria-label="Toggle confirm password visibility">
                                            <i className={resetShowConfirm ? 'ti ti-eye-off' : 'ti ti-eye'} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer d-flex align-items-center gap-1">
                                <button type="button" className="btn btn-white border" data-bs-dismiss="modal" onClick={() => { try { hideModalById('reset_password'); } catch (_) { } }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={!resetPassword || resetPassword.length < 8 || resetPassword !== resetConfirm || isResetting}>
                                    {isResetting ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> : null}
                                    Set Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>


            <div id="edit_user" className="modal fade">
                <div className="modal-dialog modal-md modal-dialog-centered">
                    <div className="modal-content patient-form-modal">
                        <div className="modal-header justify-content-center py-3 border-0 bg-teal-700 text-white rounded-top">
                            <h5 className="modal-title fw-semibold text-center mb-0">Edit Nurse</h5>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="modal-body px-4 pt-3 pb-1">
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">Name <span className="text-danger">*</span></label>
                                    <input type="text" className="form-control required-field" placeholder="Enter full name" value={editName} onChange={e => setEditName(e.target.value)} />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">Email <span className="text-danger">*</span></label>
                                    <input type="email" className="form-control required-field" placeholder="Enter email address" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">Phone Number <span className="text-danger">*</span></label>
                                    <input type="text" className="form-control required-field" placeholder="e.g. +1234567890" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">Role <span className="text-danger">*</span></label>
                                    <select className="form-control required-field" value={editRole} onChange={e => setEditRole(e.target.value)}>
                                        <option value="">Select role</option>
                                        {roleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">State <span className="text-danger">*</span></label>
                                    <SearchSelect
                                        options={stateOptions}
                                        value={editStateId ? String(editStateId) : ''}
                                        onChange={(val) => { setEditStateId(val ? Number(val) : null); setEditCityId(null); }}
                                        placeholder="Search state..."
                                        inputClassName="required-field"
                                    />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">City <span className="text-danger">*</span></label>
                                    <SearchSelect
                                        options={cityOptionsEdit}
                                        value={editCityId ? String(editCityId) : ''}
                                        onChange={(val) => setEditCityId(val ? Number(val) : null)}
                                        placeholder="Search city..."
                                        inputClassName="required-field"
                                    />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">Address <span className="text-danger">*</span></label>
                                    <textarea className="form-control required-field" placeholder="Street, area" value={editAddress} onChange={e => setEditAddress(e.target.value)} />
                                </div>
                                <div className="form-row mb-0">
                                    <label className="form-label text-dark fw-semibold">Zip <span className="text-danger">*</span></label>
                                    <input className="form-control required-field" placeholder="e.g. 12345" value={editZip} onChange={e => setEditZip(e.target.value)} />
                                </div>
                            </div>
                            <div className="modal-footer border-top py-2 px-2.5 d-flex justify-content-end gap-2">
                                <button type="button" className="btn btn-outline-danger px-3" data-bs-dismiss="modal" onClick={() => hideModalById('edit_user')}>
                                    <i className="ti ti-x me-1"></i> Cancel
                                </button>
                                <button type="submit" className="btn btn-success px-4" disabled={!isEditFormValid || isSavingEdit}>
                                    {isSavingEdit ? (
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    ) : (
                                        <>
                                            <i className="ti ti-device-floppy me-1"></i> Save
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <div id="add_user" className="modal fade">
                <div className="modal-dialog modal-md modal-dialog-centered">
                    <div className="modal-content patient-form-modal">
                        <div className="modal-header justify-content-center py-3 border-0 bg-teal-700 text-white rounded-top">
                            <h5 className="modal-title fw-semibold text-center mb-0">Add New Nurse</h5>
                        </div>
                        <form onSubmit={handleAddNurse}>
                            <div className="modal-body px-4 pt-3 pb-1">
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">Name <span className="text-danger">*</span></label>
                                    <input type="text" className="form-control required-field" placeholder="Enter full name" value={name} onChange={e => setName(e.target.value)} />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">Email <span className="text-danger">*</span></label>
                                    <input type="email" className="form-control required-field" placeholder="Enter email address" value={email} onChange={e => setEmail(e.target.value)} />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">Phone Number <span className="text-danger">*</span></label>
                                    <input type="text" className="form-control required-field" placeholder="e.g. +1234567890" value={addPhone} onChange={e => setAddPhone(e.target.value)} />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">Role <span className="text-danger">*</span></label>
                                    <select className="form-control required-field" value={role} onChange={e => setRole(e.target.value)}>
                                        <option value="">Select role</option>
                                        {roleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">State <span className="text-danger">*</span></label>
                                    <SearchSelect
                                        options={stateOptions}
                                        value={addStateId ? String(addStateId) : ''}
                                        onChange={(val) => { setAddStateId(val ? Number(val) : null); setAddCityId(null); }}
                                        placeholder="Search state..."
                                        inputClassName="required-field"
                                    />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">City <span className="text-danger">*</span></label>
                                    <SearchSelect
                                        options={cityOptionsAdd}
                                        value={addCityId ? String(addCityId) : ''}
                                        onChange={(val) => setAddCityId(val ? Number(val) : null)}
                                        placeholder="Search city..."
                                        inputClassName="required-field"
                                    />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">Address <span className="text-danger">*</span></label>
                                    <textarea className="form-control required-field" placeholder="Street, area" value={addAddress} onChange={e => setAddAddress(e.target.value)} />
                                </div>
                                <div className="form-row mb-0">
                                    <label className="form-label text-dark fw-semibold">Zip <span className="text-danger">*</span></label>
                                    <input className="form-control required-field" placeholder="e.g. 12345" value={addZip} onChange={e => setAddZip(e.target.value)} />
                                </div>
                            </div>
                            <div className="modal-footer border-top py-2 px-2.5 d-flex justify-content-end gap-2">
                                <button type="button" className="btn btn-outline-danger px-3" data-bs-dismiss="modal" onClick={() => hideModalById('add_user')}>
                                    <i className="ti ti-x me-1"></i> Cancel
                                </button>
                                <button type="submit" className="btn btn-success px-4" disabled={!isAddFormValid || isAdding}>
                                    {isAdding ? (
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    ) : (
                                        <>
                                            <i className="ti ti-device-floppy me-1"></i> Add New Nurse
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Save Search Modal */}
            <div id="save_search_modal" className={`modal fade ${showSaveSearchModal ? 'show' : ''}`} tabIndex={-1} aria-hidden={!showSaveSearchModal} style={{ display: showSaveSearchModal ? 'block' : 'none' }}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Save Search</h5>
                            <button type="button" className="btn-close" onClick={() => { setShowSaveSearchModal(false); setSaveSearchName(''); }}></button>
                        </div>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label">Search Name <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={saveSearchName}
                                    onChange={(e) => setSaveSearchName(e.target.value)}
                                    placeholder="Enter a name for this search"
                                    maxLength={50}
                                />
                            </div>

                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-white border" onClick={() => { setShowSaveSearchModal(false); setSaveSearchName(''); }}>Cancel</button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleSaveSearch}
                                disabled={!saveSearchName.trim() || isSavingSearch}
                            >
                                {isSavingSearch ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> : null}
                                Save Search
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {showSaveSearchModal && <div className="modal-backdrop fade show" onClick={() => { setShowSaveSearchModal(false); setSaveSearchName(''); }}></div>}
        </>
    );
}

export default NursesComponent;
