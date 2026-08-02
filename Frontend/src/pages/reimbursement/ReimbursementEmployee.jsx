import ReimbursementBase from "./ReimbursementBase";
import {
  useGetMyReimbursements,
  useApplyReimbursement,
  useUpdateReimbursement,
  useDeleteReimbursement,
} from "../../auth/server-state/employee/employeereimbursement/employeereimbursement.hook";

export default function ReimbursementEmployee() {
  const myClaims = useGetMyReimbursements();
  const applyMutation = useApplyReimbursement();
  const updateMutation = useUpdateReimbursement();
  const deleteMutation = useDeleteReimbursement();

  return (
    <ReimbursementBase
      roleLabel="Submit and track your reimbursement claims."
      canApply
      myClaims={myClaims}
      applyMutation={applyMutation}
      updateMutation={updateMutation}
      deleteMutation={deleteMutation}
    />
  );
}
