"use client";

// index.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import { Table } from "antd";
import type { DatatableProps } from "../../data/interface";

// Using native <select> in pagination; no need for AntD Select.Option

const Datatable: React.FC<DatatableProps> = ({
  columns,
  dataSource,
  Selection,
  searchText,
}) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
  // initialize selection flag from prop to avoid enabling rowSelection on
  // the very first render (which can cause AntD internals to call checkbox
  // helpers with undefined records). Default to false when Selection is
  // undefined/null.
  const [Selections, setSelections] = useState<boolean>(!!Selection);
  // Ensure filteredDataSource is always an array so we can safely call array methods
  const [filteredDataSource, setFilteredDataSource] = useState(
    Array.isArray(dataSource) ? dataSource : []
  );
  const usedKeysRef = useRef<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setSelections(!!Selection);
  }, [Selection]);

  useEffect(() => {
    const sourceArray = Array.isArray(dataSource) ? dataSource : [];
    const loweredSearch = String(searchText || "").toLowerCase();
    if (!loweredSearch) {
      setFilteredDataSource(sourceArray);
      return;
    }
    const filteredData = sourceArray.filter((record) => {
      try {
        return Object.values(record).some((field) =>
          String(field).toLowerCase().includes(loweredSearch)
        );
      } catch (e) {
        // If record isn't an object, fallback to string comparison
        return String(record).toLowerCase().includes(loweredSearch);
      }
    });
    setFilteredDataSource(filteredData);
  }, [searchText, dataSource]);

  // Clear per-render used keys whenever the data set changes so we can
  // deterministically generate unique keys for duplicate ids in the source.
  useEffect(() => {
    usedKeysRef.current.clear();
  }, [filteredDataSource]);

  const onSelectChange = (newSelectedRowKeys: any[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
    // Defensive: ensure AntD's internals can always read `disabled` from the
    // returned object. Some AntD versions assume getCheckboxProps exists and
    // that it returns an object; return a safe default.
    getCheckboxProps: (record: any) => ({ disabled: !!record?.disabled }),
  };

  // Compute paginated data and total pages
  const total = filteredDataSource.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filteredDataSource.slice(start, start + pageSize);
  }, [filteredDataSource, pageSize, pageSafe]);

  const goTo = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };
  const PageButton: React.FC<{ n: number; active?: boolean; onClick: () => void }> = ({ n, active, onClick }) => (
    <button className={`page-btn ${active ? 'active' : ''}`} onClick={onClick}>{n}</button>
  );

  // Generate compact page list with ellipsis
  const pages = useMemo(() => {
    const p: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) p.push(i);
    } else {
      const show = new Set<number>();
      show.add(1); show.add(2); show.add(totalPages); show.add(totalPages - 1);
      show.add(pageSafe); show.add(pageSafe - 1); show.add(pageSafe + 1);
      const sorted = Array.from(show).filter(n => n >= 1 && n <= totalPages).sort((a, b) => a - b);
      for (let i = 0; i < sorted.length; i++) {
        p.push(sorted[i]);
        if (i < sorted.length - 1 && sorted[i + 1] - sorted[i] > 1) p.push('…');
      }
    }
    return p;
  }, [totalPages, pageSafe]);

  return (
    <>
      <Table
        className="table table-nowrap datatable"
        rowSelection={Selections ? rowSelection : undefined}
        // Provide a stable rowKey function that only accepts the record parameter.
        // Avoiding the `index` parameter prevents AntD's deprecation warning.
        rowKey={(record: any) => {
          // Prefer existing id/key fields when present.
          if (record == null) return `row-${Math.random().toString(36).slice(2, 9)}`;
          const baseRaw = (record as any).id ?? (record as any).key;
          let base = baseRaw !== undefined && baseRaw !== null ? String(baseRaw) : null;

          // If base exists, ensure uniqueness within this render by appending a
          // small suffix when duplicates are encountered. We track used keys in
          // a ref that is cleared whenever the data changes.
          if (base) {
            if (!usedKeysRef.current.has(base)) {
              usedKeysRef.current.add(base);
              return base;
            }
            // append a deterministic suffix based on how many times we've seen this base
            let counter = 1;
            let candidate = `${base}-${counter}`;
            while (usedKeysRef.current.has(candidate)) {
              counter += 1;
              candidate = `${base}-${counter}`;
            }
            usedKeysRef.current.add(candidate);
            return candidate;
          }

          // For records without stable ids, generate and cache a key using WeakMap so
          // the same object reference keeps the same generated key during its lifecycle.
          try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (!Datatable.__generatedKeyMap) {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              Datatable.__generatedKeyMap = new WeakMap();
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              Datatable.__generatedKeyCounter = 0;
            }
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const map: WeakMap<object, string> = Datatable.__generatedKeyMap;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            let counter: number = Datatable.__generatedKeyCounter;

            if (typeof record === "object") {
              let existing = map.get(record);
              if (!existing) {
                counter += 1;
                existing = `row-gen-${counter}`;
                map.set(record, existing);
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                Datatable.__generatedKeyCounter = counter;
              }
              return existing;
            }
          } catch (e) {
            // Fallback to a random string when WeakMap isn't usable.
            return `row-${Math.random().toString(36).slice(2, 9)}`;
          }

          // Fallback for primitive records.
          return String(record);
        }}
        columns={columns}
        rowHoverable={false}
        dataSource={paginatedData}
        pagination={false}
      />
      <div className="tw-pagination">
        <div className="rows">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
          </select>
          <span>
            {Math.min((pageSafe - 1) * pageSize + 1, total)}-
            {Math.min(pageSafe * pageSize, total)} of {total}
          </span>
        </div>
        <div className="pager">
          <button className="page-btn" onClick={() => goTo(pageSafe - 1)} disabled={pageSafe <= 1} aria-label="Previous">
            <i className="ti ti-chevron-left" />
          </button>
          {pages.map((p, idx) => typeof p === 'number' ? (
            <PageButton key={`p-${p}-${idx}`} n={p} active={p === pageSafe} onClick={() => goTo(p)} />
          ) : (
            <span key={`dots-${idx}`} className="px-2 text-slate-500">{p}</span>
          ))}
          <button className="page-btn" onClick={() => goTo(pageSafe + 1)} disabled={pageSafe >= totalPages} aria-label="Next">
            <i className="ti ti-chevron-right" />
          </button>
        </div>
      </div>
    </>
  );
};

export default Datatable;
