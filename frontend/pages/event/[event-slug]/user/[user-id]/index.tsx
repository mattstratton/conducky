import React from "react";
import { useRouter } from "next/router";

// This file is intentionally left minimal, as it was in the JavaScript version
// Will be implemented in the future

export default function EventUserDetailPage() {
  const router = useRouter();
  const { "event-slug": eventSlug, "user-id": userId } = router.query;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">User Detail Page</h1>
      <p className="text-gray-600">
        Event: {eventSlug}, User ID: {userId}
      </p>
      <p className="text-gray-600">This page is under development</p>
    </div>
  );
} 