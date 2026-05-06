// Pages/CallPage.jsx
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { io } from "socket.io-client";
import useAuthUser from "../hooks/useAuthUser";
import toast from "react-hot-toast";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  User,
} from "lucide-react";

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const CallPage = () => {
  const { id: targetUserId } = useParams();
  const [searchParams] = useSearchParams();
  const callType = searchParams.get("type") || "video"; // default video
  const navigate = useNavigate();
  const { authUser, isLoading } = useAuthUser();

  const [socket, setSocket] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === "voice");
  const [callStatus, setCallStatus] = useState("ringing"); // ringing, connecting, connected, declined, ended

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
    ? import.meta.env.VITE_BACKEND_URL.replace(/\/api$/, "")
    : "http://localhost:8000";

  // Determine if we are the caller or receiver:
  // The caller is the one who initiated (the URL contains their targetUserId as the param.id).
  // But both sides see the same URL pattern: /call/:id?type=...
  // The receiver also navigates to /call/:callerId?type=... when they accept.
  // So we can't easily deduce role. We'll rely on whether we received an 'incomingCall' before navigating.
  // A simpler method: When the page loads, if we haven't already emitted an offer, we wait for an offer (receiver).
  // But we need a flag. We'll use a ref `isCallerRef` set by the caller when they emit the callUser event.
  // However, since the ChatPage emits callUser before navigating, we could just assume:
  // - If this page is opened directly (caller), we need to wait for 'callAccepted' before starting media.
  // - If opened via accepting an incoming call (receiver), we need to wait for 'webrtc_offer'.
  // But we can't distinguish from URL alone. Let's store a flag in sessionStorage or use a query param.
  // Simplest: Add query param `role=caller` when navigating from ChatPage's startCall,
  // and no query param (or role=receiver) when accepting.
  // We'll modify ChatPage to append `&role=caller` for the caller, and on accept we append nothing (receiver).

  // So in ChatPage: startCall -> navigate(`/call/${targetUserId}?type=${type}&role=caller`)
  // acceptCall -> navigate(`/call/${incomingCall.from}?type=${incomingCall.callType}`) (no role)

  // Then in CallPage we can check searchParams.get("role").

  const role = searchParams.get("role") || "receiver"; // "caller" or "receiver"

  // Connect socket
  useEffect(() => {
    if (!authUser) return;
    const newSocket = io(BACKEND_URL, { withCredentials: true });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [authUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (peerConnection) peerConnection.close();
      if (localStream) localStream.getTracks().forEach(track => track.stop());
    };
  }, [peerConnection, localStream]);

  // For CALLER: Wait for callAccepted, then start media / create offer
  useEffect(() => {
    if (!socket || !authUser || !targetUserId || role !== "caller") return;

    const handleCallAccepted = async () => {
      try {
        const constraints = {
          audio: true,
          video: callType === "video",
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection(configuration);
        setPeerConnection(pc);

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
          if (remoteVideoRef.current)
            remoteVideoRef.current.srcObject = event.streams[0];
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("webrtc_ice_candidate", {
              to: targetUserId,
              candidate: event.candidate,
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            setCallStatus("connected");
          } else if (
            pc.connectionState === "disconnected" ||
            pc.connectionState === "failed"
          ) {
            setCallStatus("ended");
            toast.error("Call disconnected");
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc_offer", { to: targetUserId, offer });
        setCallStatus("connecting");
      } catch (err) {
        console.error("Media error:", err);
        toast.error("Could not access camera/microphone");
        navigate("/home");
      }
    };

    const handleCallDeclined = () => {
      setCallStatus("declined");
      toast("Call declined", { icon: "📵" });
      setTimeout(() => navigate("/home"), 2000);
    };

    const handleCallEnded = () => {
      setCallStatus("ended");
      toast("Call ended");
      setTimeout(() => navigate("/home"), 2000);
    };

    socket.on("callAccepted", handleCallAccepted);
    socket.on("callDeclined", handleCallDeclined);
    socket.on("callEnded", handleCallEnded);

    return () => {
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callDeclined", handleCallDeclined);
      socket.off("callEnded", handleCallEnded);
    };
  }, [socket, authUser, targetUserId, callType, role, navigate]);

  // For RECEIVER: Wait for webrtc_offer after page mount
  useEffect(() => {
    if (!socket || role !== "receiver") return;

    const startReceiver = async () => {
      try {
        const constraints = {
          audio: true,
          video: callType === "video",
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection(configuration);
        setPeerConnection(pc);

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
          if (remoteVideoRef.current)
            remoteVideoRef.current.srcObject = event.streams[0];
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("webrtc_ice_candidate", {
              to: targetUserId,
              candidate: event.candidate,
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            setCallStatus("connected");
          } else if (
            pc.connectionState === "disconnected" ||
            pc.connectionState === "failed"
          ) {
            setCallStatus("ended");
            toast.error("Call disconnected");
          }
        };

        // Wait for the offer from the caller
        socket.on("webrtc_offer", async ({ from, offer }) => {
          if (from !== targetUserId) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("webrtc_answer", { to: targetUserId, answer });
            setCallStatus("connecting");
          } catch (err) {
            console.error("Error handling offer:", err);
          }
        });

        // Also handle call ended from the other side
        const handleCallEnded = () => {
          setCallStatus("ended");
          toast("Call ended");
          setTimeout(() => navigate("/home"), 2000);
        };
        socket.on("callEnded", handleCallEnded);

        // Cleanup these listeners when component unmounts
        return () => {
          socket.off("webrtc_offer");
          socket.off("callEnded", handleCallEnded);
        };
      } catch (err) {
        console.error("Media error (receiver):", err);
        toast.error("Could not access camera/microphone");
        navigate("/home");
      }
    };

    startReceiver();
  }, [socket, role, targetUserId, callType, navigate]);

  // Also handle answer and ICE candidates for both roles (caller will also need these)
  useEffect(() => {
    if (!socket || !peerConnection) return;

    const handleAnswer = async ({ from, answer }) => {
      if (from !== targetUserId) return;
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("Error setting remote answer:", err);
      }
    };

    const handleIceCandidate = ({ from, candidate }) => {
      if (from !== targetUserId) return;
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    };

    socket.on("webrtc_answer", handleAnswer);
    socket.on("webrtc_ice_candidate", handleIceCandidate);

    return () => {
      socket.off("webrtc_answer", handleAnswer);
      socket.off("webrtc_ice_candidate", handleIceCandidate);
    };
  }, [socket, peerConnection, targetUserId]);

  // Hang up
  const hangUp = () => {
    if (socket && targetUserId) {
      socket.emit("callEnd", { to: targetUserId });
    }
    if (peerConnection) {
      peerConnection.close();
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    navigate("/home");
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="h-screen w-screen bg-black flex flex-col">
      {/* Status banner */}
      {callStatus === "ringing" && role === "caller" && (
        <div className="bg-yellow-600 text-white text-center py-2">
          Ringing...
        </div>
      )}
      {callStatus === "connecting" && (
        <div className="bg-blue-600 text-white text-center py-2">
          Connecting...
        </div>
      )}
      {callStatus === "declined" && (
        <div className="bg-red-600 text-white text-center py-2">
          Call declined
        </div>
      )}
      {callStatus === "ended" && (
        <div className="bg-red-600 text-white text-center py-2">
          Call ended
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Remote video (large) */}
        <div className="flex-1 bg-gray-900 flex items-center justify-center relative">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-white text-opacity-50 flex flex-col items-center">
              <User size={80} />
              <p>{callStatus === "ringing" ? "Waiting for answer..." : "Waiting for connection..."}</p>
            </div>
          )}
        </div>

        {/* Local video (PiP) */}
        <div className="absolute bottom-24 right-4 w-32 h-48 md:w-48 md:h-64 bg-gray-700 rounded-lg overflow-hidden shadow-lg">
          {callType === "video" && localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              <User size={40} />
            </div>
          )}
        </div>
      </div>

      {/* Control bar */}
      <div className="bg-gray-800 py-4 px-6 flex justify-center gap-6">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full ${isMuted ? "bg-red-600" : "bg-gray-600"} text-white`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        {callType === "video" && (
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full ${isVideoOff ? "bg-red-600" : "bg-gray-600"} text-white`}
          >
            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
        )}

        <button
          onClick={hangUp}
          className="p-4 rounded-full bg-red-600 text-white"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};

export default CallPage;