import { Send, Smartphone, User } from "lucide-react";
import { Link } from "react-router";

const HeroSection = () => {
    return (
        <section className="container mx-auto px-8 py-12 md:py-20">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 max-w-7xl mx-auto">
                <div className="lg:w-1/2">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                        Connect <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Seamlessly</span> with Your People
                    </h1>
                    <p className="text-lg opacity-80 mb-8">
                        StackChat brings you real-time messaging, video calls, and friend connections in a beautifully designed interface.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link to="/signup" className="btn btn-primary btn-lg">Get Started</Link>
                        {/* <Link to="/login" className="btn btn-outline btn-lg">Try Demo</Link> */}
                    </div>
                    <div className="mt-8 flex items-center gap-2 text-sm opacity-75">
                        <Smartphone className="text-primary" />
                        <span>Fully responsive on all devices</span>
                        {/* <ChevronRight className="text-primary" size={18} /> */}
                    </div>
                </div>

                {/* Chat Interface Mockup */}
                <div className="lg:w-1/2 w-full max-w-md">
                    <div className="card bg-base-200 shadow-xl">
                        <div className="card-body p-0 overflow-hidden rounded-2xl">
                            {/* Chat header */}
                            <div className="bg-base-300 p-4 flex items-center gap-3">
                                <div className="avatar placeholder">
                                    <div className="w-10 rounded-full bg-primary text-white flex items-center justify-center">
                                        <User size={24} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Prit Paghadal</h3>
                                    <p className="text-xs opacity-75">Online</p>
                                </div>
                            </div>

                            {/* Chat messages */}
                            <div className="p-4 h-64 overflow-y-auto space-y-4">
                                {/* Received message */}
                                <div className="flex justify-start">
                                    <div className="bg-base-100 rounded-2xl px-4 py-3 max-w-xs">
                                        <p>Hey there! 👋 How's it going?</p>
                                        <p className="text-xs opacity-50 mt-1">10:42 AM</p>
                                    </div>
                                </div>

                                {/* Sent message */}
                                <div className="flex justify-end">
                                    <div className="bg-primary text-primary-content rounded-2xl px-4 py-3 max-w-xs">
                                        <p>Great! Just trying out StackChat</p>
                                        <p className="text-xs opacity-80 mt-1">10:43 AM</p>
                                    </div>
                                </div>

                                {/* Received message */}
                                <div className="flex justify-start">
                                    <div className="bg-base-100 rounded-2xl px-4 py-3 max-w-xs">
                                        <p>The UI is so clean! Love the dark mode too</p>
                                        <p className="text-xs opacity-50 mt-1">10:44 AM</p>
                                    </div>
                                </div>

                                {/* Typing indicator */}
                                <div className="flex justify-start">
                                    <div className="bg-base-100 rounded-2xl px-4 py-2">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Message input */}
                            <div className="bg-base-300 p-3 border-t border-base-200">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        className="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <button className="btn btn-primary btn-square">
                                        <Send size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default HeroSection;