export interface Health {
  status: "ok";
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function describeError(body: unknown): string | null {
  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
    return body.message;
  }

  return null;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);

    throw new ApiError(
      response.status,
      describeError(body) ?? `${init?.method ?? "GET"} ${url} failed (${response.status})`,
    );
  }

  return (await response.json()) as T;
}

export const api = {
  health: (signal?: AbortSignal) => request<Health>("/healthz", { signal }),
};
