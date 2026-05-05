import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { login } from "../lib/api";

const useLogin = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { mutate, isPending, error } = useMutation({
        mutationFn: login,
        onSuccess: (data) => {
            // Invalidate auth user query to refresh user data
            queryClient.invalidateQueries({ queryKey: ["authUser"] });
            
            // Redirect to home page after successful login
            if (data?.isOnboarded) {
                navigate("/home");
            } else {
                navigate("/onboarding");
            }
        },
        onError: (error) => {
            console.error("Login failed:", error);
        },
    });

    return { error, isPending, loginMutation: mutate };
};

export default useLogin;