/**
 * Mỗi loại xuất trong EXPORT_TYPES có một runner. Dữ liệu LUÔN lấy qua truy vấn dùng chung với màn hình (@app/server),
 * với quyền hiện tại của người yêu cầu: xuất không bao giờ rộng hơn thứ người đó xem được trên giao diện.
 */
import { PassThrough } from "node:stream";
import { eq } from "drizzle-orm";
import ExcelJS from "exceljs";
import { departments, type Db } from "@app/db";
import { findViewablePurchaseRequest, listPurchaseRequests } from "@app/server";
import {
  BUSINESS_TIMEZONE,
  type CurrentUser,
  type ExportParams,
  type ExportType,
  PR_STATUS_LABELS,
} from "@app/shared";
import type { PdfRenderer } from "./pdf.js";
import { purchaseRequestHtml } from "./templates/purchase-request.js";

/** Lỗi người dùng hiểu và tự xử lý được (lọc bớt, mất quyền...): ghi FAILED kèm câu này, không thử lại. */
export class ExportUserError extends Error {}

export interface ExportResult {
  buffer: Buffer;
  fileName: string;
  rowCount: number;
}

export interface RunnerContext {
  db: Db;
  actor: Pick<CurrentUser, "id" | "departmentId" | "permissions">;
  pdf: PdfRenderer;
  maxRows: number;
  now: Date;
}

type Runner<T extends ExportType> = (params: ExportParams<T>, ctx: RunnerContext) => Promise<ExportResult>;

/** "20261003-0930" theo giờ Việt Nam, để tên tệp sắp xếp được. */
function stamp(d: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: BUSINESS_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}${p.month}${p.day}-${p.hour}${p.minute}`;
}

/**
 * Excel không có múi giờ: ô ngày giờ hiển thị đúng như giá trị ghi vào. Ghi "giờ treo tường" Việt Nam (UTC+7, không có
 * giờ mùa hè) để người dùng thấy đúng giờ như trên giao diện.
 */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const vnWallClock = (d: Date): Date => new Date(d.getTime() + VN_OFFSET_MS);

const PAGE_SIZE = 1000;

const purchaseRequestsXlsx: Runner<"purchase-requests.xlsx"> = async (params, ctx) => {
  // Một snapshot nhất quán cho mọi trang (dữ liệu đổi trong lúc xuất không làm trùng/sót dòng).
  return ctx.db.transaction(
    async (tx) => {
      const query = { ...params, page: 1, pageSize: PAGE_SIZE };
      const first = await listPurchaseRequests(tx, ctx.actor, query);
      if (first.total > ctx.maxRows) {
        throw new ExportUserError(
          `Có ${first.total.toLocaleString("vi-VN")} phiếu, vượt giới hạn ${ctx.maxRows.toLocaleString("vi-VN")} dòng mỗi lần xuất. Hãy lọc bớt rồi xuất lại.`,
        );
      }

      const out = new PassThrough();
      const chunks: Buffer[] = [];
      out.on("data", (c: Buffer) => chunks.push(c));
      const done = new Promise<void>((resolve, reject) => {
        out.on("end", resolve);
        out.on("error", reject);
      });
      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: out, useStyles: true });
      const sheet = workbook.addWorksheet("Phiếu đề nghị", { views: [{ state: "frozen", ySplit: 1 }] });
      sheet.columns = [
        { header: "Mã phiếu", key: "code", width: 18 },
        { header: "Tiêu đề", key: "title", width: 40 },
        { header: "Người lập", key: "requester", width: 24 },
        { header: "Trạng thái", key: "status", width: 22 },
        { header: "Tổng tiền (VND)", key: "total", width: 18, style: { numFmt: "#,##0" } },
        { header: "Ngày lập", key: "createdAt", width: 18, style: { numFmt: "dd/mm/yyyy hh:mm" } },
        { header: "Lý do từ chối", key: "rejectReason", width: 40 },
      ];
      sheet.getRow(1).font = { bold: true };
      sheet.autoFilter = { from: "A1", to: "G1" };

      let rowCount = 0;
      let page = first;
      for (;;) {
        for (const { pr, requesterName } of page.items) {
          sheet
            .addRow({
              code: pr.code,
              title: pr.title,
              requester: requesterName,
              status: PR_STATUS_LABELS[pr.status],
              total: pr.totalAmount,
              createdAt: vnWallClock(pr.createdAt),
              rejectReason: pr.rejectReason ?? "",
            })
            .commit();
          rowCount++;
        }
        if (page.page * PAGE_SIZE >= page.total || page.items.length === 0) break;
        page = await listPurchaseRequests(tx, ctx.actor, { ...query, page: page.page + 1 });
      }
      sheet.commit();
      await workbook.commit();
      await done;
      return {
        buffer: Buffer.concat(chunks),
        fileName: `phieu-de-nghi-${stamp(ctx.now)}.xlsx`,
        rowCount,
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
};

const purchaseRequestPdf: Runner<"purchase-request.pdf"> = async (params, ctx) => {
  const found = await findViewablePurchaseRequest(ctx.db, ctx.actor, params.id);
  if (!found) throw new ExportUserError("Phiếu không còn tồn tại hoặc bạn không còn quyền xem phiếu này.");
  const [dept] = await ctx.db
    .select({ name: departments.name })
    .from(departments)
    .where(eq(departments.id, found.pr.departmentId));
  const buffer = await ctx.pdf.render(
    purchaseRequestHtml({
      pr: found.pr,
      requesterName: found.requesterName,
      departmentName: dept?.name ?? "",
      printedAt: ctx.now,
    }),
  );
  return { buffer, fileName: `${found.pr.code}.pdf`, rowCount: 1 };
};

/** Thiếu runner cho một loại trong EXPORT_TYPES: typecheck báo lỗi. */
const RUNNERS: { [T in ExportType]: Runner<T> } = {
  "purchase-requests.xlsx": purchaseRequestsXlsx,
  "purchase-request.pdf": purchaseRequestPdf,
};

export function runExportType<T extends ExportType>(
  input: { type: T; params: ExportParams<T> },
  ctx: RunnerContext,
): Promise<ExportResult> {
  return RUNNERS[input.type](input.params, ctx);
}
