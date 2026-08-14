import { useQuery } from "@tanstack/react-query";
import { getMyAssetsManager } from "../../../api/managerapi/asset/ma.asset.api";

export const useGetMyAssetsManager = () =>
  useQuery({
    queryKey: ["my-assets-manager"],
    queryFn: getMyAssetsManager,
    staleTime: 60 * 1000,
    retry: false,
  });