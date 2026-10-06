import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useUnreadCount } from "./api";

/** Chuông trên thanh trên: số thông báo chưa đọc, bấm để mở trang Thông báo. */
export function NotificationBell() {
  const q = useUnreadCount();
  const n = q.data?.count ?? 0;
  const label = n > 0 ? `Thông báo (${n} chưa đọc)` : "Thông báo";
  return (
    <Link
      to="/notifications"
      aria-label={label}
      title={label}
      className="relative grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-heading"
    >
      <Bell aria-hidden className="size-[18px]" />
      {n > 0 ? (
        <span className="num absolute top-0.5 right-0.5 min-w-[18px] rounded-full bg-destructive px-1 text-center text-[10.5px] leading-[18px] font-bold text-destructive-foreground ring-2 ring-card">
          {n > 99 ? "99+" : n}
        </span>
      ) : null}
    </Link>
  );
}
