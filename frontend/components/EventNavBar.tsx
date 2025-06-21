import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from "@/components/ui/navigation-menu";

export interface EventNavBarProps {
  eventSlug: string;
  eventName?: string;
  user?: unknown;
  userRoles?: string[];
  openReportModal?: () => void;
}

export function EventNavBar({ eventSlug, eventName, user, userRoles = [], openReportModal }: EventNavBarProps) {
  const isAdmin = userRoles.includes("Event Admin");
  const isResponder = userRoles.includes("Responder");
  const isSuperAdmin = userRoles.includes("SuperAdmin");
  const canSeeEventReports = isResponder || isAdmin || isSuperAdmin;

  return (
    <nav className="w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10 sticky top-[56px] md:top-[72px]">
      <div className="flex items-center px-4 md:px-8 py-2 gap-4 text-gray-900 dark:text-gray-100">
        <Link
          href={`/event/${eventSlug}`}
          className="font-bold text-lg hover:text-blue-600 dark:hover:text-blue-400 transition flex-1"
        >
          {eventName || eventSlug}
        </Link>
        {/* Hamburger for mobile using SheetTrigger */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="md:hidden p-2 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
              aria-label="Open event navigation"
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </SheetTrigger>
          <SheetContent className="p-0 w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <SheetHeader className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <SheetTitle asChild>
                <span className="font-bold text-lg flex items-center gap-2">
                  {eventName || eventSlug}
                </span>
              </SheetTitle>
              <SheetClose asChild>
                <button
                  className="p-2 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  aria-label="Close event navigation"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </SheetClose>
            </SheetHeader>
            <nav className="flex flex-col gap-2 px-4 py-4">
              {!!user && (
                <Button onClick={openReportModal} className="w-full text-left">
                  Submit Report
                </Button>
              )}
              <SheetClose asChild>
                <Link
                  href={`/event/${eventSlug}/report`}
                  className="text-blue-600 dark:text-blue-400 underline font-medium px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  My Reports
                </Link>
              </SheetClose>
              {canSeeEventReports && (
                <SheetClose asChild>
                  <Link
                    href={`/event/${eventSlug}/admin/reports`}
                    className="text-blue-600 dark:text-blue-400 underline font-medium px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    Event Reports
                  </Link>
                </SheetClose>
              )}
              {isAdmin && (
                <SheetClose asChild>
                  <Link
                    href={`/event/${eventSlug}/admin`}
                    className="text-blue-600 dark:text-blue-400 underline font-medium px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    Admin
                  </Link>
                </SheetClose>
              )}
            </nav>
          </SheetContent>
        </Sheet>
        {/* Desktop links using Shadcn NavigationMenu */}
        <NavigationMenu className="hidden md:flex gap-2 flex-wrap items-center" id="event-nav-links">
          <NavigationMenuList>
            {!!user && (
              <NavigationMenuItem>
                <Button onClick={openReportModal} className="sm:px-3 sm:py-1.5 sm:text-sm">
                  Submit Report
                </Button>
              </NavigationMenuItem>
            )}
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  href={`/event/${eventSlug}/report`}
                  className="text-blue-600 dark:text-blue-400 underline font-medium px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  My Reports
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            {canSeeEventReports && (
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href={`/event/${eventSlug}/admin/reports`}
                    className="text-blue-600 dark:text-blue-400 underline font-medium px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    Event Reports
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            )}
            {isAdmin && (
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    href={`/event/${eventSlug}/admin`}
                    className="text-blue-600 dark:text-blue-400 underline font-medium px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    Admin
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </nav>
  );
}

export default EventNavBar; 