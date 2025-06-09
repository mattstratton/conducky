import React from "react";
import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/router";
import { UserContext } from "./_app";
import { Button, Input, Card } from "../components";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const [nextUrl, setNextUrl] = useState("/");
  const { setUser } = useContext(UserContext);

  useEffect(() => {
    // Prefer ?next=... in query, else use document.referrer if it's from the same origin
    if (router.query.next) {
      setNextUrl(router.query.next);
    } else if (
      typeof document !== "undefined" &&
      document.referrer &&
      document.referrer.startsWith(window.location.origin)
    ) {
      const refPath = document.referrer.replace(window.location.origin, "");
      setNextUrl(refPath || "/");
    }
  }, [router.query.next]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        // Fetch user info and update context
        const sessionRes = await fetch(
          (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
            "/session",
          { credentials: "include" },
        );
        if (sessionRes.ok) {
          const data = await sessionRes.json();
          setUser(data.user);
        }
        router.push(nextUrl);
      } else {
        let errMsg = "Login failed";
        try {
          const data = await res.json();
          errMsg = data.error || data.message || errMsg;
        } catch {
          // If not JSON, keep default
        }
        setError(errMsg);
      }
    } catch (err) {
      setError("Network error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-200 p-4">
      <Card className="w-full max-w-md p-4 sm:p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2"
              htmlFor="email"
            >
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm"
              id="email"
            />
          </div>
          <div>
            <label
              className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2"
              htmlFor="password"
            >
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm"
              id="password"
            />
          </div>
          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm font-semibold">
              {error}
            </div>
          )}
          <Button
            type="submit"
            className="w-full px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm"
          >
            Login
          </Button>
        </form>
      </Card>
    </div>
  );
}
