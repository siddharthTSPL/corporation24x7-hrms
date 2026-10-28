import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { connectSocket, disconnectSocket } from "./socket";

// Module -> which cached React Query lists to refetch. Matched on the FIRST
// element of the query key, so every role's variant (adminPendingWFH,
// superadmin-leaves, managerTickets, ...) is covered. Only queries that are
// currently on screen refetch; the rest are just marked stale.
const MODULES = {
  leave: /leave|^employeeStats$|^myTeamOverview$/i,
  wfh: /wfh/i,
  timesheet: /^ts[A-Z]/,
  attendance: /^(attendance|attendanceOverview|employeeAttendanceHistory|myTeamOverview|todayLeaves)$/,
  reimbursement: /reimbursement/i,
  ticket: /ticket/i,
  announcement: /announcement/i,
  document: /document/i,
  asset: /asset/i,
  review: /review/i,
  training: /training/i,
  overtime: /overtime/i,
  payroll: /^(payrolls|payslip|my-payslips|salary-structures|fnf-records|fnf-eligible|payroll-policy)$/,
  recruitment: /^(all-requisitions|pending-requisitions|my-requisitions|requisition|candidate|candidates|offer-bundle|recruitment-approvers|recruitment-interviewers)$/,
  policy: /^(policies|policy-dashboard|policy-detail)$/,
  holiday: /holiday/i,
  shift: /shift/i,
  people: /^(employees|managers|admins|employee|manager|admin|employeeStats|usersUnderManager)$/,
};

// Notification type -> module(s) (a notification can touch more than one list).
const MODULES_BY_NOTIFICATION = {
  leave_applied: ["leave"],
  leave_approved: ["leave", "attendance"],
  leave_rejected: ["leave"],
  leave_forwarded: ["leave"],
  wfh_applied: ["wfh"],
  wfh_approved: ["wfh", "attendance"],
  wfh_rejected: ["wfh"],
  wfh_forwarded: ["wfh"],
  asset_assigned: ["asset"],
  asset_returned: ["asset"],
  announcement: ["announcement"],
  ticket: ["ticket"],
  reimbursement: ["reimbursement"],
  document: ["document"],
  policy: ["policy"],
  payroll: ["payroll"],
  review: ["review"],
  training: ["training"],
  timesheet: ["timesheet", "attendance"],
  overtime: ["overtime", "timesheet"],
  holiday: ["holiday"],
};

const DEBOUNCE_MS = 1200;

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
    const timers = new Map();

    const refreshNotifications = () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

    // Many writes in a row (e.g. a bulk approve) -> one refetch per module.
    const refreshModule = (name) => {
      const re = MODULES[name];
      if (!re) return;
      clearTimeout(timers.get(name));
      timers.set(
        name,
        setTimeout(() => {
          timers.delete(name);
          queryClient.invalidateQueries({
            predicate: (q) => typeof q.queryKey[0] === "string" && re.test(q.queryKey[0]),
          });
        }, DEBOUNCE_MS)
      );
    };

    // A notification was created for me: bell + related lists.
    const onNotification = (notification) => {
      refreshNotifications();
      (MODULES_BY_NOTIFICATION[notification?.type] || []).forEach(refreshModule);
    };

    // Someone in my organisation changed data (leave applied, timesheet
    // submitted, ticket raised, ...): refresh that module's lists.
    const onDataChanged = (evt) => refreshModule(evt?.module);

    // Read / delete / clear done in another tab or device.
    const onNotificationChanged = () => refreshNotifications();

    // After a reconnect, catch up on anything missed while offline.
    const onConnect = () => {
      if (firstConnect) {
        firstConnect = false;
        return;
      }
      queryClient.invalidateQueries();
    };

    socket.on("notification:new", onNotification);
    socket.on("notification:changed", onNotificationChanged);
    socket.on("data:changed", onDataChanged);
    socket.on("connect", onConnect);

    return () => {
      timers.forEach(clearTimeout);
      socket.off("notification:new", onNotification);
      socket.off("notification:changed", onNotificationChanged);
      socket.off("data:changed", onDataChanged);
      socket.off("connect", onConnect);
    };
  }, [enabled, queryClient]);
}