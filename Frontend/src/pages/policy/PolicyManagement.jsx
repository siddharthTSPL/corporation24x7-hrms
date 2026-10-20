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
  FaUndo,
  FaSpinner,
} from "react-icons/fa";
import toast from "react-hot-toast";
import {
  usePolicyDashboard,
  useListPolicies,
  usePublishPolicy,
  useArchivePolicy,
  useDeletePolicy,
} from "../../auth/server-state/policy/policy.hook";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import CreatePolicyModal from "./CreatePolicyModal";
import PolicyReportModal from "./PolicyReportModal";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-green-50 text-green-600",
  archived: "bg-gray-200 text-gray-500",
};

export default function PolicyManagement() {
  const { data: dashboard } = usePolicyDashboard();
  const { data: auth } = useAuth();
  const isSuperAdmin = auth?.role === "superadmin";
  const [filters, setFilters] = useState({ status: "", createdBy: "" });
  const { data, isLoading } = useListPolicies(filters);
  const { mutate: publish } = usePublishPolicy();
  const { mutate: archive } = useArchivePolicy();
  const { mutate: remove } = useDeletePolicy();

  const [showCreate, setShowCreate] = useState(false);
  const [reportPolicyId, setReportPolicyId] = useState(null);
  // { type: "archive" | "delete" | "restore", policy }  -> in-app confirm popup
  const [confirm, setConfirm] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [confirmError, setConfirmError] = useState("");

  const policies = data?.policies || [];
  const summary = dashboard?.summary;

  const errMsg = (err, fallback) =>
    err?.response?.data?.message || err?.message || fallback;

  const handlePublish = (policy) => {
    setBusyId(policy._id);
    publish(
      { id: policy._id },
      {
        onSuccess: () => toast.success(`"${policy.title}" published`),
        onError: (err) => {
          console.error("[policy] publish failed:", err);
          toast.error(errMsg(err, "Could not publish"));
        },
        onSettled: () => setBusyId(null),
      }
    );
  };

  const openConfirm = (type, policy) => {
    setConfirmError("");
    setConfirm({ type, policy });
  };

  const closeConfirm = () => {
    if (busyId) return;
    setConfirm(null);
    setConfirmError("");
  };

  const runConfirmed = () => {
    if (!confirm) return;
    const { type, policy } = confirm;
    setConfirmError("");
    setBusyId(policy._id);

    const done = {
      onSuccess: () => {
        toast.success(
          type === "archive" ? "Policy archived" : type === "delete" ? "Draft deleted" : `"${policy.title}" restored and published`
        );
        setConfirm(null);
      },
      onError: (err) => {
        console.error(`[policy] ${type} failed:`, err);
        const msg = errMsg(err, `Could not ${type} this policy`);
        setConfirmError(msg);
        toast.error(msg);
      },
      onSettled: () => setBusyId(null),
    };

    if (type === "archive") archive(policy._id, done);
    else if (type === "delete") remove(policy._id, done);
    else publish({ id: policy._id }, done); // restore = publish the latest version again
  };

  const CONFIRM_COPY = {
    archive: {
      title: "Archive this policy?",
      body: "It will stop applying to anyone new. Existing acknowledgement records are kept.",
      cta: "Yes, Archive",
      busy: "Archiving...",
    },
    delete: {
      title: "Delete this draft?",
      body: "This cannot be undone.",
      cta: "Yes, Delete",
      busy: "Deleting...",
    },
    restore: {
      title: "Restore and publish this policy?",
      body: "It will become live again and be assigned to its audience.",
      cta: "Yes, Restore",
      busy: "Restoring...",
    },
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

      <div className="flex gap-2 mb-4 items-center flex-wrap">
        {["", "draft", "published", "archived"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilters((f) => ({ ...f, status: s }))}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              filters.status === s ? "bg-[#730042] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s ? s[0].toUpperCase() + s.slice(1) : "All"}
          </button>
        ))}

        {isSuperAdmin && (
          <select
            value={filters.createdBy}
            onChange={(e) => setFilters((f) => ({ ...f, createdBy: e.target.value }))}
            className="ml-auto px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 focus:outline-none focus:border-[#730042]"
            aria-label="Filter policies by creator"
          >
            <option value="">All policies</option>
            <option value="me">Created by me</option>
            <option value="admin">Created by admins</option>
          </select>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Policy</th>
              <th className="text-left px-4 py-2">Category</th>
              <th className="text-left px-4 py-2">Created by</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Acknowledgement</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Loading policies...</td></tr>
            )}
            {!isLoading && policies.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
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
                  <td className="px-4 py-3 text-xs">
                    <div className="text-gray-700">{p.createdByIsMe ? "You" : p.createdByName || "-"}</div>
                    <span
                      className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        p.createdByModel === "SuperAdmin" ? "bg-[#730042]/10 text-[#730042]" : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {p.createdByModel === "SuperAdmin" ? "Super Admin" : "Admin"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.status === "published" ? (
                      <span className="text-gray-600">
                        {ack.ACKNOWLEDGED || 0} acknowledged · {(ack.PENDING || 0) + (ack.VIEWED || 0)} pending
                      </span>
                    ) : p.status === "archived" ? (
                      <span className="text-gray-400">Archived{p.archivedAt ? ` on ${new Date(p.archivedAt).toLocaleDateString()}` : ""}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600">
                        <FaExclamationTriangle size={11} /> Publish to enable
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end items-center gap-3 text-gray-500">
                      {busyId === p._id && <FaSpinner className="animate-spin text-[#730042]" />}
                      {(p.status === "published" || p.status === "archived") && (
                        <button title="Acknowledgement report" onClick={() => setReportPolicyId(p._id)} className="hover:text-[#730042]">
                          <FaChartBar />
                        </button>
                      )}
                      {p.status === "draft" && (
                        <>
                          <button
                            title="Publish — required before employees see the Acknowledge option"
                            onClick={() => handlePublish(p)}
                            disabled={busyId === p._id}
                            className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 disabled:opacity-50"
                          >
                            <FaRocket /> Publish
                          </button>
                          <button title="Delete draft" onClick={() => openConfirm("delete", p)} disabled={busyId === p._id} className="hover:text-red-600 disabled:opacity-50">
                            <FaTrash />
                          </button>
                        </>
                      )}
                      {p.status === "published" && (
                        <button title="Archive" onClick={() => openConfirm("archive", p)} disabled={busyId === p._id} className="hover:text-gray-700 disabled:opacity-50">
                          <FaArchive />
                        </button>
                      )}
                      {p.status === "archived" && (
                        <button
                          title="Restore and publish again"
                          onClick={() => openConfirm("restore", p)}
                          disabled={busyId === p._id}
                          className="flex items-center gap-1 text-xs font-medium text-[#730042] hover:underline disabled:opacity-50"
                        >
                          <FaUndo size={11} /> Restore
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

      {confirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          style={{ background: "rgba(115,0,66,0.32)", backdropFilter: "blur(2px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeConfirm();
          }}
        >
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#F4C0D1] bg-white shadow-2xl">
            <div className="px-6 pt-6 pb-4" style={{ background: "#FBEAF0" }}>
              <h3 className="text-center text-[15px] font-semibold text-[#730042]">{CONFIRM_COPY[confirm.type].title}</h3>
              <p className="mt-1 text-center text-[13px] font-medium text-[#1F2937]">{confirm.policy.title}</p>
              <p className="mt-1 text-center text-[12px] leading-relaxed text-[#993556]">{CONFIRM_COPY[confirm.type].body}</p>
            </div>
            {confirmError && <p className="px-6 pt-4 text-center text-[12px] text-rose-600">{confirmError}</p>}
            <div className="flex gap-3 px-6 py-5">
              <button
                type="button"
                onClick={closeConfirm}
                disabled={!!busyId}
                className="flex-1 rounded-xl border border-[#F4C0D1] py-2.5 text-[12px] font-medium text-[#730042] hover:bg-[#FBEAF0] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runConfirmed}
                disabled={!!busyId}
                className="flex-1 rounded-xl py-2.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-50"
                style={{ background: "#730042" }}
              >
                {busyId ? CONFIRM_COPY[confirm.type].busy : CONFIRM_COPY[confirm.type].cta}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && <CreatePolicyModal onClose={() => setShowCreate(false)} />}
      {reportPolicyId && <PolicyReportModal policyId={reportPolicyId} onClose={() => setReportPolicyId(null)} />}
    </div>
  );
}