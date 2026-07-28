import ReimbursementBase from "./ReimbursementBase";
import {
  useGetMyReimbursements,
  useApplyReimbursement,
  useUpdateReimbursement,
  useDeleteReimbursement,
} from "../../auth/server-state/manager/managerreimbursement/managerreimbursement.hook";

export default function ReimbursementManager() {
  const myClaims = useGetMyReimbursements();
  const applyMutation = useApplyReimbursement();
  const updateMutation = useUpdateReimbursement();
  const deleteMutation = useDeleteReimbursement();

  return (
    <ReimbursementBase
      roleLabel="Submit and track your reimbursement claims. These are reviewed by your Admin."
      canApply
      myClaims={myClaims}
      applyMutation={applyMutation}
      updateMutation={updateMutation}
      deleteMutation={deleteMutation}
    />
  );
}
