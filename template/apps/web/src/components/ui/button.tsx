import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Dùng chung cho <button> và <Link> trông như nút: `className={buttonVariants({ variant: "outline" })}`. */
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline: "border border-border bg-card text-heading hover:border-input hover:bg-muted",
        soft: "bg-primary-soft text-primary-text hover:bg-primary-soft/70",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        ghost: "text-foreground hover:bg-muted",
        link: "px-0 font-medium text-primary-text underline-offset-4 hover:underline",
      },
      // Mặc định cao 40px: đủ lớn để chạm bằng ngón tay. `sm` chỉ dùng trong hàng của bảng và thanh công cụ dày.
      size: { default: "h-10 px-4", sm: "h-9 px-3 text-[13px]", lg: "h-11 px-6", icon: "size-10" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
