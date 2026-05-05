import { useState } from "react";
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "https://chat-b-hxym.onrender.com";

const BACKEND_URL = API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
});

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Login failed. Please try again."
  );
}

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await api.post("/api/auth/login", formData);
      window.location.href = "/";
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-base-content/70">Log in to continue to StackChat</p>
        </div>

        <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl">
          <div className="card-body space-y-4">
            <label className="form-control w-full">
              <span className="label-text mb-2">Email</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="input input-bordered w-full rounded-lg"
                value={formData.email}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="form-control w-full">
              <span className="label-text mb-2">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                className="input input-bordered w-full rounded-lg"
                value={formData.password}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                required
              />
            </label>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log in"}
            </button>

            <p className="text-center text-sm">
              New to StackChat?{" "}
              <a href="/signup" className="link link-primary">
                Create account
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
