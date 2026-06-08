export function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (base) return `${base.replace(/\/+$/, "")}${path}`;
  return path;
}
