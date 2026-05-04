import NavbarLandingPage from "../components/LandingPage/NavbarLandingPage";
import HeroSection from '../components/LandingPage/HeroSection';
import FeaturesSection from '../components/LandingPage/FeaturesSection';
import TestimonialSection from '../components/LandingPage/TestimonialSection';
import CTASection from '../components/LandingPage/CTASection';
import FooterSection from '../components/LandingPage/FooterSection';
import { useThemeStore } from '../store/useThemeStore';

export default function LandingPage() {
    const { theme } = useThemeStore();

    return (
        <div data-theme={theme} className="min-h-screen">
            {/* Navigation */}
            <NavbarLandingPage />

            {/* Hero Section */}
            <HeroSection />

            {/* Features Section */}
            <FeaturesSection />
            {/* Testimonials Section */}
            <TestimonialSection />

            {/* Final CTA */}
            <CTASection />

            {/* Footer */}
            <FooterSection />
        </div>
    );
}