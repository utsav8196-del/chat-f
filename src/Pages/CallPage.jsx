// Pages/CallPage.jsx
import { useEffect, useRef, useState, useCallback } from "react";
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
  Camera,
  AlertCircle,
} from "lucide-react";

// STUN + free TURN (to handle NATs)
const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

const CONNECTION_TIMEOUT = 15000; // 15 seconds

const CallPage = () => {
  const { id: targetUserId } = useParams();
  const [searchParams] = useSearchParams();
  const callType = searchParams.get("type") || "video";
  const role = searchParams.get("role") || "receiver"; // "caller" or "receiver"
  const navigate = useNavigate();
  const { authUser, isLoading } = useAuthUser();

  // ----- STATE -----
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === "voice");
  const [callPhase, setCallPhase] = useState("ringing"); // ringing | connecting | connected | ended
  const [mediaReady, setMediaReady] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);

  // ----- REFS (stable across rerenders) -----
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const mediaReadyRef = useRef(false);   // used inside callbacks
  const callAcceptedRef = useRef(false);
  const timeoutRef = useRef(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
    ? import.meta.env.VITE_BACKEND_URL.replace(/\/api$/, "")
    : "http://localhost:8000";

  // ----- CLEANUP -----
  const cleanupCall = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setLocalStream(null);
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const goHome = useCallback(() => {
    cleanupCall();
    navigate("/home");
  }, [cleanupCall, navigate]);

  // ----- SOCKET CONNECTION -----
  useEffect(() => {
    if (!authUser) return;
    const socket = io(BACKEND_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("checkPendingCall"); // resume call if receiver already accepted
    });

    return () => {
      socket.disconnect();
    };
  }, [authUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupCall();
  }, [cleanupCall]);

  // ----- ATTACH STREAMS TO VIDEO ELEMENTS -----
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // ----- ENABLE CAMERA / MIC (must be a user click) -----
  const enableMedia = async () => {
    try {
      const constraints = {
        audio: true,
        video: callType === "video" ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setLocalStream(stream);
      mediaReadyRef.current = true;
      setMediaReady(true);
    } catch (err) {
      console.error("Camera/mic error:", err);
      toast.error("Camera or microphone access denied.");
      goHome();
    }
  };

  // ----- CONNECTION TIMEOUT -----
  useEffect(() => {
    if (callPhase === "connecting" && !connectionFailed) {
      timeoutRef.current = setTimeout(() => {
        if (pcRef.current && pcRef.current.connectionState !== "connected") {
          setConnectionFailed(true);
          toast.error("Could not establish a connection. You may be behind a symmetric NAT.");
        }
      }, CONNECTION_TIMEOUT);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [callPhase, connectionFailed]);

  // ===================== CALLER =====================
  // Listen for callAccepted (or receive it via checkPendingCall)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || role !== "caller") return;

    const handleCallAccepted = () => {
      callAcceptedRef.current = true;
      if (mediaReadyRef.current) {
        startCallerWebRTC(socket);
      } else {
        setCallPhase("accepted"); // wait for media
      }
    };

    const handleCallDeclined = () => {
      setCallPhase("ended");
      toast("Call declined", { icon: "📵" });
      setTimeout(goHome, 2000);
    };

    socket.on("callAccepted", handleCallAccepted);
    socket.on("callDeclined", handleCallDeclined);

    return () => {
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callDeclined", handleCallDeclined);
    };
  }, [role, goHome]); // mediaReadyRef is used, so no dependency on state

  // If media becomes ready after callAccepted
  useEffect(() => {
    if (role === "caller" && mediaReady && callAcceptedRef.current) {
      startCallerWebRTC(socketRef.current);
    }
  }, [mediaReady, role]);

  const startCallerWebRTC = useCallback(async (socket) => {
    if (!socket || pcRef.current) return;
    try {
      const stream = streamRef.current;
      if (!stream) return;

      const pc = new RTCPeerConnection(configuration);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => setRemoteStream(event.streams[0]);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc_ice_candidate", { to: targetUserId, candidate: event.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallPhase("connected");
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setCallPhase("ended");
          toast.error("Call disconnected");
          goHome();
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc_offer", { to: targetUserId, offer });
      setCallPhase("connecting");
    } catch (err) {
      console.error("Caller WebRTC error:", err);
      toast.error("Failed to set up call");
      goHome();
    }
  }, [targetUserId, goHome]);

  // ===================== RECEIVER =====================
  // Create PC once media is ready
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || role !== "receiver" || !mediaReady) return;
    if (pcRef.current) return; // already created

    const stream = streamRef.current;
    if (!stream) return;

    const pc = new RTCPeerConnection(configuration);
    pcRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => setRemoteStream(event.streams[0]);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc_ice_candidate", { to: targetUserId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallPhase("connected");
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setCallPhase("ended");
        toast.error("Call disconnected");
        goHome();
      }
    };

    setCallPhase("connecting");

    // Process early stored offer
    if (pendingOfferRef.current) {
      const offer = pendingOfferRef.current;
      pendingOfferRef.current = null;
      pc.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => pc.createAnswer())
        .then((answer) => {
          pc.setLocalDescription(answer);
          socket.emit("webrtc_answer", { to: targetUserId, answer });
        })
        .catch((err) => {
          console.error("Error handling stored offer:", err);
          toast.error("Call connection failed");
          goHome();
        });
    }

    // Listen for new offers
    const handleOffer = async ({ from, offer }) => {
      if (from !== targetUserId) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc_answer", { to: targetUserId, answer });
      } catch (err) {
        console.error("Error handling offer:", err);
        toast.error("Call connection failed");
        goHome();
      }
    };

    socket.on("webrtc_offer", handleOffer);

    const handleCallEnded = () => {
      setCallPhase("ended");
      toast("Call ended");
      setTimeout(goHome, 2000);
    };
    socket.on("callEnded", handleCallEnded);

    return () => {
      socket.off("webrtc_offer", handleOffer);
      socket.off("callEnded", handleCallEnded);
    };
  }, [role, mediaReady, targetUserId, goHome]);

  // Store early offer before media ready
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || role !== "receiver") return;

    const storeOffer = ({ from, offer }) => {
      if (from === targetUserId) pendingOfferRef.current = offer;
    };
    socket.on("webrtc_offer", storeOffer);
    return () => socket.off("webrtc_offer", storeOffer);
  }, [role, targetUserId]);

  // ===================== COMMON: ANSWER & ICE =====================
  useEffect(() => {
    const socket = socketRef.current;
    const pc = pcRef.current;
    if (!socket || !pc) return;

    const handleAnswer = async ({ from, answer }) => {
      if (from !== targetUserId) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("Error setting remote answer:", err);
      }
    };

    const handleIceCandidate = async ({ from, candidate }) => {
      if (from !== targetUserId) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Error adding ICE candidate:", err);
      }
    };

    socket.on("webrtc_answer", handleAnswer);
    socket.on("webrtc_ice_candidate", handleIceCandidate);

    return () => {
      socket.off("webrtc_answer", handleAnswer);
      socket.off("webrtc_ice_candidate", handleIceCandidate);
    };
  }, [targetUserId]);

  // ----- CONTROLS -----
  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsVideoOff(!isVideoOff);
    }
  };

  const hangUp = () => {
    if (socketRef.current && targetUserId) {
      socketRef.current.emit("callEnd", { to: targetUserId });
    }
    goHome();
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="h-screen w-screen bg-black flex flex-col">
      {/* STATUS BANNER */}
      {callPhase === "ringing" && role === "caller" && (
        <div className="bg-yellow-600 text-white text-center py-2">Ringing...</div>
      )}
      {callPhase === "connecting" && !connectionFailed && (
        <div className="bg-blue-600 text-white text-center py-2">Connecting...</div>
      )}
      {callPhase === "connected" && (
        <div className="bg-green-600 text-white text-center py-2">Connected</div>
      )}
      {callPhase === "ended" && (
        <div className="bg-red-600 text-white text-center py-2">Call ended</div>
      )}
      {connectionFailed && (
        <div className="bg-orange-600 text-white text-center py-2 flex items-center justify-center gap-2">
          <AlertCircle size={20} /> Connection failed – check your firewall/NAT
        </div>
      )}

      {/* CAMERA PERMISSION OVERLAY */}
      {!mediaReady && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black bg-opacity-80">
          <Camera size={64} className="text-white mb-4" />
          <p className="text-white text-lg mb-6">Camera and microphone are off</p>
          <button onClick={enableMedia} className="btn btn-primary btn-lg gap-2">
            <Camera size={20} /> Turn on Camera
          </button>
        </div>
      )}

      {/* VIDEO CONTAINERS */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Remote video (fullscreen) */}
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
              <p>{callPhase === "ringing" ? "Waiting for answer..." : "Waiting for connection..."}</p>
              {connectionFailed && (
                <button onClick={goHome} className="mt-4 btn btn-outline btn-sm text-white">
                  Go back to chat
                </button>
              )}
            </div>
          )}
        </div>

        {/* Local video (PiP) */}
        <div className="absolute bottom-24 right-4 w-32 h-48 md:w-48 md:h-64 bg-gray-700 rounded-lg overflow-hidden shadow-lg z-10">
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

      {/* CONTROL BAR */}
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
        <button onClick={hangUp} className="p-4 rounded-full bg-red-600 text-white">
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};

export default CallPage;