import { getManagerAnnouncements, particularAnnouncement } from "../../../api/managerapi/announcement/ma.announce.api";
import { useQuery } from "@tanstack/react-query";

export const useManagerAnnouncements = () =>
  useQuery({
    queryKey: ["managerAnnouncements"],
    queryFn: getManagerAnnouncements,
  });

export const useParticularAnnouncement = (id) =>
  useQuery({
    queryKey: ["particularAnnouncement", id],
    queryFn: () => particularAnnouncement(id),
    enabled: !!id, // optional but recommended
  });