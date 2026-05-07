import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { unlockAudioNow } from "../hooks/useNotifications";

const EnableNotifications = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => {
      const soundReady = window._audioUnlocked || false;
      const notifReady = Notification.permission === "granted";
      setVisible(!(soundReady && notifReady));
    };
    check();
    window.addEventListener("audioUnlocked", check);
    return () => window.removeEventListener("audioUnlocked", check);
  }, []);

  const handleClick = () => {
    unlockAudioNow();   // force unlock
    Notification.requestPermission().then((result) => {
      if (result === "granted") {
        setVisible(false);
      }
    });
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleClick}
        className="btn btn-primary btn-circle shadow-lg animate-bounce"
        title="Enable Sound & Notifications"
      >
        <BellRing size={24} />
      </button>
    </div>
  );
};

export default EnableNotifications;