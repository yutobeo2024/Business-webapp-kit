import { Toaster, toast } from "sonner";
import { useTheme } from "@/lib/theme";

/**
 * Thông báo nổi: dùng `toast.success("Đã lưu")` sau thao tác ghi THÀNH CÔNG. Lỗi của form vẫn hiện tại chỗ
 * (`role="alert"` cạnh ô hoặc nút) để người dùng biết sửa ở đâu; không đẩy lỗi nhập liệu lên toast.
 */
export { toast };

export function AppToaster() {
  const theme = useTheme();
  return <Toaster theme={theme} position="top-right" richColors closeButton />;
}
