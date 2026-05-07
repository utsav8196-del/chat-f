// hooks/useNotifications.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import useAuthUser from "./useAuthUser";

// Global audio state
let audioUnlocked = false;
let ringtoneAudio = null;        // optional user-provided mp3
let pendingSounds = [];          // sounds waiting for audio unlock

// ---------- AUDIO CONTEXT (for generated beeps) ----------
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// Play a short beep
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
    console.warn("Web Audio API not supported");
  }
}

// ---------- RINGTONE (prefers mp3, falls back to looping beep) ----------
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

// Create ringtone Audio element (optional custom mp3)
function createRingtone() {
  if (ringtoneAudio) return ringtoneAudio;

  const audio = new Audio("/notification.mp3");
  audio.loop = true;
  audio.preload = "auto";
  audio.onerror = () => {
    console.warn("Custom notification.mp3 not found – using generated beep");
    // If the custom file fails, we'll fall back to beep automatically later
  };
  ringtoneAudio = audio;
  return audio;
}

// ---------- UNLOCK FUNCTION (must be called from user click) ----------
export function unlockAudioNow() {
  if (audioUnlocked) return;

  try {
    const ctx = getAudioContext();
    // Resume the context (unlocks audio after user gesture)
    ctx.resume().then(() => {
      // Create a silent buffer to ensure context is fully active
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
      source.stop(ctx.currentTime + 0.001);

      audioUnlocked = true;
      window._audioUnlocked = true;

      // Play all queued sounds
      pendingSounds.forEach(audio => {
        audio.play().catch(() => {
          // If it's the ringtone and still fails, fall back to beep
          if (audio === ringtoneAudio) {
            startBeepRingtone();
          } else {
            playBeep();
          }
        });
      });
      pendingSounds = [];
      console.log("🔊 Audio unlocked");
    }).catch((err) => {
      console.error("Audio unlock failed:", err);
      alert("Unable to enable sound. Please check your browser settings.");
    });
  } catch (err) {
    console.error("Audio unlock error:", err);
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

    // Create ringtone element
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

        // Try to play custom ringtone first
        ringtoneAudio.currentTime = 0;
        if (audioUnlocked) {
          ringtoneAudio.play().catch(() => {
            // If custom mp3 fails, fall back to beep ringtone
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

        // Always use generated beep for messages (no file dependency)
        if (audioUnlocked) {
          playBeep(100, 660);
        } else {
          // Queue a simple function to play beep after unlock
          pendingSounds.push({
            play: () => playBeep(100, 660),
            pause: () => {}
          });
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