import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createAnnouncement, getAllAnnouncement, deleteAnnouncement, updateAnnouncement } from "../../api/adminapi/announcement/ad.announce.api";

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
};

export const useGetAllAnnouncement = () => {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: getAllAnnouncement,
  });
};

export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
};

export const useUpdateAnnouncement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
};