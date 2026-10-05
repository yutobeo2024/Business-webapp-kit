import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "./card";

/** Màu của ô icon: bảng màu phân loại cố định, không phải màu trạng thái. */
const TONES = {
  brand: "bg-primary-soft text-primary-text",
  purple: "bg-chart-2/14 text-chart-2",
  amber: "bg-chart-3/16 text-warning",
  blue: "bg-chart-4/14 text-info",
  rose: "bg-chart-5/14 text-destructive",
  slate: "bg-muted text-muted-foreground",
} as const;

/**
 * Ô số liệu trên trang tổng quan: nhãn, số lớn, ghi chú (so với kỳ trước...), biểu đồ nhỏ tùy chọn.
 * `attention`: số cần xử lý ngay (quá hạn, lỗi) thì tô màu cảnh báo.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  hint,
  trend,
  attention = false,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  hint?: string;
  trend?: number[];
  attention?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", TONES[tone])}>
          <Icon aria-hidden className="size-[18px]" />
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <span
          className={cn(
            "num text-2xl leading-none font-bold whitespace-nowrap",
            attention ? "text-destructive" : "text-heading",
          )}
        >
          {value}
        </span>
        {trend && trend.length > 1 ? <Sparkline data={trend} /> : null}
      </div>
      {hint ? <p className="text-[13px] text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

/** Đường xu hướng nhỏ, chỉ để nhìn chiều lên xuống; số chính xác nằm ở ô số liệu. */
export function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const w = 72;
  const h = 28;
  const min = Math.min(...data);
  const span = Math.max(...data) - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 4) + 2;
    const y = h - 3 - ((v - min) / span) * (h - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = points.at(-1)!.split(",");
  return (
    <svg aria-hidden viewBox={`0 0 ${w} ${h}`} className={cn("h-7 w-[72px] shrink-0 text-brand", className)}>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill="currentColor" />
    </svg>
  );
}
