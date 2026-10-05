import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/cn";

/** Ô logo mặc định: chữ viết tắt của ứng dụng trên nền màu thương hiệu (`brand.json`). */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary text-[13px] font-bold tracking-wide text-primary-foreground",
        className,
      )}
    >
      {BRAND.shortName}
    </span>
  );
}
