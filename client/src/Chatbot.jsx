import React, { useState } from "react";
import { Bot, Send, X, MessageCircle } from "lucide-react";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hi! I'm Guardian AI. How can I help you today?",
    },
  ]);

  const sendMessage = async () => {
    const text = message.trim();

    if (!text || loading) return;

    setMessages((prev) => [
      ...prev,
      { sender: "user", text },
    ]);

    setMessage("");
    setLoading(true);

    try {
      const token = sessionStorage.getItem("gc_token");

      const response = await fetch(`${API}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Guardian AI could not respond.");
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.answer,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: error.message || "Unable to connect to Guardian AI.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <>
      {open && (
        <div className="guardian-chat">
          <div className="guardian-chat-header">
            <div className="guardian-chat-title">
              <div className="guardian-chat-icon">
                <Bot size={18} />
              </div>

              <div>
                <b>Guardian AI</b>
                <small>Inventory assistant</small>
              </div>
            </div>

            <button
              className="guardian-chat-close"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="guardian-chat-body">
            {messages.map((item, index) => (
              <div
                key={index}
                className={`guardian-message ${
                  item.sender === "user"
                    ? "guardian-message-user"
                    : "guardian-message-bot"
                }`}
              >
                {item.text}
              </div>
            ))}

            {loading && (
              <div className="guardian-message guardian-message-bot">
                Thinking...
              </div>
            )}
          </div>

          <div className="guardian-chat-input">
            <input
              type="text"
              placeholder="Ask Guardian AI..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />

            <button onClick={sendMessage} disabled={loading}>
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      <button
        className="guardian-chat-button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open Guardian AI"
      >
        {open ? <X size={21} /> : <MessageCircle size={21} />}
      </button>
    </>
  );
}