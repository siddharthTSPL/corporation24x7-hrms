
import { getAnnouncements } from "../../../api/employeeapi/announcement/em.announce.api";


import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useGetAnnouncements = () => {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: ["announcements"],
        queryFn: () => getAnnouncements(),
        onSuccess: (data) => {
            queryClient.setQueryData(["announcements"], data.announcements);
        },
        staleTime: 1000 * 60 * 5,
        refetchOnMount: true,
    })
};