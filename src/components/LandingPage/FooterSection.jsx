import { MessageSquareText } from "lucide-react";

const FooterSection = () => {
    return (
        <footer className="py-12 px-8 bg-base-300 border-t border-base-200">
            <div className="container mx-auto max-w-7xl">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="flex items-center space-x-2 mb-6 md:mb-0">
                        <MessageSquareText className="text-primary" size={24} />
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            StackChat
                        </span>
                    </div>
                    <div className="text-sm opacity-75">
                        © {new Date().getFullYear()} StackChat. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default FooterSection;