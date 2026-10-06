import { Search } from "lucide-react";
import { type InputHTMLAttributes, type SelectHTMLAttributes, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { controlClass, Input } from "./input";

/** Ô chọn (thẻ select gốc: bàn phím, trình đọc màn hình, điện thoại đều dùng được, không cần thư viện). */
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlClass, "h-10 w-auto max-w-full pr-8 pl-2.5", className)} {...props} />;
}

export function Checkbox({
  label,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string }) {
  return (
    <label className={cn("flex items-start gap-2.5 text-sm", className)}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-primary" {...props} />
      <span>{label}</span>
    </label>
  );
}

/**
 * Ô tìm kiếm: chỉ báo giá trị mới sau khi người dùng ngừng gõ (mặc định 300 ms), tránh gọi API theo từng phím.
 * Giá trị ngoài (từ URL) đổi thì ô cập nhật theo.
 */
export function SearchInput({
  value,
  onChange,
  delayMs = 300,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  delayMs?: number;
}) {
  const [text, setText] = useState(value);
  // Giá trị ngoài đổi (bấm Back, mở link): cập nhật ô ngay trong lúc render, không qua effect.
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setText(value);
  }
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <span className={cn("relative block w-full", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint"
      />
      <Input
        type="search"
        className="pl-9"
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => onChange(next), delayMs);
        }}
        {...props}
      />
    </span>
  );
}

/**
 * Màu huy hiệu theo NGHĨA, cố định cho mọi khách hàng (không theo màu thương hiệu): người dùng học một lần.
 * `green` xong/đạt, `amber` đang chờ, `orange` cần chú ý, `red` từ chối/lỗi, `blue` đang xử lý, `muted` đã đóng/nháp.
 */
const BADGE_TONES = {
  neutral: "bg-neutral/12 text-neutral",
  green: "bg-success/12 text-success",
  amber: "bg-warning/14 text-warning",
  orange: "bg-chart-3/16 text-warning",
  red: "bg-destructive/12 text-destructive",
  blue: "bg-info/12 text-info",
  primary: "bg-primary-soft text-primary-text",
  muted: "bg-muted text-muted-foreground",
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        BADGE_TONES[tone],
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
