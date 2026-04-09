export class ApiError extends Error {
  readonly status?: number;
  readonly code?:   string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
    this.code   = code;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string; code?: string };
    throw new ApiError(
      body.message ?? `Request failed with status ${res.status}`,
      res.status,
      body.code,
    );
  }

  return res.json() as Promise<T>;
}
