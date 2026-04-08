
import { getAnnouncements } from "../../../api/employeeapi/announcement/em.announce.api";


import { useQuery } from "@tanstack/react-query";

export const useGetAnnouncements = () => {
     return useQuery(["announcements"], getAnnouncements);
};