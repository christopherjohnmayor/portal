/**
 * Multi-Instance Server Configuration Types
 *
 * These types support managing multiple OpenCode server instances,
 * each with its own workspace and configuration.
 */

/**
 * Configuration for a single OpenCode server instance
 */
export interface ServerConfig {
  /** Unique identifier for the server */
  id: string;
  /** Display name shown in UI */
  name: string;
  /** Full URL to the OpenCode server (e.g., "http://localhost:4001") */
  url: string;
  /** Hex color code for visual differentiation in UI (optional) */
  color?: string;
  /** Timestamp when server was added (optional) */
  createdAt?: number;
  /** Timestamp when server was last used (optional) */
  lastUsedAt?: number;
}

/**
 * State and methods for managing multiple OpenCode servers
 */
export interface ServerState {
  /** List of all configured servers */
  servers: ServerConfig[];
  /** Currently active server */
  activeServer: ServerConfig | null;
  /** Set a different server as active */
  setActiveServer: (id: string) => void;
  /** Add a new server to the list */
  addServer: (server: ServerConfig) => void;
  /** Update an existing server's configuration */
  updateServer: (id: string, updates: Partial<ServerConfig>) => void;
  /** Remove a server from the list */
  removeServer: (id: string) => void;
}

/**
 * Local storage keys for multi-instance configuration
 */
export const SERVER_STORAGE_KEYS = {
  /** Array of all configured servers */
  SERVERS: "opencode-servers",
  /** ID of currently active server */
  ACTIVE_SERVER: "opencode-active-server",
} as const;

/**
 * Default servers configuration
 * Used as fallback when no servers are configured
 */
export const DEFAULT_SERVERS: ServerConfig[] = [
  {
    id: "default",
    name: "Default",
    url:
      process.env.NEXT_PUBLIC_OPENCODE_SERVER_URL ||
      process.env.OPENCODE_SERVER_URL ||
      "http://localhost:4000",
    color: "#3b82f6",
    createdAt: Date.now(),
  },
];

/**
 * Server configuration loaded from environment variables
 * Format: OPENCODE_SERVER_{N}_NAME and OPENCODE_SERVER_{N}_URL
 */
export function loadServersFromEnv(): ServerConfig[] {
  const servers: ServerConfig[] = [];

  // Explicitly list env vars because Next.js/Webpack cannot inline dynamic process.env access
  const envConfigs = [
    {
      name: process.env.NEXT_PUBLIC_OPENCODE_SERVER_1_NAME,
      url: process.env.NEXT_PUBLIC_OPENCODE_SERVER_1_URL,
      color: process.env.NEXT_PUBLIC_OPENCODE_SERVER_1_COLOR,
    },
    {
      name: process.env.NEXT_PUBLIC_OPENCODE_SERVER_2_NAME,
      url: process.env.NEXT_PUBLIC_OPENCODE_SERVER_2_URL,
      color: process.env.NEXT_PUBLIC_OPENCODE_SERVER_2_COLOR,
    },
    {
      name: process.env.NEXT_PUBLIC_OPENCODE_SERVER_3_NAME,
      url: process.env.NEXT_PUBLIC_OPENCODE_SERVER_3_URL,
      color: process.env.NEXT_PUBLIC_OPENCODE_SERVER_3_COLOR,
    },
    {
      name: process.env.NEXT_PUBLIC_OPENCODE_SERVER_4_NAME,
      url: process.env.NEXT_PUBLIC_OPENCODE_SERVER_4_URL,
      color: process.env.NEXT_PUBLIC_OPENCODE_SERVER_4_COLOR,
    },
    {
      name: process.env.NEXT_PUBLIC_OPENCODE_SERVER_5_NAME,
      url: process.env.NEXT_PUBLIC_OPENCODE_SERVER_5_URL,
      color: process.env.NEXT_PUBLIC_OPENCODE_SERVER_5_COLOR,
    },
  ];

  envConfigs.forEach((config, index) => {
    if (config.name && config.url) {
      servers.push({
        id: `env-${index + 1}`,
        name: config.name,
        url: config.url,
        color: config.color,
      });
    }
  });

  return servers;
}
