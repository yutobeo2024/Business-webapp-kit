// Chạy: node --test scripts/check-ui.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { findIssues } from "./check-ui.mjs";

const kinds = (src) => findIssues(src).map((i) => `${i.line}:${i.kind}:${i.match}`);

test("màu bảng Tailwind viết cứng bị báo, kèm dòng; màu token thì không", () => {
  const src = [
    '<p className="text-neutral-500">a</p>',
    '<p className="text-muted-foreground bg-card border-border">b</p>',
    '<div className="hover:bg-red-600/80 dark:border-slate-200">c</div>',
    '<span className="bg-white text-black">d</span>',
  ].join("\n");
  assert.deepEqual(kinds(src), [
    "1:color:text-neutral-500",
    "3:color:bg-red-600",
    "3:color:border-slate-200",
    "4:color:bg-white",
    "4:color:text-black",
  ]);
});

test("mã màu viết thẳng trong class (bg-[#fff], text-[rgb(...)]) bị báo", () => {
  assert.deepEqual(kinds('<i className="bg-[#1aa5a2] text-[rgb(0,0,0)] w-[72px]" />'), [
    "1:color:bg-[#1aa5a2]",
    "1:color:text-[rgb(0,0,0)]",
  ]);
});

test("hộp thoại của trình duyệt bị báo; tên biến chứa chữ confirm thì không", () => {
  const src = [
    'if (window.confirm("Xóa?")) run();',
    "alert('x');",
    "const confirmLabel = 1; onConfirm();",
  ].join("\n");
  assert.deepEqual(kinds(src), ["1:dialog:window.confirm(", "2:dialog:alert("]);
});

test("tên class token trùng tiền tố màu (text-primary-text, bg-chart-2, text-success) không bị báo nhầm", () => {
  assert.deepEqual(kinds('<b className="text-primary-text bg-chart-2/14 text-success border-input" />'), []);
});
