"use client";
import { useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";

interface Message {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string };
}

interface Props {
  expenseId: string;
  currentUserId: string;
  initialMessages: Message[];
}

export default function ChatBox({ expenseId, currentUserId, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster || key === "your-pusher-key") return;

    const pusher = new Pusher(key, { cluster });
    const channel = pusher.subscribe(`expense-${expenseId}`);
    channel.bind("new-message", (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return () => { channel.unbind_all(); pusher.unsubscribe(`expense-${expenseId}`); };
  }, [expenseId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const res = await fetch(`/api/expenses/${expenseId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      setText("");
    }
    setSending(false);
  }

  return (
    <div className="flex flex-col h-96">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
        {messages.length === 0 && (
          <p className="text-center text-xs text-gray-400 mt-6">No messages yet. Start the conversation!</p>
        )}
        {messages.map((m) => {
          const isMe = m.user.id === currentUserId;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs rounded-2xl px-4 py-2 ${isMe ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-800"}`}>
                {!isMe && <p className="text-xs font-semibold mb-1 text-gray-500">{m.user.name}</p>}
                <p className="text-sm">{m.text}</p>
                <p className={`text-xs mt-1 ${isMe ? "text-teal-100" : "text-gray-400"}`}>
                  {new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 pt-3 border-t border-gray-100 mt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-full text-sm font-medium transition disabled:opacity-50"
        >
          {sending ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
