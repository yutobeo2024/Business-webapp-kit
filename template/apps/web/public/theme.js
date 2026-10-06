/* global window, document */
// Đặt chế độ sáng/tối TRƯỚC khi vẽ trang để không nháy. Tệp riêng (không viết inline) vì CSP chỉ cho script cùng nguồn.
// Lựa chọn của người dùng lưu ở localStorage "theme": "light" | "dark"; chưa chọn thì theo hệ điều hành.
(function () {
  var saved = null;
  try {
    saved = localStorage.getItem("theme");
  } catch {
    /* trình duyệt chặn localStorage: theo hệ điều hành */
  }
  var dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", dark);
})();
