import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("min-w-0 rounded-xl border border-border bg-card p-5 shadow-card", className)}
      {...props}
    />
  );
}

/** Thẻ có tiêu đề: tiêu đề bên trái, hành động (liên kết "Xem tất cả", nút) bên phải, mô tả ngắn bên dưới. */
export function SectionCard({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold">{title}</h2>
          {description ? <p className="text-[13px] text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}
