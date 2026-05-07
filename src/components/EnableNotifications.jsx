// components/EnableNotifications.jsx
import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";

const EnableNotifications = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Notification.permission !== "granted") {
      setVisible(true);
    }
  }, []);

  const request = () => {
    Notification.requestPermission().then((result) => {
      if (result === "granted") {
        setVisible(false);
        window.location.reload();
      } else if (result === "denied") {
        alert("Notifications are blocked. Enable them in your browser settings.");
      }
    });
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={request}
        className="btn btn-primary btn-circle shadow-lg animate-bounce"
        title="Enable Notifications"
      >
        <BellRing size={24} />
      </button>
    </div>
  );
};

export default EnableNotifications;