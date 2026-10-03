const vnd = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
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
export const formatDateTime = (iso: string): string => dateTime.format(new Date(iso));

const decimal = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
/** 1536 -> "1,5 KB"; 2400000 -> "2,3 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${decimal.format(bytes / 1024)} KB`;
  return `${decimal.format(bytes / 1024 / 1024)} MB`;
}
