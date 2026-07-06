import { useState, useEffect, useCallback, useRef } from "react";

export interface Message {
  role: "system" | "user" | "assistant" | "operator";
  content: string;
  createdAt?: string;
}

interface UseMessagesOptions {
  /**
   * Session ID for the conversation
   */
  sessionId: string;
  /**
   * Polling interval in milliseconds (default: 3000 = 3 seconds)
   */
  pollInterval?: number;
  /**
   * Enable polling for new messages (default: true)
   */
  enabled?: boolean;
}

interface UseMessagesReturn {
  /**
   * Current messages in the conversation
   */
  messages: Message[];
  /**
   * Whether the client is currently fetching messages
   */
  isLoading: boolean;
  /**
   * Error message if fetching failed
   */
  error: string | null;
  /**
   * Manually refresh messages from server
   */
  refresh: () => Promise<void>;
  /**
   * Stop polling (useful for cleanup or when handoff is complete)
   */
  stopPolling: () => void;
  /**
   * Resume polling (if previously stopped)
   */
  startPolling: () => void;
}

/**
 * Hook for managing web chat messages with automatic polling for operator replies.
 *
 * Features:
 * - Fetches initial message history from server
 * - Automatically polls for new messages every 3 seconds (configurable)
 * - Renders operator replies alongside AI messages
 * - Efficient delta-fetching: only retrieves messages since last poll
 *
 * Why polling over WebSocket/SSE:
 * - Simpler implementation, no connection management complexity
 * - Lower barrier to entry for MVP
 * - HTTP is more reliable across corporate networks/proxies
 * - 3s latency is acceptable for customer service use case
 *
 * Example usage:
 * ```tsx
 * const { messages, isLoading, error, refresh } = useMessages({
 *   sessionId: "abc123",
 *   pollInterval: 3000, // poll every 3 seconds
 * });
 *
 * return (
 *   <>
 *     {messages.map((msg) => (
 *       <div key={msg.createdAt}>{msg.role}: {msg.content}</div>
 *     ))}
 *   </>
 * );
 * ```
 */
export function useMessages({
  sessionId,
  pollInterval = 3000,
  enabled = true,
}: UseMessagesOptions): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the last message timestamp for efficient delta fetches
  const lastFetchTimeRef = useRef<Date | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(enabled);

  /**
   * Fetch messages from the server.
   * - First fetch: loads full history
   * - Subsequent fetches: uses `since` param to get only new messages
   */
  const fetchMessages = useCallback(async () => {
    if (!sessionId) return;

    try {
      setError(null);

      // Build query params: include 'since' for efficient delta fetching
      const queryParams = new URLSearchParams({
        sessionId,
        ...(lastFetchTimeRef.current && {
          since: lastFetchTimeRef.current.toISOString(),
        }),
      });

      const response = await fetch(`/api/chat/history?${queryParams}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch messages`);
      }

      const data = await response.json();

      // Response format: { messages: [...], conversation: {...} }
      const newMessages = data?.messages || [];

      if (newMessages.length > 0) {
        // On first fetch, replace messages; on subsequent fetches, append new messages.
        // Dedup reads `prev` via the functional updater (not the outer `messages` state)
        // so this callback's identity stays stable across polls — depending on `messages`
        // directly would tear down and reschedule the poll interval on every new message,
        // silently doubling the effective latency.
        if (!lastFetchTimeRef.current) {
          setMessages(newMessages);
        } else {
          setMessages((prev: Message[]) => {
            const existingIds = new Set(prev.map((m: Message) => m.createdAt));
            const freshMessages = newMessages.filter(
              (m: Message) => !existingIds.has(m.createdAt)
            );
            return freshMessages.length > 0 ? [...prev, ...freshMessages] : prev;
          });
        }

        // Update the last fetch time to the latest message's timestamp
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage?.createdAt) {
          lastFetchTimeRef.current = new Date(lastMessage.createdAt);
        }
      }
    } catch (err) {
      console.error("[useMessages] Fetch error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch messages"
      );
      // Don't crash on polling error — just log and continue
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Initial load: fetch full message history
   */
  useEffect(() => {
    if (!enabled || !sessionId) return;

    setIsLoading(true);
    fetchMessages();
  }, [sessionId, enabled, fetchMessages]);

  /**
   * Set up polling interval for new messages
   */
  useEffect(() => {
    if (!enabled || !sessionId || !isPollingRef.current) return;

    // Start polling after initial fetch
    const timer = setTimeout(() => {
      pollIntervalRef.current = setInterval(() => {
        if (isPollingRef.current) {
          fetchMessages();
        }
      }, pollInterval);
    }, pollInterval);

    return () => {
      clearTimeout(timer);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [sessionId, enabled, pollInterval, fetchMessages]);

  const stopPolling = useCallback(() => {
    isPollingRef.current = false;
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    isPollingRef.current = true;
  }, []);

  return {
    messages,
    isLoading,
    error,
    refresh: fetchMessages,
    stopPolling,
    startPolling,
  };
}
