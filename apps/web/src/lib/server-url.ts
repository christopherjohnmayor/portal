/**
 * Multi-Instance Server URL Utilities
 *
 * Helper functions to extract and use the active server URL
 * from HTTP requests for multi-instance OpenCode architecture.
 */

import type { ServerConfig } from "@/types/servers";
import { createOpencodeClient } from "@opencode-ai/sdk";

/**
 * Extract active server URL from request headers
 *
 * The client sends the active server URL in a custom header:
 * X-Active-Server-Url: http://localhost:4001
 *
 * Fallback hierarchy:
 * 1. X-Active-Server-Url header
 * 2. OPENCODE_SERVER_URL env var
 * 3. http://localhost:4000
 */
export function getActiveServerUrl(req: {
  headers?: { [key: string]: string | string[] | undefined };
}): string {
  const headerUrl = req.headers?.["x-active-server-url"];

  if (headerUrl) {
    const url = Array.isArray(headerUrl) ? headerUrl[0] : headerUrl;
    console.log("[Server URL] Using active server from header:", url);
    return url;
  }

  const envUrl =
    process.env.NEXT_PUBLIC_OPENCODE_SERVER_URL ||
    process.env.OPENCODE_SERVER_URL;

  if (envUrl) {
    console.log("[Server URL] Using env var:", envUrl);
    return envUrl;
  }

  console.log("[Server URL] Using default: http://localhost:4000");
  return "http://localhost:4000";
}

/**
 * Create an OpenCode client with the active server URL
 */
export function createClientWithActiveServer(req: {
  headers?: { [key: string]: string | string[] | undefined };
}) {
  const baseUrl = getActiveServerUrl(req);

  return createOpencodeClient({ baseUrl });
}
