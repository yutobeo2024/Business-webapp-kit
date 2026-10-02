import { useState } from "react";
import {
  PR_EVENT_LABELS,
  PR_STATUS_LABELS,
  type PrEvent,
  type PrStatus,
  type PurchaseRequestDto,
} from "@app/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { formatDateTime, formatVnd } from "@/lib/format";
import { usePurchaseRequests, useTransition } from "./api";
import { CreatePurchaseRequestForm } from "./create-form";

const STATUS_STYLE: Record<PrStatus, string> = {
  DRAFT: "bg-neutral-100 text-neutral-700",
  PENDING_MANAGER: "bg-amber-100 text-amber-800",
  PENDING_DIRECTOR: "bg-orange-100 text-orange-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-neutral-200 text-neutral-500",
};

// Thao tác không hoàn tác được phải xác nhận, nêu rõ hậu quả.
const CONFIRM: Partial<Record<PrEvent, string>> = {
  CANCEL: "Hủy phiếu? Phiếu đã hủy không khôi phục được.",
  MANAGER_APPROVE: "Duyệt phiếu này?",
  DIRECTOR_APPROVE: "Duyệt phiếu này?",
};

function Actions({ pr }: { pr: PurchaseRequestDto }) {
  const t = useTransition();
  const run = (event: PrEvent) => {
    let reason: string | undefined;
    if (event === "REJECT") {
      reason = window.prompt("Lý do từ chối (tối thiểu 10 ký tự):") ?? undefined;
      if (!reason) return;
    } else if (CONFIRM[event] && !window.confirm(CONFIRM[event])) return;
    t.mutate({ id: pr.id, event, version: pr.version, reason });
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {pr.allowedEvents.map((e) => (
        <Button
          key={e}
          size="sm"
          variant={e === "REJECT" || e === "CANCEL" ? "outline" : "default"}
          disabled={t.isPending}
          onClick={() => run(e)}
        >
          {PR_EVENT_LABELS[e]}
        </Button>
      ))}
      {t.error ? (
        <span role="alert" className="text-sm text-red-600">
          {t.error instanceof ApiError ? t.error.message : "Có lỗi xảy ra"}
        </span>
      ) : null}
    </div>
  );
}

export function PurchaseRequestListPage() {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const q = usePurchaseRequests({ page });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Phiếu đề nghị mua hàng</h1>
        {!showForm ? <Button onClick={() => setShowForm(true)}>Lập phiếu</Button> : null}
      </div>
      {showForm ? <CreatePurchaseRequestForm onDone={() => setShowForm(false)} /> : null}
      <Card className="overflow-x-auto p-0">
        {q.isPending ? (
          <p className="p-6 text-sm text-neutral-500">Đang tải...</p>
        ) : q.isError ? (
          <p role="alert" className="p-6 text-sm text-red-600">
            Không tải được danh sách.{" "}
            <button className="underline" onClick={() => q.refetch()}>
              Thử lại
            </button>
          </p>
        ) : q.data.items.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500">Chưa có phiếu nào.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-neutral-50 text-left">
              <tr>
                <th className="p-3">Mã phiếu</th>
                <th className="p-3">Tiêu đề</th>
                <th className="p-3">Người lập</th>
                <th className="p-3 text-right">Tổng tiền</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Ngày lập</th>
                <th className="p-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {q.data.items.map((pr) => (
                <tr key={pr.id} className="border-b last:border-0 align-top">
                  <td className="p-3 font-mono">{pr.code}</td>
                  <td className="p-3">
                    {pr.title}
                    {pr.rejectReason ? (
                      <p className="mt-1 text-xs text-red-600">Lý do từ chối: {pr.rejectReason}</p>
                    ) : null}
                  </td>
                  <td className="p-3">{pr.requesterName}</td>
                  <td className="p-3 text-right tabular-nums">{formatVnd(pr.totalAmount)}</td>
                  <td className="p-3">
                    <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLE[pr.status]}`}>
                      {PR_STATUS_LABELS[pr.status]}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">{formatDateTime(pr.createdAt)}</td>
                  <td className="p-3">
                    <Actions pr={pr} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {q.data && q.data.total > q.data.pageSize ? (
        <div className="flex items-center gap-2 text-sm">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Trang trước
          </Button>
          <span>
            Trang {page} / {Math.ceil(q.data.total / q.data.pageSize)}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page * q.data.pageSize >= q.data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Trang sau
          </Button>
        </div>
      ) : null}
    </div>
  );
}
