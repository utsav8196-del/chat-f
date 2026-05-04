import { useEffect, useState } from "react";
import { useParams } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";
import {Sun ,Moon} from "lucide-react";

import {
  Channel,
  ChannelHeader,
  Chat,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";

import ChatLoader from "../components/ChatLoader";
import CallButton from "../components/CallButton";

import "stream-chat-react/dist/css/v2/index.css";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

import { useChatThemeStore, } from "../store/useThemeStore";

const ChatPage = () => {
    const { id: targetUserId } = useParams();

    const [chatClient, setChatClient] = useState(null);
    const [channel, setChannel] = useState(null);
    const [loading, setLoading] = useState(true);

    const { authUser } = useAuthUser();

    const { data: tokenData } = useQuery({
        queryKey: ["streamToken"],
        queryFn: getStreamToken,
        enabled: !!authUser, // this will run only when authUser is available
    });

    useEffect(() => {
        const initChat = async () => {
        if (!tokenData?.token || !authUser) return;

        try {
            console.log("Initializing stream chat client...");

            const client = StreamChat.getInstance(STREAM_API_KEY);

            await client.connectUser(
            {
                id: authUser._id,
                name: authUser.fullName,
                image: authUser.profilePic,
            },
            tokenData.token
            );

            //
            const channelId = [authUser._id, targetUserId].sort().join("-");

            // you and me
            // if i start the chat => channelId: [myId, yourId]
            // if you start the chat => channelId: [yourId, myId]  => [myId,yourId]

            const currChannel = client.channel("messaging", channelId, {
            members: [authUser._id, targetUserId],
            });

            await currChannel.watch();

            setChatClient(client);
            setChannel(currChannel);
        } catch (error) {
            console.error("Error initializing chat:", error);
            toast.error("Could not connect to chat. Please try again.");
        } finally {
            setLoading(false);
        }
        };

        initChat();
    }, [tokenData, authUser, targetUserId]);

    const handleVideoCall = () => {
        if (channel) {
        const callUrl = `${window.location.origin}/call/${channel.id}`;

        channel.sendMessage({
            text: `I've started a video call. Join me here: ${callUrl}`,
        });

        toast.success("Video call link sent successfully!");
        }
    };

    const {chatTheme,setChatTheme}=useChatThemeStore();

    const toggleChatTheme=()=>{
        const newTheme = chatTheme === "light" ? "dark" : "light";
        setChatTheme(newTheme);
    }

    if (loading || !chatClient || !channel) return <ChatLoader />;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] relative w-full ">
            <div className="themeToggleBtn absolute right-0 z-10 p-2">
                <button
                    onClick={() => toggleChatTheme()}
                    className={`p-2 rounded-full transition-colors duration-300 border-2 border-gray-200 ${chatTheme === "dark"
                            ? "bg-blue-800/20 hover:bg-blue-800/30 text-blue-800"
                            : "bg-yellow-500/70 hover:bg-yellow-600/30 text-yellow-700"
                        }`}
                    aria-label="Toggle theme"
                >
                    {chatTheme === "dark" ? (
                        <Moon className="size-6" />
                    ) : (
                        <Sun className="size-6" />
                    )}
                </button>
            </div>
            <Chat client={chatClient} theme={`messaging str-chat__theme-${chatTheme}`}>
                {/* Chat Theme Toggle Btn */}
                <Channel channel={channel}>
                    <div className="w-full relative">
                        <CallButton handleVideoCall={handleVideoCall} />
                        <Window>
                            <ChannelHeader />
                            <MessageList />
                            <MessageInput focus />
                        </Window>
                    </div>
                    <Thread />
                </Channel>
            </Chat>
        </div>
    );
};
export default ChatPage;