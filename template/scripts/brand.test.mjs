// Chạy: node --test scripts/brand.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildTheme,
  contrast,
  DARK_SURFACE,
  mergeBrand,
  normalizeHex,
  parseArgs,
  renderCss,
  renderFavicon,
  softTint,
  toOklch,
  validateBrand,
} from "./brand.mjs";

const AA = 4.5;
const hueGap = (a, b) => {
  const d = Math.abs(toOklch(a).h - toOklch(b).h) % 360;
  return Math.min(d, 360 - d);
};

test("mã hex: nhận 3 hoặc 6 chữ số, có hay không dấu #, trả về dạng #rrggbb chữ thường; mã sai thì báo lỗi", () => {
  assert.equal(normalizeHex("#0BF"), "#00bbff");
  assert.equal(normalizeHex("1AA5A2"), "#1aa5a2");
  assert.throws(() => normalizeHex("xanh"), /mã màu/i);
  assert.throws(() => normalizeHex("#12345"), /mã màu/i);
});

test("độ tương phản WCAG: đen trên trắng là 21, cùng màu là 1, không phụ thuộc thứ tự", () => {
  assert.equal(Math.round(contrast("#000000", "#ffffff")), 21);
  assert.equal(contrast("#1aa5a2", "#1aa5a2"), 1);
  assert.equal(contrast("#1aa5a2", "#ffffff"), contrast("#ffffff", "#1aa5a2"));
});

test("màu đủ đậm (xanh dương): nút dùng đúng màu thương hiệu, chữ trắng", () => {
  const t = buildTheme({ primary: "#0B5FFF" });
  assert.equal(t.light.brand, "#0b5fff");
  assert.equal(t.light.primary, "#0b5fff");
  assert.equal(t.light.primaryForeground, "#ffffff");
});

test("màu trung bình (teal): nút đậm hơn một chút để chữ trắng đạt AA, giữ tông; màu gốc vẫn còn cho logo và biểu đồ", () => {
  const t = buildTheme({ primary: "#1aa5a2" });
  assert.equal(t.light.brand, "#1aa5a2");
  assert.notEqual(t.light.primary, "#1aa5a2");
  assert.equal(t.light.primaryForeground, "#ffffff");
  assert.ok(contrast(t.light.primary, "#ffffff") >= AA);
  assert.ok(hueGap(t.light.primary, "#1aa5a2") < 4, "tông màu không được lệch");
});

test("màu sáng (vàng): giữ màu, chữ trên nút màu tối; chữ liên kết được làm đậm để đọc được trên nền trắng", () => {
  const t = buildTheme({ primary: "#ffd400" });
  assert.equal(t.light.primary, "#ffd400");
  assert.notEqual(t.light.primaryForeground, "#ffffff");
  assert.ok(contrast(t.light.primary, t.light.primaryForeground) >= AA);
  assert.ok(contrast(t.light.primaryText, "#ffffff") >= AA);
});

test("mọi màu hợp lệ: chữ trên nút và chữ liên kết đạt AA ở cả sáng và tối", () => {
  for (const primary of [
    "#0B5FFF",
    "#1aa5a2",
    "#ffd400",
    "#7a1f2b",
    "#111111",
    "#16a34a",
    "#e11d48",
    "#f97316",
  ]) {
    const t = buildTheme({ primary });
    for (const [mode, surface] of [
      ["light", "#ffffff"],
      ["dark", DARK_SURFACE],
    ]) {
      const m = t[mode];
      assert.ok(contrast(m.primary, m.primaryForeground) >= AA, `${primary} ${mode}: chữ trên nút`);
      assert.ok(contrast(m.primaryText, surface) >= AA, `${primary} ${mode}: chữ liên kết`);
    }
    assert.ok(contrast(t.dark.primary, DARK_SURFACE) >= 3, `${primary}: nút phải nổi trên nền tối`);
  }
});

test("primaryDark khai báo sẵn thì dùng đúng màu đó cho chế độ tối", () => {
  const t = buildTheme({ primary: "#1aa5a2", primaryDark: "#4fd1cd" });
  assert.equal(t.dark.brand, "#4fd1cd");
  assert.equal(t.dark.primary, "#4fd1cd");
});

