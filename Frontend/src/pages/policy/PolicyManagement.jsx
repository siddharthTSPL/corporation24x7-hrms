import { useState } from "react";
import {
  FaFileContract,
  FaPlus,
  FaChartBar,
  FaRocket,
  FaArchive,
  FaTrash,
  FaUsers,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaLayerGroup,
} from "react-icons/fa";
import toast from "react-hot-toast";
import {
  usePolicyDashboard,
  useListPolicies,
  usePublishPolicy,
  useArchivePolicy,
  useDeletePolicy,
} from "../../auth/server-state/policy/policy.hook";
import CreatePolicyModal from "./CreatePolicyModal";
import PolicyReportModal from "./PolicyReportModal";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-green-50 text-green-600",
  archived: "bg-gray-200 text-gray-500",
};

export default function PolicyManagement() {
  const { data: dashboard } = usePolicyDashboard();
  const [filters, setFilters] = useState({ status: "" });
  const { data, isLoading } = useListPolicies(filters);
  const { mutate: publish } = usePublishPolicy();
  const { mutate: archive } = useArchivePolicy();
  const { mutate: remove } = useDeletePolicy();

  const [showCreate, setShowCreate] = useState(false);
  const [reportPolicyId, setReportPolicyId] = useState(null);

  const policies = data?.policies || [];
  const summary = dashboard?.summary;

  const handlePublish = (policy) => {
    publish(
      { id: policy._id },
      {
        onSuccess: () => toast.success(`"${policy.title}" published`),
        onError: (err) => toast.error(err?.response?.data?.message || "Could not publish"),
      }
    );
  };

  const handleArchive = (policy) => {
    if (!window.confirm(`Archive "${policy.title}"? It will stop applying to anyone new.`)) return;
    archive(policy._id, {
      onSuccess: () => toast.success("Policy archived"),
      onError: (err) => toast.error(err?.response?.data?.message || "Could not archive"),
    });
  };

  const handleDelete = (policy) => {
    if (!window.confirm(`Delete draft "${policy.title}"? This cannot be undone.`)) return;
    remove(policy._id, {
      onSuccess: () => toast.success("Draft deleted"),
      onError: (err) => toast.error(err?.response?.data?.message || "Could not delete"),
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="rounded-2xl bg-gradient-to-r from-[#730042] to-[#a3005f] p-5 mb-6 flex items-center justify-between flex-wrap gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-white">
            <FaFileContract size={18} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">TorchX Policy</h1>
            <p className="text-sm text-white/75">Create, publish, and track acknowledgement — all in one place.</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-[#730042] text-sm font-medium rounded-lg hover:bg-white/90"
        >
          <FaPlus /> Create Policy
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Policies", value: summary.totalPolicies, icon: <FaLayerGroup />, color: "text-[#730042] bg-[#730042]/10" },
            { label: "Published", value: summary.published, icon: <FaCheckCircle />, color: "text-green-600 bg-green-50" },
            { label: "Pending Acks", value: summary.pendingAcknowledgements, icon: <FaClock />, color: "text-amber-600 bg-amber-50" },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.color}`}>{c.icon}</div>
              <div>
                <p className="text-2xl font-semibold text-[#1F2937] leading-tight">{c.value}</p>
                <p className="text-xs text-gray-500">{c.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {["", "draft", "published", "archived"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilters({ status: s })}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              filters.status === s ? "bg-[#730042] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s ? s[0].toUpperCase() + s.slice(1) : "All"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Policy</th>
              <th className="text-left px-4 py-2">Category</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Acknowledgement</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Loading policies...</td></tr>
            )}
            {!isLoading && policies.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  <FaFileContract className="mx-auto mb-2 text-2xl text-gray-300" />
                  No policies yet.{" "}
                  <button onClick={() => setShowCreate(true)} className="text-[#730042] font-medium hover:underline">
                    Create your first one
                  </button>
                  .
                </td>
              </tr>
            )}
            {policies.map((p) => {
              const ack = p.ackSummary || {};
              return (
                <tr key={p._id} className="border-t border-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#1F2937]">{p.title}</div>
                    <div className="text-xs text-gray-400">{p.code || "-"} · v{p.currentVersion?.versionNumber || "-"}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.category}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.status === "published" ? (
                      <span className="text-gray-600">
                        {ack.ACKNOWLEDGED || 0} acknowledged · {(ack.PENDING || 0) + (ack.VIEWED || 0)} pending
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600">
                        <FaExclamationTriangle size={11} /> Publish to enable
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-gray-500">
                      {p.status === "published" && (
                        <button title="Acknowledgement report" onClick={() => setReportPolicyId(p._id)} className="hover:text-[#730042]">
                          <FaChartBar />
                        </button>
                      )}
                      {p.status === "draft" && (
                        <>
                          <button
                            title="Publish — required before employees see the Acknowledge option"
                            onClick={() => handlePublish(p)}
                            className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700"
                          >
                            <FaRocket /> Publish
                          </button>
                          <button title="Delete draft" onClick={() => handleDelete(p)} className="hover:text-red-600">
                            <FaTrash />
                          </button>
                        </>
                      )}
                      {p.status === "published" && (
                        <button title="Archive" onClick={() => handleArchive(p)} className="hover:text-gray-700">
                          <FaArchive />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="flex items-center gap-2 text-xs text-gray-400 mt-4">
        <FaUsers /> Audience is resolved automatically from each policy's assignment rule — new joiners and
        department transfers are picked up the next time they log in.
      </p>

      {showCreate && <CreatePolicyModal onClose={() => setShowCreate(false)} />}
      {reportPolicyId && <PolicyReportModal policyId={reportPolicyId} onClose={() => setReportPolicyId(null)} />}
    </div>
  );
}