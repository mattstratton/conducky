import React, { useEffect, useState, createContext, Dispatch, SetStateAction } from "react";
import "../styles.css";
import { useRouter } from "next/router";
import { ModalContext } from "../context/ModalContext";
import { Button } from "@/components/ui/button";
import Head from "next/head";
import type { AppProps } from "next/app";
import { ReportForm } from "@/components/ReportForm";
import { ThemeProvider } from "next-themes";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { GlobalNavigation } from "@/components/GlobalNavigation";
import { Users } from "lucide-react";

// User context for global user state
interface User {
  id: string;
  email?: string;
  name?: string;
  roles?: string[];
  avatarUrl?: string;
}
interface UserContextType {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  sessionLoading: boolean;
}
export const UserContext = createContext<UserContextType>({ user: null, setUser: () => {}, sessionLoading: true });

interface SidebarEvent {
  name: string;
  slug: string;
  roles?: string[];
}

const MyApp: React.FC<AppProps> = ({ Component, pageProps }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventSlugForModal, setEventSlugForModal] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [events, setEvents] = useState<Array<{ name: string; url: string; icon: React.ElementType; role?: string }>>([]);
  const [globalRoles, setGlobalRoles] = useState<string[]>([]);
  const router = useRouter();
  const eventSlugMatch = router.asPath.match(/^\/events\/([^/]+)/);
  const eventSlug = eventSlugMatch ? eventSlugMatch[1] : null;

  // Restore user from session cookie on mount
  React.useEffect(() => {
    setSessionLoading(true);
    fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/session", {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
        setSessionLoading(false);
      })
      .catch(() => {
        setUser(null);
        setSessionLoading(false);
      });
  }, []); // Only run on mount
  
  // Re-check session after potential OAuth redirects
  React.useEffect(() => {
    // Check if this looks like an OAuth redirect (coming from login with no current user)
    if (!user && (router.asPath.startsWith('/dashboard') || router.asPath.startsWith('/invite/')) && router.isReady) {
      // Small delay to allow session to propagate after OAuth callback
      const timer = setTimeout(() => {
        fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/session", {
          credentials: "include",
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && data.user) {
              setUser(data.user);
            }
          })
          .catch(() => {
            // If session check fails, user stays null and will be redirected to login
          });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [user, router.asPath, router.isReady]);

  useEffect(() => {
    // Wait for router to be ready and ensure we have a valid eventSlug
    if (router.isReady && eventSlug && typeof eventSlug === 'string' && eventSlug !== '[eventSlug]') {
      if (process.env.NODE_ENV === 'development') {
        console.log('Fetching event data for slug:', eventSlug);
      }
      fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/events/slug/${eventSlug}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.event) setEventName(data.event.name);
        })
        .catch((error) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to fetch event details:', error);
          }
        });
      fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/events/slug/${eventSlug}/users`, { credentials: "include" })
        .then(() => {
          // No-op for now; events are fetched from /api/users/me/events
        })
        .catch((error) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to fetch event users:', error);
          }
          // Don't clear events here - they should persist across pages
        });
    } else {
      setEventName("");
      // Don't clear events when not in event context - events should persist
    }
  }, [router.isReady, eventSlug, user]);

  useEffect(() => {
    if (modalOpen && eventSlugForModal && typeof eventSlugForModal === 'string' && eventSlugForModal !== '[eventSlug]') {
      fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/events/slug/${eventSlugForModal}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setEventName(data && data.event ? data.event.name : eventSlugForModal))
        .catch(() => setEventName(eventSlugForModal));
    }
  }, [modalOpen, eventSlugForModal]);

  useEffect(() => {
    if (user) {
      fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/users/me/events", {
        credentials: "include",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.events)) {
            setEvents(
              data.events.map((event: SidebarEvent) => ({
                name: event.name,
                url: `/events/${event.slug}/dashboard`,
                icon: Users,
                role: event.roles && event.roles.length > 0 ? event.roles[0] : undefined,
              }))
            );
            // Also capture global roles from the same API response
            setGlobalRoles(data.globalRoles || []);
          }
        })
        .catch(() => {
          setEvents([]);
          setGlobalRoles([]);
        });
    } else {
      // Clear events and global roles when user is logged out or session is lost
      setEvents([]);
      setGlobalRoles([]);
    }
  }, [user]);

  const openModal = (slug: string, name?: string) => {
    setEventSlugForModal(slug);
    setEventName(name || "");
    setModalOpen(true);
  };
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </Head>
      <UserContext.Provider value={{ user, setUser, sessionLoading }}>
        <ModalContext.Provider value={{ openModal }}>
          <GlobalNavigation>
            <div className="flex min-h-screen flex-col">
              {user ? (
                <SidebarProvider>
                  <div className="fixed top-0 left-0 right-0 z-50 h-12 bg-background border-b flex items-center px-2">
                    <SidebarTrigger />
                    <span className="ml-3 font-bold text-lg text-yellow-500">Conducky</span>
                    <AppBreadcrumbs eventName={eventName} />
                  </div>
                  <div className="flex flex-1 pt-12 md:pt-12">
                    <AppSidebar user={{
                      name: user.name || user.email || "User",
                      email: user.email || "",
                      avatar: user.avatarUrl || "",
                      roles: user.roles || [],
                    }} events={events} globalRoles={globalRoles} />
                    <main className="flex-1 bg-background text-foreground pb-10">
                      <Component {...pageProps} />
                    </main>
                  </div>
                </SidebarProvider>
              ) : (
                <main className="flex-1 bg-background text-foreground pb-10 pt-12 md:pt-12">
                  <Component {...pageProps} />
                </main>
              )}
            </div>
          </GlobalNavigation>
          {eventSlugForModal && (
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
              <DialogContent className="max-w-lg w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                <DialogClose asChild>
                  <Button
                    className="absolute top-2 right-2 px-4 py-2 sm:px-2 sm:py-0.5 text-2xl sm:text-lg font-bold bg-gray-800 text-white border border-white dark:bg-gray-900 dark:text-white dark:border-gray-600 shadow hover:bg-gray-900 dark:hover:bg-gray-800 focus:ring-2 focus:ring-primary-500"
                  >
                    &times;
                  </Button>
                </DialogClose>
                <div className="text-gray-800">
                  <h2 className="text-xl font-bold mb-4">Submit a Report</h2>
                  <div className="text-sm mb-2 text-gray-500">
                    For event: <b>{eventName || eventSlugForModal}</b>
                  </div>
                  <ReportForm
                    eventSlug={eventSlugForModal}
                    eventName={eventName}
                    onSuccess={() => {
                      setModalOpen(false);
                      const eventUrl = `/events/${eventSlugForModal}/dashboard`;
                      if (router.asPath === eventUrl) {
                        router.reload();
                      } else {
                        router.push(eventUrl);
                      }
                    }}
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
          <footer className="w-full mt-8 flex flex-col items-center justify-center px-4 py-6 bg-background border-t border-gray-200 dark:border-gray-700 text-foreground text-sm">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 items-center justify-center">
              <span>© {new Date().getFullYear()} Conducky</span>
              <span>version {process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}</span>
              <a
                href="https://github.com/mattstratton/conducky"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                GitHub
              </a>
            </div>
          </footer>
        </ModalContext.Provider>
      </UserContext.Provider>
    </ThemeProvider>
  );
};

export default MyApp; 