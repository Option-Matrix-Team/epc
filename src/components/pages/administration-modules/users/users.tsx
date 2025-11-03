"use client";

import { useEffect, useState, useMemo } from "react"; // 1. Import useMemo
import Datatable from "@/core/common/dataTable";
import { all_routes } from "@/routes/all_routes";
import Link from "next/link";
import CommonSelect from "@/core/common/common-select/commonSelect";
import { StatusActive } from "@/core/common/selectOption";
import ImageWithBasePath from "@/core/imageWithBasePath";
import SearchInput from "@/core/common/dataTable/dataTableSearch";
import getSupabaseClient from "@/lib/supabaseClient";

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
    type Filters = { phone: string; roleId: string; status: '' | 'active' | 'inactive' };
    const [showFilters, setShowFilters] = useState(false);
    const [filtersDraft, setFiltersDraft] = useState<Filters>({ phone: '', roleId: '', status: '' });
    const [appliedFilters, setAppliedFilters] = useState<Filters>({ phone: '', roleId: '', status: '' });

    // Saved Searches state
    type SavedSearch = { id: string; name: string; filters: Filters };
    const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
    const [selectedSavedSearch, setSelectedSavedSearch] = useState<string>('');
    const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
    const [saveSearchName, setSaveSearchName] = useState('');
    const [isSavingSearch, setIsSavingSearch] = useState(false);

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
            const headers = ['Name', 'Email', 'Phone Number', 'Role'];
            const rows = processedData.map(record => [
                record.name_flat || '',
                record.email_flat || '',
                record?.admin?.phone_number || '',
                record.role_flat || ''
            ]);
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
            const headers = ['Name', 'Email', 'Phone Number', 'Role'];
            const sampleRow = ['John Doe', 'john@example.com', '+1234567890', 'Admin'];
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
                const [name, email, phone, roleName] = values;

                if (!name || !email || !roleName) {
                    errorCount++;
                    continue;
                }

                try {
                    const roleEntry = Object.entries(rolesMap).find(([_, rName]) => rName.toLowerCase() === roleName.toLowerCase());
                    const role_id = roleEntry ? roleEntry[0] : null;

                    const headers: any = { 'Content-Type': 'application/json' };
                    const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET) ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET : undefined;
                    if (adminSecret) headers['x-admin-secret'] = adminSecret;

                    const res = await fetch('/api/users', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ email, name, role: roleName, role_id, userType: 'Admin', phone_number: phone || null })
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

    useEffect(() => { fetchUsers(); }, []);
    useEffect(() => { fetchRoleOptions('Admin'); }, []);

    // 2. Create processedData to flatten properties for filtering
    const processedData = useMemo(() => {
        return data.map(record => {
            const roleId = record?.admin?.role_id ?? record?.profile?.role_id ?? record?.user_metadata?.role_id ?? record?.role_id;
            const roleName = (roleId && rolesMap[String(roleId)]) ? rolesMap[String(roleId)] : (record.profile?.user_type ?? record?.user_metadata?.role ?? 'User');

            return {
                ...record, // Keep the original record for render functions that need it
                // Add flattened, searchable properties
                name_flat: record.user_metadata?.name ?? record.email,
                email_flat: record.email,
                role_flat: roleName,
                role_id_flat: roleId ?? null,
                phone_flat: record?.admin?.phone_number ?? '',
                is_active_flat: !!(record?.admin?.is_active),
            };
        });
    }, [data, rolesMap]);

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
        if (f.status) {
            rows = rows.filter((r: any) => {
                const active = !!(r?.is_active_flat ?? r?.admin?.is_active);
                return f.status === 'active' ? active : !active;
            });
        }
        return rows;
    }, [processedData, appliedFilters]);

    // 3. Update columns to use the flat dataIndex
    const columns = [
        { title: 'Name', dataIndex: 'name_flat', sorter: (a: any, b: any) => (a.name_flat || '').localeCompare(b.name_flat || '') },
        { title: 'Email', dataIndex: 'email_flat', sorter: (a: any, b: any) => (a.email_flat || '').localeCompare(b.email_flat || '') },

        { title: 'Phone', dataIndex: 'admin.phone_number', sorter: (a: any, b: any) => (a?.admin?.phone_number || '').localeCompare(b?.admin?.phone_number || ''), render: (_: any, record: any) => record?.admin?.phone_number ?? '' },
        { title: 'Role', dataIndex: 'role_flat', sorter: (a: any, b: any) => (a.role_flat || '').localeCompare(b.role_flat || '') },

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
            title: 'Status', dataIndex: 'admin.is_active', render: (_: any, record: any) => {
                // The render function still receives the full 'record' object from processedData
                const isActive = record?.admin?.is_active ?? false;
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
        return !!(name && email && role);
    }, [name, email, role]);

    const isEditFormValid = useMemo(() => {
        return !!(editingUser && editName && editEmail && editRole);
    }, [editingUser, editName, editEmail, editRole]);

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
                body: JSON.stringify({ email, name, role: rolesMap[role] || role, role_id: role || null, userType: 'Admin', phone_number: phoneNumber })
            });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            // After modal is closed, clear the inputs and refresh list
            await hideModalById('add_user');
            setEmail(''); setName(''); setRole(''); setPhoneNumber('');
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
            const res = await fetch('/api/users', { method: 'PATCH', headers, body: JSON.stringify({ action: 'edit', userId, email: editEmail, name: editName, role: rolesMap[editRole] || editRole, role_id: editRole || null, phone_number: editPhoneNumber }) });
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
        closeOpenDropdowns();
        showModalById('add_user');
    };


    return (
        <>
            <div className="page-wrapper">
                <div className="content">
                    <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 mb-3 pb-3 border-bottom">
                        <div className="flex-grow-1"><h4 className="fw-bold mb-0">Users <span className="badge badge-soft-primary fw-medium border py-1 px-2 border-primary fs-13 ms-1">
                            Total Users : {data.length}
                        </span></h4></div>

                        {/* Filter is now inside Datatable toolbar to match shadcn look */}

                        <div className="text-end d-flex">
                            <button
                                className="btn btn-outline-primary me-2 fs-13 btn-md"
                                onClick={() => { setShowFilters(s => !s); closeOpenDropdowns(); }}
                                title="Toggle filters"
                            >
                                <i className="ti ti-filter me-1" /> Filters
                            </button>
                            <button onClick={downloadTemplate} className="btn btn-secondary me-2 fs-13 btn-md d-flex align-items-center justify-content-center" title="Download Template" style={{ width: '40px', height: '38px', padding: '0' }}>
                                <i className="ti ti-download" style={{ fontSize: '18px' }} />
                            </button>
                            <button onClick={downloadCSV} className="btn btn-info me-2 fs-13 btn-md d-flex align-items-center justify-content-center" title="Download CSV" style={{ width: '40px', height: '38px', padding: '0' }}>
                                <i className="ti ti-file-download" style={{ fontSize: '18px' }} />
                            </button>
                            <label className="btn btn-warning me-2 fs-13 btn-md d-flex align-items-center justify-content-center" title="Upload CSV" style={{ cursor: isUploading ? 'not-allowed' : 'pointer', width: '40px', height: '38px', padding: '0', margin: '0' }}>
                                {isUploading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : <i className="ti ti-upload" style={{ fontSize: '18px' }} />}
                                <input type="file" accept=".csv" onChange={handleCSVUpload} disabled={isUploading} style={{ display: 'none' }} />
                            </label>
                            <button className="btn btn-outline-secondary me-2 fs-13 btn-md d-flex align-items-center justify-content-center" onClick={() => showModalById('grid_columns_users')} title="Grid Columns" style={{ width: '40px', height: '38px', padding: '0' }}>
                                <i className="ti ti-columns-3" style={{ fontSize: '18px' }} />
                            </button>
                            <button className="btn btn-primary fs-13 btn-md" onClick={handleAddOpen}>
                                <i className="ti ti-plus me-1" /> New User
                            </button>
                        </div>
                    </div>
                    {showFilters && (
                        <div className="border rounded p-3 mb-3">
                            <div className="row g-3">
                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">Phone</label>
                                    <input
                                        className="form-control"
                                        value={filtersDraft.phone}
                                        onChange={e => setFiltersDraft(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="e.g. +1234567890"
                                    />
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">Role</label>
                                    <select
                                        className="form-select"
                                        value={filtersDraft.roleId}
                                        onChange={e => setFiltersDraft(prev => ({ ...prev, roleId: e.target.value }))}
                                    >
                                        <option value="">All Roles</option>
                                        {roleOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <label className="form-label">Status</label>
                                    <select
                                        className="form-select"
                                        value={filtersDraft.status}
                                        onChange={e => setFiltersDraft(prev => ({ ...prev, status: e.target.value as Filters['status'] }))}
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
                                    onClick={() => { setFiltersDraft({ phone: '', roleId: '', status: '' }); setAppliedFilters({ phone: '', roleId: '', status: '' }); setSelectedSavedSearch(''); }}
                                >
                                    Clear
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-success me-2"
                                    onClick={() => { setShowSaveSearchModal(true); }}
                                    disabled={!filtersDraft.phone && !filtersDraft.roleId && !filtersDraft.status}
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
                    <div className="d-flex align-items-center justify-content-between flex-wrap">
                        <div>
                            <div className="search-set mb-3">
                                <div className="d-flex align-items-center flex-wrap gap-2">
                                    {savedSearches.length > 0 && (
                                        <div className="dropdown mb-0">
                                            <button
                                                className="btn btn-sm btn-outline-primary dropdown-toggle"
                                                type="button"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                                style={{ minWidth: '200px' }}
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
                                                            setFiltersDraft({ phone: '', roleId: '', status: '' });
                                                            setAppliedFilters({ phone: '', roleId: '', status: '' });
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
                                                            className="d-flex align-items-center justify-content-between px-3 py-2"
                                                            style={{
                                                                cursor: 'pointer',
                                                                transition: 'background-color 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                        >
                                                            <button
                                                                className="btn btn-link text-start text-decoration-none flex-grow-1 p-0"
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleApplySavedSearch(search.id);
                                                                    // Close dropdown after selection
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
                                    <div className="table-search d-flex align-items-center mb-0">
                                        <div className="search-input">
                                            <SearchInput value={searchText} onChange={handleSearch} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="d-flex table-dropdown mb-3 right-content align-items-center flex-wrap row-gap-3">
                            {/* keep existing filters/sort controls if desired */}
                        </div>
                    </div>
                    <div className="table-responsive">
                        {/* 4. Use processedData for the dataSource with shadcn toolbar */}
                        <Datatable
                            columns={columnsFiltered}
                            dataSource={filteredData}
                            Selection={false}
                            searchText={searchText}
                        />
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
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Edit User</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" onClick={() => hideModalById('edit_user')} />
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">Name <span className="text-danger">*</span></label>
                                    <input className="form-control" value={editName} onChange={e => setEditName(e.target.value)} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Email <span className="text-danger">*</span></label>
                                    <input className="form-control" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Phone Number</label>
                                    <input className="form-control" value={editPhoneNumber} onChange={e => setEditPhoneNumber(e.target.value)} />
                                </div>
                                <div className="mb-0">
                                    <label className="form-label">Role <span className="text-danger">*</span></label>
                                    <select className="form-select" value={editRole} onChange={e => setEditRole(e.target.value)}>
                                        <option value="">Select role</option>
                                        {roleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-white border" data-bs-dismiss="modal" onClick={() => hideModalById('edit_user')}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={!isEditFormValid || isEditing}>
                                    {isEditing ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Add User Modal */}
            <div id="add_user" className="modal fade" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">New User</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" onClick={() => hideModalById('add_user')} />
                        </div>
                        <form onSubmit={handleAddUser}>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">Name <span className="text-danger">*</span></label>
                                    <input className="form-control" value={name} onChange={e => setName(e.target.value)} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Email <span className="text-danger">*</span></label>
                                    <input className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Phone Number</label>
                                    <input className="form-control" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                                </div>
                                <div className="mb-0">
                                    <label className="form-label">Role <span className="text-danger">*</span></label>
                                    <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                                        <option value="">Select role</option>
                                        {roleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-white border" data-bs-dismiss="modal" onClick={() => hideModalById('add_user')}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={!isAddFormValid || isAddingUser}>
                                    {isAddingUser ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : 'Add New User'}
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