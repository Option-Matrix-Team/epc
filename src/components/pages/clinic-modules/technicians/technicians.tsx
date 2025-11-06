"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import getSupabaseClient from "@/lib/supabaseClient";
import SearchInput from "@/core/common/dataTable/dataTableSearch";
import { formatDateTime } from '@/core/common/dateTime';
import "@/style/css/admin-screens.css";

const TechniciansComponent = () => {
    // State declarations at the top (deduplicated)
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

    // Lightweight Searchable Select (parity with Patients UI)
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
                    {allowClear && (value !== null && value !== undefined && String(value) !== '') && (
                        <button type="button" className="btn btn-link text-muted ms-1 p-0 px-1" onClick={() => { onChange(null); setQuery(''); }} aria-label="Clear">
                            <i className="ti ti-x" />
                        </button>
                    )}
                </div>
                {open && (
                    <div className="dropdown-menu show w-100" style={{ maxHeight: 240, overflowY: 'auto' }}>
                        {filtered.length === 0 ? (
                            <span className="dropdown-item text-muted">No results</span>
                        ) : (
                            filtered.map(opt => (
                                <button
                                    key={String(opt.value)}
                                    type="button"
                                    className={`dropdown-item ${String(opt.value) === String(value) ? 'active' : ''}`}
                                    onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}
                                >
                                    {opt.label}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Filters UI state (match Patients)
    type Filters = {
        address: string;
        zip: string;
        stateId: string;
        cityId: string;
        status: '' | 'active' | 'inactive';
    };
    const [showFilters, setShowFilters] = useState(false);
    const [filtersDraft, setFiltersDraft] = useState<Filters>({ address: '', zip: '', stateId: '', cityId: '', status: '' });
    const [appliedFilters, setAppliedFilters] = useState<Filters>({ address: '', zip: '', stateId: '', cityId: '', status: '' });
    const filtersPanelRef = useRef<HTMLDivElement | null>(null);
    const [searchText, setSearchText] = useState<string>("");

    // Saved Searches state
    const SCREEN_KEY = 'technicians';
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    type SavedSearch = { id: string; name: string; filters: Filters };
    const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
    const [selectedSavedSearch, setSelectedSavedSearch] = useState<string>('');
    const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
    const [saveSearchName, setSaveSearchName] = useState('');
    const [isSavingSearch, setIsSavingSearch] = useState(false);

    // CSV helper functions
    const downloadCSV = () => {
        try {
            const headers = ['Name', 'Email', 'Phone', 'Role', 'Address', 'Zip', 'State', 'City'];
            const rows = data.map(record => {
                const roleId = record?.technician?.role_id ?? record?.profile?.role_id ?? record?.user_metadata?.role_id ?? record?.role_id;
                const roleName = (roleId && rolesMap[String(roleId)]) ? rolesMap[String(roleId)] : (record.profile?.user_type ?? record?.user_metadata?.role ?? 'User');
                const stateId = record?.technician?.state_id;
                const cityId = record?.technician?.city_id;
                const stateName = stateId ? (states.find(s => s.id === stateId)?.name ?? '') : '';
                const cityName = cityId ? (cities.find(c => c.id === cityId)?.name ?? '') : '';
                return [
                    record.user_metadata?.name ?? record.email,
                    record.email ?? '',
                    record?.technician?.phone_number ?? '',
                    roleName,
                    record?.technician?.address ?? '',
                    record?.technician?.zip ?? '',
                    stateName,
                    cityName
                ];
            });
            const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `technicians_${new Date().toISOString().split('T')[0]}.csv`;
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
            const sampleRow = ['John Doe', 'john@example.com', '9876543210', 'Lab Technician', '123 Main St', '12345', 'California', 'Los Angeles'];
            const csvContent = [headers, sampleRow].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'technicians_template.csv';
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

                    const res = await fetch('/api/technicians', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            email,
                            name,
                            phone_number: phone || null,
                            role: roleName,
                            role_id,
                            userType: 'Technician',
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
                    console.error(`Failed to import technician ${email}:`, e);
                    errorCount++;
                }
            }

            await fetchTechnicians();
            showToast(`Import complete: ${successCount} technicians added, ${errorCount} failed`, successCount > 0 ? 'success' : 'danger');
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
                    } catch (cleanupErr) { console.debug('[technicians] hideModal cleanup', cleanupErr); }
                };

                try {
                    if (bs && bs.Modal) {
                        // @ts-ignore
                        const inst = bs.Modal.getInstance(modalEl) ?? bs.Modal.getOrCreateInstance?.(modalEl) ?? new bs.Modal(modalEl);
                        const onHidden = () => { try { modalEl.removeEventListener('hidden.bs.modal', onHidden); } catch (_) { }; finish(); };
                        modalEl.addEventListener('hidden.bs.modal', onHidden);
                        try { inst?.hide?.(); } catch (hideErr) { console.debug('[technicians] bootstrap hide threw', hideErr); }
                        setTimeout(() => finish(), 600);
                        return;
                    }
                } catch (err) {
                    console.debug('[technicians] bootstrap modal hide failed', err);
                }

                finish();
                resolve();
            } catch (e) {
                console.debug('[technicians] hideModalById error', e);
                resolve();
            }
        });
    };
    const fetchTechnicians = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/technicians?userType=Technician');
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
            console.error('[technicians] fetchRoleOptions', e);
        }
    };

    useEffect(() => { fetchTechnicians(); }, []);
    useEffect(() => { fetchRoleOptions('Technician'); }, []);
    useEffect(() => { fetchStatesAndCities(); }, []); const fetchStatesAndCities = async () => {
        try {
            const [sRes, cRes] = await Promise.all([fetch('/api/states'), fetch('/api/cities')]);
            const sJson = await sRes.json().catch(() => ({}));
            const cJson = await cRes.json().catch(() => ({}));
            setStates(sJson.states || []);
            setCities(cJson.cities || []);
        } catch (e) {
            console.debug('[technicians] failed to load states/cities', e);
        }
    };

    // Saved Searches functions
    const loadSavedSearches = async () => {
        if (!currentUserId) return;
        try {
            const sb = getSupabaseClient();
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
            console.debug('[technicians] loadSavedSearches error', e);
        }
    };

    const handleSaveSearch = async () => {
        if (!currentUserId || !saveSearchName.trim()) return;
        setIsSavingSearch(true);
        try {
            const sb = getSupabaseClient();
            const { error } = await sb.from('saved_searches').insert({
                user_id: currentUserId,
                screen: SCREEN_KEY,
                name: saveSearchName.trim(),
                filters: filtersDraft
            });
            if (error) throw error;
            showToast('Search saved successfully', 'success');
            await loadSavedSearches();
            setSaveSearchName('');
            setShowSaveSearchModal(false);
        } catch (e: any) {
            showToast('Failed to save search: ' + (e.message || 'Unknown error'), 'danger');
        } finally {
            setIsSavingSearch(false);
        }
    };

    const handleApplySavedSearch = (searchId: string) => {
        const search = savedSearches.find(s => s.id === searchId);
        if (!search) return;
        setFiltersDraft(search.filters);
        setAppliedFilters(search.filters);
        setSelectedSavedSearch(searchId);
    };

    const handleDeleteSavedSearch = async (searchId: string) => {
        const search = savedSearches.find(s => s.id === searchId);
        if (!search) return;
        if (!confirm(`Delete saved search "${search.name}"?`)) return;
        try {
            const sb = getSupabaseClient();
            const { error } = await sb.from('saved_searches').delete().eq('id', searchId);
            if (error) throw error;
            showToast('Search deleted successfully', 'success');
            if (selectedSavedSearch === searchId) setSelectedSavedSearch('');
            await loadSavedSearches();
        } catch (e: any) {
            showToast('Failed to delete search: ' + (e.message || 'Unknown error'), 'danger');
        }
    };

    // Load current user
    useEffect(() => {
        (async () => {
            try {
                const sb = getSupabaseClient();
                const { data } = await sb.auth.getUser();
                setCurrentUserId(data?.user?.id ?? null);
            } catch (e) {
                console.debug('[technicians] failed to load user', e);
            }
        })();
    }, []);

    // Load saved searches when user is available
    useEffect(() => {
        if (currentUserId) loadSavedSearches();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUserId]);

    type Column = {
        key: string;
        title: string;
        dataIndex?: string;
        render?: (val: any, record: any) => any;
        sortKey?: string;
    };

    const getValueByPath = (obj: any, path?: string) => {
        if (!path) return undefined;
        return path.split('.').reduce((acc: any, key: string) => (acc ? acc[key] : undefined), obj);
    };

    const columns: Column[] = [
        { key: 'actions', title: 'Actions' },
        { key: 'status', title: 'Status', sortKey: 'is_active_flat' },
        { key: 'name', title: 'Name', dataIndex: 'user_metadata.name', sortKey: 'name_flat', render: (_: any, record: any) => record.user_metadata?.name ?? record.email },
        { key: 'email', title: 'Email', dataIndex: 'email', sortKey: 'email_flat' },
        { key: 'phone', title: 'Phone', dataIndex: 'technician.phone_number', sortKey: 'phone_flat', render: (_: any, r: any) => r?.technician?.phone_number ?? '' },
        { key: 'state', title: 'State', dataIndex: 'technician.state_id', sortKey: 'state_name_flat', render: (_: any, r: any) => { const sid = r?.technician?.state_id ?? null; const st = states.find(s => String(s.id) === String(sid)); return st ? st.name : (r?.technician?.state_name ?? ''); } },
        { key: 'city', title: 'City', dataIndex: 'technician.city_id', sortKey: 'city_name_flat', render: (_: any, r: any) => { const cid = r?.technician?.city_id ?? null; const ct = cities.find(c => String(c.id) === String(cid)); return ct ? ct.name : (r?.technician?.city_name ?? ''); } },
        { key: 'zip', title: 'Zip Code', dataIndex: 'technician.zip', sortKey: 'zip_flat', render: (_: any, r: any) => r?.technician?.zip ?? '' },
        { key: 'address', title: 'Address', dataIndex: 'technician.address', sortKey: 'address_flat', render: (_: any, r: any) => r?.technician?.address ?? '' },
        { title: 'Reset Password', key: 'reset_password' },
        { key: 'created_at', title: 'Date Created', dataIndex: 'created_at', sortKey: 'created_at_flat', render: (_: any, r: any) => formatDateTime(r?.created_at_flat ?? r?.technician?.created_at ?? r?.created_at ?? r?.user?.created_at) },
        { key: 'updated_at', title: 'Last Updated', dataIndex: 'updated_at', sortKey: 'updated_at_flat', render: (_: any, r: any) => formatDateTime(r?.updated_at_flat ?? r?.technician?.updated_at ?? r?.updated_at ?? r?.user?.updated_at) },
    ];

    // Flatten fields for filtering
    const processedData = useMemo(() => {
        return (data || []).map((record: any) => {
            const roleId = record?.technician?.role_id ?? record?.profile?.role_id ?? record?.user_metadata?.role_id ?? record?.role_id ?? null;
            const roleName = roleId && rolesMap[String(roleId)] ? rolesMap[String(roleId)] : (record.profile?.user_type ?? record?.user_metadata?.role ?? 'User');
            const stateId = record?.technician?.state_id ?? null;
            const cityId = record?.technician?.city_id ?? null;
            const stateName = stateId ? (states.find(s => String(s.id) === String(stateId))?.name ?? '') : '';
            const cityName = cityId ? (cities.find(c => String(c.id) === String(cityId))?.name ?? '') : '';
            return {
                ...record,
                name_flat: record?.user_metadata?.name ?? record?.email ?? '',
                email_flat: record?.email ?? '',
                phone_flat: record?.technician?.phone_number ?? '',
                role_id_flat: roleId,
                role_name_flat: roleName,
                address_flat: record?.technician?.address ?? '',
                zip_flat: record?.technician?.zip ?? '',
                state_id_flat: stateId,
                city_id_flat: cityId,
                state_name_flat: stateName,
                city_name_flat: cityName,
                is_active_flat: !!(record?.technician?.is_active),
                created_at_flat: record?.technician?.created_at ?? record?.created_at ?? record?.user?.created_at ?? '',
                updated_at_flat: record?.technician?.updated_at ?? record?.updated_at ?? record?.user?.updated_at ?? ''
            };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, rolesMap, states, cities]);

    // Apply filters when Go is clicked
    const filteredData = useMemo(() => {
        const f = appliedFilters;
        let rows = processedData;
        if (f.address.trim()) { const q = f.address.trim().toLowerCase(); rows = rows.filter((r: any) => (r?.address_flat || '').toLowerCase().includes(q)); }
        if (f.zip.trim()) { const q = f.zip.trim().toLowerCase(); rows = rows.filter((r: any) => (r?.zip_flat || '').toString().toLowerCase().includes(q)); }
        if (f.stateId) rows = rows.filter((r: any) => String(r?.state_id_flat ?? '') === String(f.stateId));
        if (f.cityId) rows = rows.filter((r: any) => String(r?.city_id_flat ?? '') === String(f.cityId));
        if (f.status) rows = rows.filter((r: any) => f.status === 'active' ? !!r?.is_active_flat : !r?.is_active_flat);
        return rows;
    }, [processedData, appliedFilters]);

    // Search across common fields
    const searchedData = useMemo(() => {
        const q = (searchText || '').trim().toLowerCase();
        if (!q) return filteredData;
        return filteredData.filter((r: any) => {
            return (
                (r.name_flat || '').toLowerCase().includes(q) ||
                (r.email_flat || '').toLowerCase().includes(q) ||
                (r.phone_flat || '').toLowerCase().includes(q) ||
                (r.address_flat || '').toLowerCase().includes(q) ||
                (r.zip_flat || '').toString().toLowerCase().includes(q) ||
                (r.state_name_flat || '').toLowerCase().includes(q) ||
                (r.city_name_flat || '').toLowerCase().includes(q) ||
                (r.role_name_flat || '').toLowerCase().includes(q)
            );
        });
    }, [filteredData, searchText]);

    // Sorting state and logic (default by name like Patients)
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name_flat', direction: 'asc' });
    const sortedData = useMemo(() => {
        const { key, direction } = sortConfig;
        const dir = direction === 'asc' ? 1 : -1;
        return [...searchedData].sort((a: any, b: any) => {
            const av = (a?.[key] ?? '').toString().toLowerCase();
            const bv = (b?.[key] ?? '').toString().toLowerCase();
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
        });
    }, [searchedData, sortConfig]);

    const requestSort = (col: Column) => {
        if (!col.sortKey) return;
        setSortConfig(prev => ({ key: col.sortKey!, direction: prev.key === col.sortKey ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc' }));
    };

    // Pagination (parity with Patients)
    const [pageSize, setPageSize] = useState<number>(25);
    const [currentPage, setCurrentPage] = useState<number>(1);
    useEffect(() => { setCurrentPage(1); }, [sortConfig, appliedFilters, pageSize]);
    const totalItems = sortedData.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const pagedData = useMemo(() => sortedData.slice(startIndex, endIndex), [sortedData, startIndex, endIndex]);
    useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [totalPages, currentPage]);

    // Horizontal scroll helpers
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const updateScrollButtons = () => {
        const el = scrollRef.current; if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    useEffect(() => {
        const el = scrollRef.current; if (!el) return; updateScrollButtons();
        const onScroll = () => updateScrollButtons(); el.addEventListener('scroll', onScroll, { passive: true } as any);
        const onResize = () => updateScrollButtons(); window.addEventListener('resize', onResize);
        return () => { el.removeEventListener('scroll', onScroll as any); window.removeEventListener('resize', onResize); };
    }, [scrollRef.current, pagedData, pageSize]);
    const scrollByAmount = (dx: number) => { const el = scrollRef.current; if (!el) return; try { (el as any).scrollBy({ left: dx, behavior: 'smooth' }); } catch { el.scrollLeft += dx; } };

    // Modal show helper (parity with Patients)
    const showModalById = (id: string) => {
        try {
            const modalEl = document.getElementById(id);
            // @ts-ignore
            const bs = (window as any).bootstrap;
            if (!modalEl) return;
            try {
                if (bs && bs.Modal) {
                    // @ts-ignore
                    const inst = bs.Modal.getOrCreateInstance?.(modalEl) ?? new bs.Modal(modalEl);
                    inst.show();
                    return;
                }
            } catch (innerErr) { console.debug('[technicians] bootstrap.Modal show failed', innerErr); }
            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
            modalEl.classList.add('show');
            (modalEl as any).style.display = 'block';
            modalEl.setAttribute('aria-modal', 'true');
            modalEl.removeAttribute('aria-hidden');
            document.body.classList.add('modal-open');
            if (!document.querySelector('.modal-backdrop')) {
                const backdrop = document.createElement('div');
                backdrop.className = 'modal-backdrop fade show';
                document.body.appendChild(backdrop);
            }
        } catch (e) { console.error('[technicians] showModalById error', e); }
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
            try { await hideModalById('grid_columns_technicians'); } catch { }
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
        } catch (e) { console.debug('[technicians] handleResetOpen error', e); }
    };

    const handleResetSubmit = async (e: any) => {
        e.preventDefault();
        const userId = resetUserId;
        if (!userId) return showToast('Technician id missing', 'danger');
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
            const res = await fetch('/api/technicians', { method: 'PATCH', headers, body: JSON.stringify({ action: 'reset_password', patientId: userId, password: resetPassword }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            try { await hideModalById('reset_password'); } catch (_) { }
            setResetUserId(null);
            setResetPassword('');
            setResetConfirm('');
            await fetchTechnicians();
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
        const roleValid = !!role && String(role).length > 0; // require role selection
        const phoneValid = !!addPhone && addPhone.trim().length > 0;
        return emailValid && nameValid && roleValid && phoneValid;
    }, [email, name, role, addPhone]);

    const handleAddTechnician = async (e: any) => {
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
            const res = await fetch('/api/technicians', {
                method: 'POST',
                headers,
                body: JSON.stringify({ email, name, phone_number: addPhone || null, role: rolesMap[role] || role, role_id: role || null, userType: 'Technician', address: addAddress, zip: addZip, state_id: addStateId, city_id: addCityId })
            });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            try {
                await hideModalById('add_user');
            } catch (e) {
                console.debug('[technicians] hide add_user failed', e);
            }

            setEmail(''); setName(''); setRole(''); setAddPhone(''); setAddAddress(''); setAddZip(''); setAddStateId(null); setAddCityId(null);
            await fetchTechnicians();
            showToast('Technician created. A confirmation email (magic link) was requested.', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to add technician', 'danger');
        } finally {
            setIsAdding(false);
        }
    };

    const handleToggleActive = async (record: any) => {
        const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id;
        const current = record?.technician?.is_active ?? true;
        if (!userId) return alert('Technician id missing');
        const ok = confirm(`Are you sure you want to ${current ? 'deactivate' : 'activate'} this technician?`);
        if (!ok) return;
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET)
                ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET
                : undefined;
            if (adminSecret) headers['x-admin-secret'] = adminSecret;
            setLoadingIds(prev => ({ ...prev, [userId]: true }));
            const res = await fetch('/api/technicians', { method: 'PATCH', headers, body: JSON.stringify({ action: 'toggle_active', patientId: userId, isActive: !current }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            await fetchTechnicians();
            setLoadingIds(prev => { const c = { ...prev }; delete c[userId]; return c; });
        } catch (e: any) {
            setLoadingIds(prev => { const c = { ...prev }; if (userId) delete c[userId]; return c; });
            alert(e.message || 'Failed to update active state');
        }
    };

    const handleSoftDelete = async (record: any) => {
        const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id;
        if (!userId) return alert('Technician id missing');
        const ok = confirm('Are you sure you want to delete this technician? This is a soft delete.');
        if (!ok) return;
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET)
                ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET
                : undefined;
            if (adminSecret) headers['x-admin-secret'] = adminSecret;
            setLoadingIds(prev => ({ ...prev, [userId]: true }));
            const res = await fetch('/api/technicians', { method: 'PATCH', headers, body: JSON.stringify({ action: 'soft_delete', patientId: userId }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            await fetchTechnicians();
            setLoadingIds(prev => { const c = { ...prev }; delete c[userId]; return c; });
        } catch (e: any) {
            setLoadingIds(prev => { const c = { ...prev }; if (userId) delete c[userId]; return c; });
            alert(e.message || 'Failed to delete technician');
        }
    };

    const handleEditOpen = (record: any) => {
        const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id ?? record?.id;
        setEditingUser({ id: userId, record });
        setEditEmail(record?.email ?? '');
        setEditName(record?.user_metadata?.name ?? '');
        // prefer stored role_id for select, fallback to legacy role string
        const detectedRoleId = record?.technician?.role_id ?? record?.profile?.role_id ?? record?.user_metadata?.role_id ?? record?.role_id ?? null;
        setEditRole(detectedRoleId ? String(detectedRoleId) : (record?.user_metadata?.role ?? ''));
        setEditAddress(record?.technician?.address ?? '');
        setEditZip(record?.technician?.zip ?? '');
        setEditStateId(record?.technician?.state_id ?? null);
        setEditCityId(record?.technician?.city_id ?? null);
        setEditPhone(record?.technician?.phone_number ?? '');
        try {
            console.debug('[technicians] handleEditOpen', { userId, record });
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
                console.debug('[technicians] hide dropdowns failed', err);
            }

            if (modalEl) {
                try {
                    if (bs && bs.Modal) {
                        // @ts-ignore
                        const inst = bs.Modal.getOrCreateInstance(modalEl) ?? new bs.Modal(modalEl);
                        inst.show();
                        console.debug('[technicians] shown modal via bootstrap.Modal');
                        return;
                    }
                } catch (innerErr) {
                    console.debug('[technicians] bootstrap.Modal show failed', innerErr);
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
                    console.debug('[technicians] shown modal via DOM fallback');
                    return;
                } catch (domErr) {
                    console.error('[technicians] DOM fallback to show modal failed', domErr);
                }
            } else {
                console.error('[technicians] edit_user modal element not found');
            }
        } catch (e) {
            console.error('[technicians] handleEditOpen error', e);
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
        if (!editingUser?.id) return alert('No editing technician');
        const userId = editingUser.id;
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET)
                ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET
                : undefined;
            if (adminSecret) headers['x-admin-secret'] = adminSecret;
            setIsSavingEdit(true);
            setLoadingIds(prev => ({ ...prev, [userId]: true }));
            const res = await fetch('/api/technicians', { method: 'PATCH', headers, body: JSON.stringify({ action: 'edit', patientId: userId, email: editEmail, name: editName, role: rolesMap[editRole] || editRole, role_id: editRole || null, phone_number: editPhone || null, address: editAddress, zip: editZip, state_id: editStateId, city_id: editCityId }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            try {
                await hideModalById('edit_user');
            } catch (ee) { console.debug('[technicians] hide edit_user failed', ee); }
            setEditingUser(null);
            await fetchTechnicians();
            setLoadingIds(prev => { const c = { ...prev }; delete c[userId]; return c; });
            showToast('Technician updated Success', 'success');
        } catch (e: any) {
            setLoadingIds(prev => { const c = { ...prev }; if (userId) delete c[userId]; return c; });
            showToast(e.message || 'Failed to update technician', 'danger');
        } finally {
            setIsSavingEdit(false);
        }
    }; return (
        <>
            <div className="page-wrapper patients-screen">
                <div className="content">
                    <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom patients-header">
                        <div className="flex-grow-1">
                            <h4 className="fw-bold mb-0 text-dark">
                                Technicians{" "}
                                <span className="badge badge-soft-primary fw-medium border py-1 px-2 border-primary fs-13 ms-1">
                                    Total Technicians : {data.length}
                                </span>
                            </h4>
                        </div>
                    </div>

                    {/* SEARCH + TOOLBAR */}
                    <div className="d-flex align-items-center justify-content-between flex-wrap">
                        <div className="d-flex align-items-center flex-wrap">
                            <div className="table-search d-flex align-items-center mb-0">
                                <div className="search-input">
                                    <SearchInput value={searchText} onChange={setSearchText} />
                                </div>
                            </div>
                        </div>
                        <div className="patients-toolbar d-flex align-items-center flex-wrap gap-2">
                            {(
                                <div className="saved-search-dropdown dropdown">
                                    <button className="btn btn-darkish dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                        <i className="ti ti-bookmark me-1" />
                                        {selectedSavedSearch ? (savedSearches.find(s => s.id === selectedSavedSearch)?.name || 'Saved Searches') : 'Saved Searches'}
                                    </button>
                                    <ul className="dropdown-menu" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        <li>
                                            <button className="dropdown-item text-muted" type="button" onClick={() => { setSelectedSavedSearch(''); setFiltersDraft({ address: '', zip: '', stateId: '', cityId: '', status: '' }); setAppliedFilters({ address: '', zip: '', stateId: '', cityId: '', status: '' }); }}>
                                                <i className="ti ti-x me-2" />
                                                Clear Selection
                                            </button>
                                        </li>
                                        <li><hr className="dropdown-divider" /></li>
                                        {savedSearches.map(search => (
                                            <li key={search.id}>
                                                <div className="d-flex align-items-center justify-content-between px-3 py-2 saved-search-item" style={{ cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                    <button className="btn btn-link text-start text-decoration-none flex-grow-1 p-0" type="button" onClick={(e) => { e.stopPropagation(); handleApplySavedSearch(search.id); const dropdown = e.currentTarget.closest('.dropdown'); if (dropdown) { const btn = dropdown.querySelector('[data-bs-toggle=\"dropdown\"]') as HTMLElement; if (btn) btn.click(); } }} style={{ border: 'none', background: 'none', color: selectedSavedSearch === search.id ? '#0d6efd' : '#212529', fontWeight: selectedSavedSearch === search.id ? '600' : '400' }}>
                                                        <i className={`ti ti-${selectedSavedSearch === search.id ? 'check' : 'bookmark'} me-2`} />
                                                        {search.name}
                                                    </button>
                                                    <button className="btn btn-link text-danger p-0 ms-2" type="button" onClick={(e) => { e.stopPropagation(); handleDeleteSavedSearch(search.id); }} title="Delete this saved search" style={{ border: 'none', background: 'none', fontSize: '16px' }}>
                                                        <i className="ti ti-trash" />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <button className="btn btn-darkish btn-sm" onClick={() => setShowFilters(s => !s)} title="Toggle filters">
                                <i className="ti ti-filter me-1" /> Filters
                            </button>
                            <button onClick={downloadTemplate} className="btn btn-light btn-sm" title="Download Template">
                                <i className="ti ti-download" />
                            </button>
                            <button onClick={downloadCSV} className="btn btn-darkish btn-sm" title="Download CSV">
                                <i className="ti ti-file-download" />
                            </button>
                            <label className={`btn btn-darkish btn-sm ${isUploading ? 'disabled' : ''}`} title="Upload CSV" style={{ margin: 0 }}>
                                {isUploading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : <i className="ti ti-upload" />}
                                <input type="file" accept=".csv" onChange={handleCSVUpload} disabled={isUploading} style={{ display: 'none' }} />
                            </label>
                            <button className="btn btn-light btn-sm" onClick={() => showModalById('grid_columns_technicians')} title="Grid Columns">
                                <i className="ti ti-columns-3" />
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={(e) => { e.preventDefault(); showModalById('add_user'); }}>
                                <i className="ti ti-plus me-1" /> <span>New Technician</span>
                            </button>
                        </div>
                    </div>
                    {showFilters && (
                        <div ref={filtersPanelRef} className="filter-panel border rounded p-3 mb-3">
                            <div className="row g-3">
                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">Address</label>
                                    <input className="form-control" value={filtersDraft.address} onChange={e => setFiltersDraft(prev => ({ ...prev, address: e.target.value }))} placeholder="Street, area" />
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">Zip</label>
                                    <input className="form-control" value={filtersDraft.zip} onChange={e => setFiltersDraft(prev => ({ ...prev, zip: e.target.value }))} placeholder="e.g. 12345" />
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">State</label>
                                    <SearchSelect
                                        options={[{ value: '', label: 'All States' }, ...(states || []).map(s => ({ value: String(s.id), label: s.name }))]}
                                        value={filtersDraft.stateId}
                                        onChange={(val) => setFiltersDraft(prev => ({ ...prev, stateId: String(val ?? ''), cityId: '' }))}
                                        placeholder="Search state..."
                                    />
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">City</label>
                                    <SearchSelect
                                        options={[{ value: '', label: 'All Cities' }, ...(cities || []).filter(c => !filtersDraft.stateId || String(c.state_id) === String(filtersDraft.stateId)).map(c => ({ value: String(c.id), label: c.name }))]}
                                        value={filtersDraft.cityId}
                                        onChange={(val) => setFiltersDraft(prev => ({ ...prev, cityId: String(val ?? '') }))}
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
                                <button type="button" className="btn btn-white border me-2" onClick={() => { setFiltersDraft({ address: '', zip: '', stateId: '', cityId: '', status: '' }); setAppliedFilters({ address: '', zip: '', stateId: '', cityId: '', status: '' }); setSelectedSavedSearch(''); }}>Clear</button>
                                <button type="button" className="btn btn-success me-2" onClick={() => { setShowSaveSearchModal(true); }} disabled={!filtersDraft.address && !filtersDraft.zip && !filtersDraft.stateId && !filtersDraft.cityId && !filtersDraft.status}>
                                    <i className="ti ti-device-floppy me-1" /> Save
                                </button>
                                <button type="button" className="btn btn-primary me-2" onClick={() => setAppliedFilters(filtersDraft)}>Go</button>
                                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowFilters(false)} title="Close filters">
                                    <i className="ti ti-chevron-up" />
                                </button>
                            </div>
                        </div>
                    )}
                    {/* TABLE with scroll and dynamic columns */}
                    <div className="patients-table-container">
                        <div ref={scrollRef} className="table-responsive patients-scroll">
                            <table className="table table-striped table-hover align-middle patients-table">
                                <thead className="table-dark">
                                    <tr>
                                        {columnsFiltered.map((col: Column, i: number) => {
                                            const isSorted = col.sortKey && sortConfig.key === col.sortKey;
                                            const clickable = !!col.sortKey;
                                            return (
                                                <th key={`h-${i}`} onClick={clickable ? () => requestSort(col) : undefined} style={{ whiteSpace: 'nowrap', cursor: clickable ? 'pointer' : 'default' }}>
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
                                            <td colSpan={columnsFiltered.length} className="text-center py-4 text-muted">No technicians found</td>
                                        </tr>
                                    ) : (
                                        pagedData.map((row: any, idx: number) => (
                                            <tr key={row?.id ?? row?.user?.id ?? idx}>
                                                {columnsFiltered.map((col: Column, ci: number) => {
                                                    const raw = col.dataIndex ? getValueByPath(row, col.dataIndex) : undefined;
                                                    if ((col.key || '').toString() === 'actions' || col.title === 'Actions') {
                                                        return (
                                                            <td key={`c-${idx}-${ci}`}>
                                                                <div className="dropdown position-static">
                                                                    <a href="#" className="text-dark" data-bs-toggle="dropdown" data-bs-boundary="viewport" onClick={(e) => e.preventDefault()}>
                                                                        <i className="ti ti-dots-vertical" />
                                                                    </a>
                                                                    <ul className="dropdown-menu p-2">
                                                                        <li><a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); handleEditOpen(row); }}>Edit</a></li>
                                                                        <li><a href="#" className="dropdown-item text-danger" onClick={async (e) => { e.preventDefault(); await handleSoftDelete(row); }}>Delete</a></li>
                                                                    </ul>
                                                                </div>
                                                            </td>
                                                        );
                                                    }
                                                    if ((col.key || '').toString() === 'status' || col.title === 'Status') {
                                                        const isActive = row?.technician?.is_active ?? false;
                                                        const userId = row?.id ?? row?.user?.id ?? row?.user?.user?.id;
                                                        const isLoading = !!(userId && loadingIds[userId]);
                                                        return (
                                                            <td key={`c-${idx}-${ci}`}>
                                                                <span
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    onClick={async (e) => { e.preventDefault(); await handleToggleActive(row); }}
                                                                    className={`badge ${isActive ? 'badge-soft-success' : 'badge-soft-danger'} border ${isActive ? 'border-success' : 'border-danger'} px-2 py-1 fs-13 fw-medium`}
                                                                    style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
                                                                    aria-disabled={isLoading}
                                                                >
                                                                    {isLoading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : (isActive ? 'Active' : 'Inactive')}
                                                                </span>
                                                            </td>
                                                        );
                                                    }
                                                    if ((col.key || '').toString() === 'reset_password' || col.title === 'Reset Password') {
                                                        return (
                                                            <td key={`c-${idx}-${ci}`}>
                                                                <a href="#" className="text-primary" onClick={(e) => { e.preventDefault(); handleResetOpen(row); }} title="Reset Password"><i className="ti ti-key" /></a>
                                                            </td>
                                                        );
                                                    }
                                                    const content = col.render ? col.render(raw, row) : (raw ?? '—');
                                                    return <td key={`c-${idx}-${ci}`}>{content}</td>;
                                                })}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    <div className="d-flex align-items-center gap-3 mt-2">
                        <div className="d-flex align-items-center gap-3">
                            <div className="d-flex align-items-center gap-2">
                                <span className="text-muted">Items per page:</span>
                                <select className="form-select form-select-sm" style={{ width: 80 }} value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value, 10) || 10)}>
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

                    {(canScrollLeft || canScrollRight) && (
                        <div className="hscroll-floaters">
                            {canScrollLeft && (
                                <button type="button" className="hscroll-btn" aria-label="Scroll left" onClick={() => { const el = scrollRef.current; const step = el ? Math.max(240, Math.floor(el.clientWidth * 0.8)) : 240; scrollByAmount(-step); }}>
                                    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" style={{ transform: 'scaleX(-1)' }}>
                                        <path d="M2 12L12 6v12L2 12zM12 12l10-6v12l-10-6z" fill="currentColor"></path>
                                    </svg>
                                </button>
                            )}
                            {canScrollRight && (
                                <button type="button" className="hscroll-btn" aria-label="Scroll right" onClick={() => { const el = scrollRef.current; const step = el ? Math.max(240, Math.floor(el.clientWidth * 0.8)) : 240; scrollByAmount(step); }}>
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
            <div id="grid_columns_technicians" className="modal fade" tabIndex={-1} aria-hidden="true">
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
                            <button type="button" className="btn btn-white border" onClick={() => { try { hideModalById('grid_columns_technicians'); } catch { } }}>Cancel</button>
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
                        <div className="modal-header py-2 px-3 border-0 bg-teal-700 text-white rounded-top">
                            <h5 className="modal-title fw-semibold">Edit Technician</h5>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="modal-body px-4 pt-3 pb-1">
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">Name <span className="text-danger">*</span></label>
                                    <input className="form-control required-field" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Enter full name" />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">Email <span className="text-danger">*</span></label>
                                    <input className="form-control required-field" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Enter email address" />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">Phone Number <span className="text-danger">*</span></label>
                                    <input className="form-control required-field" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="e.g. +1234567890" />
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
                                        options={(states || []).map(s => ({ value: String(s.id), label: s.name }))}
                                        value={editStateId != null ? String(editStateId) : ''}
                                        onChange={(val) => { setEditStateId(val ? Number(val) : null); setEditCityId(null); }}
                                        placeholder="Search state..."
                                        inputClassName="required-field"
                                    />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">City <span className="text-danger">*</span></label>
                                    <SearchSelect
                                        options={(cities || []).filter(c => !editStateId || String(c.state_id) === String(editStateId)).map(c => ({ value: String(c.id), label: c.name }))}
                                        value={editCityId != null ? String(editCityId) : ''}
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
                                <button type="button" className="btn btn-outline-danger px-3" data-bs-dismiss="modal" onClick={() => { try { hideModalById('edit_user'); } catch (_) { } }}>
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
                            <h5 className="modal-title fw-semibold text-center mb-0">Add New Technician</h5>
                        </div>
                        <form onSubmit={handleAddTechnician}>
                            <div className="modal-body px-4 pt-3 pb-1">
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">Name <span className="text-danger">*</span></label>
                                    <input className="form-control required-field" placeholder="Enter full name" value={name} onChange={e => setName(e.target.value)} />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">Email <span className="text-danger">*</span></label>
                                    <input className="form-control required-field" placeholder="Enter email address" value={email} onChange={e => setEmail(e.target.value)} />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">Phone Number <span className="text-danger">*</span></label>
                                    <input className="form-control required-field" placeholder="e.g. +1234567890" value={addPhone} onChange={e => setAddPhone(e.target.value)} />
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
                                        options={(states || []).map(s => ({ value: String(s.id), label: s.name }))}
                                        value={addStateId != null ? String(addStateId) : ''}
                                        onChange={(val) => { setAddStateId(val ? Number(val) : null); setAddCityId(null); }}
                                        placeholder="Search state..."
                                        inputClassName="required-field"
                                    />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">City <span className="text-danger">*</span></label>
                                    <SearchSelect
                                        options={(cities || []).filter(c => !addStateId || String(c.state_id) === String(addStateId)).map(c => ({ value: String(c.id), label: c.name }))}
                                        value={addCityId != null ? String(addCityId) : ''}
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
                                <button type="button" className="btn btn-outline-danger px-3" data-bs-dismiss="modal" onClick={() => { try { hideModalById('add_user'); } catch (_) { } }}>
                                    <i className="ti ti-x me-1"></i> Cancel
                                </button>
                                <button type="submit" className="btn btn-success px-4" disabled={!isAddFormValid || isAdding}>
                                    {isAdding ? (
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    ) : (
                                        <>
                                            <i className="ti ti-device-floppy me-1"></i> Add New Technician
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

export default TechniciansComponent;
