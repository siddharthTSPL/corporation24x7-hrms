import ReimbursementBase from "./ReimbursementBase";
import {
  useGetMyReimbursements,
  useApplyReimbursement,
  useUpdateReimbursement,
  useDeleteReimbursement,
  useGetPendingReimbursements,
  useGetAllReimbursements,
  useApproveReimbursement,
  useRejectReimbursement,
  useMarkReimbursementPaid,
} from "../../auth/server-state/adminreimbursement/adminreimbursement.hook";

export default function ReimbursementAdmin() {
  const myClaims = useGetMyReimbursements();
  const applyMutation = useApplyReimbursement();
  const updateMutation = useUpdateReimbursement();
  const deleteMutation = useDeleteReimbursement();

  const pending = useGetPendingReimbursements();
  const all = useGetAllReimbursements();
  const approve = useApproveReimbursement();
  const reject = useRejectReimbursement();
  const markPaid = useMarkReimbursementPaid();

  return (
    <ReimbursementBase
      roleLabel="Review claims from employees and managers, and submit your own — those go to your SuperAdmin."
      canApply
      myClaims={myClaims}
      applyMutation={applyMutation}
      updateMutation={updateMutation}
      deleteMutation={deleteMutation}
      reviewQueue={{ pending, all, approve, reject, markPaid }}
    />
  );
}
