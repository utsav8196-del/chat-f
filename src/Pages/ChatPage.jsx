// Pages/ChatPage.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { axiosInstance } from "../lib/axios";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { Send, User, ArrowLeft } from "lucide-react";

const ChatPage = () => {
  const { id: targetUserId } = useParams();
  const { authUser, isLoading } = useAuthUser();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const isOnline = onlineUsers.includes(targetUserId);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
    ? import.meta.env.VITE_BACKEND_URL.replace(/\/api$/, "")
    : "http://localhost:8000";

  // Fetch chat history
  useEffect(() => {
    if (!authUser || !targetUserId) return;
    axiosInstance.get(`/messages/${authUser._id}/${targetUserId}`)
      .then(res => setMessages(res.data))
      .catch(err => {
        console.error("Error fetching messages", err);
        toast.error("Could not load chat history");
      });
  }, [authUser, targetUserId]);

  // Socket connection
  useEffect(() => {
    if (!authUser) return;

    const socket = io(BACKEND_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.on("connect", () => console.log("🟢 Socket connected"));

    socket.on("getOnlineUsers", users => setOnlineUsers(users));

    socket.on("newMessage", message => {
      // Only add if it belongs to this conversation
      if (
        (message.senderId === authUser._id && message.receiverId === targetUserId) ||
        (message.senderId === targetUserId && message.receiverId === authUser._id)
      ) {
        setMessages(prev => [...prev, message]);
      }
    });

    socket.on("connect_error", err => {
      console.error("Socket error:", err.message);
      toast.error("Chat connection failed");
    });

    return () => socket.disconnect();
  }, [authUser, targetUserId]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = e => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current) return;
    socketRef.current.emit("sendMessage", {
      receiverId: targetUserId,
      text: newMessage.trim(),
    });
    setNewMessage("");
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full max-w-4xl mx-auto bg-base-100">
      {/* Header */}
      <div className="bg-base-200 p-4 flex items-center gap-3 shadow-sm">
        <Link to="/home" className="btn btn-ghost btn-circle btn-sm lg:hidden">
          <ArrowLeft size={20} />
        </Link>
        <div className="avatar placeholder">
          <div className="w-10 rounded-full bg-neutral-focus text-neutral-content">
            <User size={24} />
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-sm">Chat</h3>
          <p className={`text-xs ${isOnline ? "text-success" : "text-error"}`}>
            {isOnline ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-base-content/50">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.senderId === authUser._id;
            return (
              <div key={idx} className={`chat ${isMine ? "chat-end" : "chat-start"}`}>
                <div className="chat-header text-xs opacity-70">
                  {isMine ? "You" : "Friend"}
                  <time className="ml-1 text-xs opacity-50">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </time>
                </div>
                <div className={`chat-bubble ${isMine ? "chat-bubble-primary" : "chat-bubble-secondary"}`}>
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="bg-base-200 p-4 flex items-center gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="input input-bordered flex-1"
        />
        <button type="submit" className="btn btn-primary btn-square" disabled={!newMessage.trim()}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default ChatPage;