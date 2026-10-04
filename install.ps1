# Tạo dự án mới từ kit trên Windows. Dùng: .\install.ps1 C:\projects\ten-du-an
# File lưu UTF-8 CÓ BOM: thiếu BOM thì PowerShell 5.1 đọc theo bảng mã ANSI, tiếng Việt bị lỗi font cả trong commit.
param([Parameter(Mandatory = $true)][string]$Dest, [switch]$Force)
$ErrorActionPreference = "Stop"
$Version = "1.4.1"
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
# DB và Redis riêng cho dự án này (nhiều dự án dùng chung dịch vụ dev): tên DB theo tên thư mục, chỉ số Redis theo băm.
# Bỏ dấu tiếng Việt (Quản Lý Kho -> quan_ly_kho).
$Leaf = (Split-Path $Dest -Leaf).Replace([string][char]0x0111, "d").Replace([string][char]0x0110, "D").Normalize([Text.NormalizationForm]::FormD)
$Leaf = -join ($Leaf.ToCharArray() | Where-Object { [Globalization.CharUnicodeInfo]::GetUnicodeCategory($_) -ne [Globalization.UnicodeCategory]::NonSpacingMark })
$Slug = ($Leaf.ToLower() -replace '[^a-z0-9]+', '_').Trim('_')
if ($Slug.Length -gt 40) { $Slug = $Slug.Substring(0, 40) }
if ($Slug -notmatch '^[a-z]') { $Slug = "app_$Slug" }
$Hash = 0; foreach ($c in $Slug.ToCharArray()) { $Hash = ($Hash * 31 + [int]$c) % 1000003 }
$EnvPath = Join-Path $Dest ".env"
$Utf8 = New-Object System.Text.UTF8Encoding($false)
$EnvText = [IO.File]::ReadAllText($EnvPath, $Utf8)
$EnvText = $EnvText -replace '(?m)/app_dev(?=\r?$)', "/$($Slug)_dev" -replace '(?m)/app_test(?=\r?$)', "/$($Slug)_test"
$EnvText = $EnvText -replace '(?m)^REDIS_URL=redis://localhost:6379/1(?=\r?$)', "REDIS_URL=redis://localhost:6379/$(1 + $Hash % 7)"
$EnvText = $EnvText -replace '(?m)^TEST_REDIS_URL=redis://localhost:6379/15(?=\r?$)', "TEST_REDIS_URL=redis://localhost:6379/$(8 + $Hash % 8)"
[IO.File]::WriteAllText($EnvPath, $EnvText, $Utf8)

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
Write-Host "Tiếp theo: cd $Dest; sửa .env và CLAUDE.md; pnpm install; pnpm dev:services; pnpm build; pnpm db:reset-local dev (tạo DB dev + dữ liệu demo); pnpm db:reset-local (tạo DB test); pnpm verify:quick"
Write-Host "Nhánh chính là main (CI/CD chạy khi push main và tag vX.Y.Z). Claude Code trên Windows: nên cài Git Bash để hook và skill chạy giống CI."
