import { useQuery } from "@tanstack/react-query";
import { getAnalyticsSummary } from "../../api/analytics/analytics.api";

export const useAnalyticsSummary = ({ role = "admin", from, to } = {}, enabled = true) => {
  return useQuery({
    queryKey: ["analytics", "summary", role, from, to],
    queryFn: () => getAnalyticsSummary({ role, from, to }),
    enabled,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
};