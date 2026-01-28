"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type ModalVariant = "dialog" | "sheet" | "drawer"

type ModalContextValue = {
  variant: ModalVariant
}

const ModalContext = React.createContext<ModalContextValue | null>(null)

function useModalContext() {
  const context = React.useContext(ModalContext)
  if (!context) {
    throw new Error("Modal components must be used within <Modal>.")
  }
  return context
}

type ModalRootProps = {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  desktopVariant?: "dialog" | "sheet"
  mobileVariant?: "drawer" | "dialog"
}

function Modal({
  children,
  open,
  defaultOpen,
  onOpenChange,
  desktopVariant = "sheet",
  mobileVariant = "drawer",
}: ModalRootProps) {
  const isMobile = useIsMobile()
  const variant = isMobile ? mobileVariant : desktopVariant

  const rootProps = { open, defaultOpen, onOpenChange }

  if (variant === "dialog") {
    return (
      <ModalContext.Provider value={{ variant }}>
        <Dialog {...rootProps}>{children}</Dialog>
      </ModalContext.Provider>
    )
  }

  if (variant === "sheet") {
    return (
      <ModalContext.Provider value={{ variant }}>
        <Sheet {...rootProps}>{children}</Sheet>
      </ModalContext.Provider>
    )
  }

  return (
    <ModalContext.Provider value={{ variant }}>
      <Drawer {...rootProps}>{children}</Drawer>
    </ModalContext.Provider>
  )
}

type ModalTriggerProps = React.ComponentPropsWithoutRef<"button"> & {
  render?: React.ReactNode
  asChild?: boolean
}

function ModalTrigger({ render, asChild, children, ...props }: ModalTriggerProps) {
  const { variant } = useModalContext()
  const triggerElement = React.useMemo(
    () => (render ? React.isValidElement(render) ? render : <span>{render}</span> : undefined),
    [render]
  )

  if (variant === "dialog") {
    return triggerElement ? (
      <DialogTrigger render={triggerElement} {...props} />
    ) : (
      <DialogTrigger {...props}>{children}</DialogTrigger>
    )
  }

  if (variant === "sheet") {
    return triggerElement ? (
      <SheetTrigger render={triggerElement} {...props} />
    ) : (
      <SheetTrigger {...props}>{children}</SheetTrigger>
    )
  }

  if (triggerElement) {
    return (
      <DrawerTrigger asChild {...props}>
        {triggerElement}
      </DrawerTrigger>
    )
  }

  return (
    <DrawerTrigger asChild={asChild} {...props}>
      {children}
    </DrawerTrigger>
  )
}

type ModalCloseProps = React.ComponentPropsWithoutRef<"button"> & {
  render?: React.ReactNode
  asChild?: boolean
}

function ModalClose({ render, asChild, children, ...props }: ModalCloseProps) {
  const { variant } = useModalContext()
  const closeElement = React.useMemo(
    () => (render ? React.isValidElement(render) ? render : <span>{render}</span> : undefined),
    [render]
  )

  if (variant === "dialog") {
    return closeElement ? (
      <DialogClose render={closeElement} {...props} />
    ) : (
      <DialogClose {...props}>{children}</DialogClose>
    )
  }

  if (variant === "sheet") {
    return closeElement ? (
      <SheetClose render={closeElement} {...props} />
    ) : (
      <SheetClose {...props}>{children}</SheetClose>
    )
  }

  if (closeElement) {
    return (
      <DrawerClose asChild {...props}>
        {closeElement}
      </DrawerClose>
    )
  }

  return (
    <DrawerClose asChild={asChild} {...props}>
      {children}
    </DrawerClose>
  )
}

type ModalContentProps = React.ComponentProps<"div"> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}

function ModalContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: ModalContentProps) {
  const { variant } = useModalContext()
  const baseClasses = "flex max-h-[100dvh] min-h-0 flex-col overflow-hidden"

  if (variant === "dialog") {
    return (
      <DialogContent
        showCloseButton={showCloseButton}
        className={cn(
          "w-full sm:w-3/5 sm:max-w-none p-0 gap-0 flex flex-col bg-popover text-popover-foreground rounded-l-xl",
          baseClasses,
          className
        )}
        {...props}
      >
        {children}
      </DialogContent>
    )
  }

  if (variant === "sheet") {
    return (
      <SheetContent
        side={side}
        showCloseButton={showCloseButton}
        className={cn(
          "w-full data-[side=left]:w-full data-[side=right]:w-full sm:data-[side=left]:w-3/5 sm:data-[side=right]:w-3/5 data-[side=left]:sm:max-w-none data-[side=right]:sm:max-w-none max-w-none p-0 gap-0 bg-popover text-popover-foreground rounded-l-xl",
          baseClasses,
          className
        )}
        {...props}
      >
        {children}
      </SheetContent>
    )
  }

  return (
    <DrawerContent
      className={cn(
        "gap-0 bg-popover text-popover-foreground rounded-l-xl",
        baseClasses,
        className
      )}
      {...props}
    >
      {children}
    </DrawerContent>
  )
}

function ModalHeader({
  className,
  showCloseButton,
  children,
  ...props
}: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  const { variant } = useModalContext()
  const headerClasses = cn("p-4", className)

  if (variant === "dialog") {
    return (
      <DialogHeader className={headerClasses} {...props}>
        {children}
      </DialogHeader>
    )
  }

  if (variant === "sheet") {
    return (
      <SheetHeader className={headerClasses} {...props}>
        {children}
      </SheetHeader>
    )
  }

  const shouldShowClose = showCloseButton ?? true

  return (
    <DrawerHeader className={headerClasses} {...props}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">{children}</div>
        {shouldShowClose && (
          <DrawerClose asChild>
            <Button size="icon-sm" variant="ghost">
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </DrawerClose>
        )}
      </div>
    </DrawerHeader>
  )
}

type ModalTitleProps = React.ComponentPropsWithoutRef<"h2">

function ModalTitle({ ...props }: ModalTitleProps) {
  const { variant } = useModalContext()

  if (variant === "dialog") {
    return <DialogTitle {...props} />
  }

  if (variant === "sheet") {
    return <SheetTitle {...props} />
  }

  return <DrawerTitle {...props} />
}

type ModalDescriptionProps = React.ComponentPropsWithoutRef<"p">

function ModalDescription({ ...props }: ModalDescriptionProps) {
  const { variant } = useModalContext()

  if (variant === "dialog") {
    return <DialogDescription {...props} />
  }

  if (variant === "sheet") {
    return <SheetDescription {...props} />
  }

  return <DrawerDescription {...props} />
}

function ModalBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex-1 space-y-4 overflow-y-auto p-4", className)} {...props} />
}

function ModalFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-auto p-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function ModalForm({ className, ...props }: React.ComponentProps<"form">) {
  return <form className={cn("flex flex-1 min-h-0 flex-col", className)} {...props} />
}

function ModalGrid({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)} {...props} />
}

export {
  Modal,
  ModalTrigger,
  ModalClose,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  ModalForm,
  ModalGrid,
}
