import { EXPORT_STATUS_LABELS, type ExportStatus, formatDateTime } from "@app/shared";
import { buttonVariants } from "@/components/ui/button";
import { DataTable, Th } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page";
import { exportDownloadUrl, useMyExports } from "./api";

const TONE: Record<ExportStatus, Parameters<typeof Badge>[0]["tone"]> = {
  QUEUED: "neutral",
  RUNNING: "amber",
  DONE: "green",
  FAILED: "red",
};

/** Tệp đã xuất của chính người dùng (spec 002). Tệp tải được đến khi hết hạn, sau đó cần xuất lại. */
export function ExportsPage() {
  const q = useMyExports();
  return (
    <div className="space-y-5">
      <PageHeader
        title="Tệp đã xuất"
        description="20 lần xuất gần nhất của bạn. Tệp tự xóa khi hết hạn tải về."
      />
      <DataTable
        isPending={q.isPending}
        error={q.error}
        onRetry={() => void q.refetch()}
        isEmpty={q.data?.length === 0}
        emptyText="Bạn chưa xuất tệp nào."
      >
        <thead>
          <tr>
            <Th>Loại</Th>
            <Th>Trạng thái</Th>
            <Th>Yêu cầu lúc</Th>
            <Th>Hết hạn</Th>
            <Th>Tệp</Th>
          </tr>
        </thead>
        <tbody>
          {q.data?.map((e) => (
            <tr key={e.id} className="align-top">
              <td className="p-3">
                {e.label}
                {e.rowCount !== null && e.type.endsWith(".xlsx") ? (
                  <span className="block text-xs text-muted-foreground">{e.rowCount} dòng</span>
                ) : null}
              </td>
              <td className="p-3">
                <Badge tone={TONE[e.status]}>{EXPORT_STATUS_LABELS[e.status]}</Badge>
                {e.error ? <p className="mt-1 text-xs text-destructive">{e.error}</p> : null}
              </td>
              <td className="p-3 whitespace-nowrap">{formatDateTime(e.createdAt)}</td>
              <td className="p-3 whitespace-nowrap">{e.expiresAt ? formatDateTime(e.expiresAt) : ""}</td>
              <td className="p-3">
                {e.downloadable ? (
                  <a className={buttonVariants({ variant: "link" })} href={exportDownloadUrl(e.id)} download>
                    Tải {e.fileName}
                  </a>
                ) : e.status === "DONE" ? (
                  <span className="text-muted-foreground">Đã hết hạn</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}
