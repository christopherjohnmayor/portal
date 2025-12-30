import useSWR, { mutate } from "swr";
import { useServers } from "@/hooks/use-servers";
import { useEffect } from "react";
import type { ServerConfig } from "@/types/servers";

export interface Session {
  id: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
}

const SESSIONS_KEY = "/api/sessions";

const fetcher = async (
  arg1: string | [string, string | undefined],
  arg2?: string,
): Promise<Session[]> => {
  let url: string;
  let serverUrl: string | undefined;

  if (Array.isArray(arg1)) {
    [url, serverUrl] = arg1;
  } else {
    url = arg1;
    serverUrl = arg2;
  }

  // Debug log
  // console.log("[useSessions fetcher] Fetching:", url, "Server:", serverUrl);

  const headers: HeadersInit = {};
  if (serverUrl) {
    headers["X-Active-Server-Url"] = serverUrl;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch sessions");
  }
  const data = await response.json();
  return data.data || data || [];
};

export function useSessions() {
  const { activeServer } = useServers();
  const serverUrl = activeServer?.url;

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<Session[]>([SESSIONS_KEY, serverUrl], fetcher);

  // Force revalidation and clear cache when the active server URL changes
  useEffect(() => {
    if (activeServer && serverUrl) {
      console.log(
        "[useSessions] Server changed to:",
        serverUrl,
        ". Clearing old sessions...",
      );
      // Clear data immediately to force UI update
      swrMutate(undefined, false);
      // Trigger fresh fetch
      swrMutate();
    }
  }, [activeServer?.url, swrMutate]);

  return {
    sessions: data,
    error,
    isLoading,
  };
}

export function useAllSessions() {
  const { servers } = useServers();

  const fetcher = async () => {
    const promises = servers.map(async (server) => {
      try {
        // Append query param to prevent browser caching of requests with different headers
        const response = await fetch(
          `/api/sessions?serverId=${encodeURIComponent(server.id)}&t=${Date.now()}`,
          {
            headers: { "X-Active-Server-Url": server.url },
            cache: "no-store",
          },
        );
        if (!response.ok) return { server, sessions: [] as Session[] };
        const data = await response.json();
        return {
          server,
          sessions: (data.data || data || []) as Session[],
        };
      } catch (e) {
        return { server, sessions: [] as Session[] };
      }
    });
    return Promise.all(promises);
  };

  const { data, error, isLoading, mutate } = useSWR(
    ["/api/sessions/all", servers.map((s) => s.url).join(",")],
    fetcher,
  );

  return {
    groupedSessions: data || [],
    error,
    isLoading,
    mutate,
  };
}

export function mutateSessions() {
  // Force revalidation of all session-related keys by returning true for any session-related key
  // This ensures that when we switch servers, the sidebar immediately re-fetches the new server's sessions
  mutate(
    (key) => {
      if (Array.isArray(key) && typeof key[0] === "string") {
        return key[0].startsWith("/api/sessions");
      }
      return typeof key === "string" && key.startsWith("/api/sessions");
    },
    undefined,
    { revalidate: true },
  );
}

const sessionFetcher = async (
  arg1: string | [string, string | undefined],
  arg2?: string,
): Promise<Session> => {
  let url: string;
  let serverUrl: string | undefined;

  if (Array.isArray(arg1)) {
    [url, serverUrl] = arg1;
  } else {
    url = arg1;
    serverUrl = arg2;
  }

  const headers: HeadersInit = {};
  if (serverUrl) {
    headers["X-Active-Server-Url"] = serverUrl;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch session");
  }
  const data = await response.json();
  return data.data || data;
};

export function useSession(sessionId: string | undefined) {
  const { activeServer } = useServers();
  const serverUrl = activeServer?.url;

  const { data, error, isLoading } = useSWR<Session>(
    sessionId ? [`/api/sessions/${sessionId}`, serverUrl] : null,
    sessionFetcher,
  );

  return {
    session: data,
    error,
    isLoading,
  };
}
