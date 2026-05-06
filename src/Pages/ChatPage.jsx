// Pages/ChatPage.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { axiosInstance } from "../lib/axios";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import {
  Send,
  User,
  Phone,
  Video,
  PhoneOff,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

const ChatPage = () => {
  const { id: targetUserId } = useParams();
  const { authUser, isLoading } = useAuthUser();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const isOnline = onlineUsers.includes(targetUserId);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
    ? import.meta.env.VITE_BACKEND_URL.replace(/\/api$/, "")
    : "http://localhost:8000";

  // Fetch chat history
  useEffect(() => {
    if (!authUser || !targetUserId) return;
    const fetchMessages = async () => {
      try {
        const res = await axiosInstance.get(
          `/messages/${authUser._id}/${targetUserId}`
        );
        setMessages(res.data);
      } catch (err) {
        console.error("Error fetching messages", err);
        toast.error("Could not load chat history");
      }
    };
    fetchMessages();
  }, [authUser, targetUserId]);

  // Connect Socket.IO
  useEffect(() => {
    if (!authUser) return;

    const socket = io(BACKEND_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🟢 Socket connected");
    });

    socket.on("getOnlineUsers", (users) => {
      setOnlineUsers(users);
    });

    socket.on("newMessage", (message) => {
      if (
        (message.senderId === authUser._id &&
          message.receiverId === targetUserId) ||
        (message.senderId === targetUserId &&
          message.receiverId === authUser._id)
      ) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on("userTyping", ({ userId, name }) => {
      if (userId === targetUserId) setTypingUser(name);
    });

    socket.on("userStopTyping", (userId) => {
      if (userId === targetUserId) setTypingUser(null);
    });

    socket.on("incomingCall", (data) => {
      setIncomingCall(data);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      toast.error("Chat connection failed. Reconnecting...");
    });

    return () => {
      socket.disconnect();
    };
  }, [authUser, targetUserId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current) return;

    socketRef.current.emit("sendMessage", {
      receiverId: targetUserId,
      text: newMessage.trim(),
    });
    setNewMessage("");
    socketRef.current.emit("stopTyping", targetUserId);
  };

  // Typing indicator
  const handleTyping = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("typing", targetUserId);
    clearTimeout(window.typingTimer);
    window.typingTimer = setTimeout(() => {
      socketRef.current?.emit("stopTyping", targetUserId);
    }, 2000);
  };

  // Start a call
  const startCall = (type) => {
    if (!socketRef.current) return;
    if (!isOnline) {
      toast.error("User is offline – cannot start a call.");
      return;
    }
    socketRef.current.emit("callUser", {
      targetUserId,
      callType: type,
    });
    navigate(`/call/${targetUserId}?type=${type}&role=caller`);
  };

  // Accept incoming call
  const acceptCall = () => {
    if (!incomingCall || !socketRef.current) return;
    socketRef.current.emit("acceptCall", { to: incomingCall.from });
    navigate(`/call/${incomingCall.from}?type=${incomingCall.callType}`);
    setIncomingCall(null);
  };

  // Decline incoming call
  const declineCall = () => {
    if (!incomingCall || !socketRef.current) return;
    socketRef.current.emit("declineCall", { to: incomingCall.from });
    setIncomingCall(null);
  };

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full max-w-4xl mx-auto bg-base-100">
      {/* Chat header */}
      <div className="bg-base-200 p-4 flex items-center justify-between shadow-sm border-b border-base-300">
        <div className="flex items-center gap-3">
          <Link
            to="/home"
            className="btn btn-ghost btn-circle btn-sm lg:hidden"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="avatar placeholder">
            <div className="w-10 rounded-full bg-neutral-focus text-neutral-content">
              <User size={24} />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-sm">Chat</h3>
            <p
              className={`text-xs flex items-center gap-1 ${
                isOnline ? "text-success" : "text-error"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? "bg-success" : "bg-error"
                }`}
              />
              {isOnline ? "Online" : "Offline"}
            </p>
            {typingUser && (
              <p className="text-xs italic text-base-content/70">
                {typingUser} typing...
              </p>
            )}
          </div>
        </div>

        {/* Call buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => startCall("voice")}
            className="btn btn-ghost btn-circle"
            title="Voice Call"
            disabled={!isOnline}
          >
            <Phone size={20} />
          </button>
          <button
            onClick={() => startCall("video")}
            className="btn btn-ghost btn-circle"
            title="Video Call"
            disabled={!isOnline}
          >
            <Video size={20} />
          </button>
        </div>
      </div>

      {/* Offline warning */}
      {!isOnline && (
        <div className="bg-yellow-100 text-yellow-800 px-4 py-2 text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          <span>
            This user is offline. Messages will be delivered when they come
            online.
          </span>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-base-100 space-y-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-base-content/50">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.senderId === authUser._id;
            return (
              <div
                key={idx}
                className={`chat ${isMine ? "chat-end" : "chat-start"}`}
              >
                <div className="chat-header text-xs opacity-70">
                  {isMine ? "You" : "Friend"}
                  <time className="ml-1 text-xs opacity-50">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <div
                  className={`chat-bubble max-w-[75vw] sm:max-w-md break-words whitespace-pre-wrap ${
                    isMine ? "chat-bubble-primary" : "chat-bubble-secondary"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form
        onSubmit={handleSend}
        className="bg-base-200 p-4 flex items-center gap-2 border-t border-base-300"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            if (e.target.value.trim()) handleTyping();
          }}
          placeholder="Type a message..."
          className="input input-bordered flex-1"
          autoFocus
        />
        <button
          type="submit"
          className="btn btn-primary btn-square"
          disabled={!newMessage.trim()}
        >
          <Send size={20} />
        </button>
      </form>

      {/* Incoming call modal */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card bg-base-100 shadow-2xl p-6 text-center space-y-4">
            <h2 className="text-xl font-bold">Incoming Call</h2>
            <p className="text-lg">{incomingCall.fromName}</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={acceptCall}
                className="btn btn-success btn-lg gap-2"
              >
                <Phone size={20} /> Accept
              </button>
              <button
                onClick={declineCall}
                className="btn btn-error btn-lg gap-2"
              >
                <PhoneOff size={20} /> Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
