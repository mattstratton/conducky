import React, { useContext, useRef, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserContext } from "./_app";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Define user interface based on how it's used in the component
interface User {
  id: string;
  name?: string;
  email: string;
  avatarUrl?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Define UserContext type to match how it's used
interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

export default function ProfilePage() {
  const { user, setUser } = useContext(UserContext) as UserContextType;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return (
      <div className="p-8 text-center">
        You must be logged in to view your profile.
      </div>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSuccess("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("Only PNG or JPG images are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("File size must be 2MB or less.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const res = await fetch(`${apiUrl}/users/${user.id}/avatar`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("[Avatar Upload] Failed to upload avatar", data.error);
        setError(data.error || "Failed to upload avatar.");
      } else {
        setSuccess("Avatar updated!");
        // Refetch user session to update avatarUrl
        const sessionRes = await fetch(`${apiUrl}/session`, {
          credentials: "include",
        });
        const sessionData = await sessionRes.json();
        setUser(sessionData.user);
      }
    } catch (err) {
      console.error("[Avatar Upload] Network error", err);
      setError("Network error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    setError("");
    setSuccess("");
    setUploading(true);
    try {
      const res = await fetch(`${apiUrl}/users/${user.id}/avatar`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        console.error("[Avatar Delete] Failed to remove avatar", data.error);
        setError(data.error || "Failed to remove avatar.");
      } else {
        setSuccess("Avatar removed.");
        // Refetch user session to update avatarUrl
        const sessionRes = await fetch(`${apiUrl}/session`, {
          credentials: "include",
        });
        const sessionData = await sessionRes.json();
        setUser(sessionData.user);
      }
    } catch (err) {
      console.error("[Avatar Delete] Network error", err);
      setError("Network error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Your Profile
      </h1>
      <div className="flex flex-col items-center gap-4 mb-6">
        {(() => {
          let avatarSrc: string | undefined = undefined;
          if (user.avatarUrl) {
            avatarSrc = user.avatarUrl.startsWith("/")
              ? apiUrl + user.avatarUrl
              : user.avatarUrl;
          }
          return (
            <Avatar className="sm:size-20" style={{ width: 56, height: 56 }}>
              <AvatarImage src={avatarSrc} alt={user.name || user.email || "User avatar"} />
              <AvatarFallback>
                {user.name
                  ? user.name.split(" ").map(n => n[0]).join("").toUpperCase()
                  : user.email
                    ? user.email[0].toUpperCase()
                    : "U"}
              </AvatarFallback>
            </Avatar>
          );
        })()}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center">
          <input
            type="file"
            accept="image/png,image/jpeg"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={uploading}
            className="block text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 w-full sm:w-auto"
          />
          {user.avatarUrl && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="px-3 py-2 sm:py-1 rounded bg-red-600 dark:bg-red-700 text-white text-sm font-medium hover:bg-red-700 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-400 w-full sm:w-auto"
            >
              Remove Avatar
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          PNG or JPG, max 2MB
        </div>
        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm w-full text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="text-green-600 dark:text-green-400 text-sm w-full text-center">
            {success}
          </div>
        )}
      </div>
      <div className="mt-8">
        <div className="font-medium mb-2 text-gray-800 dark:text-gray-200">
          Name:
        </div>
        <div className="mb-4 text-gray-900 dark:text-gray-100">
          {user.name || (
            <span className="italic text-gray-400 dark:text-gray-500">
              (none)
            </span>
          )}
        </div>
        <div className="font-medium mb-2 text-gray-800 dark:text-gray-200">
          Email:
        </div>
        <div className="text-gray-900 dark:text-gray-100">{user.email}</div>
      </div>
    </div>
  );
} 