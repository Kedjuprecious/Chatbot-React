import React, { useState } from "react";

// ✅ Correct Gemini 2.0 Flash endpoint
const GEMINI_API_KEY = "AIzaSyCRAzRDm37YRwJgO2xJcGv1jfYtmTcTfEw";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

function ChatApp() {
  const [conversations, setConversations] = useState([
    { id: 1, title: "New Conversation", messages: [] }
  ]);
  const [activeConvId, setActiveConvId] = useState(1);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const activeConversation = conversations.find(c => c.id === activeConvId);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const updatedMessages = [
      ...activeConversation.messages,
      { sender: "user", text: input }
    ];
    updateConversationMessages(activeConvId, updatedMessages);

    setInput("");
    setLoading(true);

    const payload = {
      contents: [
        {
          parts: [{ text: input }]
        }
      ],
      safetySettings: [
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_ONLY_HIGH"
        }
      ],
      generationConfig: {
        stopSequences: ["Title"],
        temperature: 1.0,
        maxOutputTokens: 800,
        topP: 0.8,
        topK: 10
      }
    };

    try {
      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini";

      updateConversationMessages(activeConvId, [
        ...updatedMessages,
        { sender: "ai", text: generatedText }
      ]);
    } catch (error) {
      updateConversationMessages(activeConvId, [
        ...updatedMessages,
        { sender: "ai", text: "Error: Failed to get response." }
      ]);
      console.error("Gemini API error:", error);
    }

    setLoading(false);
  };

  const updateConversationMessages = (convId, messages) => {
    setConversations(prev =>
      prev.map(c =>
        c.id === convId ? { ...c, messages } : c
      )
    );
  };

  const createNewConversation = () => {
    const newId = conversations.length
      ? Math.max(...conversations.map(c => c.id)) + 1
      : 1;
    const newConv = { id: newId, title: "New Conversation", messages: [] };
    setConversations([...conversations, newConv]);
    setActiveConvId(newId);
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Arial, sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: 250, borderRight: "1px solid #ccc", padding: 10 }}>
        <h3>Conversations</h3>
        {conversations.map(conv => (
          <div
            key={conv.id}
            onClick={() => setActiveConvId(conv.id)}
            style={{
              padding: "8px 12px",
              marginBottom: 8,
              cursor: "pointer",
              backgroundColor: conv.id === activeConvId ? "#ddd" : "transparent",
              borderRadius: 4
            }}
          >
            {conv.title}
          </div>
        ))}
        <button onClick={createNewConversation}>+ New Conversation</button>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, padding: 20, overflowY: "auto", backgroundColor: "#f9f9f9" }}>
          {activeConversation?.messages.length === 0 && (
            <p style={{ color: "#888" }}>Start the conversation by typing below.</p>
          )}
          {activeConversation?.messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: 12,
                textAlign: msg.sender === "user" ? "right" : "left"
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "8px 12px",
                  borderRadius: 16,
                  backgroundColor: msg.sender === "user" ? "#0078d4" : "#e5e5ea",
                  color: msg.sender === "user" ? "white" : "black",
                  maxWidth: "70%"
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: 10, borderTop: "1px solid #ccc" }}>
          <textarea
            rows={2}
            style={{ width: "100%", resize: "none", padding: 8 }}
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{ marginTop: 6, padding: "8px 16px" }}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatApp;
