import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EventNavBar({ eventSlug, eventName, user, userRoles = [], openReportModal }) {
  const isAdmin = userRoles.includes("Admin");
  const isResponder = userRoles.includes("Responder");
  const isSuperAdmin = userRoles.includes("SuperAdmin");
  const canSeeEventReports = isResponder || isAdmin || isSuperAdmin;
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);

  // Close mobile nav on route change
  useEffect(() => {
    const handleRouteChange = () => setMobileOpen(false);
    window.addEventListener("hashchange", handleRouteChange);
    window.addEventListener("popstate", handleRouteChange);
    return () => {
      window.removeEventListener("hashchange", handleRouteChange);
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  // Trap focus in mobile nav when open
  useEffect(() => {
    if (!mobileOpen || !navRef.current) return;
    const focusableEls = navRef.current.querySelectorAll(
      'a, button, [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
      if (e.key === "Tab") {
        if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        } else if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    firstEl?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  return (
    <nav className="w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10 sticky top-[56px] md:top-[72px]">
      <div className="flex items-center px-4 md:px-8 py-2 gap-4 text-gray-900 dark:text-gray-100">
        <Link
          href={`/event/${eventSlug}`}
          className="font-bold text-lg hover:text-blue-600 dark:hover:text-blue-400 transition flex-1"
        >
          {eventName || eventSlug}
        </Link>
        {/* Hamburger for mobile */}
        <button
          className="md:hidden p-2 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
          aria-label={mobileOpen ? "Close event navigation" : "Open event navigation"}
          aria-controls="event-nav-links"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
        </button>
        {/* Desktop links */}
        <div className="hidden md:flex gap-2 flex-wrap items-center" id="event-nav-links">
          {user && (
            <Button onClick={openReportModal} className="sm:px-3 sm:py-1.5 sm:text-sm">
              Submit Report
            </Button>
          )}
          <Link
            href={`/event/${eventSlug}/report`}
            className="text-blue-600 dark:text-blue-400 underline font-medium px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            My Reports
          </Link>
          {canSeeEventReports && (
            <Link
              href={`/event/${eventSlug}/admin/reports`}
              className="text-blue-600 dark:text-blue-400 underline font-medium px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Event Reports
            </Link>
          )}
          {isAdmin && (
            <Link
              href={`/event/${eventSlug}/admin`}
              className="text-blue-600 dark:text-blue-400 underline font-medium px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Admin
            </Link>
          )}
        </div>
      </div>
      {/* Mobile nav links */}
      {mobileOpen && (
        <div
          ref={navRef}
          className="flex flex-col gap-2 px-4 pb-4 md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-sm"
          id="event-nav-links"
        >
          {user && (
            <Button onClick={openReportModal} className="w-full text-left">
              Submit Report
            </Button>
          )}
          <Link
            href={`/event/${eventSlug}/report`}
            className="text-blue-600 dark:text-blue-400 underline font-medium px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            onClick={() => setMobileOpen(false)}
          >
            My Reports
          </Link>
          {canSeeEventReports && (
            <Link
              href={`/event/${eventSlug}/admin/reports`}
              className="text-blue-600 dark:text-blue-400 underline font-medium px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              onClick={() => setMobileOpen(false)}
            >
              Event Reports
            </Link>
          )}
          {isAdmin && (
            <Link
              href={`/event/${eventSlug}/admin`}
              className="text-blue-600 dark:text-blue-400 underline font-medium px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              onClick={() => setMobileOpen(false)}
            >
              Admin
            </Link>
          )}
        </div>
      )}
    </nav>
  );
} 