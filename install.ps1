# Tạo dự án mới từ kit trên Windows. Dùng: .\install.ps1 C:\projects\ten-du-an
# File lưu UTF-8 CÓ BOM: thiếu BOM thì PowerShell 5.1 đọc theo bảng mã ANSI, tiếng Việt bị lỗi font cả trong commit.
param([Parameter(Mandatory = $true)][string]$Dest, [switch]$Force)
$ErrorActionPreference = "Stop"
$Version = "1.4.0"
$Src = Join-Path $PSScriptRoot "template"

# Dự án khóa Node 22/24 LTS (engine-strict): Node khác thì mọi lệnh pnpm lồng nhau, kể cả hook Stop của Claude Code, đều lỗi.
$NodeMajor = "none"
try { $NodeMajor = (node -p "process.versions.node.split('.')[0]").Trim() } catch {}
if (($NodeMajor -ne "22") -and ($NodeMajor -ne "24") -and (-not $Force)) {
  Write-Host "Cần Node 22 hoặc 24 LTS, máy đang có: $NodeMajor."
  Write-Host "Cài Node 24 bên cạnh bản hiện có rồi chạy lại: winget install Schniz.fnm; fnm install 24; fnm use 24"
  Write-Host "Vẫn muốn tạo thư mục dự án (tự lo Node sau): .\install.ps1 -Force <thư-mục>"
  exit 1
}
if ((Test-Path $Dest) -and (Get-ChildItem -Force $Dest | Select-Object -First 1)) {
  Write-Error "Thư mục $Dest không trống. Kit chỉ tạo dự án mới."
}
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
robocopy $Src $Dest /E /NFL /NDL /NJH /NJS /NP /XD node_modules dist .turbo .git test-results playwright-report coverage .data /XF .env | Out-Null
if ($LASTEXITCODE -ge 8) { Write-Error "Sao chép thất bại (robocopy $LASTEXITCODE)" }
Copy-Item (Join-Path $Dest ".env.example") (Join-Path $Dest ".env")

# PowerShell 5.1 không ném lỗi khi lệnh native (git) thất bại: kiểm $LASTEXITCODE sau từng lệnh.
function Invoke-Git {
  git @args
  if ($LASTEXITCODE -ne 0) { throw "git $($args -join ' ') thất bại (mã $LASTEXITCODE)" }
}
Push-Location $Dest
try {
  Invoke-Git init -q -b main
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
Write-Host "Nhánh chính là main (CI/CD chạy khi push main và tag vX.Y.Z). Claude Code trên Windows: nên cài Git Bash để hook và skill chạy giống CI."
