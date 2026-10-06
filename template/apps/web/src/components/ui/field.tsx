import type { ReactNode } from "react";

/** Nhãn + ô nhập + gợi ý + thông báo lỗi tiếng Việt. Nhãn bọc ô nhập nên bấm vào nhãn là vào ô. */
export function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-medium text-heading">
        {label}
        {required ? (
          <span aria-hidden className="text-destructive">
            {" "}
            *
          </span>
        ) : null}
      </span>
      {children}
      {hint && !error ? <span className="block text-[13px] text-muted-foreground">{hint}</span> : null}
      {error ? <span className="block text-[13px] text-destructive">{error}</span> : null}
    </label>
  );
}
