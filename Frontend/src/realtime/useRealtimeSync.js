import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { connectSocket, disconnectSocket } from "./socket";

// Which cached lists to refetch when a notification of a given type arrives,
// so pages (leave requests, WFH, tickets, ...) update without a manual refresh.
// Keys are React Query key prefixes already used across auth/server-state.
const LEAVE_KEYS = ["leaveHistory", "AllLeaves", "leaves", "superadmin-leaves", "forwardedLeavesManager", "allManagerLeaves", "myLeavesManager", "employeeStats"];
const WFH_KEYS = ["adminPendingWFH", "superadmin-pending-wfh", "pendingWFH", "forwardedWFH", "teamWFH", "employee-wfh"];
const ASSET_KEYS = ["admin-assets", "admin-asset", "superadmin-assets", "superadmin-asset"];
const TICKET_KEYS = ["tickets", "ticket-stats", "ticket", "employeeTickets", "adminTickets", "managerTickets"];
const REIMB_KEYS = ["manager-reimbursements", "employee-reimbursements", "admin-my-reimbursements"];
const DOC_KEYS = ["documents", "personalDocuments", "personal-documents", "manager-documents", "manager-personal-documents", "expenseDocuments", "expense-documents"];
const TIMESHEET_KEYS = ["tsPendingApprovals", "tsMyTimesheets", "tsOrgAllTimesheets", "tsWeekLog", "tsJobsAssignedToMe", "tsJobsCreatedByMe", "attendance"];

const KEYS_BY_TYPE = {
  leave_applied: LEAVE_KEYS,
  leave_approved: LEAVE_KEYS,
  leave_rejected: LEAVE_KEYS,
  leave_forwarded: LEAVE_KEYS,
  wfh_applied: WFH_KEYS,
  wfh_approved: WFH_KEYS,
  wfh_rejected: WFH_KEYS,
  wfh_forwarded: WFH_KEYS,
  asset_assigned: ASSET_KEYS,
  asset_returned: ASSET_KEYS,
  announcement: ["announcements"],
  ticket: TICKET_KEYS,
  reimbursement: REIMB_KEYS,
  document: DOC_KEYS,
  policy: ["policies", "policy-dashboard"],
  payroll: ["payrolls"],
  review: ["allReviews"],
  timesheet: TIMESHEET_KEYS,
  overtime: TIMESHEET_KEYS,
};

// Mount once inside the authenticated layout. `enabled` should be true only
// while a user is logged in; flipping it to false (logout) closes the socket.
export default function useRealtimeSync(enabled) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      disconnectSocket();
      return undefined;
    }

    const socket = connectSocket();
    let firstConnect = true;

    const refreshNotifications = () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

    const onNew = (notification) => {
      // Bell badge + dropdown refetch -> the bell's existing logic then plays
      // the chime and shows the toast for the new item.
      refreshNotifications();
      (KEYS_BY_TYPE[notification?.type] || []).forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      );
    };

    // Read / delete / clear done in another tab or device.
    const onChanged = () => refreshNotifications();

    // After a reconnect, catch up on anything missed while offline.
    const onConnect = () => {
      if (firstConnect) {
        firstConnect = false;
        return;
      }
      refreshNotifications();
    };

    socket.on("notification:new", onNew);
    socket.on("notification:changed", onChanged);
    socket.on("connect", onConnect);

    return () => {
      socket.off("notification:new", onNew);
      socket.off("notification:changed", onChanged);
      socket.off("connect", onConnect);
    };
  }, [enabled, queryClient]);
}
