import { useState } from "react";
import useAuthUser from "../hooks/useAuthUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeOnboarding } from "../lib/api";
import toast from "react-hot-toast";
import { ArrowBigRight, Ban, LoaderCircle, MapPinIcon, MessageSquareText, Pencil, ShuffleIcon } from "lucide-react";

const ProfilePage = () => {
    const [isEditing, setIsEditing] = useState(false);
    const {authUser}= useAuthUser();
    const queryClient=useQueryClient();

    const [profileData,setProfileData]=useState({
        fullName: authUser?.fullName,
        bio: authUser?.bio,
        location: authUser?.location,
        profilePic: authUser?.profilePic,
    });

    const originalProfile = {
        fullName: authUser?.fullName || "",
        bio: authUser?.bio || "",
        location: authUser?.location || "",
        profilePic: authUser?.profilePic || "",
    };

    const currentProfilePic=authUser?.profilePic;

    const {mutate:profileMutation, isPending:isProfileLoading}=useMutation({
        mutationFn:completeOnboarding,
        onSuccess:()=>{
            queryClient.invalidateQueries(['authUser']);
            toast.success("Profile Updated Successfully");
            setIsEditing(false);
        },
        onError:(error)=>{
            toast.error(error?.response?.data?.message || "Update failed.");
        }
    })

    // const handleChange = (e) => {
    //     const { name, value } = e.target;
    //     setProfile((prev) => ({ ...prev, [name]: value }));
    // };

    const handleRandomAvatar=()=>{
        const idx=Math.floor(Math.random()*100)+1;
        const avtarURL=`https://avatar.iran.liara.run/public/${idx}.png`

        setProfileData({...profileData,profilePic:avtarURL});
        toast.success("Random Profile Avtar Generated");
    }

    const handleSubmit=(e)=>{
        e.preventDefault();

        const isChanged = Object.keys(profileData).some(
            (key) => profileData[key] !== originalProfile[key]
        );

        if (!isChanged) {
            toast.error("No changes detected.");
            setIsEditing(false);
            return;
        }

        profileMutation(profileData);
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="container mx-auto max-w-4xl space-y-8">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Profile</h1>
                
                <div className="w-full mx-auto p-4 rounded-xl shadow" data-theme="forest">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* PROFILE PIC CONTAINER */}
                        <div className="flex flex-col items-center justify-center space-y-3">
                            {/* IMAGE PREVIEW */}
                            <div className="overflow-hidden flex gap-2 w-full justify-center items-center p-2">
                                <div className="currentImage flex flex-col w-full items-center justify-center">
                                    <h2 className="text-md font-medium mb-2">Current</h2>
                                    {profileData.profilePic ? (
                                        <img
                                        src={currentProfilePic}
                                        alt="Profile Preview"
                                        className="size-20 sm:size-28 object-cover self-center"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <CameraIcon className="size-12 text-base-content opacity-40" />
                                        </div>
                                    )}
                                </div>
                                <div className="arrowIcon">
                                    <ArrowBigRight className="size-24 sm:size-28" />
                                </div>
                                <div className="uploadingImage flex flex-col w-full items-center justify-center">
                                    <h2 className="text-md font-medium mb-2">Updated</h2>
                                    <img
                                        src={profileData.profilePic}
                                        alt="Profile Preview"
                                        className="size-20 sm:size-28 object-cover"
                                    />
                                </div>
                            </div>

                            {/* Generate Random Avatar BTN */}
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={handleRandomAvatar} className="btn btn-accent rounded-lg" disabled={!isEditing}>
                                <ShuffleIcon className="size-4 mr-2" />
                                Generate Random Avatar
                                </button>
                            </div>
                        </div>

                        {/* FULL NAME */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Full Name</span>
                            </label>
                            <input
                                type="text"
                                name="fullName"
                                value={profileData.fullName}
                                onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                                className="input input-bordered w-full rounded-lg"
                                placeholder="Your full name"
                                disabled={!isEditing}
                            />
                        </div>

                        {/* BIO */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Bio</span>
                            </label>
                            <textarea
                                name="bio"
                                value={profileData.bio}
                                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                                className="textarea textarea-bordered h-24 rounded-lg"
                                placeholder="Tell others about yourself and your language learning goals"
                                disabled={!isEditing}
                            />
                        </div>

                        {/* LOCATION */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Location</span>
                            </label>
                            <div className="relative">
                                <MapPinIcon className="absolute top-1/2 transform -translate-y-1/2 left-3 size-5 text-base-content opacity-70" />
                                <input
                                type="text"
                                name="location"
                                value={profileData.location}
                                onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                                className="input input-bordered w-full pl-10 rounded-lg"
                                placeholder="City, Country"
                                disabled={!isEditing}
                                />
                            </div>
                        </div>

                        {/* SUBMIT BUTTON */}
                        
                        <div className="btns flex w-full gap-2 flex-col sm:flex-row transition-all">
                            <button type="button" className="btn btn-primary rounded-lg flex-1" onClick={()=>{setIsEditing(
                            (prev)=>!prev
                        )}}>
                                {
                                    !isEditing
                                    ?<>
                                        <Pencil className="size-5 mr-2" />
                                        Edit Profile
                                    </>
                                    :<>
                                        <Ban className="size-5 mr-2" />
                                        Cancel Edit
                                    </>
                                }
                            </button>

                            <button className={`btn btn-primary rounded-lg flex-1 ${isEditing?"cursor-pointer":"cursor-not-allowed"}`} disabled={isProfileLoading||!isEditing} type="submit">
                                {!isProfileLoading ? (
                                    <>
                                    <MessageSquareText className="size-5 mr-2" />
                                    Save Changes
                                    </>
                                ) : (
                                    <>
                                    <LoaderCircle className="animate-spin size-5 mr-2" />
                                    Saving Changes...
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default ProfilePage
