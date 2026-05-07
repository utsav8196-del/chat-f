// components/EnableNotifications.jsx
import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { unlockAudioNow } from "../hooks/useNotifications";

const EnableNotifications = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => {
      const soundReady = (window._audioUnlocked === true);
      const notifReady = Notification.permission === "granted";
      setVisible(!(soundReady && notifReady));
    };
    check();

    // Listen for audio unlocked event (optional, for reactivity)
    window.addEventListener("audioUnlocked", check);
    return () => window.removeEventListener("audioUnlocked", check);
  }, []);

  const handleClick = () => {
    // 1. Unlock audio (singleton, safe)
    unlockAudioNow();
    // 2. Request notification permission
    Notification.requestPermission().then((result) => {
      if (result === "granted") {
        // Notify other components (optional)
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