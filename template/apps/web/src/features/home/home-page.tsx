import { Link, useNavigate } from "@tanstack/react-router";
import { BellOff, ChevronRight } from "lucide-react";
import { formatDateTime } from "@app/shared";
import type { NavItem } from "@/app/nav";
import { buttonVariants } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page";
import { useMe } from "@/features/auth/use-me";
import { useMarkRead, useNotifications } from "@/features/notifications/api";

/**
 * Trang chủ (lõi): lời chào, thông báo chưa đọc gần nhất, lối tắt tới các mục người dùng được dùng. Module nghiệp vụ thêm
 * lối tắt của mình qua menu (`src/app/nav.ts`); ô số liệu của nghiệp vụ dùng `StatCard` đặt ngay dưới lời chào.
 */
export function HomePage({ links }: { links: NavItem[] }) {
  const me = useMe();
  const unread = useNotifications({ page: 1, pageSize: 5, unread: true });
  const markRead = useMarkRead();
  const navigate = useNavigate();
  const items = unread.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Xin chào ${me.data?.fullName ?? ""}`}
        description={
          unread.data
            ? items.length
              ? "Có thông báo đang chờ bạn xem."
              : "Bạn đã xem hết thông báo."
            : undefined
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SectionCard
          title="Thông báo chưa đọc"
          action={
            <Link to="/notifications" className={buttonVariants({ variant: "link" })}>
              Xem tất cả
            </Link>
          }
        >
          {unread.isPending ? (
            <div className="space-y-2">
              <p className="sr-only">Đang tải...</p>
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : null}
          {unread.data && items.length === 0 ? (
            <EmptyState icon={BellOff} title="Không có thông báo chưa đọc." className="py-6" />
          ) : null}
          {items.length ? (
            <ul className="-mx-2 divide-y divide-border">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className="block w-full rounded-lg px-2 py-3 text-left hover:bg-muted"
                    onClick={() => {
                      markRead.mutate(n.id);
                      if (n.link) void navigate({ href: n.link });
                    }}
                  >
                    <span className="block font-semibold text-heading">{n.title}</span>
                    <span className="block text-foreground">{n.body}</span>
                    <span className="num block text-xs text-muted-foreground">
                      {formatDateTime(n.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </SectionCard>

        {links.length ? (
          <SectionCard title="Lối tắt">
            <ul className="-mx-2">
              {links.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-2 font-medium text-heading hover:bg-muted"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-text">
                      <l.icon aria-hidden className="size-4" />
                    </span>
                    {l.label}
                    <ChevronRight aria-hidden className="ml-auto size-4 text-faint" />
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
