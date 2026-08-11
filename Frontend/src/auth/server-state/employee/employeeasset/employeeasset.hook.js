import { useQuery } from "@tanstack/react-query";
import { getMyAssetsEmployee } from "../../../api/employeeapi/asset/em.asset.api";

export const useGetMyAssetsEmployee = () =>
  useQuery({
    queryKey: ["my-assets-employee"],
    queryFn: getMyAssetsEmployee,
    staleTime: 60 * 1000,
    retry: false,
  });