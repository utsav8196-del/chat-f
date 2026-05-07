// components/EnableNotifications.jsx
import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { unlockAudioNow } from "../hooks/useNotifications";

const EnableNotifications = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => {
      const soundReady = window._audioUnlocked === true;
      const notifReady = Notification.permission === "granted";
      setVisible(!(soundReady && notifReady));
    };
    check();
    window.addEventListener("audioUnlocked", check);
    return () => window.removeEventListener("audioUnlocked", check);
  }, []);

  const handleClick = () => {
    unlockAudioNow(); // unlocks audio (silent mp3)
    Notification.requestPermission().then((result) => {
      if (result === "granted") {
        window.dispatchEvent(new Event("audioUnlocked"));
        setVisible(false);
      }
    });
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <button
        onClick={handleClick}
        className="btn btn-primary btn-circle shadow-xl animate-bounce text-white"
        title="Enable Sound & Notifications"
      >
        <BellRing size={24} />
      </button>
    </div>
  );
};

export default EnableNotifications;