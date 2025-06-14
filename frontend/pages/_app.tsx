import React, { useEffect, useState, createContext, useContext, Dispatch, SetStateAction } from "react";
import Link from "next/link";
import "../styles.css";
import { useRouter } from "next/router";
import { ModalContext } from "../context/ModalContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import EventNavBar from "../components/EventNavBar";
import Head from "next/head";
import type { AppProps } from "next/app";
import { ReportForm } from "../components/ReportForm";
import { ThemeProvider, useTheme } from "next-themes";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from "../components/ui/navigation-menu";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "../components/ui/dropdown-menu";

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
}
export const UserContext = createContext<UserContextType>({ user: null, setUser: () => {} });

function DarkModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-full border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-yellow-400"
      title="Toggle dark mode"
      aria-label="Toggle dark mode"
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}

function UserContextDropdown({ user }: { user: User }) {
  const router = useRouter();
  const isSuperAdmin = user?.roles?.includes("SuperAdmin");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  let avatarSrc: string | undefined = undefined;
  if (user?.avatarUrl) {
    avatarSrc = user.avatarUrl.startsWith("/") ? apiUrl + user.avatarUrl : user.avatarUrl;
  }
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : user?.email
    ? user.email[0].toUpperCase()
    : "U";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white dark:bg-gray-800">
          {avatarSrc ? (
            <img src={avatarSrc} alt={user?.name || user?.email || "User avatar"} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-yellow-400 text-gray-900 font-bold text-lg">{initials}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {isSuperAdmin && (
          <DropdownMenuItem onClick={() => router.push("/admin") }>
            <span role="img" aria-label="system" className="mr-2">🦆</span> System Admin Dashboard
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => router.push("/") }>
          <span role="img" aria-label="personal" className="mr-2">👤</span> My Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/profile") }>
          <span role="img" aria-label="settings" className="mr-2">⚙️</span> Profile Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={async () => { await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/logout", { method: "POST", credentials: "include" }); window.location.href = "/"; }}>
          <span role="img" aria-label="logout" className="mr-2">🚪</span> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header() {
  const { user, setUser } = useContext(UserContext);

  useEffect(() => {
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/session",
      { credentials: "include" },
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data ? data.user : null))
      .catch(() => setUser(null));
    // Only run on mount
    // eslint-disable-next-line
  }, []);

  const handleLogout = async () => {
    await fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/logout",
      {
        method: "POST",
        credentials: "include",
      },
    );
    setUser(null);
    window.location.href = "/";
  };

  // Navigation links (role-based)
  const navLinks = [
    {
      href: "/",
      label: "Home",
      icon: (
        <svg
          className="w-5 h-5 mr-1.5 inline-block align-text-bottom"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l9-9 9 9M4 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-6 0h6"
          />
        </svg>
      ),
      show: true,
    },
    {
      href: "/admin",
      label: "Global Admin",
      icon: (
        <svg
          className="w-5 h-5 mr-1.5 inline-block align-text-bottom"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
      ),
      show: user && user.roles && user.roles.includes("SuperAdmin"),
    },
  ];

  return (
    <header className="sticky top-0 z-20 bg-gray-900 text-white shadow flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
      {/* Left: Brand & Hamburger */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="font-extrabold text-2xl tracking-wide flex items-center gap-2 hover:text-yellow-300 transition"
        >
          <span>Conducky</span>{" "}
          <span role="img" aria-label="duck">
            🦆
          </span>
        </Link>
        {/* Hamburger for mobile using SheetTrigger */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="md:hidden ml-2 p-2 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
              aria-label="Open menu"
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
          <SheetContent className="p-0 w-64 bg-gray-900 text-white">
            <SheetHeader className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <SheetTitle asChild>
                <span className="font-extrabold text-xl tracking-wide flex items-center gap-2">
                  Conducky <span role="img" aria-label="duck">🦆</span>
                </span>
              </SheetTitle>
              <SheetClose asChild>
                <button
                  className="p-2 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  aria-label="Close menu"
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
              {navLinks
                .filter((l) => l.show)
                .map((l) => (
                  <SheetClose asChild key={l.href}>
                    <Link
                      href={l.href}
                      className="py-3 px-3 rounded hover:bg-gray-800 font-semibold flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    >
                      {l.icon}
                      {l.label}
                    </Link>
                  </SheetClose>
                ))}
            </nav>
            <div className="px-4 py-2 border-t border-gray-800 flex flex-col gap-2">
              {user ? (
                <>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 group mb-2"
                  >
                    {(() => {
                      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
                      let avatarSrc: string | undefined = undefined;
                      if (user?.avatarUrl) {
                        avatarSrc = user.avatarUrl.startsWith("/")
                          ? apiUrl + user.avatarUrl
                          : user.avatarUrl;
                      }
                      return (
                        <Avatar className="border-2 border-yellow-400 group-hover:border-yellow-300 transition" style={{ width: 36, height: 36 }}>
                          <AvatarImage src={avatarSrc} alt={user?.name || user?.email || "User avatar"} />
                          <AvatarFallback>
                            {user?.name
                              ? user.name.split(" ").map(n => n[0]).join("").toUpperCase()
                              : user?.email
                                ? user.email[0].toUpperCase()
                                : "U"}
                          </AvatarFallback>
                        </Avatar>
                      );
                    })()}
                    <span className="text-sm">
                      Logged in as <b>{user.email}</b>
                      {user.name && (
                        <span className="text-gray-300"> ({user.name})</span>
                      )}
                    </span>
                  </Link>
                  <Button onClick={handleLogout} className="mt-2">
                    Logout
                  </Button>
                </>
              ) : (
                <SheetClose asChild>
                  <Link
                    href="/login"
                    className="underline font-semibold hover:text-yellow-300 transition py-2"
                  >
                    Login
                  </Link>
                </SheetClose>
              )}
              <DarkModeToggle />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      {/* Center: Desktop Nav */}
      <NavigationMenu className="hidden md:flex items-center gap-6 flex-1 justify-center">
        <NavigationMenuList>
          {navLinks.filter((l) => l.show).map((l) => (
            <NavigationMenuItem key={l.href}>
              <NavigationMenuLink asChild>
                <Link href={l.href} className="font-semibold hover:text-yellow-300 transition px-3 py-2 rounded flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-400">
                  {l.icon}
                  {l.label}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {user && <UserContextDropdown user={user} />}
        <DarkModeToggle />
      </div>
    </header>
  );
}

const MyApp: React.FC<AppProps> = ({ Component, pageProps }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventSlugForModal, setEventSlugForModal] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const router = useRouter();
  const eventSlugMatch = router.asPath.match(/^\/event\/([^/]+)/);
  const eventSlug = eventSlugMatch ? eventSlugMatch[1] : null;

  useEffect(() => {
    if (eventSlug) {
      fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/event/slug/${eventSlug}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.event) setEventName(data.event.name);
        });
      fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/events/slug/${eventSlug}/users`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : { users: [] }))
        .then((data) => {
          if (data && data.users && user) {
            const thisUser = data.users.find((u: User) => u.id === user.id);
            setUserRoles(thisUser?.roles || []);
          }
        })
        .catch(() => {
          setUserRoles([]);
        });
    } else {
      setEventName("");
      setUserRoles([]);
    }
  }, [eventSlug, user]);

  useEffect(() => {
    if (modalOpen && eventSlugForModal) {
      fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/event/slug/${eventSlugForModal}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setEventName(data && data.event ? data.event.name : eventSlugForModal))
        .catch(() => setEventName(eventSlugForModal));
    }
  }, [modalOpen, eventSlugForModal]);
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
      <UserContext.Provider value={{ user, setUser }}>
        <ModalContext.Provider value={{ openModal }}>
          <Header />
          {eventSlug && (
            <EventNavBar
              eventSlug={eventSlug}
              eventName={eventName}
              user={user}
              userRoles={userRoles}
              openReportModal={() => openModal(eventSlug, eventName)}
            />
          )}
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
                      const eventUrl = `/event/${eventSlugForModal}`;
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
          <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-10">
            <Component {...pageProps} />
          </main>
          <footer className="w-full mt-8 flex flex-col items-center justify-center px-4 py-6 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm">
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