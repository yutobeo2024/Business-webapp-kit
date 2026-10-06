/**
 * E2E GIAO DIỆN (lõi): khung trang ở ba cỡ màn hình, menu ngăn kéo trên điện thoại, không cuộn ngang cả trang,
 * đổi sáng/tối và nhớ lựa chọn, thu gọn menu. Ảnh chụp lưu vào test-results/ui để xem lại.
 */
import type { Page } from "@playwright/test";
import { expect, test } from "./users.js";

const SIZES = [
  { name: "dien-thoai", width: 375, height: 760 },
  { name: "may-tinh-bang", width: 768, height: 1024 },
  { name: "may-tinh", width: 1280, height: 800 },
] as const;

/** Trang không được cuộn ngang: nội dung rộng (bảng) phải cuộn trong khung của nó. */
async function expectNoPageScrollX(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "trang bị cuộn ngang").toBeLessThanOrEqual(0);
}

for (const size of SIZES) {
  test(`khung trang ở ${size.width}px: menu dùng được, trang không cuộn ngang`, async ({ pageAs }) => {
    const page = await pageAs("admin");
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Xin chào/ })).toBeVisible();
    await expectNoPageScrollX(page);
    await page.screenshot({ path: `test-results/ui/trang-chu-${size.name}.png`, fullPage: true });

    if (size.width < 1024) {
      // Màn hẹp: menu nằm trong ngăn kéo, mở bằng nút, chọn mục thì tự đóng.
      await expect(page.getByRole("navigation", { name: "Menu chính" })).toHaveCount(0);
      await page.getByRole("button", { name: "Mở menu" }).click();
      await page
        .getByRole("navigation", { name: "Menu chính" })
        .getByRole("link", { name: "Người dùng" })
        .click();
      await expect(page.getByRole("navigation", { name: "Menu chính" })).toHaveCount(0);
    } else {
      await page
        .getByRole("navigation", { name: "Menu chính" })
        .getByRole("link", { name: "Người dùng" })
        .click();
    }
    await expect(page.getByRole("heading", { name: "Người dùng" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expectNoPageScrollX(page);
    await page.screenshot({ path: `test-results/ui/nguoi-dung-${size.name}.png`, fullPage: true });
  });
}

test("sáng/tối: đổi trong menu tài khoản, nền đổi theo và lựa chọn còn sau khi tải lại", async ({
  pageAs,
}) => {
  const page = await pageAs("admin");
  await page.goto("/");
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  const light = await background();

  await page.getByRole("button", { name: /^Tài khoản:/ }).click();
  await page.getByRole("menuitem", { name: "Giao diện tối" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(await background()).not.toBe(light);
  await page.screenshot({ path: "test-results/ui/trang-chu-toi.png", fullPage: true });

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: /^Tài khoản:/ }).click();
  await page.getByRole("menuitem", { name: "Giao diện sáng" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("màu thương hiệu: nút chính lấy màu từ brand.css, chữ trên nút đủ tương phản", async ({ pageAs }) => {
  const page = await pageAs("admin");
  await page.goto("/admin/users");
  const button = page.getByRole("button", { name: "Thêm người dùng" });
  const { bg, fg, token } = await button.evaluate((el) => {
    const s = getComputedStyle(el);
    const probe = document.createElement("i");
    probe.style.color = "var(--brand-primary)";
    document.body.append(probe);
    const token = getComputedStyle(probe).color;
    probe.remove();
    return { bg: s.backgroundColor, fg: s.color, token };
  });
  expect(bg).toBe(token);
  const lum = (rgb: string) => {
    const [r, g, b] = rgb
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map((v) => {
        const c = Number(v) / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const [hi, lo] = [lum(bg), lum(fg)].sort((a, b) => b - a);
  expect((hi! + 0.05) / (lo! + 0.05)).toBeGreaterThanOrEqual(4.5);
});

test("thu gọn menu: chỉ còn icon, mục vẫn bấm được, mở lại thì có chữ", async ({ pageAs }) => {
  const page = await pageAs("admin");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Menu chính" });
  await page.getByRole("button", { name: "Thu gọn menu" }).click();
  await expect(nav.getByText("Người dùng")).toHaveCount(0);
  await nav.getByRole("link", { name: "Người dùng" }).click();
  await expect(page.getByRole("heading", { name: "Người dùng" })).toBeVisible();
  await page.getByRole("button", { name: "Mở rộng menu" }).click();
  await expect(nav.getByText("Người dùng")).toBeVisible();
});

test("bảng: ô ngắn không ngắt dòng, cột chữ dài (đánh dấu whitespace-normal) vẫn ngắt được", async ({
  pageAs,
}) => {
  const page = await pageAs("admin");
  await page.goto("/admin/users");
  await expect(page.getByRole("table")).toBeVisible();
  const styles = await page.evaluate(() => {
    const cells = [...document.querySelectorAll("tbody td")];
    const ws = (el: Element | undefined) => (el ? getComputedStyle(el).whiteSpace : "không có ô");
    return {
      short: ws(cells.find((c) => !c.classList.contains("whitespace-normal"))),
      long: ws(cells.find((c) => c.classList.contains("whitespace-normal"))),
    };
  });
  expect(styles).toEqual({ short: "nowrap", long: "normal" });
});

test("ngăn kéo đang mở mà màn hình nới rộng (xoay máy tính bảng): ngăn kéo đóng, trang vẫn bấm được", async ({
  pageAs,
}) => {
  const page = await pageAs("admin");
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Mở menu" }).click();
  await expect(page.getByRole("navigation", { name: "Menu chính" })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page
    .getByRole("navigation", { name: "Menu chính" })
    .getByRole("link", { name: "Người dùng" })
    .click();
  await expect(page.getByRole("heading", { name: "Người dùng" })).toBeVisible();
});

test("hộp thoại: mở ra thì con trỏ nằm ở ô nhập đầu tiên; Ctrl+K không chen vào khi đang nhập form", async ({
  pageAs,
}) => {
  const page = await pageAs("admin");
  await page.goto("/admin/departments");
  await page.getByRole("button", { name: "Thêm phòng ban" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Mã phòng ban")).toBeFocused();
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(dialog.getByLabel("Mã phòng ban")).toBeVisible();
});
