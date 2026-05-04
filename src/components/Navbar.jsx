import { Link, useLocation } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, HomeIcon, LogOutIcon, MenuIcon, MessageSquareText, Users, XIcon } from "lucide-react";
import ThemeSelector from "./ThemeSelector";
import useLogout from "../hooks/useLogout";
import { useState } from "react";

const Navbar = () => {
    const { authUser } = useAuthUser();
    const location = useLocation();
    const isChatPage = location.pathname?.startsWith("/chat");
    // const navigate=useNavigate();
    // const queryClient = useQueryClient();
    // const { mutate: logoutMutation } = useMutation({
    //   mutationFn: logout,
    //   onSuccess: () => queryClient.invalidateQueries({ queryKey: ["authUser"] }),
    // });

    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const { logoutMutation } = useLogout();

    return (
        <nav className="bg-base-200 border-b border-base-300 sticky top-0 z-30 h-16 flex items-center w-full">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className={`flex items-center ${isChatPage?"justify-between":"lg:justify-end justify-between"} w-full sm:gap-1 gap-[0.5px]`}>
                {/* LOGO - ONLY IN THE CHAT PAGE */}
                    {isChatPage && (
                        <div className="pl-3 sm:pl-5">
                            <Link to="/home" className="flex items-center gap-2.5">
                                <MessageSquareText className="size-5 sm:size-9 text-primary" />
                                <span className="text-2xl sm:text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider">
                                    StackChat
                                </span>
                            </Link>
                        </div>
                    )}

                    {
                        !isChatPage && (
                            <div className="lg:hidden pl-3 sm:pl-5">
                                <Link to="/home" className="flex items-center gap-2.5">
                                    <MessageSquareText className="size-5 sm:size-9 text-primary" />
                                    <span className="text-2xl sm:text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider">
                                        StackChat
                                    </span>
                                </Link>
                            </div>
                        )
                    }

                    <div className="sm:hidden">
                        <button className="btn btn-ghost btn-circle" onClick={toggleMenu}>
                            {menuOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
                        </button>
                    </div>

                    {/* Normal Navbar for Larger Screen */}
                    <div className="sm:flex justify-evenly hidden">
                        <div className={`${isChatPage?"":"lg:hidden"} flex items-center gap-3 sm:gap-4`}>
                            <Link to={"/home"}>
                                <button className="btn btn-ghost btn-circle">
                                    <HomeIcon className="w-5 h-5 sm:h-6 sm:w-6 text-base-content opacity-70" />
                                </button>
                            </Link>
                        </div>
                        
                        <div className={`${isChatPage?"":"lg:hidden"} flex items-center gap-3 sm:gap-4`}>
                            <Link to={"/friends"}>
                                <button className="btn btn-ghost btn-circle">
                                    <Users className="w-5 h-5 sm:h-6 sm:w-6 text-base-content opacity-70" />
                                </button>
                            </Link>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4">
                            <Link to={"/notifications"}>
                                <button className="btn btn-ghost btn-circle">
                                    <BellIcon className="w-5 h-5 sm:h-6 sm:w-6 text-base-content opacity-70" />
                                </button>
                            </Link>
                        </div>

                        {/* TODO */}
                        <ThemeSelector />

                        <div className="avatar">                        
                            <Link to={"/profile"}>
                                <button className="btn btn-ghost btn-circle p-[0.5px]">
                                    <img src={authUser?.profilePic} alt="User Avatar" rel="noreferrer" />
                                </button>
                            </Link>
                        </div>

                        {/* Logout button */}
                        <button className="btn btn-ghost btn-circle" onClick={logoutMutation}>
                            <LogOutIcon className="w-5 h-5 sm:h-6 sm:w-6 text-base-content opacity-70" />
                        </button>
                    </div>

                    {menuOpen && (
                    <div className="sm:hidden absolute top-16 left-0 right-0 bg-base-200 shadow-lg border-t border-base-300 py-2 px-4">
                        <div className="flex flex-col gap-1">
                            <Link 
                                to={"/home"} 
                                className="w-full"
                                onClick={() => setMenuOpen(false)}
                            >
                                <button className="btn btn-ghost justify-start w-full rounded-btn">
                                    <HomeIcon className="w-5 h-5 mr-3" />
                                    Home
                                </button>
                            </Link>
                            <Link 
                                to={"/friends"} 
                                className="w-full"
                                onClick={() => setMenuOpen(false)}
                            >
                                <button className="btn btn-ghost justify-start w-full rounded-btn">
                                    <Users className="w-5 h-5 mr-3" />
                                    Friends
                                </button>
                            </Link>
                            <Link 
                                to={"/notifications"} 
                                className="w-full"
                                onClick={() => setMenuOpen(false)}
                            >
                                <button className="btn btn-ghost justify-start w-full rounded-btn">
                                    <BellIcon className="w-5 h-5 mr-3" />
                                    Notifications
                                </button>
                            </Link>
                            <Link 
                                to={"/profile"} 
                                className="w-full"
                                onClick={() => setMenuOpen(false)}
                            >
                                <button className="btn btn-ghost justify-start w-full rounded-btn">
                                    <div className="avatar mr-2">
                                        <div className="w-6 rounded-full">
                                            <img src={authUser?.profilePic} alt="Profile" />
                                        </div>
                                    </div>
                                    Profile
                                </button>
                            </Link>
                            <div className="divider my-0 w-full"></div>
                            {/* <ThemeSelector /> */}
                            <div className="py-1 w-full">
                                <ThemeSelector mobile />
                            </div>
                            <button 
                                className="btn btn-ghost justify-start text-error rounded-btn" 
                                onClick={() => {
                                    logoutMutation();
                                    setMenuOpen(false);
                                }}
                            >
                                <LogOutIcon className="w-5 h-5 mr-3" />
                                Logout
                            </button>
                        </div>
                    </div>
                    )}
                </div>
            </div>
        </nav>
    );
};
export default Navbar;