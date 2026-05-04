import { Link } from "react-router";

const CTASection = () => {
    return (
        <section className="py-20 bg-base-200">
            <div className="container mx-auto px-6 text-center">
                <div className="card bg-base-100 shadow-xl max-w-4xl mx-auto">
                    <div className="card-body py-12 px-6 sm:px-12">
                        <h2 className="card-title justify-center text-3xl md:text-4xl font-bold mb-6">
                            Ready to experience modern communication?
                        </h2>
                        <p className="text-xl opacity-80 mb-8 max-w-2xl mx-auto">
                            Join thousands of users who are already enjoying StackChat.
                        </p>
                        <div className="card-actions justify-center items-stretch flex flex-col sm:flex-row gap-4">
                            <Link to="/signup" className="btn btn-primary btn-lg">Create Free Account</Link>
                            <a href="#features" className="btn btn-outline btn-lg">Explore Features</a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default CTASection;