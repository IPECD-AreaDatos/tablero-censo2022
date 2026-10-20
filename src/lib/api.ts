const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function apiPath(path: string): string {
  return `${basePath}${path}`;
}

export function assetPath(path: string): string {
  return `${basePath}${path}`;
}
