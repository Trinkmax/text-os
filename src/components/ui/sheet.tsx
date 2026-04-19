"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

export const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-bg-1 border-[color:var(--border)] shadow-[var(--shadow-hover)] transition ease-out duration-300 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top:
          "inset-x-0 top-0 border-b rounded-b-2xl pt-[max(env(safe-area-inset-top),0.75rem)] data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top",
        bottom:
          "inset-x-0 bottom-0 border-t rounded-t-2xl pb-[max(env(safe-area-inset-bottom),0.75rem)] data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
        left:
          "inset-y-0 left-0 h-[100dvh] w-[86vw] max-w-sm border-r pl-[env(safe-area-inset-left)] data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
        right:
          "inset-y-0 right-0 h-[100dvh] w-[92vw] max-w-md border-l pr-[env(safe-area-inset-right)] data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
      },
    },
    defaultVariants: { side: "right" },
  }
);

type SheetContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> &
  VariantProps<typeof sheetVariants> & { hideClose?: boolean };

export const SheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  ({ className, children, side = "right", hideClose, ...props }, ref) => (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), "flex flex-col", className)} {...props}>
        {children}
        {!hideClose && (
          <DialogPrimitive.Close className="absolute right-3 top-3 rounded-full p-2 text-fg-3 hover:bg-bg-3 hover:text-fg focus:outline-none focus:ring-2 focus:ring-brand-2/30">
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </SheetPortal>
  )
);
SheetContent.displayName = "SheetContent";

export const SheetHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1 px-5 pt-5 pb-3 border-b border-[color:var(--border)]", className)} {...p} />
);
export const SheetFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "mt-auto flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-4 border-t border-[color:var(--border)]",
      className
    )}
    {...p}
  />
);
export const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Title ref={ref as never} className={cn("text-lg font-semibold", className)} {...props} />
  )
);
SheetTitle.displayName = "SheetTitle";
export const SheetDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Description ref={ref as never} className={cn("text-sm text-fg-3", className)} {...props} />
  )
);
SheetDescription.displayName = "SheetDescription";
