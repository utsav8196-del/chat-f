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
} from "lucide-react";

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const CallPage = () => {
  const { id: targetUserId } = useParams();
  const [searchParams] = useSearchParams();
  const callType = searchParams.get("type") || "video";
  const role = searchParams.get("role") || "receiver";
  const navigate = useNavigate();
  const { authUser, isLoading } = useAuthUser();

  const [socket, setSocket] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === "voice");
  const [callStatus, setCallStatus] = useState("ringing");
  const [mediaReady, setMediaReady] = useState(false); // true after user enables media

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
    ? import.meta.env.VITE_BACKEND_URL.replace(/\/api$/, "")
    : "http://localhost:8000";

  // Cleanup
  const cleanupCall = useCallback(() => {
    if (peerConnection) peerConnection.close();
    if (localStream) localStream.getTracks().forEach((track) => track.stop());
  }, [peerConnection, localStream]);

  const goHome = useCallback(() => {
    cleanupCall();
    navigate("/home");
  }, [cleanupCall, navigate]);

  // Connect to signaling socket
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
      cleanupCall();
    };
  }, [cleanupCall]);

  // Attach local stream after it's set and video element is present
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // ----------------------------------------------------------------
  // Enable camera / microphone (must be called from a button click)
  // ----------------------------------------------------------------
  const enableMedia = async () => {
    try {
      const constraints = {
        audio: true,
        video: callType === "video" ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      setMediaReady(true);
      return stream;
    } catch (err) {
      console.error("Camera/mic error:", err);
      toast.error("Camera or microphone access denied. Check permissions.");
      goHome();
      throw err;
    }
  };

  // ----------------------------------------------------------------
  // Setup WebRTC after media is ready for CALLER
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!socket || !mediaReady || role !== "caller") return;

    const setupCaller = async () => {
      try {
        const stream = localStream; // already obtained
        if (!stream) return;

        const pc = new RTCPeerConnection(configuration);
        setPeerConnection(pc);

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
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
            goHome();
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc_offer", { to: targetUserId, offer });
        setCallStatus("connecting");
      } catch (err) {
        toast.error("Failed to start call");
        goHome();
      }
    };

    setupCaller();
  }, [socket, mediaReady, role, targetUserId, localStream, goHome]);

  // ----------------------------------------------------------------
  // For CALLER – listen for acceptance / decline
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!socket || role !== "caller") return;

    const handleCallAccepted = () => {
      // Media is already enabled, so just wait for the offer/answer exchange
      // No extra action needed here, as the media request was already done
    };

    const handleCallDeclined = () => {
      setCallStatus("declined");
      toast("Call declined", { icon: "📵" });
      setTimeout(goHome, 2000);
    };

    const handleCallEnded = () => {
      setCallStatus("ended");
      toast("Call ended");
      setTimeout(goHome, 2000);
    };

    socket.on("callAccepted", handleCallAccepted);
    socket.on("callDeclined", handleCallDeclined);
    socket.on("callEnded", handleCallEnded);

    return () => {
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callDeclined", handleCallDeclined);
      socket.off("callEnded", handleCallEnded);
    };
  }, [socket, role, goHome]);

  // ----------------------------------------------------------------
  // RECEIVER – setup after media is ready
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!socket || !mediaReady || role !== "receiver") return;

    const setupReceiver = async () => {
      try {
        const stream = localStream;
        if (!stream) return;

        const pc = new RTCPeerConnection(configuration);
        setPeerConnection(pc);

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
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
            goHome();
          }
        };

        setCallStatus("connecting");
      } catch (err) {
        toast.error("Failed to set up call");
        goHome();
      }
    };

    setupReceiver();
  }, [socket, mediaReady, role, targetUserId, localStream, goHome]);

  // ----------------------------------------------------------------
  // RECEIVER – handle incoming offer & call ended
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!socket || !peerConnection || role !== "receiver") return;

    const handleOffer = async ({ from, offer }) => {
      if (from !== targetUserId) return;
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("webrtc_answer", { to: targetUserId, answer });
      } catch (err) {
        console.error("Error handling offer:", err);
        toast.error("Call connection failed");
        goHome();
      }
    };

    const handleCallEnded = () => {
      setCallStatus("ended");
      toast("Call ended");
      setTimeout(goHome, 2000);
    };

    socket.on("webrtc_offer", handleOffer);
    socket.on("callEnded", handleCallEnded);

    return () => {
      socket.off("webrtc_offer", handleOffer);
      socket.off("callEnded", handleCallEnded);
    };
  }, [socket, peerConnection, role, targetUserId, goHome]);

  // ----------------------------------------------------------------
  // Common WebRTC events (answer and ICE) for both roles
  // ----------------------------------------------------------------
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
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
    };

    socket.on("webrtc_answer", handleAnswer);
    socket.on("webrtc_ice_candidate", handleIceCandidate);

    return () => {
      socket.off("webrtc_answer", handleAnswer);
      socket.off("webrtc_ice_candidate", handleIceCandidate);
    };
  }, [socket, peerConnection, targetUserId]);

  // Controls
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
      setIsVideoOff(!isVideoOff);
    }
  };

  const hangUp = () => {
    if (socket && targetUserId) {
      socket.emit("callEnd", { to: targetUserId });
    }
    goHome();
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="h-screen w-screen bg-black flex flex-col">
      {/* Status banner */}
      {callStatus === "ringing" && role === "caller" && (
        <div className="bg-yellow-600 text-white text-center py-2">Ringing...</div>
      )}
      {callStatus === "connecting" && (
        <div className="bg-blue-600 text-white text-center py-2">Connecting...</div>
      )}
      {callStatus === "declined" && (
        <div className="bg-red-600 text-white text-center py-2">Call declined</div>
      )}
      {callStatus === "ended" && (
        <div className="bg-red-600 text-white text-center py-2">Call ended</div>
      )}

      {!mediaReady && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black bg-opacity-80">
          <Camera size={64} className="text-white mb-4" />
          <p className="text-white text-lg mb-6">Camera and microphone are off</p>
          <button
            onClick={enableMedia}
            className="btn btn-primary btn-lg gap-2"
          >
            <Camera size={20} /> Turn on Camera
          </button>
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