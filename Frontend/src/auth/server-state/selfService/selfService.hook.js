import { useQuery } from "@tanstack/react-query";
import { fetchSelfServiceSummary } from "../../api/selfService/selfService.api";
import { useAuth } from "../../store/getmeauth/getmeauth";

export const useSelfServiceSummary = () => {
  const { data: auth } = useAuth();

  return useQuery({
    queryKey: ["self-service", "summary"],
    queryFn: fetchSelfServiceSummary,
    enabled: !!auth?.role,
    staleTime: 1000 * 60,
    retry: false,
    refetchOnWindowFocus: false,
  });
};