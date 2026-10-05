import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  BellRing,
  ChevronsUpDown,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  X,
} from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import { useEffect, useMemo, useState } from "react";
import type { CurrentUser } from "@app/shared";
import { Skeleton } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from "@/components/ui/menu";
import { toast } from "@/components/ui/toast";
import { ChangePasswordPage } from "@/features/account/change-password-page";
import { LoginPage } from "@/features/auth/login-page";
import { meQueryKey, useMe } from "@/features/auth/use-me";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { api } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { readPref, setTheme, useTheme, writePref } from "@/lib/theme";
import { type NavGroup, visibleNav } from "./nav";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

export function Logo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary text-[13px] font-bold tracking-wide text-primary-foreground",
        className,
      )}
    >
      {BRAND.shortName}
    </span>
  );
}

/** Menu chính. Cả trang chỉ có MỘT vùng `navigation` hiển thị: ở thanh bên (màn rộng) hoặc trong ngăn kéo (điện thoại). */
function MainNav({
  groups,
  collapsed = false,
  onNavigate,
}: {
  groups: NavGroup[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Menu chính" className="flex flex-col gap-0.5">
      {groups.map((g) => (
        <div key={g.label} className="flex flex-col gap-0.5">
          {collapsed ? (
            <div className="mx-2 my-2 h-px bg-sidebar-border first:hidden" />
          ) : (
            <p className="px-3 pt-4 pb-1.5 text-[11.5px] font-semibold tracking-wide text-faint">{g.label}</p>
          )}
          {g.items.map((item) => {
            const link = (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                aria-label={collapsed ? item.label : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-3 rounded-lg px-3 font-medium text-sidebar-foreground hover:bg-muted hover:text-heading",
                  collapsed && "justify-center px-0",
                )}
                activeProps={{
                  className: "bg-primary-soft font-semibold !text-primary-text hover:bg-primary-soft",
                }}
                activeOptions={{ exact: item.to === "/", includeSearch: false }}
              >
                <item.icon aria-hidden className="size-[18px] shrink-0" />
                {collapsed ? null : <span className="truncate">{item.label}</span>}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={item.to} label={item.label}>
                {link}
              </Tooltip>
            ) : (
              link
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function BrandBlock({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 px-1.5 pb-2", collapsed && "justify-center px-0")}>
      <Logo />
      {collapsed ? null : <span className="truncate text-[15px] font-bold text-heading">{BRAND.name}</span>}
    </div>
  );
}

/** Tìm nhanh (Ctrl+K): gõ tên trang để nhảy tới, chỉ gồm các trang người dùng được thấy. */
function QuickSearch({ groups }: { groups: NavGroup[] }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase();
  const results = useMemo(
    () => groups.flatMap((g) => g.items).filter((i) => fold(i.label).includes(fold(text.trim()))),
    [groups, text],
  );
  const go = (to: string) => {
    setOpen(false);
    setText("");
    void navigate({ to });
  };
  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      <RadixDialog.Trigger className="flex h-10 w-full max-w-sm items-center gap-2 rounded-lg bg-muted px-3 text-faint hover:text-muted-foreground max-sm:size-10 max-sm:justify-center max-sm:px-0">
        <Search aria-hidden className="size-4 shrink-0" />
        <span className="truncate max-sm:sr-only">Tìm trang...</span>
        <kbd className="ml-auto rounded border border-border bg-card px-1.5 text-[11px] font-semibold text-muted-foreground max-sm:hidden">
          Ctrl K
        </kbd>
      </RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-popover shadow-pop outline-none"
        >
          <RadixDialog.Title className="sr-only">Tìm trang</RadixDialog.Title>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (results[0]) go(results[0].to);
            }}
          >
            <label className="flex items-center gap-2.5 border-b border-border px-4">
              <Search aria-hidden className="size-4 text-faint" />
              <span className="sr-only">Tên trang</span>
              <input
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Gõ tên trang, Enter để mở"
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-faint"
              />
            </label>
          </form>
          <ul className="max-h-72 overflow-y-auto p-1.5">
            {results.map((i) => (
              <li key={i.to}>
                <button
                  type="button"
                  onClick={() => go(i.to)}
                  className="flex min-h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm hover:bg-muted"
                >
                  <i.icon aria-hidden className="size-4 text-muted-foreground" />
                  {i.label}
                </button>
              </li>
            ))}
            {results.length === 0 ? (
              <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                Không có trang nào khớp "{text}".
              </li>
            ) : null}
          </ul>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

function AccountMenu({ me }: { me: CurrentUser }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const theme = useTheme();
  const logout = useMutation({
    mutationFn: () => api<void>("/auth/logout", { method: "POST" }),
    // Chỉ khi server đã xóa phiên. Lỗi mạng mà vẫn xóa trạng thái thì phiên còn sống, F5 là vào lại.
    onSuccess: () => {
      qc.setQueryData(meQueryKey, null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== meQueryKey[0] });
    },
    onError: () => toast.error("Chưa đăng xuất được, thử lại"),
  });
  const roles = me.roles.map((r) => r.name).join(", ");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Tài khoản: ${me.fullName}`}
        className="flex items-center gap-2.5 rounded-xl p-1 text-left hover:bg-muted sm:pr-2"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-[13px] font-bold text-primary-text">
          {initials(me.fullName)}
        </span>
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block max-w-40 truncate text-[13.5px] font-semibold text-heading">
            {me.fullName}
          </span>
          {roles ? (
            <span className="block max-w-40 truncate text-xs text-muted-foreground">{roles}</span>
          ) : null}
        </span>
        <ChevronsUpDown aria-hidden className="hidden size-3.5 text-faint sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block font-semibold text-heading">{me.fullName}</span>
          <span className="block text-muted-foreground">{me.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate({ to: "/account/password" })}>
          <KeyRound aria-hidden />
          Đổi mật khẩu
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate({ to: "/account/notifications" })}>
          <BellRing aria-hidden />
          Cài đặt thông báo
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun aria-hidden /> : <Moon aria-hidden />}
          {theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive disabled={logout.isPending} onSelect={() => logout.mutate()}>
          <LogOut aria-hidden />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const iconButton =
  "grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-heading";

export function AppShell() {
  const me = useMe();
  const [collapsed, setCollapsed] = useState(() => readPref("sidebar") === "collapsed");
  const [drawer, setDrawer] = useState(false);

  if (me.isPending) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-8">
        <p className="sr-only">Đang tải...</p>
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9 w-2/3" />
      </div>
    );
  }
  if (me.isError)
    return (
      <p role="alert" className="p-6 text-sm text-destructive">
        Không kết nối được máy chủ.{" "}
        <button className="font-semibold underline underline-offset-2" onClick={() => me.refetch()}>
          Thử lại
        </button>
      </p>
    );
  if (!me.data) return <LoginPage />;
  if (me.data.mustChangePassword) return <ChangePasswordPage forced />;

  const groups = visibleNav(me.data);
  const toggleCollapsed = () => {
    writePref("sidebar", collapsed ? "open" : "collapsed");
    setCollapsed(!collapsed);
  };

  return (
    <div
      className={cn(
        "min-h-dvh lg:grid",
        collapsed ? "lg:grid-cols-[76px_minmax(0,1fr)]" : "lg:grid-cols-[264px_minmax(0,1fr)]",
      )}
    >
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar p-3 lg:flex">
        <BrandBlock collapsed={collapsed} />
        <MainNav groups={groups} collapsed={collapsed} />
      </aside>

      <RadixDialog.Root open={drawer} onOpenChange={setDrawer}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-40 bg-overlay lg:hidden" />
          <RadixDialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 flex w-[min(288px,86vw)] flex-col overflow-y-auto bg-sidebar p-3 shadow-pop outline-none lg:hidden"
          >
            <RadixDialog.Title className="sr-only">Menu</RadixDialog.Title>
            <div className="flex items-start justify-between">
              <BrandBlock />
              <RadixDialog.Close aria-label="Đóng menu" className={iconButton}>
                <X aria-hidden className="size-[18px]" />
              </RadixDialog.Close>
            </div>
            <MainNav groups={groups} onNavigate={() => setDrawer(false)} />
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-card/85 px-3 backdrop-blur sm:px-6">
          <button
            aria-label="Mở menu"
            className={cn(iconButton, "lg:hidden")}
            onClick={() => setDrawer(true)}
          >
            <Menu aria-hidden className="size-5" />
          </button>
          <button
            aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            className={cn(iconButton, "hidden lg:grid")}
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden className="size-[18px]" />
            ) : (
              <PanelLeftClose aria-hidden className="size-[18px]" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <QuickSearch groups={groups} />
          </div>
          <NotificationBell />
          <AccountMenu me={me.data} />
        </header>
        <main className="mx-auto w-full max-w-[1360px] px-4 pt-6 pb-14 sm:px-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
