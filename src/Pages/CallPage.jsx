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
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === "voice");
  const [callStatus, setCallStatus] = useState("ringing");
  const [mediaReady, setMediaReady] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);             // keeps the single peer connection
  const socketRef = useRef(null);
  const callAcceptedRef = useRef(false);
  const setupDoneRef = useRef(false);     // prevent duplicate setups
  const pendingOfferRef = useRef(null);   // store offer if received before pc ready
  const pendingCandidatesRef = useRef([]);// store early ICE candidates

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
    ? import.meta.env.VITE_BACKEND_URL.replace(/\/api$/, "")
    : "http://localhost:8000";

  // Cleanup everything
  const cleanupCall = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
  }, [localStream]);

  const goHome = useCallback(() => {
    cleanupCall();
    navigate("/home");
  }, [cleanupCall, navigate]);

  // Connect socket (only once)
  useEffect(() => {
    if (!authUser) return;
    const newSocket = io(BACKEND_URL, { withCredentials: true });
    setSocket(newSocket);
    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      newSocket.emit("checkPendingCall");
    });

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

  // Attach streams when refs are ready
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

  // Enable media (must be from button click)
  const enableMedia = async () => {
    try {
      const constraints = {
        audio: true,
        video: callType === "video" ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      setMediaReady(true);
    } catch (err) {
      console.error("Camera/mic error:", err);
      toast.error("Camera or microphone access denied.");
      goHome();
    }
  };

  // Common WebRTC helper: create a single PC, add tracks, and set up event handlers
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current; // already exists

    const currentSocket = socketRef.current;
    if (!currentSocket || !localStream) return null;

    const pc = new RTCPeerConnection(configuration);
    pcRef.current = pc;

    // Add local tracks
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && currentSocket) {
        currentSocket.emit("webrtc_ice_candidate", {
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

    // Process any pending offer/candidates
    if (role === "receiver" && pendingOfferRef.current) {
      const offer = pendingOfferRef.current;
      pendingOfferRef.current = null;
      pc.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => pc.createAnswer())
        .then((answer) => {
          pc.setLocalDescription(answer);
          currentSocket.emit("webrtc_answer", { to: targetUserId, answer });
        })
        .catch((err) => {
          console.error("Error handling pending offer:", err);
          toast.error("Call connection failed");
          goHome();
        });
    }

    // Add any pending ICE candidates
    if (pendingCandidatesRef.current.length > 0) {
      pendingCandidatesRef.current.forEach((candidate) => {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      });
      pendingCandidatesRef.current = [];
    }

    return pc;
  }, [localStream, targetUserId, role, goHome]);

  // Caller: wait for callAccepted then start WebRTC
  useEffect(() => {
    if (!socket) return;

    const handleCallAccepted = () => {
      callAcceptedRef.current = true;
      if (mediaReady && !setupDoneRef.current) {
        setupDoneRef.current = true;
        const pc = createPeerConnection();
        if (pc) {
          pc.createOffer()
            .then((offer) => {
              pc.setLocalDescription(offer);
              socket.emit("webrtc_offer", { to: targetUserId, offer });
              setCallStatus("connecting");
            })
            .catch((err) => {
              console.error("Error creating offer:", err);
              toast.error("Failed to set up call");
              goHome();
            });
        }
      }
    };

    const handleCallDeclined = () => {
      setCallStatus("declined");
      toast("Call declined", { icon: "📵" });
      setTimeout(goHome, 2000);
    };

    socket.on("callAccepted", handleCallAccepted);
    socket.on("callDeclined", handleCallDeclined);

    return () => {
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callDeclined", handleCallDeclined);
    };
  }, [socket, mediaReady, createPeerConnection, targetUserId, goHome]);

  // If media becomes ready after callAccepted, start the caller setup
  useEffect(() => {
    if (mediaReady && role === "caller" && callAcceptedRef.current && !setupDoneRef.current) {
      setupDoneRef.current = true;
      const pc = createPeerConnection();
      if (pc) {
        pc.createOffer()
          .then((offer) => {
            pc.setLocalDescription(offer);
            socketRef.current?.emit("webrtc_offer", { to: targetUserId, offer });
            setCallStatus("connecting");
          })
          .catch((err) => {
            console.error("Error creating offer:", err);
            toast.error("Failed to set up call");
            goHome();
          });
      }
    }
  }, [mediaReady, role, createPeerConnection, targetUserId, goHome]);

  // Receiver: setup media, create PC, and wait for offer
  useEffect(() => {
    if (!socket || !mediaReady || role !== "receiver" || setupDoneRef.current) return;

    setupDoneRef.current = true;
    const pc = createPeerConnection();
    if (!pc) return;

    // Set status to connecting (we'll update when offer handles)
    setCallStatus("connecting");

    // Function to process incoming offer (may arrive before or after PC creation)
    const handleOffer = async ({ from, offer }) => {
      if (from !== targetUserId) return;
      if (pc.signalingState !== "stable") {
        // If we already have an offer queued, ignore
        return;
      }
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
      setCallStatus("ended");
      toast("Call ended");
      setTimeout(goHome, 2000);
    };
    socket.on("callEnded", handleCallEnded);

    return () => {
      socket.off("webrtc_offer", handleOffer);
      socket.off("callEnded", handleCallEnded);
    };
  }, [socket, mediaReady, role, targetUserId, createPeerConnection, goHome]);

  // Store early offer/candidates if they arrive before PC is created (rare)
  useEffect(() => {
    if (!socket || setupDoneRef.current) return;

    const handleEarlyOffer = ({ from, offer }) => {
      if (from === targetUserId) pendingOfferRef.current = offer;
    };
    const handleEarlyCandidate = ({ from, candidate }) => {
      if (from === targetUserId) pendingCandidatesRef.current.push(candidate);
    };

    socket.on("webrtc_offer", handleEarlyOffer);
    socket.on("webrtc_ice_candidate", handleEarlyCandidate);

    return () => {
      socket.off("webrtc_offer", handleEarlyOffer);
      socket.off("webrtc_ice_candidate", handleEarlyCandidate);
    };
  }, [socket, targetUserId]);

  // Common answer/ICE handler after PC exists
  useEffect(() => {
    if (!socket || !pcRef.current) return;
    const pc = pcRef.current;

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
  }, [socket, targetUserId]);

  // Call controls
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
    if (socketRef.current && targetUserId) {
      socketRef.current.emit("callEnd", { to: targetUserId });
    }
    goHome();
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="h-screen w-screen bg-black flex flex-col">
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
          <button onClick={enableMedia} className="btn btn-primary btn-lg gap-2">
            <Camera size={20} /> Turn on Camera
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row">
        <div className="flex-1 bg-gray-900 flex items-center justify-center relative">
          {remoteStream ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="text-white text-opacity-50 flex flex-col items-center">
              <User size={80} />
              <p>{callStatus === "ringing" ? "Waiting for answer..." : "Waiting for connection..."}</p>
            </div>
          )}
        </div>

        <div className="absolute bottom-24 right-4 w-32 h-48 md:w-48 md:h-64 bg-gray-700 rounded-lg overflow-hidden shadow-lg z-10">
          {callType === "video" && localStream ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              <User size={40} />
            </div>
          )}
        </div>
      </div>

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