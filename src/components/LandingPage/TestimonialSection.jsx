import { Quote } from "lucide-react";

const TestimonialSection = () => {
    // Testimonial data
    const testimonials = [
        {
            id: 1,
            name: "Pooja Parekh",
            role: "UX Designer",
            content: "StackChat has transformed how our design team collaborates. The real-time features are incredibly smooth.",
            avatar: "https://avatar.iran.liara.run/public/76"
        },
        {
            id: 2,
            name: "John Doe",
            role: "Student",
            content: "As someone who chats with friends across timezones, StackChat's reliability is impressive.",
            avatar: "https://avatar.iran.liara.run/public/13"
        },
        {
            id: 3,
            name: "Jane Doe",
            role: "Project Manager",
            content: "The video call quality is better than many dedicated meeting apps we've used professionally.",
            avatar: "https://avatar.iran.liara.run/public/83"
        }
    ];
    
    return (
        <section className="py-24 bg-base-100">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">
                        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Loved by Users
                        </span>
                    </h2>
                    <p className="text-xl opacity-80 max-w-2xl mx-auto">
                        What our community says about StackChat
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {testimonials.map((testimonial) => (
                        <div
                            key={testimonial.id}
                            className="card bg-base-200 hover:bg-base-300 transition-colors"
                        >
                            <div className="card-body">
                                <Quote className="w-8 h-8 mb-4 opacity-50" />
                                <p className="text-lg italic mb-6">"{testimonial.content}"</p>
                                <div className="flex items-center">
                                    <div className="avatar">
                                        <div className="w-12 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                                            <img src={testimonial.avatar} alt={testimonial.name} />
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <h4 className="font-semibold">{testimonial.name}</h4>
                                        <p className="text-sm opacity-75">{testimonial.role}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default TestimonialSection;