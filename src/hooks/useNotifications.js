import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import useAuthUser from "./useAuthUser";

let audioUnlocked = false;          // global flag
let ringtoneAudio = null;           // reused Audio element for incoming calls
let pendingSounds = [];             // sounds waiting for unlock

function unlockAudioNow() {
  if (audioUnlocked) return;
  const temp = new Audio("/notification.mp3");
  temp.play()
    .then(() => {
      temp.pause();
      temp.currentTime = 0;
      audioUnlocked = true;
      window._audioUnlocked = true;   // add this
      window.dispatchEvent(new Event("audioUnlocked"));
      pendingSounds.forEach(audio => audio.play().catch(() => {}));
      pendingSounds = [];
    })
    .catch(() => {
      console.log("Audio unlock deferred – click anywhere to enable sound");
    });
}
const useNotifications = () => {
  const { authUser } = useAuthUser();
  const socketRef = useRef(null);

  useEffect(() => {
    // Try to unlock on any click (runs only once per page load)
    const clickHandler = () => unlockAudioNow();
    document.addEventListener("click", clickHandler);
    // Also try immediately (works if user already clicked before this hook mounted)
    unlockAudioNow();

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

    // --- Incoming Call ---
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

    // --- New Message ---
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

    // --- Friend Request ---
    socket.on("friendRequestReceived", (data) => {
      if (data.from !== authUser._id) {
        showNotification("Friend Request", {
          body: `${data.fromName} sent you a friend request`,
        });
      }
    });

    return () => {
      document.removeEventListener("click", clickHandler);
      socket.disconnect();
      stopRingtone();
    };
  }, [authUser]);
};

export default useNotifications;
export { unlockAudioNow };   // for button to call directly