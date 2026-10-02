import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePurchaseRequestInput,
  Paginated,
  PrStatus,
  PurchaseRequestDto,
  TransitionPurchaseRequestInput,
} from "@app/shared";
import { api } from "@/lib/api";

const key = ["purchase-requests"] as const;

export function usePurchaseRequests(params: { page: number; status?: PrStatus }) {
  const qs = new URLSearchParams({ page: String(params.page), pageSize: "20" });
  if (params.status) qs.set("status", params.status);
  return useQuery({
    queryKey: [...key, params],
    queryFn: () => api<Paginated<PurchaseRequestDto>>(`/purchase-requests?${qs.toString()}`),
  });
}

export function useCreatePurchaseRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePurchaseRequestInput) =>
      api<PurchaseRequestDto>("/purchase-requests", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: TransitionPurchaseRequestInput & { id: string }) =>
      api<PurchaseRequestDto>(`/purchase-requests/${id}/transitions`, { method: "POST", body }),
    // Luôn tải lại, kể cả khi lỗi 409 (dữ liệu đã đổi) để người dùng thấy trạng thái mới nhất.
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
