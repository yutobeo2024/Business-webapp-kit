import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildImportTemplate, readImportSheet } from "./xlsx.js";
import { checkZip } from "./zip-guard.js";

async function workbook(rows: ExcelJS.CellValue[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Trang 1");
  for (const r of rows) ws.addRow(r);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe("đọc tệp nhập Excel", () => {
  it("tiêu đề không phân biệt hoa thường, thứ tự tùy ý; bỏ dòng trống; công thức lấy kết quả; chữ định dạng nối lại", async () => {
    const buf = await workbook([
      ["  TÊN PHÒNG BAN ", "Ghi chú thêm", "mã phòng ban"],
      ["Phòng Kinh doanh", "x", "kd"],
      [],
      [
        { richText: [{ text: "Phòng " }, { text: "Kế toán", font: { bold: true } }] },
        "",
        { formula: '"K"&"T"', result: "KT" },
      ],
    ]);
    const r = await readImportSheet(buf, "departments", 100);
    expect(r.fileErrors).toEqual([]);
    expect(r.rows).toEqual([
      { row: 2, values: { code: "kd", name: "Phòng Kinh doanh" } },
      { row: 4, values: { code: "KT", name: "Phòng Kế toán" } },
    ]);
  });

  it("thiếu cột bắt buộc, tệp trống, quá số dòng: lỗi cả tệp, không trả dòng nào", async () => {
    const missing = await readImportSheet(await workbook([["Mã phòng ban"], ["KD"]]), "departments", 100);
    expect(missing.fileErrors[0]!.message).toMatch(/Thiếu cột: "Tên phòng ban"/);
    expect((await readImportSheet(await workbook([]), "departments", 100)).fileErrors[0]!.message).toMatch(
      /trống/,
    );
    const many = await workbook([
      ["Mã phòng ban", "Tên phòng ban"],
      ["A", "a"],
      ["B", "b"],
      ["C", "c"],
    ]);
    const over = await readImportSheet(many, "departments", 2);
    expect(over.rows).toEqual([]);
    expect(over.fileErrors[0]!.message).toMatch(/quá 2 dòng/);
  });

  it("tệp không phải xlsx: lỗi rõ ràng, không ném ngoại lệ", async () => {
    const r = await readImportSheet(Buffer.from("PK\u0003\u0004 không phải excel"), "departments", 10);
    expect(r.fileErrors[0]!.message).toMatch(/Excel/);
  });

  it("tệp mẫu đọc lại được: đúng tiêu đề, một dòng ví dụ", async () => {
    const r = await readImportSheet(await buildImportTemplate("departments"), "departments", 10);
    expect(r).toEqual({
      rows: [{ row: 2, values: { code: "KD", name: "Phòng Kinh doanh" } }],
      fileErrors: [],
    });
  });
});

describe("chặn zip bomb", () => {
  it("tệp Excel bình thường qua được", async () => {
    expect(checkZip(await buildImportTemplate("departments"))).toBeNull();
  });

  it("kích thước sau giải nén khai báo quá lớn hoặc tỷ lệ nén bất thường: từ chối trước khi giải nén", async () => {
    const buf = await buildImportTemplate("departments");
    // Sửa kích thước sau giải nén của mục đầu trong thư mục trung tâm thành 250 MB.
    const cdir = buf.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    const bomb = Buffer.from(buf);
    bomb.writeUInt32LE(250 * 1024 * 1024, cdir + 24);
    expect(checkZip(bomb)).toMatch(/quá lớn/);
    expect(checkZip(buf, { maxUncompressed: 1e9, maxRatio: 1, maxEntries: 100 })).toMatch(/tỷ lệ nén/);
    expect(checkZip(Buffer.from("không phải zip"))).toMatch(/không phải Excel/);
  });
});
