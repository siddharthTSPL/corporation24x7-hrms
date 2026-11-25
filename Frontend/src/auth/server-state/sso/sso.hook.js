import { useMutation, useQuery } from "@tanstack/react-query";
import { exchangeSsoTicket, getSsoProviders } from "../../api/sso/sso.api";

// Which "Sign in with …" buttons the platform has configured.
export const useSsoProviders = () =>
  useQuery({
    queryKey: ["sso-providers"],
    queryFn: getSsoProviders,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

export const useExchangeSsoTicket = () => useMutation({ mutationFn: exchangeSsoTicket });