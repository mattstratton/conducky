import * as React from "react"
import * as RadixSheet from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"

const Sheet = RadixSheet.Root
const SheetTrigger = RadixSheet.Trigger
const SheetClose = RadixSheet.Close

const SheetContent = React.forwardRef<
  React.ElementRef<typeof RadixSheet.Content>,
  React.ComponentPropsWithoutRef<typeof RadixSheet.Content>
>(({ className, children, ...props }, ref) => (
  <RadixSheet.Portal>
    <RadixSheet.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
    <RadixSheet.Content
      ref={ref}
      className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 text-white shadow-lg transition-transform duration-200 flex flex-col",
        className
      )}
      {...props}
    >
      {children}
    </RadixSheet.Content>
  </RadixSheet.Portal>
))
SheetContent.displayName = RadixSheet.Content.displayName

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center justify-between px-4 py-3 border-b border-gray-800", className)} {...props} />
)
SheetHeader.displayName = "SheetHeader"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof RadixSheet.Title>,
  React.ComponentPropsWithoutRef<typeof RadixSheet.Title>
>(({ className, ...props }, ref) => (
  <RadixSheet.Title ref={ref} className={cn("font-extrabold text-xl tracking-wide flex items-center gap-2", className)} {...props} />
))
SheetTitle.displayName = RadixSheet.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof RadixSheet.Description>,
  React.ComponentPropsWithoutRef<typeof RadixSheet.Description>
>(({ className, ...props }, ref) => (
  <RadixSheet.Description ref={ref} className={cn("text-sm text-gray-400", className)} {...props} />
))
SheetDescription.displayName = RadixSheet.Description.displayName

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } 