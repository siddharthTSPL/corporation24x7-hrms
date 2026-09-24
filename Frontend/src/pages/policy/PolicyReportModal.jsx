import { FaTimes, FaDownload, FaCheckCircle, FaClock } from "react-icons/fa";
import { useAcknowledgementReport } from "../../auth/server-state/policy/policy.hook";
import { exportAcknowledgementReportUrl } from "../../auth/api/policy/policy.api";

const STATUS_STYLES = {
  ACKNOWLEDGED: { icon: <FaCheckCircle />, cls: "text-green-600 bg-green-50" },
  VIEWED: { icon: <FaClock />, cls: "text-blue-600 bg-blue-50" },
  PENDING: { icon: <FaClock />, cls: "text-gray-500 bg-gray-100" },
};

// Shows, per policy, exactly who has acknowledged and who hasn't — this is
// the data SuperAdmin/Admin need visible for the policy they created.
export default function PolicyReportModal({ policyId, onClose }) {
  const { data, isLoading } = useAcknowledgementReport(policyId);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-[#1F2937]">{data?.policy?.title || "Acknowledgement Report"}</h2>
            {data?.summary && (
              <p className="text-xs text-gray-500 mt-0.5">
                {data.summary.acknowledged}/{data.summary.total} acknowledged ({data.summary.acknowledgementRate}%) ·{" "}
                {data.summary.pending} pending
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {policyId && (
              <a
                href={exportAcknowledgementReportUrl(policyId)}
                className="flex items-center gap-1 text-xs text-[#730042] hover:underline"
              >
                <FaDownload /> Export CSV
              </a>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="overflow-auto flex-1">
          {isLoading && <p className="p-6 text-sm text-gray-500">Loading report...</p>}
          {!isLoading && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2">Employee</th>
                  <th className="text-left px-4 py-2">Department</th>
                  <th className="text-left px-4 py-2">Role</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Acknowledged On</th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows || []).map((row) => {
                  const s = STATUS_STYLES[row.status] || STATUS_STYLES.PENDING;
                  return (
                    <tr key={`${row.employeeModel}-${row.employeeId}`} className="border-t border-gray-50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-[#1F2937]">{row.name}</div>
                        <div className="text-xs text-gray-400">{row.empid}</div>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{row.department || "-"}</td>
                      <td className="px-4 py-2 text-gray-600 capitalize">{row.employeeModel}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
                          {s.icon} {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {row.acknowledgedAt ? new Date(row.acknowledgedAt).toLocaleString("en-IN") : "-"}
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && (data?.rows || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                      No one matches this policy's assignment rules yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}