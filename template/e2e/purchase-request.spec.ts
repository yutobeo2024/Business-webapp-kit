import { expect, test } from "@playwright/test";

// Dữ liệu từ `pnpm db:seed -- --demo`. Mật khẩu demo = SEED_ADMIN_PASSWORD.
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";
test.beforeAll(() => {
  if (!PASSWORD)
    throw new Error("Thiếu SEED_ADMIN_PASSWORD (đặt trong .env rồi chạy pnpm db:seed -- --demo)");
});

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: "Phiếu đề nghị mua hàng" })).toBeVisible();
}

test("AC-01: nhân viên lập và gửi phiếu, trưởng phòng duyệt", async ({ page }) => {
  const title = `Mua giấy in E2E ${Date.now()}`;
  await login(page, "nhanvien@example.com");
  await page.getByRole("button", { name: "Lập phiếu" }).click();
  await page.getByLabel("Tiêu đề").fill(title);
  await page.getByPlaceholder("Tên hàng").fill("Giấy A4");
  await page.locator('input[name="items.0.unitPrice"]').fill("90000");
  await page.getByRole("button", { name: "Lưu nháp" }).click();

  const row = page.getByRole("row", { name: new RegExp(title) });
  await expect(row).toContainText("Nháp");
  await row.getByRole("button", { name: "Gửi duyệt" }).click();
  await expect(row).toContainText("Chờ trưởng phòng duyệt");

  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await login(page, "truongphong@example.com");
  const managerRow = page.getByRole("row", { name: new RegExp(title) });
  await managerRow.getByRole("button", { name: "Trưởng phòng duyệt" }).click();
  // Hộp thoại xác nhận của ứng dụng (thẻ <dialog>), không phải window.confirm.
  await page.getByRole("dialog").getByRole("button", { name: "Trưởng phòng duyệt" }).click();
  await expect(managerRow).toContainText("Đã duyệt");
});

test("danh sách: tìm theo mã giữ trên URL, tải lại trang vẫn còn bộ lọc", async ({ page }) => {
  await login(page, "nhanvien@example.com");
  await page.getByLabel("Tìm kiếm phiếu").fill("khong-co-phieu-nao-khop");
  await expect(page.getByText("Không có phiếu nào khớp bộ lọc.")).toBeVisible();
  await expect(page).toHaveURL(/q=khong-co-phieu-nao-khop/);
  await page.reload();
  await expect(page.getByLabel("Tìm kiếm phiếu")).toHaveValue("khong-co-phieu-nao-khop");
  await expect(page.getByText("Không có phiếu nào khớp bộ lọc.")).toBeVisible();
});

test("BR-09: nhân viên đính kèm PDF vào phiếu nháp và tải lại được", async ({ page }) => {
  const title = `Phiếu có đính kèm E2E ${Date.now()}`;
  await login(page, "nhanvien@example.com");
  await page.getByRole("button", { name: "Lập phiếu" }).click();
  await page.getByLabel("Tiêu đề").fill(title);
  await page.getByPlaceholder("Tên hàng").fill("Mực in");
  await page.locator('input[name="items.0.unitPrice"]').fill("350000");
  await page.getByRole("button", { name: "Lưu nháp" }).click();

  const row = page.getByRole("row", { name: new RegExp(title) });
  await row.getByRole("button", { name: "Đính kèm" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Chưa có tệp đính kèm.");
  await dialog.getByLabel("Chọn tệp đính kèm").setInputFiles({
    name: "Báo giá mực in.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"),
  });
  const link = dialog.getByRole("link", { name: "Báo giá mực in.pdf" });
  await expect(link).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await link.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Báo giá mực in.pdf");

  // Tệp chạy được đổi đuôi .pdf bị từ chối, có thông báo rõ.
  await dialog.getByLabel("Chọn tệp đính kèm").setInputFiles({
    name: "hoa-don.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.concat([Buffer.from("MZ"), Buffer.alloc(300, 0x90)]),
  });
  await expect(dialog.getByRole("alert")).toContainText("Loại tệp không được phép");
});