test("từ chối màu gần trắng (nút chìm vào nền) kèm gợi ý", () => {
  assert.throws(() => buildTheme({ primary: "#fafafa" }), /quá nhạt/);
});

test("brand.json: thiếu tên, tên viết tắt quá dài, bo góc ngoài khoảng thì báo đúng trường", () => {
  const ok = { name: "Tạm ứng", shortName: "TU", primary: "#1aa5a2", radius: 10 };
  assert.deepEqual(validateBrand(ok), { ...ok, primary: "#1aa5a2" });
  assert.throws(() => validateBrand({ ...ok, name: " " }), /name/);
  assert.throws(() => validateBrand({ ...ok, shortName: "TAMUNG" }), /shortName/);
  assert.throws(() => validateBrand({ ...ok, radius: 40 }), /radius/);
  assert.equal(validateBrand({ name: "Kho", shortName: "K", primary: "#0bf" }).radius, 10);
});

test("brand.css: có biến cho sáng và tối, bo góc, và sinh ra giống hệt nhau mỗi lần", () => {
  const brand = validateBrand({ name: "Tạm ứng", shortName: "TU", primary: "#1aa5a2", radius: 12 });
  const css = renderCss(brand);
  assert.match(css, /:root \{[^}]*--brand: #1aa5a2;/);
  assert.match(css, /:root \{[^}]*--radius: 12px;/);
  assert.match(css, /\.dark \{[^}]*--brand: #/);
  for (const v of ["--brand-primary", "--brand-primary-foreground", "--brand-text"]) {
    assert.equal(css.split(`${v}:`).length, 3, `${v} phải có ở cả hai chế độ`);
  }
  assert.equal(renderCss(brand), css);
});

test("favicon mặc định: ô bo góc màu thương hiệu, chữ viết tắt, ký tự đặc biệt được thoát", () => {
  const svg = renderFavicon(validateBrand({ name: "A&B", shortName: "A&", primary: "#0B5FFF" }));
  assert.match(svg, /^<svg /);
  assert.match(svg, /fill="#0b5fff"/);
  assert.match(svg, />A&amp;</);
});

test("chữ liên kết đọc được cả trên nền nhuộm màu thương hiệu (mục menu đang chọn, huy hiệu)", () => {
  for (const primary of ["#0B5FFF", "#e60000", "#1aa5a2", "#ffd400", "#7a1f2b", "#16a34a", "#f97316"]) {
    const t = buildTheme({ primary });
    assert.ok(contrast(t.light.primaryText, softTint(t.light.brand, "#ffffff")) >= AA, `${primary} sáng`);
    assert.ok(contrast(t.dark.primaryText, softTint(t.dark.brand, DARK_SURFACE)) >= AA, `${primary} tối`);
  }
});

test("primaryDark quá tối (nút chìm vào nền tối) bị từ chối", () => {
  assert.throws(() => buildTheme({ primary: "#1aa5a2", primaryDark: "#101820" }), /primaryDark/);
});

test("đổi màu chủ đạo mà không nêu màu cho nền tối: bỏ primaryDark cũ để script tự tính theo màu mới", () => {
  const current = { name: "A", shortName: "A", primary: "#1aa5a2", primaryDark: "#4fd1cd", radius: 10 };
  assert.equal(mergeBrand(current, { primary: "#0B5FFF" }).primaryDark, undefined);
  assert.equal(mergeBrand(current, { name: "B" }).primaryDark, "#4fd1cd");
  assert.equal(mergeBrand(current, { primary: "#0B5FFF", primaryDark: "#7aa7ff" }).primaryDark, "#7aa7ff");
});

test("tham số dòng lệnh thiếu giá trị thì báo lỗi, không âm thầm xóa trường", () => {
  assert.throws(() => parseArgs(["--primary-dark"]), /--primary-dark/);
  assert.throws(() => parseArgs(["--name", "--short", "A"]), /--name/);
  assert.deepEqual(parseArgs(["--primary", "#0bf", "--check"]), {
    changes: { primary: "#0bf" },
    check: true,
  });
});
