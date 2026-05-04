import { create } from "zustand";

export const useThemeStore = create((set) => ({
    theme: localStorage.getItem("stackchat_theme") || "forest",
    setTheme: (theme) => {
        localStorage.setItem("stackchat_theme", theme);
        set({ theme });
    },
}));

export const useChatThemeStore = create((set) => ({
    chatTheme: localStorage.getItem("stackchat_chat_theme") || "light",
    setChatTheme: (chatTheme) => {
        localStorage.setItem("stackchat_chat_theme", chatTheme);
        set({ chatTheme });
    },
}));