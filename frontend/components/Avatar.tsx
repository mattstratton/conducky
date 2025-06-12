import React from "react";

interface User {
  name?: string;
  email?: string;
  avatarUrl?: string;
}

export interface AvatarProps {
  user: User;
  size?: number;
  className?: string;
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${hash % 360}, 60%, 60%)`;
  return color;
}

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({ user, size = 40, className = "" }) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  let avatarSrc: string | null = null;
  if (user.avatarUrl) {
    avatarSrc = user.avatarUrl.startsWith("/")
      ? apiUrl + user.avatarUrl
      : user.avatarUrl;
    return (
      <img
        src={avatarSrc}
        alt={user.name || "User avatar"}
        className={`rounded-full object-cover bg-gray-200 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = getInitials(user.name || user.email || "?");
  const bgColor = stringToColor(user.name || user.email || "?");
  return (
    <div
      className={`flex items-center justify-center rounded-full text-white font-bold ${className}`}
      style={{ width: size, height: size, background: bgColor }}
      title={user.name || user.email || "User"}
    >
      {initials}
    </div>
  );
}; 