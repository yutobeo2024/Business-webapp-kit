import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const listeners = new Set<() => void>();
const current = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");

/** Đổi sáng/tối và nhớ lựa chọn. Lần tải sau `public/theme.js` áp dụng trước khi vẽ trang. */
export function setTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Trình duyệt chặn localStorage: vẫn đổi cho phiên này.
  }
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    current,
    () => "light",
  );
}

/** Ghi nhớ một lựa chọn giao diện nhỏ của người dùng (menu thu gọn...). Không dùng cho dữ liệu nghiệp vụ. */
export function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Không lưu được thì thôi: chỉ là tiện ích.
  }
}
