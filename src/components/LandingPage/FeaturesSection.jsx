import { Lock, MessageSquare, Users, Video, Zap } from "lucide-react";

const FeaturesSection = () => {
    return (
        <section className="py-24 bg-base-200" id="features">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">
                        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Powerful Features
                        </span>
                    </h2>
                    <p className="text-xl opacity-80 max-w-2xl mx-auto">
                        Everything you need for modern communication in one place
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                        {
                            icon: <MessageSquare size={32} strokeWidth={1.5} />,
                            title: "Real-time Chat",
                            desc: "Instant messaging with typing indicators and read receipts.",
                            features: ["Group chats", "Media sharing", "Message reactions"]
                        },
                        {
                            icon: <Video size={32} strokeWidth={1.5} />,
                            title: "Video Calls",
                            desc: "HD quality video calls powered by Stream API.",
                            features: ["Screen sharing", "Low latency", "Picture-in-picture"]
                        },
                        {
                            icon: <Users size={32} strokeWidth={1.5} />,
                            title: "Friend Network",
                            desc: "Build your community with friend requests.",
                            features: ["Recommendations", "Online status", "Contact management"]
                        },
                        {
                            icon: <Lock size={32} strokeWidth={1.5} />,
                            title: "Secure Auth",
                            desc: "JWT-based authentication with full security.",
                            features: ["Profile onboarding", "Session management", "Secure tokens"]
                        }
                    ].map((feature, index) => (
                        <div
                            key={index}
                            className="card bg-base-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-2 duration-300"
                        >
                            <div className="card-body">
                                <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white mb-6">
                                    {feature.icon}
                                </div>
                                <h3 className="card-title text-2xl">{feature.title}</h3>
                                <p className="opacity-80 mb-4">{feature.desc}</p>
                                <ul className="space-y-2 text-sm opacity-75">
                                    {feature.features.map((item, i) => (
                                        <li key={i} className="flex items-center">
                                            <Zap className="w-4 h-4 mr-2 text-primary" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
export default FeaturesSection;