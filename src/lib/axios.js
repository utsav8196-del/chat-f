import axios from "axios";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:8000/api" : "/api";
// const BASE_URL = "http://localhost:8000/api";
// const BASE_URL = import.meta.env.VITE_BASE_URL || "https://stackchatbackend.vercel.app";

export const axiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true, // send cookies with the request
});
