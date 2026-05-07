// components/FriendRequestPopup.jsx
import { UserPlus, UserX } from "lucide-react";

const FriendRequestPopup = ({ request, onAccept, onDecline }) => {
  if (!request) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="card bg-base-100 shadow-2xl w-full max-w-sm">
        <div className="card-body text-center space-y-4">
          <h3 className="text-xl font-bold">Friend Request</h3>
          <p className="text-lg">{request.fromName}</p>
          <p className="text-sm opacity-70">wants to be your friend</p>
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => onAccept(request._id)}
              className="btn btn-success gap-2"
            >
              <UserPlus size={18} /> Accept
            </button>
            <button
              onClick={() => onDecline(request._id)}
              className="btn btn-error gap-2"
            >
              <UserX size={18} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FriendRequestPopup;