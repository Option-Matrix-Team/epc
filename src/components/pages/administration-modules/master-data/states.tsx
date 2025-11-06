"use client";

import { useEffect, useState, useMemo } from "react";
import Datatable from "@/core/common/dataTable";
import Link from "next/link";
import "@/style/css/admin-screens.css";

const StatesComponent = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [abbreviation, setAbbreviation] = useState("");
    const [editing, setEditing] = useState<any | null>(null);
    const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
    const [isUploading, setIsUploading] = useState(false);

    // Pagination state
    const [pageSize, setPageSize] = useState<number>(25);
    const [currentPage, setCurrentPage] = useState<number>(1);

    // Sorting state
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

    // Search state
    const [search, setSearch] = useState("");

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
                    } catch (cleanupErr) { console.debug('[states] hideModal cleanup', cleanupErr); }
                    resolve();
                };

                try {
                    if (bs && bs.Modal) {
                        // @ts-ignore
                        const inst = bs.Modal.getInstance(modalEl) ?? bs.Modal.getOrCreateInstance?.(modalEl) ?? new bs.Modal(modalEl);
                        const onHidden = () => { try { modalEl.removeEventListener('hidden.bs.modal', onHidden); } catch (_) { }; finish(); };
                        modalEl.addEventListener('hidden.bs.modal', onHidden);
                        try { inst?.hide?.(); } catch (hideErr) { console.debug('[states] bootstrap hide threw', hideErr); }
                        setTimeout(() => finish(), 600);
                        return;
                    }
                } catch (err) {
                    console.debug('[states] bootstrap modal hide failed', err);
                }

                finish();
            } catch (e) {
                console.debug('[states] hideModalById error', e);
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

    // CSV helper functions
    const downloadCSV = () => {
        try {
            const headers = ['State', 'Abbreviation', 'Status'];
            const rows = data.map(record => [
                record.name || '',
                record.abbreviation || '',
                record.is_active ? 'Active' : 'Inactive'
            ]);
            const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `states_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
            showToast('CSV downloaded successfully', 'success');
        } catch (e: any) {
            showToast('Failed to download CSV: ' + e.message, 'danger');
        }
    };

    const downloadTemplate = () => {
        try {
            const headers = ['State', 'Abbreviation'];
            const sampleRow = ['California', 'CA'];
            const csvContent = [headers, sampleRow].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'states_template.csv';
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
                const [stateName, abbr] = values;

                if (!stateName || !abbr) {
                    errorCount++;
                    continue;
                }

                try {
                    const headers: any = { 'Content-Type': 'application/json' };
                    const res = await fetch('/api/states', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ name: stateName, abbreviation: abbr })
                    });
                    const json = await res.json();
                    if (json.error) throw new Error(json.error);
                    successCount++;
                } catch (e: any) {
                    console.error(`Failed to import state ${stateName}:`, e);
                    errorCount++;
                }
            }

            await fetchStates();
            showToast(`Import complete: ${successCount} states added, ${errorCount} failed`, successCount > 0 ? 'success' : 'danger');
        } catch (e: any) {
            showToast('Failed to upload CSV: ' + e.message, 'danger');
        } finally {
            setIsUploading(false);
            event.target.value = ''; // Reset file input
        }
    };

    const fetchStates = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/states');
            const json = await res.json();
            setData(json.states || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStates(); }, []);

    const handleAdd = async (e: any) => {
        e.preventDefault();
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            const res = await fetch('/api/states', { method: 'POST', headers, body: JSON.stringify({ name, abbreviation }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            setName('');
            setAbbreviation('');
            try { await hideModalById('add_state'); } catch (_) { }
            await fetchStates();
            showToast('State added', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to add state', 'danger');
        }
    };

    const openEdit = (row: any) => {
        setEditing(row);
        setName(row.name || '');
        setAbbreviation(row.abbreviation ?? '');
        try {
            const modalEl = document.getElementById('edit_state');
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
        if (!editing?.id) return showToast('No editing state', 'danger');
        try {
            const headers: any = { 'Content-Type': 'application/json' };
            const res = await fetch('/api/states', { method: 'PATCH', headers, body: JSON.stringify({ action: 'edit', stateId: editing.id, name, abbreviation }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            setEditing(null); setName('');
            setAbbreviation('');
            try { await hideModalById('edit_state'); } catch (_) { }
            await fetchStates();
            showToast('State updated', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to update state', 'danger');
        }
    };

    const handleDelete = async (row: any) => {
        const ok = confirm('Delete this state? This is a soft delete.');
        if (!ok) return;
        try {
            const res = await fetch('/api/states', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'soft_delete', stateId: row.id }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            await fetchStates();
            showToast('State deleted', 'success');
        } catch (err: any) { showToast(err.message || 'Failed to delete state', 'danger'); }
    };

    const handleToggleActive = async (record: any) => {
        const id = record?.id;
        if (!id) return showToast('State id missing', 'danger');
        const current = !!record?.is_active;
        const ok = confirm(`Are you sure you want to ${current ? 'deactivate' : 'activate'} this state?`);
        if (!ok) return;
        try {
            setLoadingIds(prev => ({ ...prev, [id]: true }));
            const res = await fetch('/api/states', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle_active', stateId: id, isActive: !current }) });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            await fetchStates();
            showToast(current ? 'State deactivated' : 'State activated', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to update state status', 'danger');
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

    // Filtered data based on search
    const filteredData = useMemo(() => {
        let d = data;
        if (search.trim()) {
            const kw = search.trim().toLowerCase();
            d = d.filter((row: any) =>
                (row.name || '').toLowerCase().includes(kw) ||
                (row.abbreviation || '').toLowerCase().includes(kw)
            );
        }
        return d;
    }, [data, search]);

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

    // Reset to first page on data-affecting changes
    useEffect(() => {
        setCurrentPage(1);
    }, [sortConfig, pageSize]);

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
            title: 'State',
            dataIndex: 'name',
            sortKey: 'name'
        },
        {
            title: 'State Code',
            dataIndex: 'abbreviation',
            sortKey: 'abbreviation'
        }
    ];

    return (
        <>
            <div className="page-wrapper states-screen">
                <div className="content">
                    <div className="d-flex align-items-center justify-content-between flex-wrap mb-3 pb-3 border-bottom states-header">
                        <div className="flex-grow-1">
                            <h4 className="fw-bold mb-0 text-dark">
                                States{" "}
                                <span className="badge badge-soft-primary fw-medium border py-1 px-2 border-primary fs-13 ms-1">
                                    Total States : {data.length}
                                </span>
                            </h4>
                        </div>
                    </div>

                    {/* CUSTOM HTML TABLE (matching patients.tsx structure) */}
                    <div className="states-table-container">
                        {/* SEARCH BAR AND TOOLBAR BUTTONS */}
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search by state name or code..."
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

                                <button className="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#add_state">
                                    <i className="ti ti-plus me-1" /> <span>Add State</span>
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
                                            <td colSpan={columns.length} className="text-center py-4 text-muted">No states found</td>
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

                    {/* PAGINATION (matching patients.tsx structure) */}
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

            <div id="add_state" className="modal fade">
                <div className="modal-dialog modal-md modal-dialog-centered">
                    <div className="modal-content patient-form-modal">
                        <div className="modal-header py-2 px-3 border-0 bg-teal-700 text-white rounded-top">
                            <h5 className="modal-title fw-semibold">Add State</h5>
                        </div>
                        <form onSubmit={handleAdd}>
                            <div className="modal-body px-4 pt-3 pb-1">
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">State Name: <span className="text-danger">*</span></label>
                                    <input type="text" className="form-control required-field" placeholder="Enter state name" value={name} onChange={e => setName(e.target.value)} />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">State Code: <span className="text-danger">*</span></label>
                                    <input type="text" className="form-control required-field" placeholder="Enter state code" value={abbreviation} onChange={e => setAbbreviation(e.target.value)} maxLength={3} />
                                </div>
                            </div>
                            <div className="modal-footer d-flex align-items-center gap-1">
                                <button type="button" className="btn btn-white border" data-bs-dismiss="modal" onClick={() => { try { hideModalById('add_state'); } catch (_) { } }}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Add State</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <div id="edit_state" className="modal fade">
                <div className="modal-dialog modal-md modal-dialog-centered">
                    <div className="modal-content patient-form-modal">
                        <div className="modal-header py-2 px-3 border-0 bg-teal-700 text-white rounded-top">
                            <h5 className="modal-title fw-semibold">Edit State</h5>
                        </div>
                        <form onSubmit={handleEdit}>
                            <div className="modal-body px-4 pt-3 pb-1">
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">State Name: <span className="text-danger">*</span></label>
                                    <input type="text" className="form-control required-field" placeholder="Enter state name" value={name} onChange={e => setName(e.target.value)} />
                                </div>
                                <div className="form-row">
                                    <label className="form-label text-dark fw-semibold">State Code: <span className="text-danger">*</span></label>
                                    <input type="text" className="form-control required-field" placeholder="Enter state code" value={abbreviation} onChange={e => setAbbreviation(e.target.value)} maxLength={3} />
                                </div>
                            </div>
                            <div className="modal-footer d-flex align-items-center gap-1">
                                <button type="button" className="btn btn-white border" data-bs-dismiss="modal" onClick={() => { try { hideModalById('edit_state'); } catch (_) { } }}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default StatesComponent;
