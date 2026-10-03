/**
 * Kiểm tệp .xlsx (thực chất là zip) TRƯỚC khi giải nén: tệp 10 MB có thể nở thành hàng GB (zip bomb) và làm sập worker.
 * Đọc thư mục trung tâm của zip (không giải nén), cộng kích thước sau giải nén khai báo của mọi mục.
 * Thư viện giải nén vẫn có thể bị lừa nếu kích thước khai báo sai; giới hạn RAM của container là lớp chặn cuối.
 */
const EOCD_SIG = 0x06054b50;
const CDIR_SIG = 0x02014b50;

export interface ZipLimits {
  /** Tổng kích thước sau giải nén tối đa (byte). */
  maxUncompressed: number;
  /** Tỷ lệ nén tối đa (sau / trước), tệp Excel bình thường dưới 30. */
  maxRatio: number;
  maxEntries: number;
}

export const DEFAULT_ZIP_LIMITS: ZipLimits = {
  maxUncompressed: 200 * 1024 * 1024,
  maxRatio: 200,
  maxEntries: 5000,
};

/** Trả câu lỗi tiếng Việt nếu tệp không an toàn để mở, null nếu ổn. */
export function checkZip(buf: Buffer, limits: ZipLimits = DEFAULT_ZIP_LIMITS): string | null {
  // Bản ghi kết thúc nằm trong 22 + 65535 byte cuối (có thể có chú thích).
  const from = Math.max(0, buf.length - 22 - 0xffff);
  let eocd = -1;
  for (let i = buf.length - 22; i >= from; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return "Tệp không phải Excel hợp lệ (.xlsx)";
  const entries = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  if (entries === 0xffff || offset === 0xffffffff) return "Tệp quá lớn hoặc dạng ZIP64, không hỗ trợ";
  if (entries > limits.maxEntries) return "Tệp có quá nhiều thành phần";

  let total = 0;
  for (let n = 0; n < entries; n++) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== CDIR_SIG) {
      return "Tệp Excel bị hỏng";
    }
    const compressed = buf.readUInt32LE(offset + 20);
    const uncompressed = buf.readUInt32LE(offset + 24);
    if (compressed === 0xffffffff || uncompressed === 0xffffffff) return "Tệp dạng ZIP64, không hỗ trợ";
    total += uncompressed;
    offset +=
      46 + buf.readUInt16LE(offset + 28) + buf.readUInt16LE(offset + 30) + buf.readUInt16LE(offset + 32);
  }
  if (total > limits.maxUncompressed) return "Tệp sau giải nén quá lớn";
  if (total / Math.max(buf.length, 1) > limits.maxRatio) return "Tệp có tỷ lệ nén bất thường";
  return null;
}
