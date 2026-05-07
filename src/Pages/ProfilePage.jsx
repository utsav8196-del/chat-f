// Pages/ProfilePage.jsx
import { useState, useRef } from "react";
import useAuthUser from "../hooks/useAuthUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeOnboarding } from "../lib/api";
import toast from "react-hot-toast";
import {
  ArrowBigRight,
  Ban,
  LoaderCircle,
  MapPinIcon,
  MessageSquareText,
  Pencil,
  ShuffleIcon,
  Upload,
  Camera,
  User,
} from "lucide-react";

const ProfilePage = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();

  const [profileData, setProfileData] = useState({
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
    location: authUser?.location || "",
    profilePic: authUser?.profilePic || "",
  });

  const originalProfile = {
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
    location: authUser?.location || "",
    profilePic: authUser?.profilePic || "",
  };

  const fileInputRef = useRef(null);

  const { mutate: profileMutation, isPending: isProfileLoading } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries(["authUser"]);
      toast.success("Profile Updated Successfully");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Update failed.");
    },
  });

  // Random avatar using DiceBear (multiple styles)
  const handleRandomAvatar = () => {
    const styles = ["avataaars", "fun-emoji", "bottts", "pixel-art"];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const seed = Math.random().toString(36).substring(2, 8);
    const avatarURL = `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${seed}`;
    setProfileData({ ...profileData, profilePic: avatarURL });
    toast.success("Random avatar generated!");
  };

  // Handle custom file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    // Create local preview (in production, upload to server/cloud and use returned URL)
    const imageUrl = URL.createObjectURL(file);
    setProfileData({ ...profileData, profilePic: imageUrl });
    toast.success("Custom photo selected (local preview)");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    if (!profileData.fullName || !profileData.bio || !profileData.location) {
      toast.error("All fields are required");
      return;
    }

    const isChanged = Object.keys(profileData).some(
      (key) => profileData[key] !== originalProfile[key]
    );

    if (!isChanged) {
      toast.error("No changes detected.");
      setIsEditing(false);
      return;
    }

    profileMutation(profileData);
  };

  const handleCancel = () => {
    setProfileData(originalProfile);
    setIsEditing(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-base-100">
      <div className="container mx-auto max-w-2xl space-y-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          My Profile
        </h1>

        <div className="card bg-base-200 shadow-xl">
          <div className="card-body p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ===== PROFILE PHOTO SECTION ===== */}
              <div className="flex flex-col items-center gap-4">
                <h2 className="text-lg font-semibold self-start">Profile Photo</h2>
                <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
                  {/* Current photo */}
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <p className="text-sm font-medium opacity-70">Current</p>
                    <div className="avatar">
                      <div className="w-24 sm:w-28 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                        {authUser?.profilePic ? (
                          <img src={authUser.profilePic} alt="Current" />
                        ) : (
                          <div className="bg-neutral-focus text-neutral-content flex items-center justify-center h-full">
                            <User size={32} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowBigRight className="size-8 sm:size-12 text-primary hidden sm:block" />

                  {/* Updated preview */}
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <p className="text-sm font-medium opacity-70">Updated</p>
                    <div className="avatar">
                      <div className="w-24 sm:w-28 rounded-full ring ring-secondary ring-offset-base-100 ring-offset-2">
                        {profileData.profilePic ? (
                          <img src={profileData.profilePic} alt="Preview" />
                        ) : (
                          <div className="bg-neutral-focus text-neutral-content flex items-center justify-center h-full">
                            <Camera size={32} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Avatar controls (only when editing) */}
                {isEditing && (
                  <div className="flex flex-wrap gap-3 justify-center mt-2">
                    <button
                      type="button"
                      onClick={handleRandomAvatar}
                      className="btn btn-accent btn-sm gap-1"
                    >
                      <ShuffleIcon size={16} />
                      Random Avatar
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-outline btn-sm gap-1"
                    >
                      {/* <Upload size={16} />
                      Upload Photo
                    </button> */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                )}
              </div>

              <div className="divider" />

              {/* ===== FULL NAME ===== */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Full Name</span>
                </label>
                <input
                  type="text"
                  value={profileData.fullName}
                  onChange={(e) =>
                    setProfileData({ ...profileData, fullName: e.target.value })
                  }
                  className="input input-bordered w-full"
                  placeholder="Your full name"
                  disabled={!isEditing}
                />
              </div>

              {/* ===== BIO ===== */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Bio</span>
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) =>
                    setProfileData({ ...profileData, bio: e.target.value })
                  }
                  className="textarea textarea-bordered h-24"
                  placeholder="Tell others about yourself..."
                  disabled={!isEditing}
                />
              </div>

              {/* ===== LOCATION ===== */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Location</span>
                </label>
                <div className="relative">
                  <MapPinIcon className="absolute top-1/2 -translate-y-1/2 left-3 size-5 text-base-content/70" />
                  <input
                    type="text"
                    value={profileData.location}
                    onChange={(e) =>
                      setProfileData({ ...profileData, location: e.target.value })
                    }
                    className="input input-bordered w-full pl-10"
                    placeholder="City, Country"
                    disabled={!isEditing}
                  />
                </div>
              </div>

              {/* ===== ACTION BUTTONS ===== */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                {!isEditing ? (
                  <button
                    type="button"
                    className="btn btn-primary flex-1 gap-2"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil size={18} />
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost flex-1 gap-2"
                      onClick={handleCancel}
                    >
                      <Ban size={18} />
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary flex-1 gap-2"
                      disabled={isProfileLoading}
                    >
                      {isProfileLoading ? (
                        <>
                          <LoaderCircle className="animate-spin size-5" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <MessageSquareText size={18} />
                          Save Changes
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;