---
name: business-flow
description: Chuyển yêu cầu nghiệp vụ thô (mô tả, biên bản họp, file quy trình của khách) thành spec quy trình chuẩn tiếng Việt trong docs/specs/. Dùng khi có tính năng hoặc quy trình mới chưa có spec, hoặc khi khách đổi nghiệp vụ.
argument-hint: "<mô tả yêu cầu | đường dẫn file>"
---

# Tạo spec quy trình nghiệp vụ

Đầu vào: $ARGUMENTS

1. **Thu thập.** Đọc đầu vào (đường dẫn thì đọc file). Đọc `docs/specs/` để dùng lại tên vai trò, thực thể, trạng thái đã có;
   không đặt tên mới cho cùng một khái niệm.
2. **Hỏi trước khi viết.** Liệt kê tối đa 7 câu hỏi về điểm mơ hồ ảnh hưởng thiết kế: ai duyệt, hạn mức, ngoại lệ, dữ liệu cũ,
   tích hợp, báo cáo, dữ liệu cá nhân. Người dùng bảo "cứ giả định" thì ghi giả định vào mục 11.
3. **Viết spec** đúng khung [spec-template.md](spec-template.md), giữ thứ tự mục, lưu `docs/specs/<NNN>-<ten-quy-trinh>.md`
   (NNN là số kế tiếp). Tham khảo spec mẫu `docs/specs/001-phieu-de-nghi-mua-hang.md`.
   - Mỗi trạng thái không kết thúc có ít nhất một đường ra; mỗi chuyển trạng thái ghi vai trò được phép và điều kiện.
   - Mỗi quy tắc có mã BR-xx viết được thành test. Tiêu chí nghiệm thu dạng Cho/Khi/Thì, có cả trường hợp bị từ chối quyền.
4. **Tự kiểm.** Trạng thái mồ côi? Vai trò làm được việc vượt quyền? Ai tự duyệt được việc của mình? Quy tắc mâu thuẫn?
   Đã nêu dữ liệu cá nhân, thời gian lưu, audit chưa?
5. **Kết thúc.** Trả đường dẫn spec và câu hỏi mở. KHÔNG viết code. Dừng chờ người dùng duyệt (đổi "Trạng thái spec" thành Đã duyệt).
