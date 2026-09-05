import ReimbursementBase from "./ReimbursementBase";
import {
  useGetPendingReimbursements,
  useGetAllReimbursements,
  useApproveReimbursement,
  useRejectReimbursement,
  useMarkReimbursementPaid,
} from "../../auth/server-state/superadmin/reimbursement/sureimbursement.hook";

export default function ReimbursementSuperadmin() {
  const pending = useGetPendingReimbursements();
  const all = useGetAllReimbursements();
  const approve = useApproveReimbursement();
  const reject = useRejectReimbursement();
  const markPaid = useMarkReimbursementPaid();

  return (
    <ReimbursementBase
      roleLabel="Review claims raised by Admins, and see every claim across your organisation — employees, managers, and admins."
      canApply={false}
      reviewQueue={{ pending, all, approve, reject, markPaid }}
    />
  );
}

