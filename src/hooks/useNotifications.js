// hooks/useNotifications.js
import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { acceptFriendRequest, declineFriendRequest } from "../lib/api";
import useAuthUser from "./useAuthUser";
import toast from "react-hot-toast";

// Global audio state
let audioUnlocked = false;
let pendingSounds = [];
let currentRingtone = null;
let audioCtx = null;

// ---------- AUDIO HELPERS (same as before) ----------
function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playBeep(duration = 150, frequency = 880, type = "sine") {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.3;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    oscillator.stop(ctx.currentTime + duration / 1000 + 0.05);
  } catch (e) {}
}

let beepInterval = null;
function startBeepRingtone() {
  stopBeepRingtone();
  playBeep(200, 880);
  beepInterval = setInterval(() => playBeep(200, 880), 1000);
}
function stopBeepRingtone() {
  if (beepInterval) {
    clearInterval(beepInterval);
    beepInterval = null;
  }
}

let audioElement = null;
function createRingtoneAudioElement() {
  if (audioElement) return audioElement;
  const audio = new Audio("/notification.mp3");
  audio.loop = true;
  audio.preload = "auto";
  audio.onerror = () => {};
  audioElement = audio;
  return audio;
}

function createRingtoneObject() {
  return {
    play: () => {
      const audio = createRingtoneAudioElement();
      audio.currentTime = 0;
      audio.play().catch(() => startBeepRingtone());
    },
    stop: () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      stopBeepRingtone();
    }
  };
}

export function unlockAudioNow() {
  if (audioUnlocked) return;
  try {
    const ctx = getAudioContext();
    ctx.resume().then(() => {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
      source.stop(ctx.currentTime + 0.001);
      audioUnlocked = true;
      window._audioUnlocked = true;
      pendingSounds.forEach(sound => sound.play());
      pendingSounds = [];
    }).catch(() => {});
  } catch (e) {}
}

export function stopGlobalRingtone() {
  if (currentRingtone) {
    currentRingtone.stop();
    currentRingtone = null;
  }
  pendingSounds = pendingSounds.filter(s => s !== currentRingtone);
}

// ---------- NOTIFICATION HOOK ----------
const useNotifications = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const socketRef = useRef(null);

  const [friendRequestPopup, setFriendRequestPopup] = useState(null); // { _id, from, fromName }

  useEffect(() => {
    if (!authUser) return;

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
      ? import.meta.env.VITE_BACKEND_URL.replace(/\/api$/, "")
      : "http://localhost:8000";

    const socket = io(BACKEND_URL, { withCredentials: true });
    socketRef.current = socket;

    const showNotification = (title, options) => {
      if (Notification.permission === "granted") {
        new Notification(title, { ...options, icon: "/vite.svg" });
      }
    };

    // ----- Incoming Call -----
    socket.on("incomingCall", (data) => {
      if (data.from !== authUser._id) {
        showNotification("Incoming Call", {
          body: `${data.fromName} is calling...`,
          requireInteraction: true,
        });

        const ringtone = createRingtoneObject();
        currentRingtone = ringtone;
        if (audioUnlocked) {
          ringtone.play();
        } else {
          pendingSounds.push(ringtone);
        }
      }
    });

    const stopRingtones = () => {
      if (currentRingtone) {
        currentRingtone.stop();
        currentRingtone = null;
      }
      pendingSounds = pendingSounds.filter(s => s !== currentRingtone);
    };

    socket.on("callAccepted", stopRingtones);
    socket.on("callDeclined", stopRingtones);
    socket.on("callEnded", stopRingtones);

    // ----- New Message -----
    socket.on("newMessage", (message) => {
      if (message.senderId !== authUser._id) {
        showNotification("New Message", { body: message.text });
        const beep = { play: () => playBeep(100, 660), stop: () => {} };
        if (audioUnlocked) beep.play();
        else pendingSounds.push(beep);
      }
    });

    // ----- Friend Request -----
    socket.on("friendRequestReceived", (data) => {
      if (data.from !== authUser._id) {
        showNotification("Friend Request", {
          body: `${data.fromName} sent you a friend request`,
        });
        // Show in-app popup
        setFriendRequestPopup(data);
      }
    });

    return () => {
      socket.disconnect();
      stopRingtones();
      stopBeepRingtone();
    };
  }, [authUser]);

  // Handlers for the popup
  const handleAcceptRequest = useCallback(async (requestId) => {
    try {
      await acceptFriendRequest(requestId);
      toast.success("Friend request accepted");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      setFriendRequestPopup(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to accept request");
    }
  }, [queryClient]);

  const handleDeclineRequest = useCallback(async (requestId) => {
    try {
      await declineFriendRequest(requestId);
      toast.success("Friend request declined");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      setFriendRequestPopup(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to decline request");
    }
  }, [queryClient]);

  return {
    friendRequestPopup,
    acceptFriendRequest: handleAcceptRequest,
    declineFriendRequest: handleDeclineRequest,
  };
};

export default useNotifications;