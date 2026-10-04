// Chạy: node --test scripts/remove-sample.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { stripSample } from "./remove-sample.mjs";

test("cắt khối begin/end (cả dòng đánh dấu) và dòng có // sample, giữ phần còn lại", () => {
  const src = [
    `import { a } from "./a.js";`,
    `import { pr } from "./pr.js"; // sample`,
    `export const X = {`,
    `  core: 1,`,
    `  // sample:begin (ghi chú)`,
    `  pr: 2,`,
    `  // sample:end`,
    `};`,
    `const keep = "sample text không phải đánh dấu";`,
  ].join("\n");
  assert.equal(
    stripSample(src, "code"),
    [
      `import { a } from "./a.js";`,
      `export const X = {`,
      `  core: 1,`,
      `};`,
      `const keep = "sample text không phải đánh dấu";`,
    ].join("\n"),
  );
});

test("dòng `// sample: lý do` cũng bị cắt; không có đánh dấu thì giữ nguyên", () => {
  assert.equal(stripSample("a: 1,\nb: 7, // sample: đính kèm phiếu mẫu\nc: 3", "code"), "a: 1,\nc: 3");
  assert.equal(stripSample("x\ny", "code"), "x\ny");
});

test("đánh dấu lệch hoặc lồng nhau: ném lỗi (không sửa tệp nào)", () => {
  assert.throws(() => stripSample("// sample:begin\nx", "code"), /không có sample:end/);
  assert.throws(() => stripSample("x\n// sample:end", "code"), /không có sample:begin/);
  assert.throws(() => stripSample("// sample:begin\n// sample:begin\n// sample:end", "code"), /lồng/);
});

test("markdown: cắt khối, mở khối after-remove; // sample trong markdown là chữ thường", () => {
  const md = [
    "# Tiêu đề",
    "<!-- sample:begin -->",
    "Mẫu: xem module phiếu đề nghị.",
    "<!-- sample:end -->",
    "<!-- sample:after-remove",
    "Mẫu: xem module đầu tiên của dự án.",
    "-->",
    "Ví dụ mã: `x; // sample`",
  ].join("\n");
  assert.equal(
    stripSample(md, "md"),
    ["# Tiêu đề", "Mẫu: xem module đầu tiên của dự án.", "Ví dụ mã: `x; // sample`"].join("\n"),
  );
});
