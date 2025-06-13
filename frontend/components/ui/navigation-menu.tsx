import * as React from "react"
import {
  NavigationMenu as RadixNavigationMenu,
  NavigationMenuList as RadixNavigationMenuList,
  NavigationMenuItem as RadixNavigationMenuItem,
  NavigationMenuLink as RadixNavigationMenuLink,
  NavigationMenuTrigger as RadixNavigationMenuTrigger,
  NavigationMenuContent as RadixNavigationMenuContent,
} from "@radix-ui/react-navigation-menu"
import { cn } from "@/lib/utils"

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof RadixNavigationMenu>,
  React.ComponentPropsWithoutRef<typeof RadixNavigationMenu>
>(({ className, ...props }, ref) => (
  <RadixNavigationMenu
    ref={ref}
    className={cn("relative z-10 flex flex-1 justify-center", className)}
    {...props}
  />
))
NavigationMenu.displayName = "NavigationMenu"

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof RadixNavigationMenuList>,
  React.ComponentPropsWithoutRef<typeof RadixNavigationMenuList>
>(({ className, ...props }, ref) => (
  <RadixNavigationMenuList
    ref={ref}
    className={cn("flex gap-6", className)}
    {...props}
  />
))
NavigationMenuList.displayName = "NavigationMenuList"

const NavigationMenuItem = RadixNavigationMenuItem
const NavigationMenuLink = React.forwardRef<
  React.ElementRef<typeof RadixNavigationMenuLink>,
  React.ComponentPropsWithoutRef<typeof RadixNavigationMenuLink>
>(({ className, ...props }, ref) => (
  <RadixNavigationMenuLink
    ref={ref}
    className={cn("font-semibold hover:text-yellow-300 transition px-3 py-2 rounded flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-400", className)}
    {...props}
  />
))
NavigationMenuLink.displayName = "NavigationMenuLink"

const NavigationMenuTrigger = RadixNavigationMenuTrigger
const NavigationMenuContent = RadixNavigationMenuContent

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
  NavigationMenuContent,
} 