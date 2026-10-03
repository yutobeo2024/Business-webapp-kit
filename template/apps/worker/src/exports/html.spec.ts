import { describe, expect, it } from "vitest";
import { escapeHtml, html } from "@app/server";
import { purchaseRequestHtml } from "./templates/purchase-request.js";

describe("html", () => {
  it("escape mọi giá trị chèn vào, kể cả trong thuộc tính", () => {
    const name = `<img src=x onerror="alert(1)">'&`;
    expect(html`<td title="${name}">${name}</td>`.value).toBe(
      `<td title="&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&#39;&amp;">&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&#39;&amp;</td>`,
    );
  });

  it("lồng html không bị escape hai lần; mảng nối lại; null/undefined/false bỏ qua", () => {
    const rows = ["a<b", "c"].map((x) => html`<li>${x}</li>`);
    expect(
      html`<ul>
        ${rows}${null}${undefined}${false}
      </ul>`.value.replace(/\s+/g, ""),
    ).toBe("<ul><li>a&lt;b</li><li>c</li></ul>");
    expect(html`${0}`.value).toBe("0");
  });

  it("escapeHtml", () => expect(escapeHtml(`"<&>'`)).toBe("&quot;&lt;&amp;&gt;&#39;"));

  it("mẫu in phiếu: dữ liệu người dùng nhập không thành thẻ HTML", () => {
    const doc = purchaseRequestHtml({
      pr: {
        id: "x",
        code: "PR-2026-000001",
        title: "<script>alert(1)</script>",
        departmentId: "d",
        requesterId: "u",
        status: "DRAFT",
        totalAmount: 1_250_000,
        items: [{ name: "</td><img src=x>", quantity: 1, unitPrice: 1_250_000 }],
        note: null,
        rejectReason: null,
        version: 1,
        deletedAt: null,
        createdAt: new Date("2026-01-31T17:30:00Z"),
        updatedAt: new Date("2026-01-31T17:30:00Z"),
      },
      requesterName: "Nguyễn Văn A",
      departmentName: "Kinh doanh",
      printedAt: new Date("2026-02-01T01:00:00Z"),
    }).value;
    expect(doc).not.toContain("<script>");
    expect(doc).not.toContain("<img");
    expect(doc).toContain("&lt;script&gt;");
    expect(doc).toContain("01/02/2026"); // ngày theo giờ Việt Nam
    expect(doc).toMatch(/1\.250\.000\s₫/);
  });
});
