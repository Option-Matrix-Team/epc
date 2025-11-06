// Small, dependency-free date-time formatter used across grids
// Format: YYYY-MM-DD HH:mm (local time)
export function formatDateTime(input: string | number | Date | null | undefined): string {
    if (!input) return '—';
    const d = new Date(input);
    if (isNaN(d.getTime())) return '—';
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}
