import getManagerAnnouncements from "../../../api/managerapi/announcement/ma.announce.api";
import { useQuery } from "@tanstack/react-query";

export const useManagerAnnouncements = () => useQuery(["managerAnnouncements"], getManagerAnnouncements);