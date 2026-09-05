import { useQuery } from "@tanstack/react-query";
import { fetchPlanFeatures } from "../../api/planFeature/planFeature.api";
import { useAuth } from "../../store/getmeauth/getmeauth";

// Tells the frontend whether Review, Timesheet, and Recruitment are
// unlocked for the caller's organisation. Enabled only once we know the
// person is logged in, so this never fires on the login screen.
export const usePlanFeatures = () => {
  const { data: auth } = useAuth();

  return useQuery({
    queryKey: ["plan-features"],
    queryFn: fetchPlanFeatures,
    enabled: !!auth?.role,
    staleTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: false,
  });
};