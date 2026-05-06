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
  const [callStatus, setCallStatus] = useState("calling"); // calling, connected, declined, ended

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
    ? import.meta.env.VITE_BACKEND_URL.replace(/\/api$/, "")
    : "http://localhost:8000";

  // Connect socket for signaling
  useEffect(() => {
    if (!authUser) return;
    const newSocket = io(BACKEND_URL, { withCredentials: true });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [authUser]);

  // Setup media and PeerConnection as caller
  useEffect(() => {
    if (!socket || !authUser || !targetUserId) return;

    const startCall = async () => {
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
      } catch (err) {
        console.error("Media error:", err);
        toast.error("Could not access camera/microphone");
        navigate("/home");
      }
    };

    startCall();
  }, [socket, authUser, targetUserId, callType]);

  // Handle incoming signaling (for receiver side)
  useEffect(() => {
    if (!socket || !peerConnection) return;

    const handleAnswer = async ({ from, answer }) => {
      if (from !== targetUserId) return;
      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      } catch (err) {
        console.error("Error setting remote answer:", err);
      }
    };

    const handleOffer = async ({ from, offer }) => {
      if (from !== targetUserId) return;
      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("webrtc_answer", { to: targetUserId, answer });
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    };

    const handleIceCandidate = ({ from, candidate }) => {
      if (from !== targetUserId) return;
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
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

    socket.on("webrtc_answer", handleAnswer);
    socket.on("webrtc_offer", handleOffer);
    socket.on("webrtc_ice_candidate", handleIceCandidate);
    socket.on("callDeclined", handleCallDeclined);
    socket.on("callEnded", handleCallEnded);

    return () => {
      socket.off("webrtc_answer", handleAnswer);
      socket.off("webrtc_offer", handleOffer);
      socket.off("webrtc_ice_candidate", handleIceCandidate);
      socket.off("callDeclined", handleCallDeclined);
      socket.off("callEnded", handleCallEnded);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (peerConnection) peerConnection.close();
      if (localStream) localStream.getTracks().forEach(track => track.stop());
    };
  }, []);

  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="h-screen w-screen bg-black flex flex-col">
      {/* Status banner */}
      {callStatus === "calling" && (
        <div className="bg-yellow-600 text-white text-center py-2">
          Calling...
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
              <p>Waiting for connection...</p>
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