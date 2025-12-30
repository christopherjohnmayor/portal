import useSWR, { mutate } from "swr";
import { useServers } from "@/hooks/use-servers";
import type {
  Message,
  Part,
  ToolPart,
  ToolState,
  TextPart,
} from "@opencode-ai/sdk";

// Re-export types for convenience
export type { Message, Part, ToolPart, ToolState, TextPart };

// Extended message type with optimistic update flag
export interface OptimisticMessage {
  info: {
    id: string;
    role: "user" | "assistant";
    sessionID?: string;
    time?: { created: number };
  };
  parts: Part[];
  isQueued?: boolean;
}

// API response format (messages with info wrapper)
export interface MessageWithParts {
  info: Message;
  parts: Part[];
  isQueued?: boolean;
}

const fetcher = async (
  arg1: string | [string, string | undefined],
  arg2?: string,
): Promise<MessageWithParts[]> => {
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
    throw new Error("Failed to fetch messages");
  }
  const data = await response.json();
  return data.data || data || [];
};

export function useSessionMessages(sessionId: string | undefined) {
  const { activeServer } = useServers();
  const serverUrl = activeServer?.url;
  const key = sessionId ? `/api/sessions/${sessionId}/messages` : null;

  const {
    data,
    error,
    isLoading,
    mutate: boundMutate,
  } = useSWR<MessageWithParts[]>(key ? [key, serverUrl] : null, fetcher, {
    // Refresh every 3 seconds for cross-device sync
    refreshInterval: 3000,
    // Keep previous data while revalidating
    keepPreviousData: true,
    // Don't revalidate on focus to avoid conflicts during send
    revalidateOnFocus: false,
  });

  return {
    messages: data || [],
    error,
    isLoading,
    mutate: boundMutate,
  };
}

export function getMessagesKey(sessionId: string) {
  return `/api/sessions/${sessionId}/messages`;
}

export function mutateSessionMessages(sessionId: string) {
  // Use a fuzzy matcher for the array key format
  mutate((key) => {
    if (Array.isArray(key) && typeof key[0] === "string") {
      return key[0] === getMessagesKey(sessionId);
    }
    return key === getMessagesKey(sessionId);
  });
}

/**
 * Add an optimistic message to the cache and return a function to revert it
 */
export function addOptimisticMessage(
  sessionId: string,
  message: MessageWithParts,
): () => void {
  // We can't know the exact key (serverUrl) here without hook context,
  // so we match all keys for this session
  const keyPrefix = getMessagesKey(sessionId);

  // Get current messages from cache
  let previousMessages: MessageWithParts[] = [];

  mutate(
    (key) => {
      if (Array.isArray(key) && typeof key[0] === "string") {
        return key[0] === keyPrefix;
      }
      return key === keyPrefix;
    },
    (current: MessageWithParts[] | undefined) => {
      previousMessages = current || [];
      return [...previousMessages, message];
    },
    { revalidate: false },
  );

  // Return rollback function
  return () => {
    mutate(
      (key) => {
        if (Array.isArray(key) && typeof key[0] === "string") {
          return key[0] === keyPrefix;
        }
        return key === keyPrefix;
      },
      previousMessages,
      { revalidate: false },
    );
  };
}

/**
 * Update an optimistic message (e.g., to mark as no longer queued)
 */
export function updateOptimisticMessage(
  sessionId: string,
  messageId: string,
  updates: Partial<MessageWithParts>,
) {
  const keyPrefix = getMessagesKey(sessionId);

  mutate(
    (key) => {
      if (Array.isArray(key) && typeof key[0] === "string") {
        return key[0] === keyPrefix;
      }
      return key === keyPrefix;
    },
    (current: MessageWithParts[] | undefined) => {
      if (!current) return current;
      return current.map((m) =>
        m.info.id === messageId ? { ...m, ...updates } : m,
      );
    },
    { revalidate: false },
  );
}

/**
 * Remove an optimistic message from the cache
 */
export function removeOptimisticMessage(sessionId: string, messageId: string) {
  const keyPrefix = getMessagesKey(sessionId);

  mutate(
    (key) => {
      if (Array.isArray(key) && typeof key[0] === "string") {
        return key[0] === keyPrefix;
      }
      return key === keyPrefix;
    },
    (current: MessageWithParts[] | undefined) => {
      if (!current) return current;
      return current.filter((m) => m.info.id !== messageId);
    },
    { revalidate: false },
  );
}
