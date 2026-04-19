import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Member } from "../types";

export function useAuth() {
  const { data: member, isLoading } = useQuery<Member | null>({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api.get<Member>("/auth/me");
      } catch {
        return null;
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      queryClient.setQueryData(["me"], null);
      queryClient.clear();
    },
  });

  return {
    member: member ?? null,
    isLoading,
    logout: logoutMutation.mutate,
  };
}
