// components/EnableNotifications.jsx
import { BellRing } from "lucide-react";

const EnableNotifications = () => {
  const requestPermission = () => {
    if (Notification.permission === "denied") {
      alert("You have blocked notifications. Please enable them in your browser settings.");
      return;
    }
    Notification.requestPermission().then((result) => {
      if (result === "granted") window.location.reload();
    });
  };

  if (Notification.permission === "granted") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={requestPermission}
        className="btn btn-primary btn-circle shadow-lg"
        title="Enable Notifications"
      >
        <BellRing size={24} />
      </button>
    </div>
  );
};

export default EnableNotifications;