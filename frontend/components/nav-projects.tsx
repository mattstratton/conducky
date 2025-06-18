import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/router";

export function NavEvents({
  events,
  collapsed = false,
  selectedEventSlug,
}: {
  events: {
    name: string
    url: string
    icon: React.ElementType
    role?: string
  }[]
  collapsed?: boolean
  selectedEventSlug?: string | null
}) {
  const router = useRouter();
  const { setOpenMobile, isMobile } = useSidebar()
  
  // Determine current event by matching current path to event url, or use selectedEventSlug
  const currentEvent = events.find(e => router.asPath.startsWith(e.url)) 
    || (selectedEventSlug ? events.find(e => e.url.endsWith(`/${selectedEventSlug}/dashboard`)) : null)
    || events[0];

  const handleEventClick = async (eventUrl: string) => {
    await router.push(eventUrl);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  if (collapsed) {
    // Only show the icon, but still open the dropdown
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-accent transition">
            {currentEvent && <currentEvent.icon className="w-6 h-6" />}
            <span className="sr-only">Switch Event</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 p-0">
          {events.map(event => (
            <DropdownMenuItem
              key={event.url}
              className={`flex items-center gap-2 px-3 py-2 text-sm ${currentEvent?.url === event.url ? "bg-accent font-semibold" : ""}`}
              onClick={() => handleEventClick(event.url)}
            >
              <event.icon className="w-4 h-4" />
              <span className="flex-1 truncate text-left">{event.name}</span>
              {event.role && (
                <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold">
                  {event.role}
                </span>
              )}
              {currentEvent?.url === event.url && <Check className="w-4 h-4 text-primary ml-auto" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="px-2 py-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-muted hover:bg-accent transition text-foreground font-medium">
            {currentEvent && <currentEvent.icon className="w-5 h-5" />}
            <span className="flex-1 truncate text-left">{currentEvent ? currentEvent.name : "Select Event"}</span>
            <ChevronDown className="w-4 h-4 ml-auto opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 p-0">
          {events.map(event => (
            <DropdownMenuItem
              key={event.url}
              className={`flex items-center gap-2 px-3 py-2 text-sm ${currentEvent?.url === event.url ? "bg-accent font-semibold" : ""}`}
              onClick={() => handleEventClick(event.url)}
            >
              <event.icon className="w-4 h-4" />
              <span className="flex-1 truncate text-left">{event.name}</span>
              {event.role && (
                <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold">
                  {event.role}
                </span>
              )}
              {currentEvent?.url === event.url && <Check className="w-4 h-4 text-primary ml-auto" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
