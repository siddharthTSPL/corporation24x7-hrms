import {
  useQuery,
  useMutation,
  useQueryClient,
  useIsMutating,
} from "@tanstack/react-query";

import {
  createAnnouncement,
  getAllAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} from "../../../api/superadmin/announcement/su.announcement";



export const useGetAllAnnouncements = () => {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: getAllAnnouncements,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};



export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAnnouncement,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["announcements"],
      });
    },
  });
};



export const useUpdateAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateAnnouncement(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["announcements"],
      });
    },
  });
};



export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAnnouncement,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["announcements"],
      });
    },
  });
};



export const useAnnouncementLoading = () => {
  const loading = useIsMutating({
    mutationKey: ["announcement"],
  });

  return loading > 0;
};