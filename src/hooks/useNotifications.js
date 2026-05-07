// hooks/useNotifications.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import useAuthUser from "./useAuthUser";

const useNotifications = () => {
  const { authUser } = useAuthUser();
  const audioRef = useRef(null);          // ringtone audio element
  const audioUnlockedRef = useRef(false); // tracks if user has interacted

  useEffect(() => {
    if (!authUser) return;

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
      ? import.meta.env.VITE_BACKEND_URL.replace(/\/api$/, "")
      : "http://localhost:8000";

    // ---------- AUDIO CONTEXT UNLOCK ----------
    // Create the audio element early so we can attempt playback
    const ringtone = new Audio("/notification.mp3");
    ringtone.loop = true;
    audioRef.current = ringtone;

    // Function to unlock audio (must be called after user gesture)
    const unlockAudio = async () => {
      if (audioUnlockedRef.current) return;
      try {
        // Start and immediately pause to unlock
        await ringtone.play();
        ringtone.pause();
        ringtone.currentTime = 0;
        audioUnlockedRef.current = true;
        console.log("🔊 Audio unlocked");
      } catch (e) {
        console.warn("Audio unlock failed, will retry on user click");
      }
    };

    // Attempt to unlock on any user click
    const clickHandler = () => unlockAudio();
    document.addEventListener("click", clickHandler, { once: false });

    // Also try immediately (might work if user already clicked something before hook runs)
    unlockAudio();

    // ---------- NOTIFICATION PERMISSION ----------
    const requestPermission = async () => {
      if (Notification.permission === "default") {
        const result = await Notification.requestPermission();
        console.log("Notification permission:", result);
      }
    };
    requestPermission();

    // ---------- SOCKET CONNECTION ----------
    const socket = io(BACKEND_URL, { withCredentials: true });

    const showNotification = (title, options = {}) => {
      if (Notification.permission === "granted") {
        new Notification(title, { ...options, icon: "/vite.svg" });
      }
    };

    // ---------- INCOMING CALL (ringtone loop) ----------
    socket.on("incomingCall", (data) => {
      if (data.from !== authUser._id) {
        showNotification("Incoming Call", {
          body: `${data.fromName} is calling...`,
          requireInteraction: true,
        });

        // Start ringtone (if audio is unlocked, it will play; otherwise user click will trigger later)
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      }
    });

    // Stop ringtone when call is resolved
    const stopRingtone = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
    socket.on("callAccepted", stopRingtone);
    socket.on("callDeclined", stopRingtone);
    socket.on("callEnded", stopRingtone);

    // ---------- NEW MESSAGE (short sound) ----------
    socket.on("newMessage", (message) => {
      if (message.senderId !== authUser._id) {
        showNotification("New Message", {
          body: message.text,
        });

        // Play a short beep (non‑looping)
        const beep = new Audio("/notification.mp3");
        beep.loop = false;
        beep.play().catch(() => {});
      }
    });

    // ---------- FRIEND REQUEST ----------
    socket.on("friendRequestReceived", (data) => {
      if (data.from !== authUser._id) {
        showNotification("Friend Request", {
          body: `${data.fromName} sent you a friend request`,
        });
      }
    });

    // Cleanup
    return () => {
      document.removeEventListener("click", clickHandler);
      socket.disconnect();
      stopRingtone();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [authUser]);
};

export default useNotifications;