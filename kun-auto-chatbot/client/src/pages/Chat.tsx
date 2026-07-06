import { useState, useMemo, useEffect, useRef } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { useMessages } from "@/hooks/useMessages";
import { nanoid } from "nanoid";
import { Car, Phone } from "lucide-react";

export default function Chat() {
  // Read vehicle context from URL params (from VehicleLanding → Chat flow)
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const vehicleContext = urlParams.get("vehicle");
  const prefilledMessage = urlParams.get("message");

  const [sessionId] = useState(() => {
    const stored = localStorage.getItem("kun-chat-session");
    if (stored) return stored;
    const id = nanoid();
    localStorage.setItem("kun-chat-session", id);
    return id;
  });

  // Initialize messages from localStorage
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem("kun-chat-messages");
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        if (parsed.length > 1) return parsed;
      }
    } catch { /* ignore */ }
    return [{ role: "system", content: "你是崑家汽車的AI智能客服助理。" }];
  });

  // Fetch server messages via polling for operator replies
  const { messages: serverMessages } = useMessages({
    sessionId,
    pollInterval: 3000, // Poll every 3 seconds for new operator replies
    enabled: true,
  });

  // Merge server messages (especially operator replies) into local display
  // Strategy: When polling returns new messages, append them if not already present
  useEffect(() => {
    if (serverMessages.length === 0) return; // Server has no messages yet

    // Find messages that are not yet in the local display
    // (compare by role + full content — a truncated key risks two distinct
    // messages sharing the same prefix, e.g. similar operator greetings,
    // silently dropping the second one)
    const localSet = new Set(
      messages.map((m) => `${m.role}:${m.content}`)
    );
    const newMessages = serverMessages.filter(
      (m) => !localSet.has(`${m.role}:${m.content}`)
    );

    if (newMessages.length > 0) {
      setMessages((prev) => {
        // Avoid adding duplicates
        const combined = [...prev, ...newMessages];
        // Deduplicate by role + content
        const seen = new Set<string>();
        const deduped = combined.filter((m) => {
          const key = `${m.role}:${m.content}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return deduped;
      });
    }
  }, [serverMessages, messages]);

  // Persist messages to localStorage
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem("kun-chat-messages", JSON.stringify(messages));
    }
  }, [messages]);

  const [isLoading, setIsLoading] = useState(false);
  const messageIndexRef = useRef(-1);
  const assistantMessageRef = useRef("");

  const handleSend = async (content: string) => {
    setMessages((prev) => [...prev, { role: "user", content }]);
    setIsLoading(true);
    messageIndexRef.current = -1;
    assistantMessageRef.current = "";

    try {
      // Start streaming from the new endpoint
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: content,
          channel: "web",
          vehicleContext: vehicleContext ? vehicleContext : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Get the ReadableStream from the response body
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent: string | null = null;
      let currentData: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE messages (event\ndata\n\n format)
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          if (line === "") {
            // Empty line signals end of message
            if (currentEvent && currentData !== null) {
              if (currentEvent === "token") {
                assistantMessageRef.current += currentData;

                setMessages((prev) => {
                  if (messageIndexRef.current === -1) {
                    // First token: add new assistant message
                    messageIndexRef.current = prev.length;
                    return [
                      ...prev,
                      {
                        role: "assistant",
                        content: assistantMessageRef.current,
                      },
                    ];
                  } else {
                    // Subsequent tokens: update existing message
                    const updated = [...prev];
                    updated[messageIndexRef.current] = {
                      ...updated[messageIndexRef.current],
                      content: assistantMessageRef.current,
                    };
                    return updated;
                  }
                });
              } else if (currentEvent === "done") {
                // Stream finished successfully
                break;
              } else if (currentEvent === "error") {
                throw new Error(currentData || "Stream error from server");
              }
            }
            currentEvent = null;
            currentData = null;
          } else if (line.startsWith("event: ")) {
            currentEvent = line.slice(7);
          } else if (line.startsWith("data: ")) {
            currentData = line.slice(6);
          }
        }
      }
    } catch (err) {
      console.error("Chat stream error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "抱歉，系統暫時忙碌中。您可以直接撥打 0936-812-818 聯繫賴先生。",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-send prefilled message from VehicleLanding (once)
  const [autoSent, setAutoSent] = useState(false);
  useEffect(() => {
    if (prefilledMessage && !autoSent) {
      setAutoSent(true);
      // Small delay so the UI renders first
      setTimeout(() => handleSend(prefilledMessage), 300);
    }
  }, [prefilledMessage, autoSent]);

  const suggestedPrompts = useMemo(
    () =>
      vehicleContext
        ? [
            `${vehicleContext} 多少錢？`,
            `我想預約看 ${vehicleContext}`,
            `${vehicleContext} 有什麼配備？`,
          ]
        : [
            "目前有哪些車可以看？",
            "有沒有50萬以下的SUV？",
            "我想找一台省油的家庭用車",
            "Honda CR-V 的詳細資訊",
          ],
    [vehicleContext]
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-primary text-primary-foreground">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Car className="h-6 w-6" />
              <div>
                <h1 className="text-base font-semibold leading-tight">
                  崑家汽車
                </h1>
                <p className="text-xs opacity-80">
                  {vehicleContext ? `正在詢問：${vehicleContext}` : "AI 智能客服"}
                </p>
              </div>
            </a>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="tel:0936812818"
              className="flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/25"
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">0936-812-818</span>
            </a>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="container py-4">
        <div className="mx-auto max-w-3xl">
          <AIChatBox
            messages={messages}
            onSendMessage={handleSend}
            isLoading={isLoading}
            placeholder={vehicleContext ? `詢問 ${vehicleContext} 的問題...` : "請輸入您想詢問的車輛問題..."}
            height="calc(100vh - 8rem)"
            emptyStateMessage={vehicleContext ? `想了解 ${vehicleContext} 嗎？選個問題或直接打字！` : "歡迎來到崑家汽車！有什麼我可以幫您的嗎？"}
            suggestedPrompts={suggestedPrompts}
            className="border-0 shadow-none"
          />
        </div>
      </div>
    </div>
  );
}
