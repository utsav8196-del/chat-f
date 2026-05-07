// hooks/useNotifications.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import useAuthUser from "./useAuthUser";

// Global state
let audioUnlocked = false;
let pendingSounds = [];          // array of { play: fn, stop: fn }
let currentRingtone = null;      // the currently active ringtone object
let audioCtx = null;

// ---------- AUDIO HELPERS ----------
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

// ---------- RINGTONE (looping beep + optional custom mp3) ----------
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

let audioElement = null; // optional custom mp3 element

function createRingtoneAudioElement() {
  if (audioElement) return audioElement;
  const audio = new Audio("/notification.mp3");
  audio.loop = true;
  audio.preload = "auto";
  audio.onerror = () => console.warn("Custom notification.mp3 not found – using beep");
  audioElement = audio;
  return audio;
}

// Creates a ringtone object that can be started and stopped
function createRingtoneObject() {
  return {
    play: () => {
      // Try custom mp3 first
      const audio = createRingtoneAudioElement();
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Fall back to beep ringtone
        startBeepRingtone();
      });
    },
    stop: () => {
      const audio = audioElement;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      stopBeepRingtone();
    }
  };
}

// ---------- UNLOCK AUDIO ----------
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

      // Play all queued sounds
      pendingSounds.forEach(sound => sound.play());
      pendingSounds = [];
      console.log("🔊 Audio unlocked");
    }).catch(err => {
      console.error("Audio unlock failed:", err);
    });
  } catch (err) {
    console.error("Audio unlock error:", err);
  }
}

// Stop the ringtone globally (called from ChatPage)
export function stopGlobalRingtone() {
  if (currentRingtone) {
    currentRingtone.stop();
    currentRingtone = null;
  }
  // Also remove any pending ringtone
  pendingSounds = pendingSounds.filter(sound => sound !== currentRingtone);
}

// ---------- NOTIFICATION HOOK ----------
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

    // Stop ringtone when call is resolved via server events
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

        const beepSound = {
          play: () => playBeep(100, 660),
          stop: () => {}
        };
        if (audioUnlocked) {
          beepSound.play();
        } else {
          pendingSounds.push(beepSound);
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