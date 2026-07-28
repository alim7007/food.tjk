const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
const backendOrigin = apiUrl.replace(/\/api\/v1$/, "");

export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${backendOrigin}${path}`;
}
