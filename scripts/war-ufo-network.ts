const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export function validatedHttpsUrl(
  rawUrl: string,
  allowedHosts: ReadonlySet<string>,
  baseUrl?: string
) {
  const url = new URL(rawUrl, baseUrl);
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:") throw new Error(`URL must use HTTPS: ${url.toString()}`);
  if (url.username || url.password) throw new Error(`URL credentials are not allowed: ${url.toString()}`);
  if (url.port && url.port !== "443") throw new Error(`URL port is not allowed: ${url.toString()}`);
  if (!allowedHosts.has(hostname)) throw new Error(`URL host is not allowed: ${hostname}`);
  url.hash = "";
  return url;
}

type SafeFetchOptions = RequestInit & {
  allowedHosts: ReadonlySet<string>;
  timeoutMs?: number;
  maxRedirects?: number;
};

export async function safeFetch(
  rawUrl: string,
  { allowedHosts, timeoutMs = 15_000, maxRedirects = 3, ...init }: SafeFetchOptions
) {
  let url = validatedHttpsUrl(rawUrl, allowedHosts);
  let method = (init.method ?? "GET").toUpperCase();

  for (let redirectCount = 0; ; redirectCount += 1) {
    const response = await fetch(url, {
      ...init,
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!REDIRECT_STATUSES.has(response.status)) {
      validatedHttpsUrl(response.url || url.toString(), allowedHosts);
      return response;
    }
    await response.body?.cancel();
    if (redirectCount >= maxRedirects) throw new Error(`Too many redirects for ${rawUrl}`);
    const location = response.headers.get("location");
    if (!location) throw new Error(`Redirect from ${url.toString()} is missing Location`);
    url = validatedHttpsUrl(location, allowedHosts, url.toString());
    if (response.status === 303 && method !== "HEAD") method = "GET";
  }
}

export async function readTextBounded(response: Response, maxBytes: number) {
  return new TextDecoder().decode(await readBytesBounded(response, maxBytes));
}

export async function readBytesBounded(response: Response, maxBytes: number) {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > maxBytes) {
    throw new Error(`Response body exceeds ${maxBytes} bytes`);
  }
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error(`Response body exceeds ${maxBytes} bytes`);
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export function isValidatedHttpsUrl(rawUrl: string, allowedHosts: ReadonlySet<string>) {
  try {
    validatedHttpsUrl(rawUrl, allowedHosts);
    return true;
  } catch {
    return false;
  }
}
