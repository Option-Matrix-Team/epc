"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Datatable from '@/core/common/dataTable';
import ImageWithBasePath from '@/core/imageWithBasePath';
import { all_routes } from '../../../../routes/all_routes';
import SearchInput from '@/core/common/dataTable/dataTableSearch';
import getSupabaseClient from '@/lib/supabaseClient';
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

const PatientsComponent = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [addPhoneNumber, setAddPhoneNumber] = useState("");
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [editingPatient, setEditingPatient] = useState<any | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editDob, setEditDob] = useState("");
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
  const [resetPatientId, setResetPatientId] = useState<string | null>(null);
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

  // Saved Searches state
  const SCREEN_KEY = 'patients';
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
      const headers = ['Name', 'Email', 'Date of Birth', 'Address', 'Zip', 'State', 'City'];
      const rows = data.map(record => {
        const stateId = record?.patient?.state_id;
        const cityId = record?.patient?.city_id;
        const stateName = stateId ? (states.find(s => s.id === stateId)?.name ?? '') : '';
        const cityName = cityId ? (cities.find(c => c.id === cityId)?.name ?? '') : '';
        return [
          record.user_metadata?.name ?? record.email,
          record.email ?? '',
          record?.patient?.dob ?? '',
          record?.patient?.address ?? '',
          record?.patient?.zip ?? '',
          stateName,
          cityName
        ];
      });
      const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `patients_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast('CSV downloaded successfully', 'success');
    } catch (e: any) {
      showToast('Failed to download CSV: ' + e.message, 'danger');
    }
  };

  const handleShadowLogin = (record: any) => {
    try {
      const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id;
      if (!userId) {
        showToast('Unable to determine user for shadow login', 'danger');
        return;
      }
      // Placeholder behavior: hook up your real impersonation endpoint here
      console.debug('[patients] Shadow Login clicked for', userId);
      showToast('Shadow login action triggered', 'info');
      // Example (if you add an endpoint): window.open(`/api/impersonate?userId=${userId}`, '_blank');
    } catch (e) {
      console.error('[patients] handleShadowLogin error', e);
      showToast('Shadow login failed to start', 'danger');
    }
  };

  const downloadTemplate = () => {
    try {
      const headers = ['Name', 'Email', 'Date of Birth', 'Address', 'Zip', 'State', 'City'];
      const sampleRow = ['Alice Johnson', 'alice@example.com', '1990-01-15', '789 Pine St', '67890', 'New York', 'New York'];
      const csvContent = [headers, sampleRow].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'patients_template.csv';
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
        const [name, email, dob, address, zip, stateName, cityName] = values;

        if (!name || !email || !dob) {
          errorCount++;
          continue;
        }

        try {
          // Find state by name
          const state = states.find(s => s.name.toLowerCase() === stateName.toLowerCase());
          const state_id = state?.id ?? null;

          // Find city by name and state
          const city = state_id ? cities.find(c => c.name.toLowerCase() === cityName.toLowerCase() && c.state_id === state_id) : null;
          const city_id = city?.id ?? null;

          const headers: any = { 'Content-Type': 'application/json' };
          const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET) ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET : undefined;
          if (adminSecret) headers['x-admin-secret'] = adminSecret;

          const res = await fetch('/api/patients', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              email,
              name,
              dob,
              userType: 'Patient',
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
          console.error(`Failed to import patient ${email}:`, e);
          errorCount++;
        }
      }

      await fetchPatients();
      showToast(`Import complete: ${successCount} patients added, ${errorCount} failed`, successCount > 0 ? 'success' : 'danger');
    } catch (e: any) {
      showToast('Failed to upload CSV: ' + e.message, 'danger');
    } finally {
      setIsUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  // Toast helpers
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

  // Safe JSON parser for fetch responses
  const parseJSONSafe = async (res: Response): Promise<any> => {
    const contentType = res.headers.get('content-type') || '';
    // Non-OK responses: read text and surface a meaningful error
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      // If server returned HTML (e.g. Next.js 404/500 page), avoid throwing the whole document into the console.
      if (txt && /^\s*<!doctype html>|^\s*<html/i.test(txt) || contentType.includes('text/html')) {
        // Try to extract a short title/message from the HTML if present
        const titleMatch = txt.match(/<title>(.*?)<\/title>/i);
        const short = titleMatch ? titleMatch[1].trim() : `HTTP ${res.status} ${res.statusText || ''}`;
        // log full body to debug (non-fatal) but throw a concise error message
        try { console.debug('[patients] server returned HTML:', txt.slice(0, 2000)); } catch (_) { }
        throw new Error(short || `Request failed with status ${res.status}`);
      }
      // For other non-JSON error responses, return a concise message rather than the full body
      const plain = txt ? txt.trim().slice(0, 500) : `Request failed with status ${res.status}`;
      throw new Error(plain);
    }
    // Expect JSON
    if (contentType.includes('application/json')) {
      try {
        return await res.json();
      } catch (err) {
        const txt = await res.text().catch(() => '');
        const short = txt ? (txt.trim().slice(0, 300)) : String(err);
        console.debug('[patients] invalid JSON response body:', short);
        throw new Error('Invalid JSON response');
      }
    }
    // If not JSON, surface a short preview of the response to help debugging (e.g. HTML 404 page)
    const txt = await res.text().catch(() => '');
    if (txt && /^\s*<!doctype html>|^\s*<html/i.test(txt) || contentType.includes('text/html')) {
      const titleMatch = txt.match(/<title>(.*?)<\/title>/i);
      const short = titleMatch ? titleMatch[1].trim() : `Unexpected HTML response (status ${res.status || 'unknown'})`;
      console.debug('[patients] unexpected HTML response body preview:', txt.slice(0, 1000));
      throw new Error(short);
    }
    throw new Error('Expected JSON response but received non-JSON content');
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
          } catch (cleanupErr) { console.debug('[patients] hideModal cleanup', cleanupErr); }
          resolve();
        };

        try {
          if (bs && bs.Modal) {
            // @ts-ignore
            const inst = bs.Modal.getInstance(modalEl) ?? bs.Modal.getOrCreateInstance?.(modalEl) ?? new bs.Modal(modalEl);
            const onHidden = () => { try { modalEl.removeEventListener('hidden.bs.modal', onHidden); } catch (_) { }; finish(); };
            modalEl.addEventListener('hidden.bs.modal', onHidden);
            try { inst?.hide?.(); } catch (hideErr) { console.debug('[patients] bootstrap hide threw', hideErr); }
            setTimeout(() => finish(), 600);
            return;
          }
        } catch (err) {
          console.debug('[patients] bootstrap modal hide failed', err);
        }

        finish();
      } catch (e) {
        console.debug('[patients] hideModalById error', e);
        resolve();
      }
    });
  };

  // Show Bootstrap modal by id with graceful fallback (matches users.tsx behavior)
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
        console.debug('[patients] bootstrap.Modal show failed', innerErr);
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
      console.error('[patients] showModalById error', e);
    }
  };

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/patients?userType=Patient');
      const json = await parseJSONSafe(res);
      setData(json.users || json.patients || []);
    } catch (e) {
      console.error('[patients] fetchPatients error', e);
      showToast((e as Error).message || 'Failed to load patients', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatients(); fetchStatesAndCities(); }, []);

  const fetchStatesAndCities = async () => {
    try {
      const [sRes, cRes] = await Promise.all([fetch('/api/states'), fetch('/api/cities')]);
      const sJson = await sRes.json().catch(() => ({}));
      const cJson = await cRes.json().catch(() => ({}));
      setStates(sJson.states || []);
      setCities(cJson.cities || []);
    } catch (e) {
      console.debug('[patients] failed to load states/cities', e);
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
        console.debug('[patients] failed to get user', e);
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
      console.debug('[patients] loadSavedSearches error', e);
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
    { title: 'Actions', key: 'actions' },
    { title: 'Status', key: 'status', sortKey: 'is_active_flat' },
    { title: 'Name', dataIndex: 'user_metadata.name', sortKey: 'name_flat' },
    { title: 'Email', dataIndex: 'email', sortKey: 'email_flat' },
    { title: 'Phone', dataIndex: 'phone_flat', sortKey: 'phone_flat' },
    { title: 'State', dataIndex: 'patient.state_id', render: (v: any, r: any) => { const sid = r?.patient?.state_id ?? null; const st = states.find((s: any) => String(s.id) === String(sid)); return st ? st.name : (r?.patient?.state_name ?? ''); } },
    { title: 'City', dataIndex: 'patient.city_id', render: (v: any, r: any) => { const cid = r?.patient?.city_id ?? null; const ct = cities.find((c: any) => String(c.id) === String(cid)); return ct ? ct.name : (r?.patient?.city_name ?? ''); } },
    { title: 'Zip Code', dataIndex: 'patient.zip', sortKey: 'zip_flat' },
    { title: 'Address', dataIndex: 'patient.address', sortKey: 'address_flat' },
    { title: 'Reset Password', key: 'reset_password' },
    { title: 'Date Created', dataIndex: 'created_at', sortKey: 'created_at_flat', render: (_: any, r: any) => formatDateTime(r?.created_at_flat ?? r?.patient?.created_at ?? r?.created_at ?? r?.user?.created_at) },
    { title: 'Last Updated', dataIndex: 'updated_at', sortKey: 'updated_at_flat', render: (_: any, r: any) => formatDateTime(r?.updated_at_flat ?? r?.patient?.updated_at ?? r?.updated_at ?? r?.user?.updated_at) },
  ];

  // Flatten common fields for filtering
  const processedData = useMemo(() => {
    return (data || []).map((record: any) => {
      const nameFlat = record?.user_metadata?.name ?? record?.email ?? '';
      const emailFlat = record?.email ?? '';
      const addressFlat = record?.patient?.address ?? '';
      const zipFlat = record?.patient?.zip ?? '';
      const phoneFlat = record?.patient?.phone_number ?? record?.patient?.phone ?? record?.profile?.phone ?? record?.user_metadata?.phone ?? record?.admin?.phone_number ?? '';
      const stateIdFlat = record?.patient?.state_id ?? null;
      const cityIdFlat = record?.patient?.city_id ?? null;
      const isActiveFlat = (record?.patient?.is_active ?? record?.admin?.is_active ?? true) ? true : false;
      const dobFlat = record?.date_of_birth ?? record?.patient?.date_of_birth ?? record?.profile?.date_of_birth ?? record?.user_metadata?.date_of_birth ?? record?.user_metadata?.dob ?? '';
      const createdAtFlat = record?.patient?.created_at ?? record?.created_at ?? record?.user?.created_at ?? '';
      const updatedAtFlat = record?.patient?.updated_at ?? record?.updated_at ?? record?.user?.updated_at ?? '';
      return {
        ...record,
        name_flat: nameFlat,
        email_flat: emailFlat,
        address_flat: addressFlat,
        zip_flat: zipFlat,
        phone_flat: phoneFlat,
        state_id_flat: stateIdFlat,
        city_id_flat: cityIdFlat,
        is_active_flat: isActiveFlat,
        dob_flat: dobFlat,
        created_at_flat: createdAtFlat,
        updated_at_flat: updatedAtFlat
      };
    });
  }, [data]);

  // Apply filters on Go
  const filteredData = useMemo(() => {
    const f = appliedFilters;
    let rows = processedData;
    if (f.address.trim()) {
      const q = f.address.trim().toLowerCase();
      rows = rows.filter((r: any) => (r?.address_flat || '').toLowerCase().includes(q));
    }
    if (f.zip.trim()) {
      const q = f.zip.trim().toLowerCase();
      rows = rows.filter((r: any) => (r?.zip_flat || '').toString().toLowerCase().includes(q));
    }
    if (f.stateId) {
      rows = rows.filter((r: any) => String(r?.state_id_flat ?? '') === String(f.stateId));
    }
    if (f.cityId) {
      rows = rows.filter((r: any) => String(r?.city_id_flat ?? '') === String(f.cityId));
    }
    if (f.status) {
      rows = rows.filter((r: any) => f.status === 'active' ? !!r?.is_active_flat : !r?.is_active_flat);
    }
    return rows;
  }, [processedData, appliedFilters]);

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
          if (ls) {
            try { const arr = JSON.parse(ls); if (Array.isArray(arr)) setVisibleColIds(new Set(arr)); else setVisibleColIds(new Set(allColIds)); } catch { setVisibleColIds(new Set(allColIds)); }
          } else setVisibleColIds(new Set(allColIds));
          return;
        }
        const { data, error } = await sb
          .from('grid_columns_prefs')
          .select('visible_columns')
          .eq('user_id', uid)
          .eq('screen', SCREEN_KEY)
          .maybeSingle();
        if (error) throw error;
        const vis = Array.isArray(data?.visible_columns) && data?.visible_columns?.length ? new Set<string>(data!.visible_columns as any) : new Set(allColIds);
        if (mounted) setVisibleColIds(vis);
      } catch (e) {
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
      try { localStorage.setItem(`grid_columns_${SCREEN_KEY}`, JSON.stringify(ids)); } catch { }
      try {
        const sb = (await import('@/lib/supabaseClient')).default();
        if (currentUserId) {
          const { error } = await sb.from('grid_columns_prefs').upsert({ user_id: currentUserId, screen: SCREEN_KEY, visible_columns: ids }, { onConflict: 'user_id,screen' });
          if (error) throw error;
        }
      } catch { }
      showToast('Grid columns saved', 'success');
      try { await hideModalById('grid_columns_patients'); } catch (_) { }
    } catch (e: any) {
      showToast(e?.message || 'Failed to save grid columns', 'danger');
    } finally { setIsSavingCols(false); }
  };

  const resetGridColumns = () => setVisibleColIds(new Set(allColIds));

  const [searchText, setSearchText] = useState<string>("");

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name_flat', direction: 'asc' });

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sorted data based on sortConfig
  const sortedData = useMemo(() => {
    const dataCopy = [...filteredData];
    dataCopy.sort((a: any, b: any) => {
      const aVal = a[sortConfig.key] ?? '';
      const bVal = b[sortConfig.key] ?? '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return dataCopy;
  }, [filteredData, sortConfig]);

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset to first page on data-affecting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortConfig, appliedFilters, pageSize]);

  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pagedData = useMemo(() => sortedData.slice(startIndex, endIndex), [sortedData, startIndex, endIndex]);

  useEffect(() => {
    // Clamp page if filters reduce total pages
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  // Horizontal scroll floaters for wide tables
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButtons();
    const onScroll = () => updateScrollButtons();
    el.addEventListener('scroll', onScroll, { passive: true } as any);
    const onResize = () => updateScrollButtons();
    window.addEventListener('resize', onResize);
    return () => {
      el.removeEventListener('scroll', onScroll as any);
      window.removeEventListener('resize', onResize);
    };
  }, [scrollRef.current, pagedData, pageSize]);

  const scrollByAmount = (dx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    try {
      (el as any).scrollBy({ left: dx, behavior: 'smooth' });
    } catch {
      el.scrollLeft += dx;
    }
  };

  const handleResetOpen = (record: any) => {
    const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id ?? null;
    setResetPatientId(userId);
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
    } catch (e) { console.debug('[patients] handleResetOpen error', e); }
  };

  const handleResetSubmit = async (e: any) => {
    e.preventDefault();
    const userId = resetPatientId;
    if (!userId) return showToast('Patient id missing', 'danger');
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
      const res = await fetch('/api/patients', { method: 'PATCH', headers, body: JSON.stringify({ action: 'reset_password', patientId: userId, password: resetPassword }) });
      const json = await parseJSONSafe(res);
      if (json?.error) throw new Error(json.error);
      try { await hideModalById('reset_password'); } catch (_) { }
      setResetPatientId(null);
      setResetPassword('');
      setResetConfirm('');
      await fetchPatients();
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
    const phoneValid = !!addPhoneNumber && addPhoneNumber.trim().length > 0;
    return emailValid && nameValid && phoneValid;
  }, [email, name, addPhoneNumber]);

  const handleAddPatient = async (e: any) => {
    e.preventDefault();
    if (!isAddFormValid) {
      showToast('Please provide a valid name and email', 'danger');
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
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, name, date_of_birth: dob, userType: 'Patient', address: addAddress, zip: addZip, state_id: addStateId, city_id: addCityId, phone_number: addPhoneNumber || null })
      });
      const json = await parseJSONSafe(res);
      if (json?.error) throw new Error(json.error);
      try {
        await hideModalById('add_patient');
      } catch (e) {
        console.debug('[patients] hide add_patient failed', e);
      }
      setEmail(''); setName(''); setDob(''); setAddPhoneNumber(''); setAddAddress(''); setAddZip(''); setAddStateId(null); setAddCityId(null);
      await fetchPatients();
      showToast('Patient added successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add patient', 'danger');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleActive = async (record: any) => {
    const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id;
    // Use patient application row first, then admin, default to true
    const current = record?.patient?.is_active ?? record?.admin?.is_active ?? true;
    if (!userId) return alert('Patient id missing');
    const ok = confirm(`Are you sure you want to ${current ? 'deactivate' : 'activate'} this patient?`);
    if (!ok) return;
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET)
        ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET
        : undefined;
      if (adminSecret) headers['x-admin-secret'] = adminSecret;
      setLoadingIds(prev => ({ ...prev, [userId]: true }));
      const res = await fetch('/api/patients', { method: 'PATCH', headers, body: JSON.stringify({ action: 'toggle_active', patientId: userId, isActive: !current }) });
      const json = await parseJSONSafe(res);
      if (json?.error) throw new Error(json.error);
      await fetchPatients();
      setLoadingIds(prev => { const c = { ...prev }; delete c[userId]; return c; });
    } catch (e: any) {
      setLoadingIds(prev => { const c = { ...prev }; if (userId) delete c[userId]; return c; });
      alert(e.message || 'Failed to update active state');
    }
  };

  const handleSoftDelete = async (record: any) => {
    const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id;
    if (!userId) return alert('Patient id missing');
    const ok = confirm('Are you sure you want to delete this patient? This is a soft delete.');
    if (!ok) return;
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET)
        ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET
        : undefined;
      if (adminSecret) headers['x-admin-secret'] = adminSecret;
      setLoadingIds(prev => ({ ...prev, [userId]: true }));
      const res = await fetch('/api/patients', { method: 'PATCH', headers, body: JSON.stringify({ action: 'soft_delete', patientId: userId }) });
      const json = await parseJSONSafe(res);
      if (json?.error) throw new Error(json.error);
      await fetchPatients();
      showToast('Patient deleted successfully', 'success');
      setLoadingIds(prev => { const c = { ...prev }; delete c[userId]; return c; });
    } catch (e: any) {
      setLoadingIds(prev => { const c = { ...prev }; if (userId) delete c[userId]; return c; });
      alert(e.message || 'Failed to delete patient');
    }
  };

  const handleEditOpen = (record: any) => {
    const userId = record?.id ?? record?.user?.id ?? record?.user?.user?.id ?? record?.id;
    setEditingPatient({ id: userId, record });
    setEditEmail(record?.email ?? '');
    setEditName(record?.user_metadata?.name ?? '');

    setEditDob(record?.user_metadata?.date_of_birth ?? record?.user_metadata?.dob ?? record?.profile?.date_of_birth ?? record?.patient?.date_of_birth ?? '');
    setEditPhoneNumber(record?.patient?.phone_number ?? record?.admin?.phone_number ?? record?.profile?.phone ?? '');
    setEditAddress(record?.patient?.address ?? '');
    setEditZip(record?.patient?.zip ?? '');
    setEditStateId(record?.patient?.state_id ?? null);
    setEditCityId(record?.patient?.city_id ?? null);
    try {
      console.debug('[patients] handleEditOpen', { userId, record });
      const modalEl = document.getElementById('edit_patient');
      // @ts-ignore
      const bs = (window as any).bootstrap;

      try {
        const openMenus = Array.from(document.querySelectorAll('.dropdown-menu.show')) as HTMLElement[];
        openMenus.forEach(menu => {
          const toggle = menu.parentElement?.querySelector('[data-bs-toggle="dropdown"]') as HTMLElement | null;
          if (bs && bs.Dropdown && toggle) {
            try { /* @ts-ignore */ bs.Dropdown.getInstance(toggle)?.hide?.(); } catch (ddErr) { try { bs.Dropdown.getOrCreateInstance?.(toggle)?.hide?.(); } catch (_) { } }
          } else {
            menu.classList.remove('show');
            const toggle = menu.parentElement?.querySelector('[data-bs-toggle="dropdown"]');
            toggle?.classList?.remove('show');
          }
        });
      } catch (err) {
        console.debug('[patients] hide dropdowns failed', err);
      }

      if (modalEl) {
        try {
          if (bs && bs.Modal) {
            // @ts-ignore
            const inst = bs.Modal.getOrCreateInstance(modalEl) ?? new bs.Modal(modalEl);
            inst.show();
            return;
          }
        } catch (innerErr) {
          console.debug('[patients] bootstrap.Modal show failed', innerErr);
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
          return;
        } catch (domErr) {
          console.error('[patients] DOM fallback to show modal failed', domErr);
        }
      } else {
        console.error('[patients] edit_patient modal element not found');
      }
    } catch (e) {
      console.error('[patients] handleEditOpen error', e);
    }
  };

  const isEditFormValid = useMemo(() => {
    const emailValid = !!editEmail && editEmail.includes('@');
    const nameValid = !!editName && editName.trim().length > 1;
    const phoneValid = !!editPhoneNumber && editPhoneNumber.trim().length > 0;
    return emailValid && nameValid && phoneValid;
  }, [editEmail, editName, editPhoneNumber]);

  const handleEditSubmit = async (e: any) => {
    e.preventDefault();
    if (!editingPatient?.id) return alert('No editing patient');
    const userId = editingPatient.id;
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      const adminSecret = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ADMIN_API_SECRET)
        ? (process as any).env.NEXT_PUBLIC_ADMIN_API_SECRET
        : undefined;
      if (adminSecret) headers['x-admin-secret'] = adminSecret;
      setIsSavingEdit(true);
      setLoadingIds(prev => ({ ...prev, [userId]: true }));
      const res = await fetch('/api/patients', { method: 'PATCH', headers, body: JSON.stringify({ action: 'edit', patientId: userId, email: editEmail, name: editName, date_of_birth: editDob, address: editAddress, zip: editZip, state_id: editStateId, city_id: editCityId, phone_number: editPhoneNumber }) });
      const json = await parseJSONSafe(res);
      if (json?.error) throw new Error(json.error);
      try {
        await hideModalById('edit_patient');
      } catch (ee) { console.debug('[patients] hide edit_patient failed', ee); }
      setEditingPatient(null);
      setEditDob('');
      setEditPhoneNumber('');
      setEditAddress(''); setEditZip(''); setEditStateId(null); setEditCityId(null);
      await fetchPatients();
      setLoadingIds(prev => { const c = { ...prev }; delete c[userId]; return c; });
      showToast('Patient updated successfully', 'success');
    } catch (e: any) {
      setLoadingIds(prev => { const c = { ...prev }; if (userId) delete c[userId]; return c; });
      showToast(e.message || 'Failed to update patient', 'danger');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  return (
    <>
      <div className="page-wrapper patients-screen">
        <div className="content">
          <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom patients-header">
            <div className="flex-grow-1">
              <h4 className="fw-bold mb-0 text-dark">
                Patients{" "}
                <span className="badge badge-soft-primary fw-medium border py-1 px-2 border-primary fs-13 ms-1">
                  Total Patients : {data.length}
                </span>
              </h4>
            </div>
          </div>

          {/* SEARCH BAR + TOOLBAR IN ONE LINE */}
          <div className="d-flex align-items-center justify-content-between flex-wrap">
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
                          setFiltersDraft({ address: '', zip: '', stateId: '', cityId: '', status: '' });
                          setAppliedFilters({ address: '', zip: '', stateId: '', cityId: '', status: '' });
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
                onClick={() => showModalById('grid_columns_patients')}
                title="Grid Columns"
              >
                <i className="ti ti-columns-3" />
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={(e) => { e.preventDefault(); showModalById('add_patient'); }}
              >
                <i className="ti ti-plus me-1" /> <span>New Patient</span>
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="filter-panel border rounded p-3 mb-3">
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
                    options={[{ value: '', label: 'All States' }, ...stateOptions]}
                    value={filtersDraft.stateId}
                    onChange={(val) => setFiltersDraft(prev => ({ ...prev, stateId: String(val ?? ''), cityId: '' }))}
                    placeholder="Search state..."
                  />
                </div>
                <div className="col-sm-6 col-md-3">
                  <label className="form-label">City</label>
                  <SearchSelect
                    options={[{ value: '', label: 'All Cities' }, ...cityOptionsFilter]}
                    value={filtersDraft.cityId}
                    onChange={(val) => setFiltersDraft(prev => ({ ...prev, cityId: String(val ?? '') }))}
                    placeholder="Search city..."
                  />
                </div>
                <div className="col-sm-6 col-md-3">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={filtersDraft.status} onChange={e => setFiltersDraft(prev => ({ ...prev, status: e.target.value as Filters['status'] }))}>
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

          {/* CUSTOM HTML TABLE WITH SCROLL WRAPPER (dynamic columns) */}
          <div className="patients-table-container">
            <div ref={scrollRef} className="table-responsive patients-scroll">
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
                      <td colSpan={columnsFiltered.length} className="text-center py-4 text-muted">No patients found</td>
                    </tr>
                  ) : (
                    pagedData.map((r: any, idx: number) => (
                      <tr key={r.id || idx}>
                        {columnsFiltered.map((col: any, ci: number) => {
                          const getVal = (obj: any, path?: string) => {
                            if (!path) return undefined;
                            return path.split('.').reduce((o: any, k: string) => (o ? o[k] : undefined), obj);
                          };
                          // Custom cells for Actions, Status, and Reset Password since they were previously custom-rendered
                          if ((col.key || '').toString() === 'actions' || col.title === 'Actions') {
                            return (
                              <td key={`c-${idx}-${ci}`}>
                                <div className="dropdown position-static">
                                  <a href="#" className="text-dark" data-bs-toggle="dropdown" data-bs-boundary="viewport" onClick={(e) => e.preventDefault()}>
                                    <i className="ti ti-dots-vertical" />
                                  </a>
                                  <ul className="dropdown-menu p-2">
                                    <li><a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); handleEditOpen(r); }}>Edit</a></li>
                                    <li><a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); handleShadowLogin(r); }}>Shadow Login</a></li>
                                    <li><a href="#" className="dropdown-item text-danger" onClick={async (e) => { e.preventDefault(); await handleSoftDelete(r); }}>Delete</a></li>
                                  </ul>
                                </div>
                              </td>
                            );
                          }
                          if ((col.key || '').toString() === 'status' || col.title === 'Status') {
                            const isActive = r?.patient?.is_active ?? r?.admin?.is_active ?? true;
                            const userId = r?.id ?? r?.user?.id ?? r?.user?.user?.id;
                            const isLoading = !!(userId && loadingIds[userId]);
                            return (
                              <td key={`c-${idx}-${ci}`}>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={async (e) => { e.preventDefault(); await handleToggleActive(r); }}
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
                                <a href="#" className="text-primary" onClick={(e) => { e.preventDefault(); handleResetOpen(r); }} title="Reset Password"><i className="ti ti-key" /></a>
                              </td>
                            );
                          }
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

          {/* Grid Columns Modal */}
          <div id="grid_columns_patients" className="modal fade" tabIndex={-1} aria-hidden="true">
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
                  <button type="button" className="btn btn-white border" onClick={() => hideModalById('grid_columns_patients')}>Cancel</button>
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

          <div id="edit_patient" className="modal fade">
            <div className="modal-dialog modal-md modal-dialog-centered">
              <div className="modal-content patient-form-modal">
                <div className="modal-header py-2 px-3 border-0 bg-teal-700 text-white rounded-top">
                  <h5 className="modal-title fw-semibold">Edit Patient</h5>
                </div>
                <form onSubmit={handleEditSubmit}>
                  <div className="modal-body px-4 pt-3 pb-1">
                    <div className="form-row">
                      <label className="form-label text-dark fw-semibold">Name: <span className="text-danger">*</span></label>
                      <input type="text" className="form-control required-field" placeholder="Enter full name" value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>
                    <div className="form-row">
                      <label className="form-label text-dark fw-semibold">Email: <span className="text-danger">*</span></label>
                      <input type="email" className="form-control required-field" placeholder="Enter email address" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                    </div>
                    <div className="form-row">
                      <label className="form-label text-dark fw-semibold">Phone Number: <span className="text-danger">*</span></label>
                      <input type="text" className="form-control required-field" placeholder="e.g. +1234567890" value={editPhoneNumber} onChange={e => setEditPhoneNumber(e.target.value)} />
                    </div>
                    <div className="form-row">
                      <label className="form-label text-dark fw-semibold">Date of Birth: <span className="text-danger">*</span></label>
                      <input type="date" className="form-control required-field" placeholder="Select date of birth" value={editDob} onChange={e => setEditDob(e.target.value)} />
                    </div>
                    <div className="form-row">
                      <label className="form-label text-dark fw-semibold">State: <span className="text-danger">*</span></label>
                      <SearchSelect
                        options={stateOptions}
                        value={editStateId != null ? String(editStateId) : ''}
                        onChange={(val) => { setEditStateId(val ? Number(val) : null); setEditCityId(null); }}
                        placeholder="Search state..."
                        inputClassName="required-field"
                      />
                    </div>
                    <div className="form-row">
                      <label className="form-label text-dark fw-semibold">City: <span className="text-danger">*</span></label>
                      <SearchSelect
                        options={cityOptionsEdit}
                        value={editCityId != null ? String(editCityId) : ''}
                        onChange={(val) => setEditCityId(val ? Number(val) : null)}
                        placeholder="Search city..."
                        inputClassName="required-field"
                      />
                    </div>
                    <div className="form-row">
                      <label className="form-label text-dark fw-semibold">Address: <span className="text-danger">*</span></label>
                      <textarea className="form-control required-field" placeholder="Street, area" value={editAddress} onChange={e => setEditAddress(e.target.value)} />
                    </div>
                    <div className="form-row mb-0">
                      <label className="form-label text-dark fw-semibold">Zip: <span className="text-danger">*</span></label>
                      <input className="form-control required-field" placeholder="e.g. 12345" value={editZip} onChange={e => setEditZip(e.target.value)} />
                    </div>
                  </div>
                  <div className="modal-footer border-top py-2 px-2.5 d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-outline-danger px-3" data-bs-dismiss="modal" onClick={() => hideModalById('edit_patient')}>
                      <i className="ti ti-x me-1"></i> Cancel
                    </button>
                    <button type="submit" className="btn btn-success px-4" disabled={!isEditFormValid || isSavingEdit}>
                      {isSavingEdit ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
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

          <div id="add_patient" className="modal fade">
            <div className="modal-dialog modal-md modal-dialog-centered">
              <div className="modal-content patient-form-modal">
                <div className="modal-header justify-content-center py-3 border-0 bg-teal-700 text-white rounded-top">
                  <h5 className="modal-title fw-semibold text-center mb-0">Add New Patient</h5>
                </div>
                <form onSubmit={handleAddPatient}>
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
                      <input type="text" className="form-control required-field" placeholder="e.g. +1234567890" value={addPhoneNumber} onChange={e => setAddPhoneNumber(e.target.value)} />
                    </div>
                    <div className="form-row">
                      <label className="form-label text-dark fw-semibold">Date of Birth <span className="text-danger">*</span></label>
                      <input type="date" className="form-control required-field" placeholder="Select date of birth" value={dob} onChange={e => setDob(e.target.value)} />
                    </div>
                    <div className="form-row">
                      <label className="form-label text-dark fw-semibold">State <span className="text-danger">*</span></label>
                      <SearchSelect
                        options={stateOptions}
                        value={addStateId != null ? String(addStateId) : ''}
                        onChange={(val) => { setAddStateId(val ? Number(val) : null); setAddCityId(null); }}
                        placeholder="Search state..."
                        inputClassName="required-field"
                      />
                    </div>
                    <div className="form-row">
                      <label className="form-label text-dark fw-semibold">City <span className="text-danger">*</span></label>
                      <SearchSelect
                        options={cityOptionsAdd}
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
                    <button type="button" className="btn btn-outline-danger px-3" data-bs-dismiss="modal" onClick={() => hideModalById('add_patient')}>
                      <i className="ti ti-x me-1"></i> Cancel
                    </button>
                    <button type="submit" className="btn btn-success px-4" disabled={!isAddFormValid || isAdding}>
                      {isAdding ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : (
                        <>
                          <i className="ti ti-device-floppy me-1"></i> Add New Patient
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
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
                    placeholder="e.g. Active Patients in NY"
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

        <div className="footer text-center bg-white p-2 border-top">
          <p className="text-dark mb-0">
            2025 ©
            <Link href="#" className="link-primary">
              EMR
            </Link>
            , All Rights Reserved
          </p>
        </div>
      </div>
    </>
  );
};

export default PatientsComponent;
