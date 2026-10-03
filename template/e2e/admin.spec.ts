import { expect, type Page, test } from "@playwright/test";

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
