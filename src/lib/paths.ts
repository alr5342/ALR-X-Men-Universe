// Shared by static templates and React islands; keep local content paths portable.
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (!path.startsWith('/') || path.startsWith('//') || path === base || path.startsWith(`${base}/`)) return path;
  return `${base}${path}`;
}
