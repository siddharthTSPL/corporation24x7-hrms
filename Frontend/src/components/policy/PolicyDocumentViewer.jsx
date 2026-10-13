import { useState } from "react";
import { FaFilePdf, FaCheckCircle, FaDownload } from "react-icons/fa";
import toast from "react-hot-toast";
import { useAcknowledgePolicy } from "../../auth/server-state/policy/policy.hook";
import { getCertificateUrl } from "../../auth/api/policy/policy.api";

// Renders one policy's content (PDF and/or photos) plus, when required, the
// "I have read and understood this policy" confirmation + Acknowledge action.
// Used both inside the blocking Policy Gate and on the normal "My Policies"
// page, so acknowledging from either place behaves identically.
export default function PolicyDocumentViewer({ entry, onAcknowledged, compact = false }) {
  const [confirmed, setConfirmed] = useState(false);
  const { mutate: acknowledge, isPending } = useAcknowledgePolicy();

  if (!entry) return null;
  const { policy, version, acknowledgement } = entry;
  const alreadyAcknowledged = acknowledgement?.status === "ACKNOWLEDGED";

  const handleAcknowledge = () => {
    if (!confirmed) {
      toast.error('Please check "I have read and understood this policy" first.');
      return;
    }
    acknowledge(
      { policyId: policy._id, confirm: true },
      {
        onSuccess: () => {
          toast.success("Policy acknowledged. Thank you.");
          onAcknowledged?.();
        },
        onError: (err) => toast.error(err?.response?.data?.message || "Could not record acknowledgement."),
      }
    );
  };

  return (
    <div className={compact ? "" : "space-y-4"}>
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-semibold text-[#1F2937]">{policy.title}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Mandatory</span>
          {policy.category && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{policy.category}</span>
          )}
          {version?.versionNumber && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#90DBF4]/30 text-[#0f5c78]">
              v{version.versionNumber}
            </span>
          )}
        </div>
        {policy.description && <p className="text-sm text-gray-500 mt-1">{policy.description}</p>}
      </div>

      {version?.pdfUrl && (
        <div className="rounded-lg overflow-hidden border border-gray-200">
          <div className="flex items-center justify-between bg-gray-50 px-3 py-2 text-sm text-gray-600">
            <span className="flex items-center gap-2">
              <FaFilePdf className="text-red-500" /> {version.pdfFileName || "Policy document"}
            </span>
            <a
              href={version.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#730042] hover:underline text-xs font-medium"
            >
              Open in new tab
            </a>
          </div>
          <iframe
            src={version.pdfUrl}
            title={policy.title}
            className="w-full"
            style={{ height: compact ? "55vh" : 520, minHeight: compact ? 380 : undefined, border: "none" }}
          />
        </div>
      )}

      {version?.images?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {version.images.map((img, i) => (
            <a key={img.fileId || i} href={img.url} target="_blank" rel="noreferrer" className="block group">
              <img
                src={img.url}
                alt={img.caption || `Attachment ${i + 1}`}
                className="rounded-lg border border-gray-200 object-cover w-full h-32 group-hover:opacity-90"
              />
            </a>
          ))}
        </div>
      )}

      {!alreadyAcknowledged && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 accent-[#730042]"
            />
            I have read and understood this policy.
          </label>
          <button
            onClick={handleAcknowledge}
            disabled={isPending}
            className="px-4 py-2 rounded-lg bg-[#730042] text-white text-sm font-medium hover:bg-[#5c0335] disabled:opacity-60"
          >
            {isPending ? "Submitting..." : "Acknowledge Policy"}
          </button>
        </div>
      )}

      {alreadyAcknowledged && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <span className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <FaCheckCircle /> Acknowledged on{" "}
            {acknowledgement.acknowledgedAt ? new Date(acknowledgement.acknowledgedAt).toLocaleString("en-IN") : ""}
          </span>
          <a
            href={getCertificateUrl(policy._id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-[#730042] hover:underline"
          >
            <FaDownload /> Download certificate
          </a>
        </div>
      )}
    </div>
  );
}