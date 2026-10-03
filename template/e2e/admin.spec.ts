import { expect, type Page, test } from "@playwright/test";
import ExcelJS from "exceljs";

// Tài khoản quản trị do `pnpm db:seed` tạo từ SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "";
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "";
test.beforeAll(() => {
  if (!ADMIN_EMAIL || !PASSWORD) throw new Error("Thiếu SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (xem .env)");
});

async function login(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

test("quản trị: tạo vai trò và người dùng; người mới bị bắt đổi mật khẩu rồi lập được phiếu", async ({
  page,
}) => {
  const stamp = Date.now();
  const roleName = `Nhân viên kho ${stamp}`;
  const email = `kho.${stamp}@example.com`;
  const temp = `tam-${stamp}`;
  const newPassword = `moi-${stamp}-abc`;

  await login(page, ADMIN_EMAIL, PASSWORD);
  // Quản trị hệ thống không có quyền nghiệp vụ: không thấy nút lập phiếu, thấy menu quản trị.
  await expect(page.getByRole("link", { name: "Người dùng" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lập phiếu" })).toHaveCount(0);

  // Vai trò mới với quyền lập phiếu.
  await page.getByRole("link", { name: "Vai trò" }).click();
  await page.getByRole("button", { name: "Thêm vai trò" }).click();
  const roleDialog = page.getByRole("dialog");
  await roleDialog.getByLabel("Tên vai trò").fill(roleName);
  await roleDialog.getByLabel(/^Lập phiếu/).check();
  await roleDialog.getByRole("button", { name: "Lưu" }).click();
  await expect(page.getByRole("row", { name: new RegExp(roleName) })).toBeVisible();

  // Người dùng mới, mật khẩu tạm do quản trị viên đặt.
  await page.getByRole("link", { name: "Người dùng" }).click();
  await page.getByRole("button", { name: "Thêm người dùng" }).click();
  const userDialog = page.getByRole("dialog");
  await userDialog.getByLabel("Email").fill(email);
  await userDialog.getByLabel("Mật khẩu tạm").fill(temp);
  await userDialog.getByLabel("Họ tên").fill("Nhân Viên Kho");
  await userDialog.getByLabel("Phòng ban").selectOption({ label: "KD · Phòng Kinh doanh" });
  await userDialog.getByLabel(roleName).check();
  await userDialog.getByRole("button", { name: "Tạo tài khoản" }).click();
  await expect(userDialog.getByText(temp)).toBeVisible();
  await userDialog.getByRole("button", { name: "Đóng" }).click();
  await page.getByLabel("Tìm người dùng").fill(email);
  await expect(page.getByRole("row", { name: new RegExp(email) })).toContainText("Đang dùng mật khẩu tạm");
  await page.getByRole("button", { name: "Đăng xuất" }).click();

  // Người mới: bắt đổi mật khẩu trước khi vào ứng dụng.
  await login(page, email, temp);
  await expect(page.getByRole("heading", { name: "Đặt mật khẩu mới" })).toBeVisible();
  await page.getByLabel("Mật khẩu tạm").fill(temp);
  await page.getByLabel("Mật khẩu mới").fill(newPassword);
  await page.getByRole("button", { name: "Lưu mật khẩu mới" }).click();
  await expect(page.getByRole("heading", { name: "Phiếu đề nghị mua hàng" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lập phiếu" })).toBeVisible();
  // Không có quyền quản trị: không thấy menu quản trị.
  await expect(page.getByRole("link", { name: "Người dùng" })).toHaveCount(0);
});

async function departmentsXlsx(rows: string[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Phòng ban");
  ws.addRow(["Mã phòng ban", "Tên phòng ban"]);
  for (const r of rows) ws.addRow(r);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test("nhập phòng ban từ Excel: tệp có lỗi bị chặn, tệp đúng nhập xong", async ({ page }) => {
  const code = `E2E${Date.now() % 1_000_000}`;
  await login(page, ADMIN_EMAIL, PASSWORD);
  await page.getByRole("link", { name: "Phòng ban" }).click();
  await page.getByRole("button", { name: "Nhập từ Excel" }).click();
  const dialog = page.getByRole("dialog");

  // Tệp mẫu tải về được.
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("link", { name: "tệp mẫu" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("mau-nhap-departments.xlsx");

  // Có dòng sai: không nhập gì, báo đúng dòng.
  await dialog.getByLabel("Chọn tệp Excel để nhập").setInputFiles({
    name: "co-loi.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: await departmentsXlsx([
      [code, "Phòng E2E"],
      ["sai mã!", "Phòng lỗi"],
    ]),
  });
  await expect(dialog).toContainText("Có lỗi", { timeout: 20_000 });
  await expect(dialog.getByRole("row", { name: /3 Mã phòng ban/ })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Xác nhận nhập/ })).toHaveCount(0);

  // Tệp đúng: xem trước rồi xác nhận.
  await dialog.getByLabel("Chọn tệp Excel để nhập").setInputFiles({
    name: "dung.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: await departmentsXlsx([[code, "Phòng E2E"]]),
  });
  await dialog.getByRole("button", { name: "Xác nhận nhập 1 dòng" }).click({ timeout: 20_000 });
  await expect(dialog.getByRole("status")).toHaveText("Đã nhập 1 dòng.", { timeout: 20_000 });
  await dialog.getByRole("button", { name: "Đóng" }).click();
  await page.getByLabel("Tìm phòng ban").fill(code);
  await expect(page.getByRole("row", { name: new RegExp(code) })).toBeVisible();
});
