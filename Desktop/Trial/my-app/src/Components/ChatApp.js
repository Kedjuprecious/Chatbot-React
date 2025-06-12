import React, { useState, useEffect } from "react";
import { marked } from "marked";
import { FiTrash } from "react-icons/fi";

const GEMINI_API_KEY = "AIzaSyCRAzRDm37YRwJgO2xJcGv1jfYtmTcTfEw";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.0-flash";
const temperature = 0.7;

const systemInstruction = `
You are a cardiologist AI expert. Your role is to:
- Ask 6 follow-up questions to understand user symptoms related to cardiovascular disease, one at a time, based on previous answers.
- Based on answers, recommend first-line medical care (like medications or lifestyle advice).
- Suggest necessary diagnostic tests (e.g., ECG, echocardiogram) where applicable.
- If symptoms suggest emergency (like crushing chest pain, syncope, severe shortness of breath), advise urgent cardiologist consultation.
- After the questions and recommendation, summarize the session.
- Then, ask the user if they want to speak to a cardiologist on the platform.
Please act like a compassionate, experienced medical doctor.
`;

function ChatApp() {
  const [conversations, setConversations] = useState(() => {
    const saved = localStorage.getItem("conversations");
    return saved ? JSON.parse(saved) : [{ id: 1, title: "New Conversation", messages: [] }];
  });

  const [activeConvId, setActiveConvId] = useState(1);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const maxQuestions = 6;

  const activeConversation = conversations.find(c => c.id === activeConvId);

  useEffect(() => {
    localStorage.setItem("conversations", JSON.stringify(conversations));
  }, [conversations]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const updatedMessages = [...activeConversation.messages, { sender: "user", text: input }];
    updateConversationMessages(activeConvId, updatedMessages);
    setInput("");
    setLoading(true);

    const chatHistory = [
      { role: "user", parts: [{ text: systemInstruction.trim() }] },
      ...updatedMessages.map(msg => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      }))
    ];

    const payload = {
      contents: chatHistory,
      generationConfig: {
        temperature,
        maxOutputTokens: 800,
        topP: 0.8,
        topK: 10
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_ONLY_HIGH"
        }
      ]
    };

    const url = `${GEMINI_BASE_URL}/${DEFAULT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const generatedText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini";

      updateConversationMessages(activeConvId, [
        ...updatedMessages,
        { sender: "ai", text: generatedText }
      ]);

      if (questionCount < maxQuestions) {
        setQuestionCount(prev => prev + 1);
      }
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
      prev.map(c => {
        if (c.id === convId) {
          const defaultTitle = "New Conversation";
          let newTitle = c.title;

          if (c.title === defaultTitle) {
            const firstUserMsg = messages.find(m => m.sender === "user");
            if (firstUserMsg) {
              newTitle =
                firstUserMsg.text.length > 30
                  ? firstUserMsg.text.slice(0, 30) + "..."
                  : firstUserMsg.text;
            }
          }

          return { ...c, messages, title: newTitle };
        }
        return c;
      })
    );
  };

  const createNewConversation = () => {
    const newId = conversations.length ? Math.max(...conversations.map(c => c.id)) + 1 : 1;
    const newConv = { id: newId, title: "New Conversation", messages: [] };
    setConversations([...conversations, newConv]);
    setActiveConvId(newId);
    setQuestionCount(0);
  };

  const confirmDelete = () => {
    const updatedConversations = conversations.filter(c => c.id !== deleteTargetId);
    setConversations(updatedConversations);

    if (deleteTargetId === activeConvId) {
      if (updatedConversations.length > 0) {
        setActiveConvId(updatedConversations[0].id);
      } else {
        const newConv = { id: 1, title: "New Conversation", messages: [] };
        setConversations([newConv]);
        setActiveConvId(1);
        setQuestionCount(0);
      }
    }

    setShowModal(false);
    setDeleteTargetId(null);
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Arial, sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: 250, borderRight: "1px solid #ccc", padding: 10 }}>
        <h3>Conversations</h3>
        {conversations.map(conv => (
          <div
            key={conv.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              marginBottom: 8,
              cursor: "pointer",
              backgroundColor: conv.id === activeConvId ? "#ddd" : "transparent",
              borderRadius: 4
            }}
          >
            <div
              onClick={() => setActiveConvId(conv.id)}
              style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
              title={conv.title}
            >
              {conv.title}
            </div>
            <button
              onClick={() => {
                setDeleteTargetId(conv.id);
                setShowModal(true);
              }}
              style={{ marginLeft: 8, backgroundColor: "transparent", border: "none", cursor: "pointer" }}
              title="Delete conversation"
            >
              <FiTrash color="red" size={18} />
            </button>
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
              style={{ marginBottom: 12, textAlign: msg.sender === "user" ? "right" : "left" }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "8px 12px",
                  borderRadius: 16,
                  backgroundColor: msg.sender === "user" ? "#0078d4" : "#e5e5ea",
                  color: msg.sender === "user" ? "white" : "black",
                  maxWidth: "70%",
                  textAlign: "left"
                }}
                dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
              />
            </div>
          ))}
        </div>

        {/* Input */}
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

      {/* Delete Confirmation Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            height: "100vh",
            width: "100vw",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <div
            style={{
              background: "white",
              padding: 20,
              borderRadius: 8,
              width: 300,
              boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
              textAlign: "center"
            }}
          >
            <h4>Confirm Deletion</h4>
            <p>Do you really want to delete this conversation?</p>
            <div style={{ marginTop: 20 }}>
              <button
                onClick={confirmDelete}
                style={{
                  backgroundColor: "#d9534f",
                  color: "white",
                  padding: "8px 12px",
                  marginRight: 10,
                  border: "none",
                  borderRadius: 4
                }}
              >
                Yes, Delete
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setDeleteTargetId(null);
                }}
                style={{
                  backgroundColor: "#ccc",
                  padding: "8px 12px",
                  border: "none",
                  borderRadius: 4
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatApp;
