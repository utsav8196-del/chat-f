// components/FriendCard.jsx
import { MapPinIcon } from "lucide-react";
import { Link } from "react-router";

const FriendCard = ({ friend }) => {
  return (
    <div className="card bg-base-200 hover:shadow-md transition-shadow">
      <div className="card-body p-4">
        {/* USER INFO */}
        <div className="flex items-center gap-3 mb-3">
          <div className="avatar">
            <div className="w-12 rounded-full">
              <img src={friend.profilePic} alt={friend.fullName} />
            </div>
          </div>
          <div className="overflow-hidden">
            <h3 className="font-semibold truncate">{friend.fullName}</h3>
            {friend.location && (
              <div className="flex items-center text-xs opacity-70 mt-1 truncate">
                <MapPinIcon className="size-3 mr-1 shrink-0" />
                <span className="truncate">{friend.location}</span>
              </div>
            )}
          </div>
        </div>

        {friend.bio && (
          <p className="text-sm opacity-70 line-clamp-2 mb-3">
            {friend.bio}
          </p>
        )}

        <Link to={`/chat/${friend._id}`} className="btn btn-outline w-full btn-sm">
          Message
        </Link>
      </div>
    </div>
  );
};

export default FriendCard;