import { Link } from "@tanstack/react-router";
import {
  NOTIFICATION_CHANNEL_LABELS,
  type NotificationChannel,
  type UpdateNotificationSettingsInput,
} from "@app/shared";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page";
import { apiErrorMessage } from "@/lib/api";
import { useNotificationSettings, useUpdateNotificationSettings } from "./api";

/** Người dùng bật/tắt từng kênh ngoài (spec 003). Thông báo trong app luôn bật. */
export function NotificationSettingsPage() {
  const q = useNotificationSettings();
  const update = useUpdateNotificationSettings();
  const error = apiErrorMessage(q.error) ?? apiErrorMessage(update.error);

  const toggle = (channel: NotificationChannel, enabled: boolean) => {
    if (!q.data) return;
    const next = Object.fromEntries(
      q.data.map((s) => [s.channel, s.enabled]),
    ) as UpdateNotificationSettingsInput;
    update.mutate({ ...next, [channel]: enabled });
  };

  return (
    <div className="max-w-xl space-y-5">
      <PageHeader title="Cài đặt thông báo" />
      <p className="text-muted-foreground">
        Thông báo luôn hiện ở{" "}
        <Link
          to="/notifications"
          className="font-medium text-primary-text underline-offset-4 hover:underline"
        >
          chuông trên thanh trên
        </Link>
        . Chọn thêm kênh muốn nhận:
      </p>
      {q.isPending ? <p className="text-sm text-muted-foreground">Đang tải...</p> : null}
      <Card className="space-y-3">
        {q.data?.map((s) => (
          <div key={s.channel}>
            <Checkbox
              label={NOTIFICATION_CHANNEL_LABELS[s.channel]}
              checked={s.enabled && s.available}
              disabled={!s.available || update.isPending}
              onChange={(e) => toggle(s.channel, e.target.checked)}
            />
            {s.unavailableReason ? (
              <p className="ml-6 text-xs text-muted-foreground">{s.unavailableReason}</p>
            ) : null}
          </div>
        ))}
      </Card>
      {update.isSuccess ? (
        <p role="status" className="text-sm text-success">
          Đã lưu.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
