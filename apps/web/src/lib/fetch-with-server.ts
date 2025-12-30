import { useServers } from "@/hooks/use-servers";

let activeServerUrlCache: string | null = null;

export function setServerUrlHeader(
  options: RequestInit,
  serverUrl: string,
): RequestInit {
  const headers = new Headers(options.headers as HeadersInit);

  if (!headers.has("X-Active-Server-Url")) {
    headers.set("X-Active-Server-Url", serverUrl);
  }

  return {
    ...options,
    headers,
  };
}

export function createOpencodeFetch() {
  const { activeServer } = useServers();
  const serverUrl = activeServer?.url || "";

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const options = init
      ? setServerUrlHeader(init, serverUrl)
      : { headers: { "X-Active-Server-Url": serverUrl } };

    return fetch(input, options);
  };
}
