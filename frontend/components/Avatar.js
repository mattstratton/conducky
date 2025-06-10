import React from "react";

function stringToColor(str) {
  // Simple hash to color
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${hash % 360}, 60%, 60%)`;
  return color;
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ user, size = 40, className = "" }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  let avatarSrc = null;
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
}
