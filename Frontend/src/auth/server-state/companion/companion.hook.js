import { useMutation } from "@tanstack/react-query";
import { getCompanionLink, redeemCompanionLink } from "../../api/companion/companion.api";

// On the ALREADY-logged-in browser: generates the link to open elsewhere.
export const useGenerateCompanionLink = () => {
  return useMutation({ mutationFn: getCompanionLink });
};

// On the OTHER browser: exchanges the link's token for a real session here.
export const useRedeemCompanionLink = () => {
  return useMutation({ mutationFn: redeemCompanionLink });
};