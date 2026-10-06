import { X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import { type ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { Field } from "./field";
import { Textarea } from "./input";

/**
 * Hộp thoại (Radix Dialog): khóa nền, Esc để đóng, focus nằm trong hộp thoại. Trên điện thoại hiện sát đáy, rộng hết
 * màn hình. Bấm ra ngoài KHÔNG đóng (tránh mất dữ liệu đang nhập); đóng bằng nút X, Esc hoặc nút Hủy.
 * Thay cho window.confirm/prompt (không tùy biến được, không test ổn định, chặn cả trang).
 */
export function Dialog({
  open,
  title,
  description,
  onClose,
  size = "md",
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  size?: "md" | "lg";
  children: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  return (
    <RadixDialog.Root open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <RadixDialog.Content
          aria-describedby={undefined}
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => {
            // Vào thẳng ô nhập hoặc nút đầu tiên của nội dung (như <dialog> gốc), không dừng ở nút X.
            const first = body.current?.querySelector<HTMLElement>(
              "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]",
            );
            if (first) {
              e.preventDefault();
              first.focus();
            }
          }}
          className={cn(
            "fixed z-50 flex max-h-[92dvh] w-full flex-col bg-popover text-popover-foreground shadow-pop outline-none",
            "inset-x-0 bottom-0 rounded-t-2xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
            size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg",
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <RadixDialog.Title className="text-base font-bold text-heading">{title}</RadixDialog.Title>
              {description ? <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p> : null}
            </div>
            <RadixDialog.Close
              aria-label="Tắt hộp thoại"
              className="-mt-1 -mr-2 grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-heading"
            >
              <X aria-hidden className="size-4" />
            </RadixDialog.Close>
          </div>
          <div ref={body} className="space-y-4 overflow-y-auto px-5 py-4">
            {children}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** Hàng nút cuối hộp thoại: trên điện thoại nút chính nằm dưới cùng và rộng hết. */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">{children}</div>;
}

/**
 * Xác nhận thao tác không hoàn tác được (rule frontend: nêu rõ hậu quả). `reason`: bắt nhập lý do, kiểm bằng
 * `reason.validate` (thường gọi schema Zod ở shared) để người dùng thấy đúng câu lỗi trước khi gửi.
 */
export function ConfirmDialog(props: ConfirmDialogProps) {
  // Nội dung chỉ mount khi mở: lý do đã gõ và lỗi tự xóa mỗi lần mở lại.
  return (
    <Dialog open={props.open} title={props.title} onClose={props.onClose}>
      <ConfirmBody {...props} />
    </Dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  reason?: { label: string; validate: (text: string) => string | null };
  pending?: boolean;
  onConfirm: (reason: string | undefined) => void;
  onClose: () => void;
}

function ConfirmBody({
  message,
  confirmLabel = "Xác nhận",
  destructive = false,
  reason,
  pending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    if (reason) {
      const err = reason.validate(text);
      if (err) return setError(err);
    }
    onConfirm(reason ? text : undefined);
  };
  return (
    <>
      <p className="text-sm text-foreground">{message}</p>
      {reason ? (
        <Field label={reason.label} error={error ?? undefined}>
          <Textarea value={text} aria-invalid={Boolean(error)} onChange={(e) => setText(e.target.value)} />
        </Field>
      ) : null}
      <DialogActions>
        <Button variant="ghost" onClick={onClose} disabled={pending}>
          Hủy bỏ
        </Button>
        <Button variant={destructive ? "destructive" : "default"} onClick={submit} disabled={pending}>
          {pending ? "Đang xử lý..." : confirmLabel}
        </Button>
      </DialogActions>
    </>
  );
}
