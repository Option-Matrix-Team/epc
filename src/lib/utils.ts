// Lightweight classnames merge utility compatible with Tailwind
// Avoids external deps like clsx/tailwind-merge to keep bundle minimal
export function cn(...inputs: Array<string | undefined | null | false | Record<string, any>>): string {
    const classes: string[] = [];
    for (const input of inputs) {
        if (!input) continue;
        if (typeof input === 'string') {
            if (input.trim()) classes.push(input.trim());
            continue;
        }
        if (typeof input === 'object') {
            for (const key of Object.keys(input)) {
                if ((input as any)[key]) classes.push(key);
            }
        }
    }
    // naive merge: split and dedupe to reduce duplicated classes
    const seen = new Set<string>();
    const out: string[] = [];
    for (const token of classes.join(' ').split(/\s+/g)) {
        if (!token) continue;
        if (!seen.has(token)) {
            seen.add(token);
            out.push(token);
        }
    }
    return out.join(' ');
}
