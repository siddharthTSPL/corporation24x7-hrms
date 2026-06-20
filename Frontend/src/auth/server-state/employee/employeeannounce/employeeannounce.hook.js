import { getAnnouncements, particularAnnouncement } from "../../../api/employeeapi/announcement/em.announce.api";
import { useQuery } from "@tanstack/react-query";

export const useGetAnnouncements = () => {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: () => getAnnouncements(),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetAnnouncement = (id) => {
  return useQuery({
    queryKey: ["announcement", id],
    queryFn: () => particularAnnouncement(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });
};