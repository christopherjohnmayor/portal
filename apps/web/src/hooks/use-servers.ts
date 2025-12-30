import { useMemo } from "react";
import useLocalStorage from "./use-local-storage";
import {
  ServerConfig,
  SERVER_STORAGE_KEYS,
  DEFAULT_SERVERS,
  loadServersFromEnv,
} from "@/types/servers";

export function useServers() {
  const [storedServers, setStoredServers] = useLocalStorage<ServerConfig[]>(
    SERVER_STORAGE_KEYS.SERVERS,
    DEFAULT_SERVERS,
  );

  const [activeServerId, setActiveServerId] = useLocalStorage<string>(
    SERVER_STORAGE_KEYS.ACTIVE_SERVER,
    DEFAULT_SERVERS[0]?.id || "",
  );

  const allServers = useMemo(() => {
    const envServers = loadServersFromEnv();
    const combinedServers = [...storedServers];

    for (const envServer of envServers) {
      if (!combinedServers.some((s) => s.id === envServer.id)) {
        combinedServers.push(envServer);
      }
    }

    return combinedServers;
  }, [storedServers]);

  const activeServer = useMemo(
    () => allServers.find((s) => s.id === activeServerId) || null,
    [allServers, activeServerId],
  );

  const addServer = (server: ServerConfig) => {
    setStoredServers([...storedServers, { ...server, createdAt: Date.now() }]);
    if (!activeServerId) {
      setActiveServerId(server.id);
    }
  };

  const updateServer = (id: string, updates: Partial<ServerConfig>) => {
    setStoredServers(
      storedServers.map((server) =>
        server.id === id ? { ...server, ...updates } : server,
      ),
    );
  };

  const removeServer = (id: string) => {
    const newServers = storedServers.filter((server) => server.id !== id);
    setStoredServers(newServers);

    if (activeServerId === id && newServers.length > 0) {
      setActiveServerId(newServers[0].id);
    }
  };

  const setActiveServer = (id: string) => {
    setActiveServerId(id);
    const server = storedServers.find((s) => s.id === id);
    if (server) {
      setStoredServers(
        storedServers.map((s) =>
          s.id === id ? { ...s, lastUsedAt: Date.now() } : s,
        ),
      );
    }
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const reloadServers = () => {
    const envServers = loadServersFromEnv();
    if (envServers.length > 0) {
      setStoredServers(envServers);
    }
  };

  return {
    servers: allServers,
    activeServer,
    activeServerId,
    setActiveServer,
    addServer,
    updateServer,
    removeServer,
    reloadServers,
  };
}
