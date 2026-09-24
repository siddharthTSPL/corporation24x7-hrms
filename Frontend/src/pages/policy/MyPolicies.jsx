import { useState } from "react";
import { FaFileContract, FaCheckCircle, FaClock, FaHistory } from "react-icons/fa";
import { useMyPolicies, useMyAcknowledgementHistory } from "../../auth/server-state/policy/policy.hook";
import PolicyDocumentViewer from "../../components/policy/PolicyDocumentViewer";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "acknowledged", label: "Acknowledged" },
  { key: "all", label: "All Policies" },
];

export default function MyPolicies() {
  const { data, isLoading } = useMyPolicies();
  const { data: historyData } = useMyAcknowledgementHistory();
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState(null);

  const policies = data?.policies || [];
  const pending = policies.filter(
    (p) => p.acknowledgement && p.acknowledgement.status !== "ACKNOWLEDGED"
  );
  const acknowledged = policies.filter((p) => p.acknowledgement?.status === "ACKNOWLEDGED");
  const list = tab === "pending" ? pending : tab === "acknowledged" ? acknowledged : policies;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#730042]/10 flex items-center justify-center text-[#730042]">
          <FaFileContract />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[#1F2937]">My Policies</h1>
          <p className="text-sm text-gray-500">Policies assigned to you — read, and acknowledge where required.</p>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2 text-amber-700 text-sm">
          <FaClock /> {pending.length} polic{pending.length === 1 ? "y needs" : "ies need"} your acknowledgement.
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              tab === t.key ? "bg-[#730042] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t.label} {t.key === "pending" && pending.length > 0 && `(${pending.length})`}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          {isLoading && <p className="text-sm text-gray-500">Loading policies...</p>}
          {!isLoading && list.length === 0 && (
            <p className="text-sm text-gray-500 bg-white border border-gray-100 rounded-xl p-4">
              Nothing here right now.
            </p>
          )}
          {list.map((entry) => (
            <button
              key={entry.policy._id}
              onClick={() => setSelected(entry)}
              className={`w-full text-left bg-white rounded-xl border p-4 hover:border-[#730042]/40 transition ${
                selected?.policy._id === entry.policy._id ? "border-[#730042]" : "border-gray-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-[#1F2937]">{entry.policy.title}</h3>
                {entry.acknowledgement?.status === "ACKNOWLEDGED" ? (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <FaCheckCircle /> Acknowledged
                  </span>
                ) : (
                  <span className="text-xs text-amber-600 font-medium">Action needed</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {entry.policy.category} {entry.version?.versionNumber ? `· v${entry.version.versionNumber}` : ""}
              </p>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          {selected ? (
            <PolicyDocumentViewer entry={selected} onAcknowledged={() => setSelected(null)} />
          ) : (
            <p className="text-sm text-gray-500">Select a policy on the left to view it.</p>
          )}
        </div>
      </div>

      {historyData?.acknowledgements?.length > 0 && (
        <div className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-3">
            <FaHistory /> My Acknowledgement History
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2">Policy</th>
                  <th className="text-left px-4 py-2">Version</th>
                  <th className="text-left px-4 py-2">Acknowledged On</th>
                </tr>
              </thead>
              <tbody>
                {historyData.acknowledgements.map((a) => (
                  <tr key={a._id} className="border-t border-gray-50">
                    <td className="px-4 py-2">{a.policy?.title}</td>
                    <td className="px-4 py-2">v{a.version?.versionNumber}</td>
                    <td className="px-4 py-2">{new Date(a.acknowledgedAt).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}