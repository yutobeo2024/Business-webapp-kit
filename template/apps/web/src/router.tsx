import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ChangePasswordPage } from "@/features/account/change-password-page";
import { LoginPage } from "@/features/auth/login-page";
import { meQueryKey, useMe } from "@/features/auth/use-me";
import { PurchaseRequestListPage } from "@/features/purchase-requests/list-page";
import { api } from "@/lib/api";

function AppShell() {
  const me = useMe();
  const qc = useQueryClient();
  const logout = useMutation({
    mutationFn: () => api<void>("/auth/logout", { method: "POST" }),
    // Chỉ khi server đã xóa phiên. Lỗi mạng mà vẫn xóa trạng thái thì phiên còn sống, F5 là vào lại.
    onSuccess: () => {
      qc.setQueryData(meQueryKey, null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== meQueryKey[0] });
    },
  });

  if (me.isPending) return <p className="p-6 text-sm text-neutral-500">Đang tải...</p>;
  if (me.isError)
    return (
      <p role="alert" className="p-6 text-sm text-red-600">
        Không kết nối được máy chủ.{" "}
        <button className="underline" onClick={() => me.refetch()}>
          Thử lại
        </button>
      </p>
    );
  if (!me.data) return <LoginPage />;
  if (me.data.mustChangePassword) return <ChangePasswordPage forced />;

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <span className="font-semibold">Quản lý quy trình</span>
          <div className="flex items-center gap-3 text-sm">
            <span>
              {me.data.fullName}
              {me.data.roles.length ? ` · ${me.data.roles.map((r) => r.name).join(", ")}` : ""}
            </span>
            <Button size="sm" variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending}>
              Đăng xuất
            </Button>
            {logout.isError ? (
              <span role="alert" className="text-red-600">
                Chưa đăng xuất được, thử lại
              </span>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
    </div>
  );
}

const rootRoute = createRootRoute({ component: AppShell });
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: PurchaseRequestListPage,
});

export const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute]) });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
