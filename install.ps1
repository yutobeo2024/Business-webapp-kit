# Tạo dự án mới từ kit trên Windows. Dùng: .\install.ps1 C:\projects\ten-du-an
# File lưu UTF-8 CÓ BOM: thiếu BOM thì PowerShell 5.1 đọc theo bảng mã ANSI, tiếng Việt bị lỗi font cả trong commit.
param([Parameter(Mandatory = $true)][string]$Dest)
$ErrorActionPreference = "Stop"
$Version = "1.1.0"
$Src = Join-Path $PSScriptRoot "template"
if ((Test-Path $Dest) -and (Get-ChildItem -Force $Dest | Select-Object -First 1)) {
  Write-Error "Thư mục $Dest không trống. Kit chỉ tạo dự án mới."
}
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
robocopy $Src $Dest /E /NFL /NDL /NJH /NJS /NP /XD node_modules dist .turbo .git test-results playwright-report coverage /XF .env | Out-Null
if ($LASTEXITCODE -ge 8) { Write-Error "Sao chép thất bại (robocopy $LASTEXITCODE)" }
Copy-Item (Join-Path $Dest ".env.example") (Join-Path $Dest ".env")

# PowerShell 5.1 không ném lỗi khi lệnh native (git) thất bại: kiểm $LASTEXITCODE sau từng lệnh.
function Invoke-Git {
  git @args
  if ($LASTEXITCODE -ne 0) { throw "git $($args -join ' ') thất bại (mã $LASTEXITCODE)" }
}
Push-Location $Dest
try {
  Invoke-Git init -q
  Invoke-Git add -A
  # Git trên Windows (core.filemode=false) ghi file .sh với quyền 644: CI rsync lên máy chủ Linux sẽ báo
  # "Permission denied". Đặt bit +x trong index; .gitattributes đã bắt buộc xuống dòng LF.
  Get-ChildItem infra -Filter *.sh | ForEach-Object { Invoke-Git update-index --chmod=+x "infra/$($_.Name)" }
  Invoke-Git -c commit.gpgsign=false commit -qm "chore: khởi tạo từ business-webapp-kit $Version"
} catch {
  Write-Warning "Không tạo được commit đầu: $_"
  Write-Warning "Thường do chưa cấu hình git user.name/user.email. Tự commit sau, trước đó chạy: git update-index --chmod=+x infra/*.sh"
} finally { Pop-Location }
Write-Host "Đã tạo dự án tại $Dest"
Write-Host "Tiếp theo: cd $Dest; sửa .env và CLAUDE.md; pnpm install; pnpm dev:services; pnpm build; pnpm db:migrate; pnpm db:seed -- --demo; pnpm verify:quick"
Write-Host "Cần Node 22 hoặc 24 LTS. Claude Code trên Windows: nên cài Git Bash để hook và skill chạy giống CI."
