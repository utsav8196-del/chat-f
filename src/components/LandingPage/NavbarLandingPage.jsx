import { MessageSquareText, Sun, Moon, Menu, X } from 'lucide-react';
import { useState } from 'react';
import ThemeSelector from '../ThemeSelector';

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    return (
        <nav className="bg-base-200 shadow-sm">
            <div className="container mx-auto px-2 max-w-7xl py-2">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo and desktop menu */}
                    <div className="flex items-center">
                        <div className="flex-shrink-0 flex items-center">
                            <MessageSquareText className="text-primary" size={28} />
                            <span className="ml-2 text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                StackChat
                            </span>
                        </div>
                    </div>

                    {/* Desktop navigation */}
                    <div className="hidden md:flex items-center space-x-4">
                        <ThemeSelector />
                        <a href="/login" className="btn btn-ghost">Sign In</a>
                        <a href="/signup" className="btn btn-primary">Sign Up</a>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={toggleMobileMenu}
                            className="btn btn-ghost btn-circle"
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            <div className={`md:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
                <div className="space-y-2 px-4 pb-4 pt-2">
                    <div className="flex justify-center">
                        <ThemeSelector />
                    </div>
                    <a
                        href="/login"
                        className="btn btn-ghost w-full justify-start"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        Sign In
                    </a>
                    <a
                        href="/signup"
                        className="btn btn-primary w-full justify-start"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        Sign Up
                    </a>
                </div>
            </div>
        </nav>
    );
}