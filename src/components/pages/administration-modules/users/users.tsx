"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Datatable from "@/core/common/dataTable";
import { all_routes } from "@/routes/all_routes";
import Link from "next/link";
import CommonSelect from "@/core/common/common-select/commonSelect";
import { StatusActive } from "@/core/common/selectOption";
import ImageWithBasePath from "@/core/imageWithBasePath";
import SearchInput from "@/core/common/dataTable/dataTableSearch";
import getSupabaseClient from "@/lib/supabaseClient";
import { formatDateTime } from '@/core/common/dateTime';
import "@/style/css/admin-screens.css";

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

const UsersComponent = () => {
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
    const [phoneNumber, setPhoneNumber] = useState("");
    const [editPhoneNumber, setEditPhoneNumber] = useState("");
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

    // New states for submit button loading and filter
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    // Grid Columns prefs
    const SCREEN_KEY = 'users';
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [visibleColIds, setVisibleColIds] = useState<Set<string> | null>(null); // null = not loaded yet
    const [isSavingCols, setIsSavingCols] = useState(false);

    // Filters UI state
    type Filters = { phone: string; roleId: string; address: string; zip: string; stateId: string; cityId: string; status: '' | 'active' | 'inactive' };
    const [showFilters, setShowFilters] = useState(false);
    const [filtersDraft, setFiltersDraft] = useState<Filters>({ phone: '', roleId: '', address: '', zip: '', stateId: '', cityId: '', status: '' });
    const [appliedFilters, setAppliedFilters] = useState<Filters>({ phone: '', roleId: '', address: '', zip: '', stateId: '', cityId: '', status: '' });

    // Saved Searches state
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

    // Close any open dropdown menus before opening a dialog to avoid stacking/focus issues
    const closeOpenDropdowns = () => {
        try {
            const menus = Array.from(document.querySelectorAll('.dropdown-menu.show')) as HTMLElement[];
            menus.forEach(menu => {
                menu.classList.remove('show');
                const toggle = menu.parentElement?.querySelector('[data-bs-toggle="dropdown"]') as HTMLElement | null;
                toggle?.classList?.remove('show');
                try {
                    // @ts-ignore
                    const bs = (window as any).bootstrap;
                    if (bs?.Dropdown && toggle) {
                        // @ts-ignore
                        const inst = bs.Dropdown.getInstance(toggle) ?? new bs.Dropdown(toggle);
                        inst?.hide?.();
                    }
                } catch { }
            });
        } catch { }
    };

    // CSV helper functions
    const downloadCSV = () => {
        try {
            const headers = ['Name', 'Email', 'Phone', 'Role', 'Address', 'Zip', 'State', 'City'];
            const rows = processedData.map(record => {
                const sid = record?.admin?.state_id ?? null;
                const cid = record?.admin?.city_id ?? null;
                const st = states.find(s => String(s.id) === String(sid));
                const ct = cities.find(c => String(c.id) === String(cid));
                return [
                    record.name_flat || '',
                    record.email_flat || '',
                    record?.admin?.phone_number || '',
                    record.role_flat || '',
                    record?.admin?.address || '',
                    record?.admin?.zip || '',
                    st?.name || '',
                    ct?.name || ''
                ];
            });
            const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
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
            const sampleRow = ['John Doe', 'john@example.com', '+1234567890', 'Admin', '123 Main St', '12345', 'Texas', 'Houston'];
            const csvContent = [headers, sampleRow].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'users_template.csv';
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
                    const roleEntry = Object.entries(rolesMap).find(([_, rName]) => rName.toLowerCase() === roleName.toLowerCase());
                    const role_id = roleEntry ? roleEntry[0] : null;

                    // Find state and city IDs by name
                    const state = states.find(s => s.name.toLowerCase() === stateName?.toLowerCase());
                    const state_id = state ? state.id : null;
                    const city = cities.find(c => c.name.toLowerCase() === cityName?.toLowerCase() && (!state_id || c.state_id === state_id));
                    const city_id = city ? city.id : null;

                    const headers: any = { 'Content-Type': 'application/json' };
                    const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET) ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET : undefined;
                    if (adminSecret) headers['x-admin-secret'] = adminSecret;

                    const res = await fetch('/api/users', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            email,
                            name,
                            role: roleName,
                            role_id,
                            userType: 'Admin',
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
                    console.error(`Failed to import user ${email}:`, e);
                    errorCount++;
                }
            }

            await fetchUsers();
            showToast(`Import complete: ${successCount} users added, ${errorCount} failed`, successCount > 0 ? 'success' : 'danger');
        } catch (e: any) {
            showToast('Failed to upload CSV: ' + e.message, 'danger');
        } finally {
            setIsUploading(false);
            event.target.value = ''; // Reset file input
        }
    };

    // Lightweight toast helper (uses Bootstrap classes if available). Appends to body.
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
            // auto remove
            setTimeout(() => { toast.classList.remove('show'); try { toast.remove(); } catch (_) { } }, 4000);
        } catch (e) {
            // fallback to alert if DOM manipulation fails
            // eslint-disable-next-line no-alert
            alert(message);
        }
    };
    const handleSearch = (value: string) => {
        setSearchText(value);
    };
    // Bootstrap modal helpers (replicated from patients.tsx)
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
                        try { document.body.classList.remove('modal-open'); } catch (_) { }
                        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                        try { (modalEl as any).scrollTop = 0; } catch (_) { }
                    } catch (cleanupErr) { console.debug('[users] hideModal cleanup', cleanupErr); }
                    resolve();
                };

                try {
                    if (bs && bs.Modal) {
                        // @ts-ignore
                        const inst = bs.Modal.getInstance(modalEl) ?? bs.Modal.getOrCreateInstance?.(modalEl) ?? new bs.Modal(modalEl);
                        const onHidden = () => { modalEl.removeEventListener('hidden.bs.modal', onHidden); finish(); };
                        modalEl.addEventListener('hidden.bs.modal', onHidden);
                        try { inst.hide(); } catch (hideErr) { console.debug('[users] bootstrap modal hide error', hideErr); }
                        setTimeout(() => finish(), 600);
                        return;
                    }
                } catch (err) {
                    console.debug('[users] bootstrap modal hide failed', err);
                }

                finish();
            } catch (e) {
                console.debug('[users] hideModalById error', e);
                resolve();
            }
        });
    };

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
            } catch (innerErr) {
                console.debug('[users] bootstrap.Modal show failed', innerErr);
            }

            // Fallback to DOM manipulation
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
        } catch (e) {
            console.error('[users] showModalById error', e);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // By default show Admin users from profiles table
            const res = await fetch('/api/users?userType=Admin');
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
            console.error('[users] fetchRoleOptions', e);
        }
    };

    const fetchStatesAndCities = async () => {
        try {
            const [sRes, cRes] = await Promise.all([fetch('/api/states'), fetch('/api/cities')]);
            const sJson = await sRes.json().catch(() => ({}));
            const cJson = await cRes.json().catch(() => ({}));
            setStates(sJson.states || []);
            setCities(cJson.cities || []);
        } catch (e) {
            console.debug('[users] failed to load states/cities', e);
        }
    };

    useEffect(() => { fetchUsers(); fetchStatesAndCities(); }, []);
    useEffect(() => { fetchRoleOptions('Admin'); }, []);

    // 2. Create processedData to flatten properties for filtering
    const processedData = useMemo(() => {
        return data.map(record => {
            const roleId = record?.admin?.role_id ?? record?.profile?.role_id ?? record?.user_metadata?.role_id ?? record?.role_id;
            const roleName = (roleId && rolesMap[String(roleId)]) ? rolesMap[String(roleId)] : (record.profile?.user_type ?? record?.user_metadata?.role ?? 'User');

            return {
                ...record,
                name_flat: record.user_metadata?.name ?? record.email,
                email_flat: record.email,
                role_flat: roleName,
                role_id_flat: roleId ?? null,
                phone_flat: record?.admin?.phone_number ?? '',
                state_id_flat: record?.admin?.state_id ?? null,
                city_id_flat: record?.admin?.city_id ?? null,
                state_name_flat: (() => {
                    const sid = record?.admin?.state_id ?? null;
                    const st = states.find(s => String(s.id) === String(sid));
                    return st ? st.name : (record?.admin?.state_name ?? '');
                })(),
                city_name_flat: (() => {
                    const cid = record?.admin?.city_id ?? null;
                    const ct = cities.find(c => String(c.id) === String(cid));
                    return ct ? ct.name : (record?.admin?.city_name ?? '');
                })(),
                zip_flat: record?.admin?.zip ?? '',
                address_flat: record?.admin?.address ?? '',
                is_active_flat: !!(record?.admin?.is_active),
                created_at_flat: record?.admin?.created_at ?? record?.created_at ?? record?.user?.created_at ?? '',
                updated_at_flat: record?.admin?.updated_at ?? record?.updated_at ?? record?.user?.updated_at ?? '',
            };
        });
    }, [data, rolesMap, states, cities]);

    // Apply advanced filters when "Go" is clicked
    const filteredData = useMemo(() => {
        let rows = processedData;
        const f = appliedFilters;
        if (f.phone.trim()) {
            const q = f.phone.trim().toLowerCase();
            rows = rows.filter((r: any) => (r?.phone_flat || '').toString().toLowerCase().includes(q));
        }
        if (f.roleId) {
            rows = rows.filter((r: any) => {
                const rid = r?.role_id_flat ?? r?.admin?.role_id ?? r?.profile?.role_id ?? r?.user_metadata?.role_id ?? r?.role_id ?? '';
                return String(rid) === String(f.roleId);
            });
        }
        if (f.address.trim()) {
            const q = f.address.trim().toLowerCase();
            rows = rows.filter((r: any) => (r?.address_flat || '').toString().toLowerCase().includes(q));
        }
        if (f.zip.trim()) {
            const q = f.zip.trim().toLowerCase();
            rows = rows.filter((r: any) => (r?.zip_flat || '').toString().toLowerCase().includes(q));
        }
        if (f.stateId) rows = rows.filter((r: any) => String(r?.state_id_flat ?? '') === String(f.stateId));
        if (f.cityId) rows = rows.filter((r: any) => String(r?.city_id_flat ?? '') === String(f.cityId));
        if (f.status) {
            rows = rows.filter((r: any) => {
                const active = !!(r?.is_active_flat ?? r?.admin?.is_active);
                return f.status === 'active' ? active : !active;
            });
        }
        return rows;
    }, [processedData, appliedFilters]);

    // 3. Update columns to use the flat dataIndex - matching nurses.tsx structure
    const columns = [
        {
            title: 'Actions', render: (v: any, r: any) => {
                const userId = r?.id ?? r?.user?.id ?? r?.user?.user?.id;
                const isLoading = !!(userId && loadingIds[userId]);
                if (isLoading) {
                    return <div><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span></div>;
                }
                return (
                    <div className="dropdown position-static">
                        <a href="#" className="text-dark" data-bs-toggle="dropdown" data-bs-boundary="viewport" onClick={(e) => e.preventDefault()}>
                            <i className="ti ti-dots-vertical" />
                        </a>
                        <ul className="dropdown-menu p-2">
                            <li><a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); handleEditOpen(r); }}>Edit</a></li>
                            <li><a href="#" className="dropdown-item text-danger" onClick={async (e) => { e.preventDefault(); await handleSoftDelete(r); }}>Delete</a></li>
                        </ul>
                    </div>
                );
            }
        },
        {
            title: 'Status', dataIndex: 'admin.is_active', sortKey: 'is_active_flat', render: (_: any, record: any) => {
                const isActive = record?.admin?.is_active ?? false;
                const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id;
                const isLoading = !!(userId && loadingIds[userId]);
                return (
                    <span
                        role="button"
                        tabIndex={0}
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
            dataIndex: 'admin.phone_number',
            sortKey: 'phone_flat',
            sorter: (a: any, b: any) => (a?.admin?.phone_number ?? '').localeCompare(b?.admin?.phone_number ?? ''),
            render: (v: any, r: any) => r?.admin?.phone_number ?? ''
        },
        {
            title: 'State',
            dataIndex: 'admin.state_id',
            sortKey: 'state_name_flat',
            sorter: (a: any, b: any) => {
                const aSid = a?.admin?.state_id ?? null;
                const bSid = b?.admin?.state_id ?? null;
                const aSt = states.find(s => String(s.id) === String(aSid));
                const bSt = states.find(s => String(s.id) === String(bSid));
                return (aSt?.name ?? a?.admin?.state_name ?? '').localeCompare(bSt?.name ?? b?.admin?.state_name ?? '');
            },
            render: (v: any, r: any) => { const sid = r?.admin?.state_id ?? null; const st = states.find(s => String(s.id) === String(sid)); return st ? st.name : (r?.admin?.state_name ?? ''); }
        },
        {
            title: 'City',
            dataIndex: 'admin.city_id',
            sortKey: 'city_name_flat',
            sorter: (a: any, b: any) => {
                const aCid = a?.admin?.city_id ?? null;
                const bCid = b?.admin?.city_id ?? null;
                const aCt = cities.find(c => String(c.id) === String(aCid));
                const bCt = cities.find(c => String(c.id) === String(bCid));
                return (aCt?.name ?? a?.admin?.city_name ?? '').localeCompare(bCt?.name ?? b?.admin?.city_name ?? '');
            },
            render: (v: any, r: any) => { const cid = r?.admin?.city_id ?? null; const ct = cities.find(c => String(c.id) === String(cid)); return ct ? ct.name : (r?.admin?.city_name ?? ''); }
        },
        {
            title: 'Zip',
            dataIndex: 'admin.zip',
            sortKey: 'zip_flat',
            sorter: (a: any, b: any) => (a?.admin?.zip ?? '').localeCompare(b?.admin?.zip ?? ''),
            render: (v: any, r: any) => r?.admin?.zip ?? ''
        },
        {
            title: 'Address',
            dataIndex: 'admin.address',
            sortKey: 'address_flat',
            sorter: (a: any, b: any) => (a?.admin?.address ?? '').localeCompare(b?.admin?.address ?? ''),
            render: (v: any, r: any) => r?.admin?.address ?? ''
        },
        {
            title: 'Role',
            dataIndex: 'user_metadata.role',
            sortKey: 'role_flat',
            sorter: (a: any, b: any) => {
                const aRoleId = a?.admin?.role_id ?? a?.profile?.role_id ?? a?.user_metadata?.role_id ?? a?.role_id;
                const bRoleId = b?.admin?.role_id ?? b?.profile?.role_id ?? b?.user_metadata?.role_id ?? b?.role_id;
                const aRole = (aRoleId && rolesMap[String(aRoleId)]) ? rolesMap[String(aRoleId)] : (a.profile?.user_type ?? a?.user_metadata?.role ?? 'User');
                const bRole = (bRoleId && rolesMap[String(bRoleId)]) ? rolesMap[String(bRoleId)] : (b.profile?.user_type ?? b?.user_metadata?.role ?? 'User');
                return aRole.localeCompare(bRole);
            },
            render: (val: any, record: any) => {
                const roleId = record?.admin?.role_id ?? record?.profile?.role_id ?? record?.user_metadata?.role_id ?? record?.role_id;
                if (roleId && rolesMap[String(roleId)]) return rolesMap[String(roleId)];
                return record.profile?.user_type ?? val ?? 'User';
            }
        },
        {
            title: 'Reset Password', render: (v: any, r: any) => {
                const userId = r?.id ?? r?.user?.id ?? r?.user?.user?.id;
                return (
                    <a href="#" className="text-primary" onClick={(e) => { e.preventDefault(); handleResetOpen(r); }} title="Reset Password"><i className="ti ti-key" /></a>
                );
            }
        },
        {
            title: 'Date Created',
            dataIndex: 'created_at',
            sortKey: 'created_at_flat',
            sorter: (a: any, b: any) => {
                const aDate = a?.admin?.created_at ?? a?.created_at ?? a?.user?.created_at ?? '';
                const bDate = b?.admin?.created_at ?? b?.created_at ?? b?.user?.created_at ?? '';
                return aDate.localeCompare(bDate);
            },
            render: (v: any, r: any) => formatDateTime(r?.created_at_flat ?? r?.admin?.created_at ?? r?.created_at ?? r?.user?.created_at)
        },
        {
            title: 'Last Updated',
            dataIndex: 'updated_at',
            sortKey: 'updated_at_flat',
            sorter: (a: any, b: any) => {
                const aDate = a?.admin?.updated_at ?? a?.updated_at ?? a?.user?.updated_at ?? '';
                const bDate = b?.admin?.updated_at ?? b?.updated_at ?? b?.user?.updated_at ?? '';
                return aDate.localeCompare(bDate);
            },
            render: (v: any, r: any) => formatDateTime(r?.updated_at_flat ?? r?.admin?.updated_at ?? r?.updated_at ?? r?.user?.updated_at)
        }
    ];

    // Helpers for Grid Columns
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

    // Load current user and existing prefs
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const sb = getSupabaseClient();
                const { data: userData } = await sb.auth.getUser();
                const uid = userData?.user?.id ?? null;
                if (mounted) setCurrentUserId(uid);
                if (!uid) {
                    // fallback to localStorage
                    const ls = localStorage.getItem(`grid_columns_${SCREEN_KEY}`);
                    if (ls) {
                        try { const arr = JSON.parse(ls); if (Array.isArray(arr)) setVisibleColIds(new Set(arr)); else setVisibleColIds(new Set(allColIds)); } catch { setVisibleColIds(new Set(allColIds)); }
                    } else {
                        setVisibleColIds(new Set(allColIds));
                    }
                    return;
                }
                const { data, error } = await sb
                    .from('grid_columns_prefs')
                    .select('visible_columns')
                    .eq('user_id', uid)
                    .eq('screen', SCREEN_KEY)
                    .maybeSingle();
                if (error) throw error;
                const vis = Array.isArray(data?.visible_columns) && data?.visible_columns?.length
                    ? new Set<string>(data!.visible_columns as any)
                    : new Set(allColIds);
                if (mounted) setVisibleColIds(vis);
            } catch (e) {
                // If Supabase not configured, fallback to localStorage
                try {
                    const ls = localStorage.getItem(`grid_columns_${SCREEN_KEY}`);
                    if (ls) { const arr = JSON.parse(ls); setVisibleColIds(new Set(arr)); }
                    else setVisibleColIds(new Set(allColIds));
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
            // localStorage backup
            try { localStorage.setItem(`grid_columns_${SCREEN_KEY}`, JSON.stringify(ids)); } catch { }
            // Save to Supabase if logged in
            try {
                const sb = getSupabaseClient();
                if (currentUserId) {
                    const { error } = await sb
                        .from('grid_columns_prefs')
                        .upsert({ user_id: currentUserId, screen: SCREEN_KEY, visible_columns: ids }, { onConflict: 'user_id,screen' });
                    if (error) throw error;
                }
            } catch (e) { /* ignore if supabase missing */ }
            showToast('Grid columns saved', 'success');
            await hideModalById('grid_columns_users');
        } catch (e: any) {
            showToast(e?.message || 'Failed to save grid columns', 'danger');
        } finally {
            setIsSavingCols(false);
        }
    };

    const resetGridColumns = () => {
        const setAll = new Set(allColIds);
        setVisibleColIds(setAll);
    };

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
            console.debug('[users] loadSavedSearches error', e);
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

    // Derived state for form validation
    const isAddFormValid = useMemo(() => {
        return !!(name && email && role && phoneNumber && addStateId && addCityId && addAddress && addZip);
    }, [name, email, role, phoneNumber, addStateId, addCityId, addAddress, addZip]);

    const isEditFormValid = useMemo(() => {
        return !!(editingUser && editName && editEmail && editRole && editPhoneNumber && editStateId && editCityId && editAddress && editZip);
    }, [editingUser, editName, editEmail, editRole, editPhoneNumber, editStateId, editCityId, editAddress, editZip]);

    const isResetFormValid = useMemo(() => {
        return !!(resetPassword && resetPassword.length >= 8 && resetPassword === resetConfirm);
    }, [resetPassword, resetConfirm]);


    const handleResetOpen = (record: any) => {
        const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id ?? null;
        setResetUserId(userId);
        setResetPassword('');
        setResetConfirm('');
        closeOpenDropdowns();
        showModalById('reset_password_user');
    };

    const handleResetSubmit = async (e: any) => {
        e.preventDefault();
        const userId = resetUserId;
        if (!userId) return showToast('User id missing', 'danger');

        if (!isResetFormValid) {
            if (!resetPassword || resetPassword.length < 8) return showToast('Password must be at least 8 characters', 'danger');
            if (resetPassword !== resetConfirm) return showToast('Passwords do not match', 'danger');
            return;
        }

        try {
            setLoadingIds(prev => ({ ...prev, [userId]: true }));
            const headers: any = { 'Content-Type': 'application/json' };
            const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET)
                ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET
                : undefined;
            if (adminSecret) headers['x-admin-secret'] = adminSecret;
            const res = await fetch('/api/users', { method: 'PATCH', headers, body: JSON.stringify({ action: 'reset_password', userId, password: resetPassword }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            await hideModalById('reset_password_user');
            setResetUserId(null);
            setResetPassword('');
            setResetConfirm('');
            await fetchUsers();
            showToast('Password reset successfully', 'success');
        } catch (e: any) {
            showToast(e.message || 'Failed to reset password', 'danger');
        } finally {
            if (userId) setLoadingIds(prev => { const c = { ...prev }; delete c[userId]; return c; });
        }
    };

    const handleAddUser = async (e: any) => {
        e.preventDefault();

        if (!isAddFormValid) {
            showToast('Please fill out all required fields.', 'danger');
            return;
        }

        setIsAddingUser(true);
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            // If you need to provide an admin secret from the client for local/dev,
            // expose it explicitly as NEXT_PUBLIC_ADMIN_API_SECRET (not recommended for prod).
            // Use a typeof check to avoid runtime ReferenceError when `process` is not defined.
            const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET)
                ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET
                : undefined;
            if (adminSecret) {
                headers['x-admin-secret'] = adminSecret;
            }
            const res = await fetch('/api/users', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    email,
                    name,
                    role: rolesMap[role] || role,
                    role_id: role || null,
                    userType: 'Admin',
                    phone_number: phoneNumber,
                    address: addAddress || null,
                    zip: addZip || null,
                    state_id: addStateId,
                    city_id: addCityId
                })
            });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            // After modal is closed, clear the inputs and refresh list
            await hideModalById('add_user');
            setEmail('');
            setName('');
            setRole('');
            setPhoneNumber('');
            setAddAddress('');
            setAddZip('');
            setAddStateId(null);
            setAddCityId(null);
            await fetchUsers();
            // Optionally send magic link to user via client supabase or instruct admin to send
            // Show success feedback and refresh the list
            showToast('User created. A confirmation email (magic link) was requested.', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to add user', 'danger');
        } finally {
            setIsAddingUser(false);
        }
    };

    const handleToggleActive = async (record: any) => {
        const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id;
        const current = record?.admin?.is_active ?? true;
        if (!userId) return alert('User id missing');
        const ok = confirm(`Are you sure you want to ${current ? 'deactivate' : 'activate'} this admin?`);
        if (!ok) return;
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET)
                ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET
                : undefined;
            if (adminSecret) headers['x-admin-secret'] = adminSecret;
            setLoadingIds(prev => ({ ...prev, [userId]: true }));
            const res = await fetch('/api/users', { method: 'PATCH', headers, body: JSON.stringify({ action: 'toggle_active', userId, isActive: !current }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            await fetchUsers();
            setLoadingIds(prev => { const c = { ...prev }; delete c[userId]; return c; });
        } catch (e: any) {
            setLoadingIds(prev => { const c = { ...prev }; if (userId) delete c[userId]; return c; });
            alert(e.message || 'Failed to update active state');
        }
    };

    const handleSoftDelete = async (record: any) => {
        const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id;
        if (!userId) return alert('User id missing');
        const ok = confirm('Are you sure you want to delete this admin? This is a soft delete.');
        if (!ok) return;
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET)
                ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET
                : undefined;
            if (adminSecret) headers['x-admin-secret'] = adminSecret;
            setLoadingIds(prev => ({ ...prev, [userId]: true }));
            const res = await fetch('/api/users', { method: 'PATCH', headers, body: JSON.stringify({ action: 'soft_delete', userId }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            await fetchUsers();
            setLoadingIds(prev => { const c = { ...prev }; delete c[userId]; return c; });
        } catch (e: any) {
            setLoadingIds(prev => { const c = { ...prev }; if (userId) delete c[userId]; return c; });
            alert(e.message || 'Failed to delete admin');
        }
    };

    const handleEditOpen = (record: any) => {
        const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id ?? record?.id;
        setEditingUser({ id: userId, record });
        setEditEmail(record?.email ?? '');
        setEditName(record?.user_metadata?.name ?? '');
        // try to pick a stored role_id if present, fallback to existing role text
        const detectedRoleId = record?.admin?.role_id ?? record?.profile?.role_id ?? record?.user_metadata?.role_id ?? record?.role_id ?? null;
        setEditRole(detectedRoleId ? String(detectedRoleId) : (record?.user_metadata?.role ?? ''));
        setEditPhoneNumber(record?.admin?.phone_number ?? '');
        setEditAddress(record?.admin?.address ?? '');
        setEditZip(record?.admin?.zip ?? '');
        setEditStateId(record?.admin?.state_id ?? null);
        setEditCityId(record?.admin?.city_id ?? null);
        closeOpenDropdowns();
        showModalById('edit_user');
    };

    const handleEditSubmit = async (e: any) => {
        e.preventDefault();

        if (!isEditFormValid) {
            showToast('Please fill out all required fields.', 'danger');
            return;
        }

        if (!editingUser?.id) return alert('No editing user');
        const userId = editingUser.id;
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET)
                ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET
                : undefined;
            if (adminSecret) headers['x-admin-secret'] = adminSecret;
            setLoadingIds(prev => ({ ...prev, [userId]: true }));
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    action: 'edit',
                    userId,
                    email: editEmail,
                    name: editName,
                    role: rolesMap[editRole] || editRole,
                    role_id: editRole || null,
                    phone_number: editPhoneNumber,
                    address: editAddress || null,
                    zip: editZip || null,
                    state_id: editStateId,
                    city_id: editCityId
                })
            });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            await hideModalById('edit_user');
            setEditingUser(null);
            await fetchUsers();
            setLoadingIds(prev => { const c = { ...prev }; delete c[userId]; return c; });
            showToast('User updated Success', 'success');
        } catch (e: any) {
            setLoadingIds(prev => { const c = { ...prev }; if (userId) delete c[userId]; return c; });
            showToast(e.message || 'Failed to update user', 'danger');
        }
    };

    // Determine loading state for edit/reset buttons
    const isEditing = !!(editingUser && loadingIds[editingUser.id]);
    const isResetting = !!(resetUserId && loadingIds[resetUserId]);

    const handleAddOpen = () => {
        setEmail('');
        setName('');
        setRole('');
        setPhoneNumber('');
        setAddAddress('');
        setAddZip('');
        setAddStateId(null);
        setAddCityId(null);
        closeOpenDropdowns();
        showModalById('add_user');
    };

    // Sorting state
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
        key: "name_flat",
        direction: "asc",
    });

    // Pagination state
    const [pageSize, setPageSize] = useState<number>(25);
    const [currentPage, setCurrentPage] = useState<number>(1);

    // Horizontal scroll floaters
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const handleSort = (key: string) => {
        setSortConfig((prev) => {
            if (prev.key === key) {
                // Toggle direction
                return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
            }
            return { key, direction: "asc" };
        });
    };

    // Derived sorted data
    const sortedData = useMemo(() => {
        const dataCopy = [...filteredData];
        if (!sortConfig.key) return dataCopy;

        dataCopy.sort((a: any, b: any) => {
            const aVal = (a?.[sortConfig.key] ?? "").toString().toLowerCase();
            const bVal = (b?.[sortConfig.key] ?? "").toString().toLowerCase();
            if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });

        return dataCopy;
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

    // Re-evaluate scroll buttons when columns or page data change
    useEffect(() => {
        updateScrollButtons();
    }, [columnsFiltered, startIndex, endIndex]);

    // Match patients behavior: take a numeric delta and attempt smooth scroll with fallback
    const scrollByAmount = (dx: number) => {
        const el = scrollRef.current;
        if (!el) return;
        try {
            el.scrollBy({ left: dx, behavior: 'smooth' });
        } catch {
            (el as any).scrollLeft = (el as any).scrollLeft + dx;
        }
    };

    return (
        <>
            <div className="page-wrapper users-screen">
                <div className="content">
                    {/* ===== HEADER & TOOLBAR ===== */}
                    <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom users-header">
                        <div className="flex-grow-1">
                            <h4 className="fw-bold mb-0 text-dark">
                                Users{" "}
                                <span className="badge badge-soft-primary fw-medium border py-1 px-2 border-primary fs-13 ms-1">
                                    Total Users : {data.length}
                                </span>
                            </h4>
                        </div>

                    </div>

                    {/* ===== FILTER SECTION ===== */}


                    {/* ===== SAVED SEARCH & SEARCH BAR ===== */}
                    {/* ===== SEARCH BAR + TOOLBAR IN ONE LINE ===== */}
                    <div className="d-flex align-items-center justify-content-between flex-wrap">
                        <div className="d-flex align-items-center flex-wrap">

                            <div className="table-search d-flex align-items-center mb-0">
                                <div className="search-input">
                                    <SearchInput value={searchText} onChange={handleSearch} />
                                </div>
                            </div>
                        </div>

                        {/* TOOLBAR BUTTONS TO THE RIGHT */}
                        <div className="users-toolbar d-flex align-items-center flex-wrap gap-2">

                            <div className="saved-search-dropdown dropdown">
                                <button
                                    className="btn btn-darkish dropdown-toggle"
                                    type="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    <i className="ti ti-bookmark me-1"></i>
                                    {selectedSavedSearch
                                        ? savedSearches.find((s) => s.id === selectedSavedSearch)?.name || "Saved Searches"
                                        : "Saved Searches"}
                                </button>

                                <ul className="dropdown-menu" style={{ maxHeight: "300px", overflowY: "auto" }}>
                                    <li>
                                        <button
                                            className="dropdown-item text-muted"
                                            type="button"
                                            onClick={() => {
                                                setSelectedSavedSearch("");
                                                setFiltersDraft({ phone: "", roleId: "", address: "", zip: "", stateId: "", cityId: "", status: "" });
                                                setAppliedFilters({ phone: "", roleId: "", address: "", zip: "", stateId: "", cityId: "", status: "" });
                                            }}
                                        >
                                            <i className="ti ti-x me-2" />
                                            Clear Selection
                                        </button>
                                    </li>
                                    <li>
                                        <hr className="dropdown-divider" />
                                    </li>

                                    {savedSearches.map((search) => (
                                        <li key={search.id}>
                                            <div
                                                className="d-flex align-items-center justify-content-between px-3 py-2 saved-search-item"
                                                style={{ cursor: "pointer", transition: "background-color 0.2s" }}
                                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8f9fa")}
                                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                            >
                                                <button
                                                    className="btn btn-link text-start text-decoration-none flex-grow-1 p-0"
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleApplySavedSearch(search.id);
                                                        const dropdown = e.currentTarget.closest(".dropdown");
                                                        if (dropdown) {
                                                            const btn = dropdown.querySelector("[data-bs-toggle='dropdown']") as HTMLElement;
                                                            if (btn) btn.click();
                                                        }
                                                    }}
                                                    style={{
                                                        border: "none",
                                                        background: "none",
                                                        color: selectedSavedSearch === search.id ? "#0d6efd" : "#212529",
                                                        fontWeight: selectedSavedSearch === search.id ? "600" : "400",
                                                    }}
                                                >
                                                    <i
                                                        className={`ti ti-${selectedSavedSearch === search.id ? "check" : "bookmark"
                                                            } me-2`}
                                                    />
                                                    {search.name}
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    className="btn btn-link text-danger p-0 ms-2"
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteSavedSearch(search.id);
                                                    }}
                                                    title="Delete this saved search"
                                                    style={{
                                                        border: "none",
                                                        background: "none",
                                                        fontSize: "16px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    <i className="ti ti-trash" />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>



                            <button
                                className="btn btn-darkish btn-sm"
                                onClick={() => {
                                    setShowFilters((s) => !s);
                                    closeOpenDropdowns();
                                }}
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
                                className={`btn btn-darkish btn-sm ${isUploading ? "disabled" : ""}`}
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
                                    style={{ display: "none" }}
                                />
                            </label>

                            <button
                                className="btn btn-light btn-sm"
                                onClick={() => showModalById("grid_columns_users")}
                                title="Grid Columns"
                            >
                                <i className="ti ti-columns-3" />
                            </button>

                            <button className="btn btn-primary btn-sm" onClick={handleAddOpen}>
                                <i className="ti ti-plus me-1" /> <span>New User</span>
                            </button>
                        </div>
                    </div>
                    {showFilters && (
                        <div className="filter-panel border rounded p-3 mb-3">
                            <div className="row g-3">
                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">Role</label>
                                    <select
                                        className="form-select"
                                        value={filtersDraft.roleId}
                                        onChange={(e) =>
                                            setFiltersDraft((prev) => ({ ...prev, roleId: e.target.value }))
                                        }
                                    >
                                        <option value="">All Roles</option>
                                        {roleOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">Phone</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Filter by phone..."
                                        value={filtersDraft.phone}
                                        onChange={(e) => setFiltersDraft(prev => ({ ...prev, phone: e.target.value }))}
                                    />
                                </div>

                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">Address</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Filter by address..."
                                        value={filtersDraft.address}
                                        onChange={(e) => setFiltersDraft(prev => ({ ...prev, address: e.target.value }))}
                                    />
                                </div>

                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">Zip</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Filter by zip..."
                                        value={filtersDraft.zip}
                                        onChange={(e) => setFiltersDraft(prev => ({ ...prev, zip: e.target.value }))}
                                    />
                                </div>

                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">State</label>
                                    <SearchSelect
                                        options={stateOptions}
                                        value={filtersDraft.stateId}
                                        onChange={(val) => {
                                            setFiltersDraft(prev => ({ ...prev, stateId: val ? String(val) : '', cityId: '' }));
                                        }}
                                        placeholder="Select state..."
                                    />
                                </div>

                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">City</label>
                                    <SearchSelect
                                        options={cityOptionsFilter}
                                        value={filtersDraft.cityId}
                                        onChange={(val) => setFiltersDraft(prev => ({ ...prev, cityId: val ? String(val) : '' }))}
                                        placeholder="Select city..."
                                        disabled={!filtersDraft.stateId}
                                    />
                                </div>

                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">Status</label>
                                    <select
                                        className="form-select"
                                        value={filtersDraft.status}
                                        onChange={(e) =>
                                            setFiltersDraft((prev) => ({
                                                ...prev,
                                                status: e.target.value as Filters["status"],
                                            }))
                                        }
                                    >
                                        <option value="">All</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="d-flex justify-content-end mt-3">
                                <button
                                    type="button"
                                    className="btn btn-white border me-2"
                                    onClick={() => {
                                        setFiltersDraft({ phone: "", roleId: "", address: "", zip: "", stateId: "", cityId: "", status: "" });
                                        setAppliedFilters({ phone: "", roleId: "", address: "", zip: "", stateId: "", cityId: "", status: "" });
                                        setSelectedSavedSearch("");
                                    }}
                                >
                                    Clear
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-success me-2"
                                    onClick={() => {
                                        setShowSaveSearchModal(true);
                                    }}
                                    disabled={
                                        !filtersDraft.phone && !filtersDraft.roleId && !filtersDraft.address && !filtersDraft.zip && !filtersDraft.stateId && !filtersDraft.cityId && !filtersDraft.status
                                    }
                                >
                                    <i className="ti ti-device-floppy me-1" /> Save
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary me-2"
                                    onClick={() => setAppliedFilters(filtersDraft)}
                                >
                                    Go
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setShowFilters(false)}
                                    title="Close filters"
                                >
                                    <i className="ti ti-chevron-up" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ===== Dynamic table driven by columnsFiltered with horizontal scroll (match patients UI) ===== */}
                    <div className="users-table-container">
                        <div ref={scrollRef} className="table-responsive users-scroll">
                            <table className="table table-striped table-hover align-middle users-table">
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
                                    {pagedData.length === 0 ? (
                                        <tr>
                                            <td colSpan={columnsFiltered.length} className="text-center py-4 text-muted">No users found</td>
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

                        {/* Fixed bottom-right horizontal scroll floaters (double arrows) - same as patients */}
                        {(canScrollLeft || canScrollRight) && (
                            <div className="hscroll-floaters">
                                {canScrollLeft && (
                                    <button
                                        type="button"
                                        className="hscroll-btn"
                                        aria-label="Scroll left"
                                        onClick={() => {
                                            const el = scrollRef.current;
                                            const step = el ? Math.max(240, Math.floor(el.clientWidth * 0.8)) : 240;
                                            scrollByAmount(-step);
                                        }}
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
                                        onClick={() => {
                                            const el = scrollRef.current;
                                            const step = el ? Math.max(240, Math.floor(el.clientWidth * 0.8)) : 240;
                                            scrollByAmount(step);
                                        }}
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
            </div>


            {/* Grid Columns Modal */}
            <div id="grid_columns_users" className="modal fade" tabIndex={-1} aria-hidden="true">
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
                            <button type="button" className="btn btn-white border" onClick={() => hideModalById('grid_columns_users')}>Cancel</button>
                            <button type="button" className="btn btn-primary" onClick={handleSaveGridColumns} disabled={isSavingCols}>
                                {isSavingCols ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* Reset Password Modal */}
            <div id="reset_password_user" className="modal fade" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Reset Password</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" onClick={() => hideModalById('reset_password_user')} />
                        </div>
                        <form onSubmit={handleResetSubmit}>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">New Password <span className="text-danger">*</span></label>
                                    <div className="input-group">
                                        <input className="form-control" type={resetShowPassword ? 'text' : 'password'} value={resetPassword} onChange={e => setResetPassword(e.target.value)} />
                                        <button type="button" className="btn btn-light border" onClick={() => setResetShowPassword(s => !s)} aria-label="Toggle password visibility">
                                            <i className={resetShowPassword ? 'ti ti-eye-off' : 'ti ti-eye'} />
                                        </button>
                                    </div>
                                </div>
                                <div className="mb-0">
                                    <label className="form-label">Confirm Password <span className="text-danger">*</span></label>
                                    <div className="input-group">
                                        <input className="form-control" type={resetShowConfirm ? 'text' : 'password'} value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} />
                                        <button type="button" className="btn btn-light border" onClick={() => setResetShowConfirm(s => !s)} aria-label="Toggle confirm password visibility">
                                            <i className={resetShowConfirm ? 'ti ti-eye-off' : 'ti ti-eye'} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-white border" data-bs-dismiss="modal" onClick={() => hideModalById('reset_password_user')}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={!isResetFormValid || isResetting}>
                                    {isResetting ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : 'Set Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Edit User Modal */}
            <div id="edit_user" className="modal fade" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-md modal-dialog-centered">
                    <div className="modal-content user-form-modal">
                        <div className="modal-header py-2 px-3 border-0 bg-teal-700 text-white rounded-top">
                            <h5 className="modal-title fw-semibold">Edit User</h5>

                        </div>


                        <form onSubmit={handleEditSubmit}>
                            <div className="modal-body px-4 pt-3 pb-1">
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">
                                        Name: <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control required-field"
                                        placeholder="Enter full name"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                    />
                                </div>

                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">
                                        Email: <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        className="form-control required-field"
                                        placeholder="Enter email address"
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                    />
                                </div>

                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">
                                        Phone Number: <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control required-field"
                                        placeholder="e.g. +1234567890"
                                        value={editPhoneNumber}
                                        onChange={(e) => setEditPhoneNumber(e.target.value)}
                                    />
                                </div>

                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">
                                        Role: <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className="form-select required-field"
                                        value={editRole}
                                        onChange={(e) => setEditRole(e.target.value)}
                                    >
                                        <option value="">Select Role</option>
                                        {roleOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">
                                        State <span className="text-danger">*</span>
                                    </label>
                                    <SearchSelect
                                        options={stateOptions}
                                        value={editStateId}
                                        onChange={(val) => {
                                            setEditStateId(val ? Number(val) : null);
                                            setEditCityId(null);
                                        }}
                                        placeholder="Select state..."
                                        inputClassName="required-field"
                                    />
                                </div>

                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">
                                        City <span className="text-danger">*</span>
                                    </label>
                                    <SearchSelect
                                        options={cityOptionsEdit}
                                        value={editCityId}
                                        onChange={(val) => setEditCityId(val ? Number(val) : null)}
                                        placeholder="Select city..."
                                        disabled={!editStateId}
                                        inputClassName="required-field"
                                    />
                                </div>

                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">
                                        Address <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control required-field"
                                        placeholder="Enter address"
                                        value={editAddress}
                                        onChange={(e) => setEditAddress(e.target.value)}
                                    />
                                </div>

                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">
                                        Zip <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control required-field"
                                        placeholder="Enter zip code"
                                        value={editZip}
                                        onChange={(e) => setEditZip(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="modal-footer border-top py-2 px-2.5 d-flex justify-content-end gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-danger px-3"
                                    data-bs-dismiss="modal"
                                    onClick={() => hideModalById("edit_user")}
                                >
                                    <i className="ti ti-x me-1"></i> Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="btn btn-success px-4"
                                    disabled={!isEditFormValid || isEditing}
                                >
                                    {isEditing ? (
                                        <span
                                            className="spinner-border spinner-border-sm"
                                            role="status"
                                            aria-hidden="true"
                                        ></span>
                                    ) : (
                                        <>
                                            <i className="ti ti-device-floppy me-1"></i> Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>


            {/* Add User Modal */}
            {/* Add User Modal */}
            <div id="add_user" className="modal fade" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-md modal-dialog-centered">
                    <div className="modal-content user-form-modal">
                        {/* Header */}
                        <div className="modal-header justify-content-center py-3 border-0 bg-teal-700 text-white rounded-top">
                            <h5 className="modal-title fw-semibold text-center mb-0">
                                Add New User
                            </h5>

                        </div>

                        {/* Section Header */}


                        {/* Form */}
                        <form onSubmit={handleAddUser}>
                            <div className="modal-body px-4 pt-3 pb-1">
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">
                                        Name <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control required-field"
                                        placeholder="Enter full name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>

                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">
                                        Email <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        className="form-control required-field"
                                        placeholder="Enter email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">
                                        Phone Number <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control required-field"
                                        placeholder="e.g. +1234567890"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                    />
                                </div>

                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">
                                        Role <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className="form-select required-field"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                    >
                                        <option value="">Select Role</option>
                                        {roleOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">
                                        State <span className="text-danger">*</span>
                                    </label>
                                    <SearchSelect
                                        options={stateOptions}
                                        value={addStateId}
                                        onChange={(val) => {
                                            setAddStateId(val ? Number(val) : null);
                                            setAddCityId(null);
                                        }}
                                        placeholder="Select state..."
                                        inputClassName="required-field"
                                    />
                                </div>

                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">
                                        City <span className="text-danger">*</span>
                                    </label>
                                    <SearchSelect
                                        options={cityOptionsAdd}
                                        value={addCityId}
                                        onChange={(val) => setAddCityId(val ? Number(val) : null)}
                                        placeholder="Select city..."
                                        disabled={!addStateId}
                                        inputClassName="required-field"
                                    />
                                </div>

                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">
                                        Address <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control required-field"
                                        placeholder="Enter address"
                                        value={addAddress}
                                        onChange={(e) => setAddAddress(e.target.value)}
                                    />
                                </div>

                                <div className="form-row mb-0">
                                    <label className="form-label text-dark fw-semibold">
                                        Zip <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control required-field"
                                        placeholder="Enter zip code"
                                        value={addZip}
                                        onChange={(e) => setAddZip(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="modal-footer border-top py-2 px-2.5 d-flex justify-content-end gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-danger px-3"
                                    data-bs-dismiss="modal"
                                    onClick={() => hideModalById("add_user")}
                                >
                                    <i className="ti ti-x me-1"></i> Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="btn btn-success px-4"
                                    disabled={!isAddFormValid || isAddingUser}
                                >
                                    {isAddingUser ? (
                                        <span
                                            className="spinner-border spinner-border-sm"
                                            role="status"
                                            aria-hidden="true"
                                        ></span>
                                    ) : (
                                        <>
                                            <i className="ti ti-device-floppy me-1"></i> Add New User
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
                            <button type="button" className="btn-close" onClick={() => { setShowSaveSearchModal(false); setSaveSearchName(''); }} aria-label="Close" />
                        </div>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label">Search Name <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={saveSearchName}
                                    onChange={e => setSaveSearchName(e.target.value)}
                                    placeholder="e.g. Active Admins"
                                    autoFocus
                                />
                            </div>

                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-white border" onClick={() => { setShowSaveSearchModal(false); setSaveSearchName(''); }}>Cancel</button>
                            <button type="button" className="btn btn-primary" onClick={handleSaveSearch} disabled={!saveSearchName.trim() || isSavingSearch}>
                                {isSavingSearch ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="ti ti-device-floppy me-1" />}
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

export default UsersComponent;