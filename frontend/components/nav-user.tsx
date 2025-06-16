"use client"

import React from "react"
import Link from "next/link"
import {
  BadgeCheck,
  ChevronsUpDown,
  LogOut,
  Sparkles,
  Moon,
  Sun,
  Settings2,
  Users,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/router"
import { UserContext } from "@/pages/_app"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
    roles?: string[]
  }
}) {
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const isSuperAdmin = user.roles?.includes("SuperAdmin")
  const router = useRouter()
  const { setUser } = React.useContext(UserContext)
  const [loggingOut, setLoggingOut] = React.useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/logout", {
        method: "POST",
        credentials: "include",
      })
    } catch {
      // Ignore errors
    }
    setUser(null)
    setLoggingOut(false)
    router.push("/login")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {(() => {
                let avatarSrc = user.avatar;
                if (avatarSrc && avatarSrc.startsWith("/")) {
                  avatarSrc = apiUrl + avatarSrc;
                }
                return (
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={avatarSrc} alt={user.name} />
                    <AvatarFallback className="rounded-lg">{user.name ? user.name[0] : "CN"}</AvatarFallback>
                  </Avatar>
                );
              })()}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                {(() => {
                  let avatarSrc = user.avatar;
                  if (avatarSrc && avatarSrc.startsWith("/")) {
                    avatarSrc = apiUrl + avatarSrc;
                  }
                  return (
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={avatarSrc} alt={user.name} />
                      <AvatarFallback className="rounded-lg">{user.name ? user.name[0] : "CN"}</AvatarFallback>
                    </Avatar>
                  );
                })()}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <BadgeCheck />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile/settings">
                  <Settings2 />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile/events">
                  <Users />
                  My Events
                </Link>
              </DropdownMenuItem>
              {isSuperAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/admin/dashboard">
                    <Sparkles />
                    System Admin Dashboard
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <div className="flex items-center w-full" tabIndex={-1} role="menuitem">
                  {theme === "dark" ? <Sun className="mr-2" /> : <Moon className="mr-2" />}
                  <span className="flex-1">Dark Mode</span>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    aria-label="Toggle dark mode"
                  />
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button type="button" onClick={handleLogout} disabled={loggingOut} className="flex items-center w-full">
                <LogOut />
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
