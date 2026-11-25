import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { useConvsStore } from "../../auth/store/convs/convsStore";
import { resolveNotificationAction } from "./notificationLinks";

// One click handler for every place a notification can be clicked
// (bell dropdown, live toast, /notifications page).
//   chat / call / group / contact -> opens the Convs dock (on that conversation when known)
//   other apps (Peple)             -> full page load
//   everything else               -> a Talent route that really exists
export default function useOpenNotification() {
  const navigate = useNavigate();
  const { data: auth } = useAuth();
  const role = auth?.role;

  return useCallback(
    (notification) => {
      if (!notification) return;
      try {
        const action = resolveNotificationAction(notification, role);
        if (action.kind === "convs") {
          useConvsStore.getState().sendCommand({
            type: "open-conversation",
            conversationId: action.conversationId,
            view: action.view,
          });
          return;
        }
        if (action.kind === "external") {
          window.location.assign(action.href);
          return;
        }
        navigate(action.to);
      } catch (err) {
        console.warn("[notification] open failed", err);
        toast.error("Couldn't open that notification");
      }
    },
    [navigate, role],
  );
}
