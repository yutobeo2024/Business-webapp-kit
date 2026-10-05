# Deploy và phát hành

Nguyên tắc: **build một lần**. Image chỉ được build khi merge vào `main` (tag `sha-<commit>`) và chạy staging trước;
production dùng lại ĐÚNG image đó (gắn thêm tên `vX.Y.Z`, cùng digest), không build lại.

**Staging:** mỗi lần merge vào `main`, CI chạy đủ kiểm tra, build image `sha-xxxxxxx`, deploy staging tự động.

**Production:**

1. Trong Claude Code: `/release minor` (hoặc patch/major). Xem lại CHANGELOG và ghi chú `docs/runbooks/releases/vX.Y.Z.md`.
2. Merge commit phát hành vào `main` (người làm, không phải AI). CI deploy staging bản `sha-xxxxxxx` của commit đó.
3. Kiểm staging theo ghi chú release. Ổn thì gắn tag ĐÚNG commit đó và đẩy tag:
   `git tag -a vX.Y.Z -m "..." <commit>` rồi `git push origin vX.Y.Z` (người làm).
4. GitHub Actions (job `promote`): kiểm tag nằm trên `main` và commit đã deploy staging thành công (chưa thì dừng), gắn
   tên `vX.Y.Z` cho đúng image `sha-xxxxxxx` (so digest), không chạy lại test, không build. Environment `production` có
   người duyệt thì chờ duyệt (repo riêng tư gói GitHub Free không có tính năng này: gắn tag là bước duyệt).
5. `deploy.sh` trên máy chủ: sao lưu DB, pull image, migrate, khởi động, chờ healthy, kiểm `/api/health` qua HTTPS.
   Hỏng thì tự quay image về bản trước và gửi cảnh báo.
6. Sau deploy: làm các bước kiểm trong ghi chú release; theo dõi cảnh báo 30 phút.

Lịch sử (kèm digest từng image): `<thư mục instance>/infra/deploy-history.log`. Đang chạy: `.deployed-tag` cùng thư mục.
Thư mục instance: `/opt/app` (mặc định) hoặc `/opt/app-<tên>` khi staging và production chung một máy (xem
[server-setup.md](server-setup.md)). Digest của staging và production phải trùng cho cùng một bản.

Quay lại bản trước: Actions > Rollback > Run workflow (từ `main`), chọn môi trường và tag đã từng chạy ổn.

Không deploy chiều thứ Sáu hoặc trước ngày nghỉ trừ bản vá khẩn.
