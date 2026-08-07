import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearReadNotifications,
} from "../../api/notification/notification.api";

const UNREAD_POLL_MS = 30000;

export const useUnreadNotificationCount = (enabled = true) => {
  return useQuery({
    queryKey: ["notifications", "unreadCount"],
    queryFn: getUnreadCount,
    enabled,
    refetchInterval: enabled ? UNREAD_POLL_MS : false,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });
};

export const useNotifications = ({ page = 1, limit = 20, filter = "all", type } = {}, enabled = true) => {
  return useQuery({
    queryKey: ["notifications", "list", { page, limit, filter, type }],
    queryFn: () => getNotifications({ page, limit, filter, type }),
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 10000,
    keepPreviousData: true,
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["markNotificationAsRead"],
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["markAllNotificationsAsRead"],
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["deleteNotification"],
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useClearReadNotifications = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["clearReadNotifications"],
    mutationFn: clearReadNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};
