// hooks/useNotifications.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import useAuthUser from "./useAuthUser";

const useNotifications = () => {
  const { authUser } = useAuthUser();
  const ringtoneRef = useRef(null);

  useEffect(() => {
    if (!authUser) return;

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
      ? import.meta.env.VITE_BACKEND_URL.replace(/\/api$/, "")
      : "http://localhost:8000";

    const socket = io(BACKEND_URL, { withCredentials: true });

    const requestNotificationPermission = async () => {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
    };

    // Request permission on first socket connect (user gesture may be needed later, but we try)
    requestNotificationPermission();

    const audio = new Audio("/mixkit-software-interface-remove-2576"); // Add your ringtone file to /public
    ringtoneRef.current = audio;

    const showNotification = (title, options = {}) => {
      if (Notification.permission === "granted") {
        new Notification(title, options);
      }
    };

    // Incoming call – play ringtone until accepted/declined/ended
    socket.on("incomingCall", (data) => {
      if (data.from !== authUser._id) {
        showNotification("Incoming Call", {
          body: `${data.fromName} is calling...`,
          requireInteraction: true,
        });
        // Start ringing loop
        audio.loop = true;
        audio.play().catch(() => {});
      }
    });

    // Stop ringtone on these events
    const stopRingtone = () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
        ringtoneRef.current.loop = false;
      }
    };

    socket.on("callAccepted", stopRingtone);
    socket.on("callDeclined", stopRingtone);
    socket.on("callEnded", stopRingtone);

    // New message notification
    socket.on("newMessage", (message) => {
      if (message.senderId !== authUser._id) {
        showNotification("New Message", {
          body: message.text,
        });
        // Play a short sound (not loop)
        const msgSound = new Audio("/mixkit-software-interface-remove-2576");
        msgSound.play().catch(() => {});
      }
    });

    // Friend request notification
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