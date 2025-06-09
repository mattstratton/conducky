import React from "react";
import { useEffect, useState, useContext } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { UserContext } from "./_app";
import { Button, Input, Card } from "../components";

export default function Home() {
  const [firstUserNeeded, setFirstUserNeeded] = useState(false);
  const [firstUserForm, setFirstUserForm] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [firstUserError, setFirstUserError] = useState("");
  const [firstUserSuccess, setFirstUserSuccess] = useState("");
  const { user, setUser } = useContext(UserContext);
  const router = useRouter();

  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.firstUserNeeded) {
          setFirstUserNeeded(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // If user is logged in and is a superuser, redirect to /admin
    if (user && user.roles && user.roles.includes("SuperAdmin")) {
      router.replace("/admin");
    }
  }, [user, router]);

  if (firstUserNeeded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-200 p-4">
        <Card className="w-full max-w-md p-4 sm:p-8">
          <h1 className="text-2xl font-bold mb-4 text-center">
            Welcome! Set Up Your First User
          </h1>
          <p className="mb-4 text-gray-700 dark:text-gray-200">
            No users exist yet. Create the first user (will be Global Admin):
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setFirstUserError("");
              setFirstUserSuccess("");
              // Register the user
              const res = await fetch(
                (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
                  "/register",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(firstUserForm),
                  credentials: "include",
                },
              );
              if (!res.ok) {
                const data = await res.json();
                setFirstUserError(data.error || "Failed to create user.");
                return;
              }
              setFirstUserSuccess(
                "First user created and set as Global Admin! You can now log in.",
              );
              setFirstUserNeeded(false);
            }}
          >
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2">
                Email
              </label>
              <Input
                type="email"
                required
                value={firstUserForm.email}
                onChange={(e) =>
                  setFirstUserForm((f) => ({ ...f, email: e.target.value }))
                }
                className="px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2">
                Name
              </label>
              <Input
                type="text"
                value={firstUserForm.name}
                onChange={(e) =>
                  setFirstUserForm((f) => ({ ...f, name: e.target.value }))
                }
                className="px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2">
                Password
              </label>
              <Input
                type="password"
                required
                value={firstUserForm.password}
                onChange={(e) =>
                  setFirstUserForm((f) => ({ ...f, password: e.target.value }))
                }
                className="px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm"
              />
            </div>
            <Button
              type="submit"
              className="w-full px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm"
            >
              Create First User
            </Button>
          </form>
          {firstUserError && (
            <p className="text-red-600 dark:text-red-400 mt-2">
              {firstUserError}
            </p>
          )}
          {firstUserSuccess && (
            <p className="text-green-600 dark:text-green-400 mt-2">
              {firstUserSuccess}
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-200 p-4">
      <Card className="w-full max-w-md text-center p-4 sm:p-8">
        <h1 className="text-3xl font-bold mb-4">Hello!</h1>
        <p className="mb-6 text-gray-700 dark:text-gray-200">
          This is a self-hosted installation of Conducky, your free and open
          source code of conduct report management system.
        </p>
        <p className="mb-6 text-gray-700 dark:text-gray-200">
          If you're looking to configure this installation, please head over
          here:
        </p>
        <Link
          href="/admin"
          className="text-blue-700 dark:text-blue-400 hover:underline font-semibold"
        >
          Configure this installation
        </Link>
        <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">
          powered by Conducky
        </p>
      </Card>
    </div>
  );
}
