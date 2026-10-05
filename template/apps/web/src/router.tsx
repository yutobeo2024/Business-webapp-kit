import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import {
  can,
  listDepartmentsQuerySchema,
  listPurchaseRequestsQuerySchema, // sample
  listRolesQuerySchema,
  listUsersQuerySchema,
  type Permission,
} from "@app/shared";
import { AppShell } from "@/app/app-shell";
import { visibleNav } from "@/app/nav";
import { EmptyState } from "@/components/ui/empty-state";
import { ChangePasswordPage } from "@/features/account/change-password-page";
import { DepartmentsPage } from "@/features/admin/departments-page";
import { RolesPage } from "@/features/admin/roles-page";
import { UsersPage } from "@/features/admin/users-page";
import { useMe } from "@/features/auth/use-me";
import { ExportsPage } from "@/features/exports/exports-page";
import { NotificationsPage } from "@/features/notifications/notifications-page";
import { NotificationSettingsPage } from "@/features/notifications/settings-page";
import { HomePage } from "@/features/home/home-page";
import { PurchaseRequestListPage } from "@/features/purchase-requests/list-page"; // sample
import { searchValidator } from "@/lib/list-search";

const rootRoute = createRootRoute({ component: AppShell });
function Home() {
  const me = useMe();
  const links = visibleNav(me.data)
    .flatMap((g) => g.items)
    .filter((n) => n.to !== "/");
  return <HomePage links={links} />;
}
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Home });
// sample:begin
const purchaseRequestsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/purchase-requests",
  validateSearch: searchValidator(listPurchaseRequestsQuerySchema),
  component: PurchaseRequestListPage,
});
// sample:end
const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notifications",
  component: NotificationsPage,
});
const exportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/exports",
  component: ExportsPage,
});
const accountNotificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account/notifications",
  component: NotificationSettingsPage,
});
const accountPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account/password",
  component: () => <ChangePasswordPage />,
});

/** Trang chỉ hiện khi có quyền (mở thẳng URL mà không có quyền thì báo, thay vì một bảng toàn lỗi 403). */
function RequirePermission({ permission, page }: { permission: Permission; page: ReactNode }) {
  const me = useMe();
  if (!can(me.data, permission)) {
    return (
      <EmptyState
        icon={Lock}
        title="Bạn không có quyền xem trang này."
        description="Cần quyền thì liên hệ quản trị viên của hệ thống."
      />
    );
  }
  return page;
}

const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/users",
  validateSearch: searchValidator(listUsersQuerySchema),
  component: () => <RequirePermission permission="users.manage" page={<UsersPage />} />,
});
const adminRolesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/roles",
  validateSearch: searchValidator(listRolesQuerySchema),
  component: () => <RequirePermission permission="roles.manage" page={<RolesPage />} />,
});
const adminDepartmentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/departments",
  validateSearch: searchValidator(listDepartmentsQuerySchema),
  component: () => <RequirePermission permission="departments.manage" page={<DepartmentsPage />} />,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    homeRoute,
    purchaseRequestsRoute, // sample
    exportsRoute,
    notificationsRoute,
    accountPasswordRoute,
    accountNotificationsRoute,
    adminUsersRoute,
    adminRolesRoute,
    adminDepartmentsRoute,
  ]),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
