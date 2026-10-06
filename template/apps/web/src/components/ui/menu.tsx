import { DropdownMenu as RadixMenu, Tooltip as RadixTooltip } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Menu thả (Radix): mở bằng chuột, bàn phím, chạm; tự đóng khi chọn. Dùng cho menu tài khoản, menu ba chấm của hàng. */
export const DropdownMenu = RadixMenu.Root;
export const DropdownMenuTrigger = RadixMenu.Trigger;

export function DropdownMenuContent({ className, ...props }: ComponentProps<typeof RadixMenu.Content>) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        sideOffset={6}
        align="end"
        className={cn(
          "z-50 min-w-48 rounded-xl border border-border bg-popover p-1.5 text-sm text-popover-foreground shadow-pop",
          className,
        )}
        {...props}
      />
    </RadixMenu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: ComponentProps<typeof RadixMenu.Item> & { destructive?: boolean }) {
  return (
    <RadixMenu.Item
      className={cn(
        "flex min-h-9 cursor-default items-center gap-2.5 rounded-lg px-2.5 py-1.5 outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground",
        destructive && "text-destructive [&_svg]:text-destructive",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return <RadixMenu.Label className="px-2.5 py-1.5 text-[13px]">{children}</RadixMenu.Label>;
}

export function DropdownMenuSeparator() {
  return <RadixMenu.Separator className="my-1.5 h-px bg-border" />;
}

/** Chú thích khi rê chuột hoặc focus (nút chỉ có icon, menu đã thu gọn). Nút vẫn phải có `aria-label`. */
export function Tooltip({
  label,
  side = "right",
  children,
}: {
  label: string;
  side?: "top" | "right" | "bottom" | "left";
  children: ReactNode;
}) {
  return (
    <RadixTooltip.Provider delayDuration={200}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={8}
            className="z-50 rounded-md bg-heading px-2 py-1 text-xs font-medium text-card shadow-pop"
          >
            {label}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
