// hooks/useNotifications.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import useAuthUser from "./useAuthUser";

// Global audio state
let audioUnlocked = false;
let ringtoneAudio = null;        // looping beep or user-provided mp3
let pendingSounds = [];          // sounds waiting for audio unlock

// ---------- EMBEDDED SILENT MP3 for unlocking (base64) ----------
const silentMp3Base64 = "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAYAAAAAAAAABYa1A6bVAAAAAAAAAAAAAAAAAAAA";
// Decode base64 to a Blob URL
function getSilentAudioUrl() {
  const byteCharacters = atob(silentMp3Base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "audio/mp3" });
  return URL.createObjectURL(blob);
}

// ---------- SIMPLE BEEP (Web Audio API) ----------
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
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
  } catch (e) {
    // Web Audio not supported
  }
}

// ---------- RINGTONE (prefers mp3, falls back to repeating beep) ----------
function createRingtone() {
  // Try to use existing audio element if already created
  if (ringtoneAudio) return ringtoneAudio;

  // Attempt to load the user's mp3 file
  const audio = new Audio("/notification.mp3");
  audio.loop = true;
  audio.preload = "auto";
  audio.onerror = () => {
    // If user's mp3 fails, we'll fall back to beep in the unlock handler
    console.warn("Custom notification.mp3 not found – using generated beep");
  };
  ringtoneAudio = audio;
  return audio;
}

// ---------- UNLOCK FUNCTION (must be called from user click) ----------
export function unlockAudioNow() {
  if (audioUnlocked) return;

  // Use a silent audio to unlock the browser context
  const silentAudio = new Audio(getSilentAudioUrl());
  silentAudio.play()
    .then(() => {
      silentAudio.pause();
      silentAudio.currentTime = 0;
      audioUnlocked = true;
      window._audioUnlocked = true;
      // Play all queued sounds
      pendingSounds.forEach(audio => {
        audio.play().catch(() => {
          // If still fails, fall back to beep
          if (audio === ringtoneAudio) {
            startBeepRingtone();
          } else {
            playBeep();
          }
        });
      });
      pendingSounds = [];
      console.log("🔊 Audio unlocked");
    })
    .catch((err) => {
      console.error("Audio unlock failed:", err);
      alert("Unable to enable sound. Please check your browser settings.");
    });
}

// Start a beep-based ringtone (looping)
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

const useNotifications = () => {
  const { authUser } = useAuthUser();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!authUser) return;

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
      ? import.meta.env.VITE_BACKEND_URL.replace(/\/api$/, "")
      : "http://localhost:8000";

    const socket = io(BACKEND_URL, { withCredentials: true });
    socketRef.current = socket;

    // Prepare ringtone (no external file needed)
    createRingtone();

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

        // Try to play ringtone
        ringtoneAudio.currentTime = 0;
        if (audioUnlocked) {
          ringtoneAudio.play().catch(() => {
            // If mp3 fails, start beep ringtone
            startBeepRingtone();
          });
        } else {
          pendingSounds.push(ringtoneAudio);
        }
      }
    });

    const stopRingtones = () => {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
      stopBeepRingtone();
      pendingSounds = pendingSounds.filter(a => a !== ringtoneAudio);
    };

    socket.on("callAccepted", stopRingtones);
    socket.on("callDeclined", stopRingtones);
    socket.on("callEnded", stopRingtones);

    // ----- New Message -----
    socket.on("newMessage", (message) => {
      if (message.senderId !== authUser._id) {
        showNotification("New Message", { body: message.text });

        const beep = new Audio("/notification.mp3");
        beep.loop = false;
        if (audioUnlocked) {
          beep.play().catch(() => playBeep(100, 660));
        } else {
          pendingSounds.push(beep);
        }
      }
    });

    // ----- Friend Request -----
    socket.on("friendRequestReceived", (data) => {
      if (data.from !== authUser._id) {
        showNotification("Friend Request", {
          body: `${data.fromName} sent you a friend request`,
        });
      }
    });

    return () => {
      socket.disconnect();
      stopRingtones();
      stopBeepRingtone();
    };
  }, [authUser]);
};

export default useNotifications;