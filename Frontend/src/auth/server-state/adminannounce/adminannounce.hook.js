import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAnnouncement } from "../../api/adminapi/announcement/ad.announce.api";

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
};