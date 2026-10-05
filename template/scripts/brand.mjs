// Thương hiệu của dự án ở MỘT chỗ: apps/web/brand.json -> apps/web/src/brand.css (+ favicon mặc định).
//   pnpm brand                                   sinh lại từ brand.json
//   pnpm brand --primary "#0B5FFF" --name "Quản lý kho" --short "QK" [--primary-dark "#7AA7FF"] [--radius 10]
//   pnpm brand --check                           brand.css lệch brand.json thì thoát mã 1 (dùng trong CI)
// Từ một mã màu, script tính màu nút, màu chữ trên nút và màu chữ liên kết sao cho đạt tương phản WCAG AA ở cả chế độ
// sáng và tối. Màu trạng thái (thành công, cảnh báo, lỗi...) cố định trong styles.css, không đổi theo khách hàng.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AA = 4.5;
const WHITE = "#ffffff";
const INK = "#0b1220";
/** Nền tối nhất mà chữ màu thương hiệu phải đọc được ở chế độ tối (khớp `--muted` tối trong styles.css). */
export const DARK_SURFACE = "#18222c";
/** Nút được phép đậm hơn màu gốc tối đa chừng này (độ sáng OKLCH) để giữ chữ trắng; quá mức thì dùng chữ tối. */
const MAX_DARKEN = 0.15;
const FAVICON_MARK = "<!-- brand.mjs -->";

export function normalizeHex(input) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(input).trim());
  if (!m) throw new Error(`Mã màu không hợp lệ: "${input}". Dùng dạng #RRGGBB, ví dụ #0B5FFF.`);
  const h = m[1].toLowerCase();
  return `#${h.length === 3 ? [...h].map((c) => c + c).join("") : h}`;
}

const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

