import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { type CurrentUser, type LoginInput, loginSchema } from "@app/shared";
import { Logo } from "@/app/app-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { meQueryKey } from "./use-me";

export function LoginPage() {
  const qc = useQueryClient();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const login = useMutation({
    mutationFn: (body: LoginInput) => api<CurrentUser>("/auth/login", { method: "POST", body }),
    onSuccess: (user) => qc.setQueryData(meQueryKey, user),
  });

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Bảng thương hiệu: chỉ hiện trên màn rộng; điện thoại vào thẳng form. */}
      <div className="hidden flex-col justify-between bg-primary-soft p-12 lg:flex">
        <div className="flex items-center gap-3">
          <Logo className="size-11 text-sm" />
          <span className="text-lg font-bold text-heading">{BRAND.name}</span>
        </div>
        <p className="max-w-md text-3xl leading-snug font-bold text-heading">
          Lập phiếu, duyệt và theo dõi công việc ở một nơi.
        </p>
        <p className="text-[13px] text-muted-foreground">Hệ thống nội bộ. Chỉ dùng tài khoản được cấp.</p>
      </div>

      <div className="flex items-center justify-center bg-card p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-3 lg:hidden">
            <Logo />
            <span className="text-base font-bold text-heading">{BRAND.name}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Đăng nhập</h1>
            <p className="mt-1 text-muted-foreground">Dùng email công ty và mật khẩu được cấp.</p>
          </div>
          <form className="space-y-4" onSubmit={form.handleSubmit((v) => login.mutate(v))} noValidate>
            <Field label="Email" error={form.formState.errors.email?.message}>
              <Input type="email" autoComplete="username" {...form.register("email")} />
            </Field>
            <Field label="Mật khẩu" error={form.formState.errors.password?.message}>
              <Input type="password" autoComplete="current-password" {...form.register("password")} />
            </Field>
            {login.error ? (
              <p role="alert" className="text-sm text-destructive">
                {login.error instanceof ApiError ? login.error.message : "Không kết nối được máy chủ"}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
          <p className="text-[13px] text-muted-foreground">
            Quên mật khẩu? Liên hệ quản trị viên để được cấp lại.
          </p>
        </div>
      </div>
    </div>
  );
}
