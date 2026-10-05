import brand from "../../brand.json";

/** Tên ứng dụng và chữ viết tắt trên logo, lấy từ `apps/web/brand.json` (đổi bằng `pnpm brand`). */
export const BRAND: { name: string; shortName: string } = { name: brand.name, shortName: brand.shortName };