function luminance(hex) {
  const [r, g, b] = channels(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Tỉ lệ tương phản WCAG 2 giữa hai màu (1 đến 21). */
export function contrast(a, b) {
  const [hi, lo] = [luminance(normalizeHex(a)), luminance(normalizeHex(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function toOklch(input) {
  const [r, g, b] = channels(normalizeHex(input)).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

function oklchToLinear({ l: L, c, h }) {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** OKLCH -> hex; màu ngoài dải sRGB thì giảm độ rực (giữ độ sáng và tông) cho tới khi hiển thị được. */
function fromOklch(color) {
  const inGamut = (rgb) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);
  let c = color.c;
  if (!inGamut(oklchToLinear(color))) {
    let lo = 0;
    let hi = color.c;
    for (let i = 0; i < 24; i++) {
      c = (lo + hi) / 2;
      if (inGamut(oklchToLinear({ ...color, c }))) lo = c;
      else hi = c;
    }
    c = lo;
  }
  const hex = oklchToLinear({ ...color, c }).map((v) =>
    Math.round(toGamma(Math.min(1, Math.max(0, v))) * 255)
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${hex.join("")}`;
}

/** Đổi độ sáng từng bước nhỏ (giữ tông) cho tới khi đạt tương phản `target` với `against`. */
function shiftUntil(hex, direction, against, target) {
  const base = toOklch(hex);
  let out = hex;
  for (let l = base.l; l >= 0 && l <= 1 && contrast(out, against) < target; l += direction * 0.004) {
    out = fromOklch({ ...base, l });
  }
  return contrast(out, against) >= target ? out : direction < 0 ? "#000000" : WHITE;
}

/** Chữ trên nền màu: trắng nếu đạt AA, không thì màu mực tối (đen khi mực cũng chưa đạt). */
function foregroundOn(bg) {
  if (contrast(bg, WHITE) >= AA) return WHITE;
  return contrast(bg, INK) >= AA ? INK : "#000000";
}

/** Từ màu thương hiệu, tính bộ màu dùng trong giao diện cho chế độ sáng và tối. */
export function buildTheme({ primary, primaryDark }) {
  const brand = normalizeHex(primary);
  if (contrast(brand, WHITE) < 1.25) {
    throw new Error(
      `Màu chủ đạo ${brand} quá nhạt: nút và mục đang chọn sẽ chìm vào nền trắng. Chọn tông đậm hơn của cùng màu.`,
    );
  }
  // Sáng: ưu tiên chữ trắng trên nút. Màu hơi nhạt thì làm nút đậm hơn một chút; nhạt hẳn (vàng...) thì dùng chữ tối.
  let button = brand;
  if (contrast(brand, WHITE) < AA) {
    const darker = shiftUntil(brand, -1, WHITE, AA);
    if (toOklch(brand).l - toOklch(darker).l <= MAX_DARKEN) button = darker;
  }
  const light = {
    brand,
    primary: button,
    primaryForeground: foregroundOn(button),
    // Chữ liên kết và mục đang chọn nằm trên nền trắng hoặc nền nhuộm nhẹ màu thương hiệu: lấy dư một chút.
    primaryText: shiftUntil(brand, -1, WHITE, AA + 0.6),
  };
  // Tối: màu phải sáng lên mới nổi trên nền tối; khách có sẵn màu cho nền tối thì khai báo primaryDark.
  const brandDark = primaryDark ? normalizeHex(primaryDark) : shiftUntil(brand, 1, DARK_SURFACE, AA + 0.6);
  const dark = {
    brand: brandDark,
    primary: brandDark,
    primaryForeground: foregroundOn(brandDark),
    primaryText: shiftUntil(brandDark, 1, DARK_SURFACE, AA),
  };
  return { light, dark };
}

/** Kiểm brand.json và điền mặc định. Lỗi nêu đúng tên trường để người không biết code sửa được. */
export function validateBrand(raw) {
  const name = typeof raw?.name === "string" ? raw.name.trim() : "";
  if (!name) throw new Error('brand.json: "name" (tên ứng dụng) không được để trống.');
  const shortName = typeof raw.shortName === "string" ? raw.shortName.trim() : "";
  if (shortName.length < 1 || shortName.length > 3) {
    throw new Error('brand.json: "shortName" (chữ viết tắt trên logo) phải có 1 đến 3 ký tự.');
  }
  const radius = raw.radius ?? 10;
  if (!Number.isFinite(radius) || radius < 0 || radius > 20) {
    throw new Error('brand.json: "radius" (bo góc, px) phải là số từ 0 đến 20.');
  }
  const brand = { name, shortName, primary: normalizeHex(raw.primary), radius };
  if (raw.primaryDark) brand.primaryDark = normalizeHex(raw.primaryDark);
  if (raw.logo) brand.logo = String(raw.logo);
  buildTheme(brand);
  return brand;
}

export function renderCss(brand) {
  const t = buildTheme(brand);
  const block = (selector, m, extra = []) =>
    [
      `${selector} {`,
      `  --brand: ${m.brand};`,
      `  --brand-primary: ${m.primary};`,
      `  --brand-primary-foreground: ${m.primaryForeground};`,
      `  --brand-text: ${m.primaryText};`,
      ...extra,
      "}",
    ].join("\n");
  return [
    "/* Sinh từ apps/web/brand.json bằng `pnpm brand`. Không sửa tay: sửa brand.json rồi chạy lại. */",
    block(":root", t.light, [`  --radius: ${brand.radius}px;`]),
    "",
    block(".dark", t.dark),
    "",
  ].join("\n");
}

const escapeXml = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`).replace(/&#38;/g, "&amp;");

export function renderFavicon(brand) {
  const { light } = buildTheme(brand);
  const size = brand.shortName.length > 2 ? 24 : 30;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${FAVICON_MARK}` +
    `<rect width="64" height="64" rx="15" fill="${light.primary}"/>` +
    `<text x="32" y="33" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif" ` +
    `font-size="${size}" font-weight="700" fill="${light.primaryForeground}">${escapeXml(brand.shortName)}</text></svg>\n`
  );
}

function parseArgs(argv) {
  const map = {
    "--primary": "primary",
    "--primary-dark": "primaryDark",
    "--name": "name",
    "--short": "shortName",
  };
  const out = { changes: {}, check: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--check") out.check = true;
    else if (a === "--radius") out.changes.radius = Number(argv[++i]);
    else if (map[a]) out.changes[map[a]] = argv[++i];
    else throw new Error(`Tham số lạ: ${a}. Xem cách dùng ở đầu scripts/brand.mjs.`);
  }
  return out;
}

function main() {
  const web = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "web");
  const jsonFile = join(web, "brand.json");
  const cssFile = join(web, "src", "brand.css");
  const iconFile = join(web, "public", "favicon.svg");
  const { changes, check } = parseArgs(process.argv.slice(2));
  const brand = validateBrand({ ...JSON.parse(readFileSync(jsonFile, "utf8")), ...changes });
  const css = renderCss(brand);
  if (check) {
    if (existsSync(cssFile) && readFileSync(cssFile, "utf8").replace(/\r\n/g, "\n") === css) return;
    console.error("apps/web/src/brand.css lệch với brand.json. Chạy: pnpm brand");
    process.exit(1);
  }
  if (Object.keys(changes).length) writeFileSync(jsonFile, `${JSON.stringify(brand, null, 2)}\n`);
  writeFileSync(cssFile, css);
  // Favicon mặc định chỉ ghi đè chính nó: dự án đã đặt logo riêng vào public/favicon.svg thì giữ nguyên.
  if (!existsSync(iconFile) || readFileSync(iconFile, "utf8").includes(FAVICON_MARK)) {
    mkdirSync(dirname(iconFile), { recursive: true });
    writeFileSync(iconFile, renderFavicon(brand));
  }
  const { light } = buildTheme(brand);
  console.log(
    `Thương hiệu "${brand.name}": màu ${light.brand}, nút ${light.primary} chữ ${light.primaryForeground}. Đã ghi src/brand.css.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
