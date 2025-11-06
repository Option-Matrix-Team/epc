"use client";

import { useEffect, useState, useMemo } from "react";

const CitiesComponent = () => {
    const [data, setData] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [stateId, setStateId] = useState<string | null>(null);
    const [editing, setEditing] = useState<any | null>(null);
    const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
    const [search, setSearch] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [pageSize, setPageSize] = useState<number>(25);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
    // CSV helpers
    const downloadCSV = () => {
        const rows = filteredData.map((row: any) => ({
            City: row.name,
            State: row.state_name,
            Status: row.is_active ? 'Active' : 'Inactive',
        }));
        const csv = [Object.keys(rows[0] || {}).join(','), ...rows.map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cities.csv';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    };

    const downloadTemplate = () => {
        const csv = 'City,State\r\nSample City,Sample State';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cities_template.csv';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    };

    const handleCSVUpload = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const text = await file.text();
            const lines = text.split(/\r?\n/).filter(Boolean);
            const [header, ...rows] = lines;
            const [cityCol, stateCol] = header.split(',').map((s: string) => s.trim().toLowerCase());
            let success = 0, fail = 0;
            for (const row of rows) {
                const [city, state] = row.split(',').map((s: string) => s.trim());
                if (!city || !state) { fail++; continue; }
                const stateObj = states.find((s: any) => s.name.toLowerCase() === state.toLowerCase());
                if (!stateObj) { fail++; continue; }
                try {
                    const res = await fetch('/api/cities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: city, state_id: stateObj.id }) });
                    const json = await res.json();
                    if (json.error) { fail++; continue; }
                    success++;
                } catch { fail++; }
            }
            await fetchCities();
            showToast(`Upload complete: ${success} added, ${fail} failed`, fail ? 'danger' : 'success');
        } catch (err: any) {
            showToast('Failed to upload CSV', 'danger');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    // Reusable modal hide helper (robust against missing bootstrap API)
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
                    } catch (cleanupErr) { console.debug('[cities] hideModal cleanup', cleanupErr); }
                    resolve();
                };

                try {
                    if (bs && bs.Modal) {
                        // @ts-ignore
                        const inst = bs.Modal.getInstance(modalEl) ?? bs.Modal.getOrCreateInstance?.(modalEl) ?? new bs.Modal(modalEl);
                        const onHidden = () => { try { modalEl.removeEventListener('hidden.bs.modal', onHidden); } catch (_) { }; finish(); };
                        modalEl.addEventListener('hidden.bs.modal', onHidden);
                        try { inst?.hide?.(); } catch (hideErr) { console.debug('[cities] bootstrap hide threw', hideErr); }
                        setTimeout(() => finish(), 600);
                        return;
                    }
                } catch (err) {
                    console.debug('[cities] bootstrap modal hide failed', err);
                }

                finish();
            } catch (e) {
                console.debug('[cities] hideModalById error', e);
                resolve();
            }
        });
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
            setTimeout(() => { toast.classList.remove('show'); try { toast.remove(); } catch (_) { } }, 4000);
        } catch (e) {
            // fallback
            // eslint-disable-next-line no-alert
            alert(message);
        }
    };

    const fetchStates = async () => {
        try {
            const res = await fetch('/api/states');
            const json = await res.json();
            setStates(json.states || []);
        } catch (e) { console.error(e); }
    };

    const fetchCities = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/cities');
            const json = await res.json();
            setData(json.cities || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStates(); fetchCities(); }, []);

    const handleAdd = async (e: any) => {
        e.preventDefault();
        if (!stateId) return showToast('Please select state', 'danger');
        try {
            const res = await fetch('/api/cities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, state_id: Number(stateId) }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            setName(''); setStateId(null);
            try { await hideModalById('add_city'); } catch (_) { }
            await fetchCities();
            showToast('City added', 'success');
        } catch (err: any) { alert(err.message || 'Failed to add city'); }
    };

    const openEdit = (row: any) => {
        setEditing(row); setName(row.name || ''); setStateId(row.state_id ? String(row.state_id) : null);
        try {
            const modalEl = document.getElementById('edit_city');
            const bs = (window as any).bootstrap;
            if (modalEl && bs && bs.Modal) {
                bs.Modal.getOrCreateInstance(modalEl).show();
                return;
            }
            if (modalEl) {
                modalEl.classList.add('show');
                (modalEl as any).style.display = 'block';
                document.body.classList.add('modal-open');
            }
        } catch (e) { }
    };

    const handleEdit = async (e: any) => {
        e.preventDefault();
        if (!editing?.id) return showToast('No editing city', 'danger');
        try {
            const res = await fetch('/api/cities', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'edit', cityId: editing.id, name, state_id: Number(stateId) }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            setEditing(null); setName(''); setStateId(null);
            try { await hideModalById('edit_city'); } catch (_) { }
            await fetchCities();
            showToast('City updated', 'success');
        } catch (err: any) { showToast(err.message || 'Failed to update city', 'danger'); }
    };

    const handleDelete = async (row: any) => {
        const ok = confirm('Delete this city? This is a soft delete.'); if (!ok) return;
        try {
            const res = await fetch('/api/cities', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'soft_delete', cityId: row.id }) });
            const json = await res.json(); if (json.error) throw new Error(json.error); await fetchCities();
            showToast('City deleted', 'success');
        } catch (err: any) { showToast(err.message || 'Failed to delete city', 'danger'); }
    };

    const handleToggleActive = async (record: any) => {
        const id = record?.id;
        if (!id) return showToast('City id missing', 'danger');
        const current = !!record?.is_active;
        const ok = confirm(`Are you sure you want to ${current ? 'deactivate' : 'activate'} this city?`);
        if (!ok) return;
        try {
            setLoadingIds(prev => ({ ...prev, [id]: true }));
            const res = await fetch('/api/cities', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle_active', cityId: id, isActive: !current }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            await fetchCities();
            showToast(current ? 'City deactivated' : 'City activated', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to update city status', 'danger');
        } finally {
            setLoadingIds(prev => { const c = { ...prev }; delete c[id]; return c; });
        }
    };

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };


    // Filtering and sorting
    const filteredData = useMemo(() => {
        let d = data;
        if (search.trim()) {
            const kw = search.trim().toLowerCase();
            d = d.filter((row: any) =>
                (row.name || '').toLowerCase().includes(kw) ||
                (row.state_name || '').toLowerCase().includes(kw)
            );
        }
        return d;
    }, [data, search]);

    const sortedData = useMemo(() => {
        const d = [...filteredData];
        d.sort((a: any, b: any) => {
            const aVal = a[sortConfig.key] ?? '';
            const bVal = b[sortConfig.key] ?? '';
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return d;
    }, [filteredData, sortConfig]);

    const totalItems = sortedData.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const pagedData = useMemo(() => sortedData.slice(startIndex, endIndex), [sortedData, startIndex, endIndex]);

    const columns = [
        {
            title: 'Actions',
            render: (_: any, record: any) => {
                const id = record?.id;
                const isLoading = !!(id && loadingIds[id]);
                if (isLoading) {
                    return <div><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span></div>;
                }
                return (
                    <div className="dropdown position-static">
                        <a href="#" className="text-dark" data-bs-toggle="dropdown" data-bs-boundary="viewport" onClick={(e) => e.preventDefault()}>
                            <i className="ti ti-dots-vertical" />
                        </a>
                        <ul className="dropdown-menu p-2">
                            <li><a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); openEdit(record); }}>Edit</a></li>
                            <li><a href="#" className="dropdown-item text-danger" onClick={async (e) => { e.preventDefault(); await handleDelete(record); }}>Delete</a></li>
                            <li><a href="#" className="dropdown-item text-primary" onClick={(e) => { e.preventDefault(); showToast('Shadow login not implemented', 'info'); }}>Shadow Login</a></li>
                        </ul>
                    </div>
                );
            }
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            sortKey: 'is_active',
            render: (_: any, record: any) => {
                const isActive = !!record?.is_active;
                const id = record?.id;
                const isLoading = !!(id && loadingIds[id]);
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
            title: 'City',
            dataIndex: 'name',
            sortKey: 'name'
        },
        {
            title: 'State',
            dataIndex: 'state_name',
            sortKey: 'state_name'
        }
    ];

    return (
        <>
            <div className="page-wrapper states-screen">
                <div className="content">
                    <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom states-header">
                        <div className="flex-grow-1">
                            <h4 className="fw-bold mb-0 text-dark">
                                Cities{' '}
                                <span className="badge badge-soft-primary fw-medium border py-1 px-2 border-primary fs-13 ms-1">
                                    Total Cities : {data.length}
                                </span>
                            </h4>
                        </div>
                    </div>

                    {/* CUSTOM HTML TABLE (matching states.tsx structure) */}
                    <div className="states-table-container">
                        {/* SEARCH BAR AND TOOLBAR BUTTONS */}
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search by city or state name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ maxWidth: '220px', height: '36px' }}
                            />
                            <div className="d-flex align-items-center flex-wrap gap-2 states-toolbar">
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

                                <button className="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#add_city">
                                    <i className="ti ti-plus me-1" /> <span>Add City</span>
                                </button>
                            </div>
                        </div>
                        <div className="table-responsive states-scroll">
                            <table className="table table-striped table-hover align-middle states-table">
                                <thead className="table-dark">
                                    <tr>
                                        {columns.map((col: any, i: number) => {
                                            const sortKey = col.sortKey;
                                            const isSorted = sortKey && sortConfig.key === sortKey;
                                            const clickable = !!sortKey;
                                            return (
                                                <th
                                                    key={`h-${i}`}
                                                    onClick={clickable ? () => handleSort(sortKey!) : undefined}
                                                    style={{ whiteSpace: 'nowrap', cursor: clickable ? 'pointer' : 'default' }}
                                                >
                                                    {col.title}{' '}
                                                    {clickable ? (
                                                        isSorted ? (
                                                            sortConfig.direction === 'asc' ? <i className="ti ti-arrow-up" /> : <i className="ti ti-arrow-down" />
                                                        ) : (
                                                            <i className="ti ti-arrows-sort opacity-50" />
                                                        )
                                                    ) : null}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedData.length === 0 ? (
                                        <tr>
                                            <td colSpan={columns.length} className="text-center py-4 text-muted">No cities found</td>
                                        </tr>
                                    ) : (
                                        pagedData.map((r: any, idx: number) => (
                                            <tr key={r.id || idx}>
                                                {columns.map((col: any, ci: number) => {
                                                    const getVal = (obj: any, path?: string) => {
                                                        if (!path) return undefined;
                                                        return path.split('.').reduce((o: any, k: string) => (o ? o[k] : undefined), obj);
                                                    };
                                                    const content = col.render
                                                        ? col.render(getVal(r, col.dataIndex), r, idx)
                                                        : (col.dataIndex ? (getVal(r, col.dataIndex) ?? '—') : '—');
                                                    return <td key={`c-${idx}-${ci}`}>{content}</td>;
                                                })}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* PAGINATION (matching states.tsx structure) */}
                    <div className="d-flex align-items-center gap-3 mt-2">
                        <div className="d-flex align-items-center gap-3">
                            <div className="d-flex align-items-center gap-2">
                                <span className="text-muted">Items per page:</span>
                                <select
                                    className="form-select form-select-sm"
                                    style={{ width: 80 }}
                                    value={pageSize}
                                    onChange={e => setPageSize(parseInt(e.target.value, 10) || 10)}
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
                                <button
                                    className="icon-btn"
                                    disabled={safePage <= 1}
                                    onClick={() => setCurrentPage(1)}
                                    aria-label="First"
                                    title="First"
                                >
                                    <i className="ti ti-chevrons-left" />
                                </button>
                                <button
                                    className="icon-btn"
                                    disabled={safePage <= 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    aria-label="Previous"
                                    title="Previous"
                                >
                                    <i className="ti ti-chevron-left" />
                                </button>
                                <button
                                    className="icon-btn"
                                    disabled={safePage >= totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    aria-label="Next"
                                    title="Next"
                                >
                                    <i className="ti ti-chevron-right" />
                                </button>
                                <button
                                    className="icon-btn"
                                    disabled={safePage >= totalPages}
                                    onClick={() => setCurrentPage(totalPages)}
                                    aria-label="Last"
                                    title="Last"
                                >
                                    <i className="ti ti-chevrons-right" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add City Modal */}
            <div id="add_city" className="modal fade">
                <div className="modal-dialog modal-md modal-dialog-centered">
                    <div className="modal-content patient-form-modal">
                        <div className="modal-header py-2 px-3 border-0 bg-teal-700 text-white rounded-top">
                            <h5 className="modal-title fw-semibold">Add City</h5>
                        </div>
                        <form onSubmit={handleAdd}>
                            <div className="modal-body px-4 pt-3 pb-1">
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">State: <span className="text-danger">*</span></label>
                                    <select className="form-select required-field" value={stateId ?? ''} onChange={e => setStateId(e.target.value || null)} required>
                                        <option value="">Select state</option>
                                        {states.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">City Name: <span className="text-danger">*</span></label>
                                    <input type="text" className="form-control required-field" placeholder="Enter city name" value={name} onChange={e => setName(e.target.value)} required />
                                </div>
                            </div>
                            <div className="modal-footer d-flex align-items-center gap-1">
                                <button type="button" className="btn btn-white border" data-bs-dismiss="modal" onClick={() => { try { hideModalById('add_city'); } catch (_) { } }}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Add City</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Edit City Modal */}
            <div id="edit_city" className="modal fade">
                <div className="modal-dialog modal-md modal-dialog-centered">
                    <div className="modal-content patient-form-modal">
                        <div className="modal-header py-2 px-3 border-0 bg-teal-700 text-white rounded-top">
                            <h5 className="modal-title fw-semibold">Edit City</h5>
                        </div>
                        <form onSubmit={handleEdit}>
                            <div className="modal-body px-4 pt-3 pb-1">
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">State: <span className="text-danger">*</span></label>
                                    <select className="form-select required-field" value={stateId ?? ''} onChange={e => setStateId(e.target.value || null)} required>
                                        <option value="">Select state</option>
                                        {states.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">City Name: <span className="text-danger">*</span></label>
                                    <input type="text" className="form-control required-field" placeholder="Enter city name" value={name} onChange={e => setName(e.target.value)} required />
                                </div>
                            </div>
                            <div className="modal-footer d-flex align-items-center gap-1">
                                <button type="button" className="btn btn-white border" data-bs-dismiss="modal" onClick={() => { try { hideModalById('edit_city'); } catch (_) { } }}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CitiesComponent;
