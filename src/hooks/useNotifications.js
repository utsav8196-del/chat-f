// hooks/useNotifications.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import useAuthUser from "./useAuthUser";

let audioUnlocked = false;       // global flag, survives re-renders
let ringtoneAudio = null;        // shared across hook instances

const unlockAudio = () => {
  if (audioUnlocked) return;
  // Create and immediately play‑pause to unlock the audio context
  const temp = new Audio("/notification.mp3");
  temp.play()
    .then(() => {
      temp.pause();
      temp.currentTime = 0;
      audioUnlocked = true;
      console.log("🔊 Audio unlocked successfully");
    })
    .catch(() => {
      // Still might fail if user hasn't interacted
      console.log("Audio unlock deferred – click anywhere to enable sound");
    });
};

const useNotifications = () => {
  const { authUser } = useAuthUser();

  useEffect(() => {
    if (!authUser) return;

    // ----- ONE‑TIME AUDIO UNLOCK -----
    // Attach a click listener to the whole document (most reliable)
    const handleClick = () => unlockAudio();
    document.addEventListener("click", handleClick, { once: true });

    // Also try immediately – works if user already clicked before this hook ran
    unlockAudio();

    // ----- SOCKET CONNECTION -----
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
      ? import.meta.env.VITE_BACKEND_URL.replace(/\/api$/, "")
      : "http://localhost:8000";

    const socket = io(BACKEND_URL, { withCredentials: true });

    // Prepare ringtone (used for incoming calls)
    if (!ringtoneAudio) {
      ringtoneAudio = new Audio("/notification.mp3");
      ringtoneAudio.loop = true;
    }

    // ----- NOTIFICATION HELPER -----
    const showNotification = (title, options) => {
      if (Notification.permission === "granted") {
        new Notification(title, { ...options, icon: "/vite.svg" });
      }
    };

    // ----- INCOMING CALL (ringtone loop) -----
    socket.on("incomingCall", (data) => {
      if (data.from !== authUser._id) {
        showNotification("Incoming Call", {
          body: `${data.fromName} is calling...`,
          requireInteraction: true,
        });

        // Start ringtone (works because audio is unlocked by now)
        ringtoneAudio.currentTime = 0;
        ringtoneAudio.play().catch(() => {
          console.warn("Ringtone blocked by browser – click anywhere first");
        });
      }
    });

    // Stop ringtone when call resolved
    const stopRingtone = () => {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
    };
    socket.on("callAccepted", stopRingtone);
    socket.on("callDeclined", stopRingtone);
    socket.on("callEnded", stopRingtone);

    // ----- NEW MESSAGE (short beep) -----
    socket.on("newMessage", (message) => {
      if (message.senderId !== authUser._id) {
        showNotification("New Message", { body: message.text });

        const beep = new Audio("/notification.mp3");
        beep.loop = false;
        beep.play().catch(() => {});
      }
    });

    // ----- FRIEND REQUEST -----
    socket.on("friendRequestReceived", (data) => {
      if (data.from !== authUser._id) {
        showNotification("Friend Request", {
          body: `${data.fromName} sent you a friend request`,
        });
      }
    });

    // Cleanup
    return () => {
      document.removeEventListener("click", handleClick);
      socket.disconnect();
      stopRingtone();
    };
  }, [authUser]);
};

export default useNotifications;