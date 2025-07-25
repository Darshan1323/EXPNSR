"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

// Root remains unchanged
const Popover = PopoverPrimitive.Root;

// ✅ Forward ref on Trigger
const PopoverTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <PopoverPrimitive.Trigger ref={ref} className={className} {...props} />
));
PopoverTrigger.displayName = "PopoverTrigger";

// ✅ Forward ref on Content
const PopoverContent = React.forwardRef(
  ({ className, align = "center", sideOffset = 4, ...props }, ref) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-[--radix-popover-content-transform-origin] rounded-md border p-4 shadow-md outline-none",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
);
PopoverContent.displayName = "PopoverContent";

// ✅ Forward ref on Anchor
const PopoverAnchor = React.forwardRef(({ className, ...props }, ref) => (
  <PopoverPrimitive.Anchor ref={ref} className={className} {...props} />
));
PopoverAnchor.displayName = "PopoverAnchor";

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
