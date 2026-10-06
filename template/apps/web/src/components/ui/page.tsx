import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { formatVnd } from "@app/shared";
import { cn } from "@/lib/cn";

/**
 * Đầu trang: đường dẫn, tiêu đề (trang chi tiết: kèm huy hiệu trạng thái qua `badges`), mô tả ngắn, nút hành động bên
 * phải (xuống dòng trên điện thoại).
 * Đường dẫn KHÔNG dùng thẻ <nav>: cả trang chỉ có một vùng điều hướng là menu bên trái.
 */
export function PageHeader({
  title,
  badges,
  description,
  breadcrumb,
  actions,
}: {
  title: string;
  badges?: ReactNode;
  description?: string;
  breadcrumb?: { label: string; to?: string }[];
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 flex-[1_1_20rem]">
        {breadcrumb?.length ? (
          <ol className="mb-1 flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
            {breadcrumb.map((b, i) => (
              <li key={b.label} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight aria-hidden className="size-3.5 text-faint" /> : null}
                {b.to ? (
                  <Link to={b.to} className="hover:text-heading hover:underline">
                    {b.label}
                  </Link>
                ) : (
                  b.label
                )}
              </li>
            ))}
          </ol>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="text-2xl leading-tight font-bold tracking-tight">{title}</h1>
          {badges}
        </div>
        {description ? <p className="mt-1 max-w-2xl text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Thanh lọc phía trên bảng: ô tìm, ô chọn, nút. Tự xuống dòng trên màn hẹp. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-end gap-3", className)}>{children}</div>;
}

/**
 * Danh sách nhãn và giá trị của một bản ghi (trang chi tiết). Hai cột trên màn rộng, một cột trên điện thoại.
 * Truyền `items`, hoặc đặt các `DescriptionItem` bên trong (tiện khi có dòng chỉ hiện theo điều kiện).
 */
export function DescriptionList({
  items = [],
  columns = 2,
  className,
  children,
}: {
  items?: { label: string; value: ReactNode; wide?: boolean }[];
  columns?: 1 | 2 | 3;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-4",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((it) => (
        <DescriptionItem key={it.label} label={it.label} wide={it.wide}>
          {it.value}
        </DescriptionItem>
      ))}
      {children}
    </dl>
  );
}

/** Một dòng của `DescriptionList`. `wide`: chiếm cả hàng (lý do, ghi chú dài). */
export function DescriptionItem({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-full")}>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium break-words text-heading">{children ?? "-"}</dd>
    </div>
  );
}

/** Một nhóm ô trong form dài: tiêu đề, mô tả, các ô xếp lưới. */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-[15px] font-bold text-heading">{title}</legend>
      {description ? <p className="text-[13px] text-muted-foreground">{description}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** Số tiền VND: chữ số thẳng cột, không bao giờ ngắt dòng giữa số và ký hiệu ₫. Trong bảng đặt ở ô `text-right`. */
export function MoneyText({ value, className }: { value: number; className?: string }) {
  return <span className={cn("num whitespace-nowrap", className)}>{formatVnd(value)}</span>;
}
