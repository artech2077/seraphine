"use client"

import { useClerk, useUser, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

function getInitials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "U"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function UserMenu() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()

  const email = user?.primaryEmailAddress?.emailAddress ?? ""
  const name = user?.fullName ?? user?.firstName ?? email ?? "User"
  const initials = getInitials(name || email || "User")

  return (
    <>
      <SignedIn>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "rounded-full")}
          >
            <Avatar className="size-8">
              <AvatarImage src={user?.imageUrl} alt={name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="space-y-0.5">
                <div className="text-sm font-medium leading-none">{name}</div>
                <div className="text-muted-foreground text-xs">{email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  router.push("/app/account")
                }}
              >
                Account settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  signOut({ redirectUrl: "/" })
                }}
                variant="destructive"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SignedIn>
      <SignedOut>
        <SignInButton>
          <Button variant="outline" size="sm">
            Sign in
          </Button>
        </SignInButton>
      </SignedOut>
    </>
  )
}
