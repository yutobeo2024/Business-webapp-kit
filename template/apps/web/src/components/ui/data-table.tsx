import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import type { SortOrder } from "@app/shared";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { EmptyState, Skeleton } from "./empty-state";

/**
 * Khung bảng dữ liệu có đủ trạng thái đang tải / lỗi (kèm thử lại) / rỗng (rule frontend: mọi danh sách phải có đủ).
 * Nội dung bảng (thead, tbody) do trang tự vẽ trong `children`; kiểu hàng, tiêu đề, ô đặt sẵn ở đây nên trang chỉ cần
 * `<td className="p-3">`. Bảng rộng hơn màn hình thì cuộn ngang TRONG khung, trang không cuộn ngang.
 */
export function DataTable({
  isPending,
  error,
  onRetry,
  isEmpty,
  emptyText = "Không có dữ liệu.",
  children,
}: {
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  isEmpty: boolean;
  emptyText?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-border bg-card shadow-card">
      {isPending ? (
        <div className="space-y-3 p-5">
          <p className="sr-only">Đang tải...</p>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : error ? (
        <p role="alert" className="p-6 text-sm text-destructive">
          Không tải được dữ liệu.{" "}
          <button className="font-semibold underline underline-offset-2" onClick={onRetry}>
            Thử lại
          </button>
        </p>
      ) : isEmpty ? (
        <EmptyState title={emptyText} />
      ) : (
        <table
          className={cn(
            "w-full text-sm",
            "[&_thead]:border-b [&_thead]:border-border [&_thead]:bg-muted/60",
            "[&_th]:text-[13px] [&_th]:whitespace-nowrap [&_th]:text-muted-foreground",
            "[&_tbody_tr]:border-b [&_tbody_tr]:border-border [&_tbody_tr:last-child]:border-0",
            "[&_tbody_tr:hover]:bg-muted/50",
            // Ô không tự ngắt dòng (tên, mã, tiền, ngày, nút): bảng rộng thì cuộn trong khung. Cột chữ dài tự thêm
            // `whitespace-normal min-w-56` ở trang.
            "[&_td:not(.whitespace-normal)]:whitespace-nowrap",
          )}
        >
          {children}
        </table>
      )}
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("p-3 text-left font-semibold", className)}>{children}</th>;
}

/** Tiêu đề cột bấm để sắp xếp: bấm lần đầu giảm dần, bấm lại đảo chiều. `aria-sort` cho trình đọc màn hình. */
export function SortTh<S extends string>({
  field,
  label,
  sort,
  order,
  onSort,
  className,
}: {
  field: S;
  label: string;
  sort: S;
  order: SortOrder;
  onSort: (sort: S, order: SortOrder) => void;
  className?: string;
}) {
  const active = sort === field;
  const Icon = active ? (order === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
  return (
    <th
      className={cn("p-3 text-left font-semibold", className)}
      aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        className={cn(
          "-my-2.5 inline-flex min-h-10 items-center gap-1 hover:text-heading",
          active && "text-heading",
        )}
        onClick={() => onSort(field, active && order === "desc" ? "asc" : "desc")}
      >
        {label}
        <Icon aria-hidden className={cn("size-3.5", !active && "text-faint")} />
      </button>
    </th>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize && page === 1) {
    return <p className="num text-[13px] text-muted-foreground">{total} dòng</p>;
  }
  return (
    <nav aria-label="Phân trang" className="flex flex-wrap items-center gap-2 text-[13px]">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft aria-hidden />
        Trang trước
      </Button>
      <span className="num text-muted-foreground">
        Trang {page} / {pages} · {total} dòng
      </span>
      <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Trang sau
        <ChevronRight aria-hidden />
      </Button>
    </nav>
  );
}
