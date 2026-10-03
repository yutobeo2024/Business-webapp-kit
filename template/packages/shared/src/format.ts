/** Định dạng hiển thị dùng chung cho web và tệp xuất (Excel, PDF): cùng một cách viết tiền và giờ ở mọi nơi. */
import { BUSINESS_TIMEZONE } from "./time.js";

const vnd = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("vi-VN", {
  timeZone: BUSINESS_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** 1250000 -> "1.250.000 ₫" */
export const formatVnd = (amount: number): string => vnd.format(amount);
/** ISO -> "dd/MM/yyyy HH:mm" theo giờ Việt Nam */
export const formatDateTime = (value: string | Date): string => dateTime.format(new Date(value));

const decimal = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
/** 1536 -> "1,5 KB"; 2400000 -> "2,3 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${decimal.format(bytes / 1024)} KB`;
  return `${decimal.format(bytes / 1024 / 1024)} MB`;
}

const date = new Intl.DateTimeFormat("vi-VN", {
  timeZone: BUSINESS_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
/** ISO hoặc Date -> "dd/MM/yyyy" theo giờ Việt Nam */
export const formatDate = (value: string | Date): string => date.format(new Date(value));
