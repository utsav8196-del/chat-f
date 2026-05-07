// hooks/useNotifications.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import useAuthUser from "./useAuthUser";

// Global audio state
let audioUnlocked = false;
let ringtoneAudio = null;        // looping sound for incoming calls
let pendingSounds = [];          // sounds waiting to be played

// This function must be called from a user click (the button).
export function unlockAudioNow() {
  if (audioUnlocked) return;
  const temp = new Audio("/notification.mp3");
  temp.play()
    .then(() => {
      temp.pause();
      temp.currentTime = 0;
      audioUnlocked = true;
      if (window) window._audioUnlocked = true;
      // Play all queued sounds
      pendingSounds.forEach(audio => {
        audio.play().catch(() => {});
      });
      pendingSounds = [];
      console.log("🔊 Audio unlocked successfully");
    })
    .catch((err) => {
      // Still might fail if user hasn't interacted? The button click ensures it will work.
      console.error("Unable to unlock audio even after click:", err);
    });
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

    // Create ringtone once
    if (!ringtoneAudio) {
      ringtoneAudio = new Audio("/notification.mp3");
      ringtoneAudio.loop = true;
    }

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

        ringtoneAudio.currentTime = 0;
        if (audioUnlocked) {
          ringtoneAudio.play().catch(() => {});
        } else {
          pendingSounds.push(ringtoneAudio);
        }
      }
    });

    const stopRingtone = () => {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
      pendingSounds = pendingSounds.filter(a => a !== ringtoneAudio);
    };
    socket.on("callAccepted", stopRingtone);
    socket.on("callDeclined", stopRingtone);
    socket.on("callEnded", stopRingtone);

    // ----- New Message -----
    socket.on("newMessage", (message) => {
      if (message.senderId !== authUser._id) {
        showNotification("New Message", { body: message.text });
        const beep = new Audio("/notification.mp3");
        beep.loop = false;
        if (audioUnlocked) {
          beep.play().catch(() => {});
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
      stopRingtone();
    };
  }, [authUser]);
};

export default useNotifications;