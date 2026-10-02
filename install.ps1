# Tạo dự án mới từ kit trên Windows. Dùng: .\install.ps1 C:\projects\ten-du-an
param([Parameter(Mandatory = $true)][string]$Dest)
$ErrorActionPreference = "Stop"
$Src = Join-Path $PSScriptRoot "template"
if ((Test-Path $Dest) -and (Get-ChildItem -Force $Dest | Select-Object -First 1)) {
  Write-Error "Thư mục $Dest không trống. Kit chỉ tạo dự án mới."
}
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
robocopy $Src $Dest /E /NFL /NDL /NJH /NJS /NP /XD node_modules dist .turbo .git /XF .env | Out-Null
if ($LASTEXITCODE -ge 8) { Write-Error "Sao chép thất bại (robocopy $LASTEXITCODE)" }
Copy-Item (Join-Path $Dest ".env.example") (Join-Path $Dest ".env")
Push-Location $Dest
try {
  # Bắt buộc LF cho script shell chạy trên server Linux (.gitattributes đã khai báo).
  git init -q
  git add -A
  git -c commit.gpgsign=false commit -qm "chore: khởi tạo từ business-webapp-kit 1.0.0"
} catch {
  Write-Warning "Không tạo được commit đầu. Tự commit sau."
} finally { Pop-Location }
Write-Host "Đã tạo dự án tại $Dest"
Write-Host "Tiếp theo: cd $Dest; sửa .env và CLAUDE.md; pnpm install; pnpm dev:services; pnpm build; pnpm db:migrate; pnpm db:seed -- --demo; pnpm verify:quick"
Write-Host "Claude Code trên Windows: nên cài Git Bash để hook và skill chạy giống CI."
