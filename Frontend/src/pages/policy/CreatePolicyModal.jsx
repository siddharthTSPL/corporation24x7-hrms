import { useState } from "react";
import { FaTimes, FaFilePdf, FaImages, FaUpload, FaFileContract, FaBolt } from "react-icons/fa";
import toast from "react-hot-toast";
import { useCreatePolicy, usePublishPolicy } from "../../auth/server-state/policy/policy.hook";

const CATEGORY_OPTIONS = [
  "General",
  "Attendance",
  "Leave",
  "HR",
  "Finance",
  "IT",
  "Security",
  "Compliance",
  "Travel",
  "Workplace",
  "Employee Conduct",
  "Benefits",
];

const ROLE_OPTIONS = [
  { key: "employee", label: "Employees" },
  { key: "manager", label: "Managers" },
  { key: "admin", label: "Admins" },
];

export default function CreatePolicyModal({ onClose }) {
  const { mutate: createPolicy, isPending } = useCreatePolicy();
  const { mutate: publishPolicy, isPending: isPublishing } = usePublishPolicy();

  // Every policy is saved as a draft first (so you can double-check it),
  // but a draft is invisible to employees — nobody sees an "Acknowledge"
  // option until it's published. Default this ON so the common case
  // ("I created a policy, why can't anyone acknowledge it?") just works.
  const [publishNow, setPublishNow] = useState(true);

  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");

  const [assignmentType, setAssignmentType] = useState("ALL");
  const [roles, setRoles] = useState(["employee", "manager", "admin"]);
  const [departments, setDepartments] = useState("");
  const [locations, setLocations] = useState("");

  const [pdfFile, setPdfFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);

  const toggleRole = (key) => {
    setRoles((prev) => (prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Policy title is required");
    if (!pdfFile && imageFiles.length === 0) return toast.error("Attach a PDF and/or at least one photo");
    if (roles.length === 0) return toast.error("Select at least one audience (Employees / Managers / Admins)");

    const assignment = {
      type: assignmentType,
      roles,
      departments: assignmentType === "DEPARTMENT" ? departments.split(",").map((d) => d.trim()).filter(Boolean) : [],
      locations: assignmentType === "LOCATION" ? locations.split(",").map((l) => l.trim()).filter(Boolean) : [],
      employees: [],
    };

    createPolicy(
      {
        title,
        code,
        category,
        description,
        assignment,
        pdfFile,
        imageFiles,
      },
      {
        onSuccess: (res) => {
          const newPolicyId = res?.policy?._id;
          if (publishNow && newPolicyId) {
            publishPolicy(
              { id: newPolicyId },
              {
                onSuccess: () => {
                  toast.success(`"${title}" is live — employees can now acknowledge it.`);
                  onClose();
                },
                onError: (err) => {
                  toast.error(err?.response?.data?.message || "Saved as draft, but publishing failed. Publish it from the list.");
                  onClose();
                },
              }
            );
            return;
          }
          toast.success('Saved as draft. Click the ⚡ Publish icon in the list for the acknowledge option to appear.');
          onClose();
        },
        onError: (err) => toast.error(err?.response?.data?.message || "Could not create policy"),
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#730042] to-[#a3005f] flex items-center justify-center text-white">
              <FaFileContract size={14} />
            </div>
            <div>
              <h2 className="font-semibold text-[#1F2937] leading-tight">Create TorchX Policy</h2>
              <p className="text-xs text-gray-400">Fill in the details, attach the document, and publish.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Policy Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. Leave Policy 2026"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Policy Code (optional)</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. HR-LV-001"
              />
            </div>
          </div>

          <div>
            <div>
              <label className="text-sm text-gray-600">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Short summary shown to employees"
            />
          </div>

          <div className="rounded-xl border border-gray-100 p-4 space-y-3">
            <p className="text-sm font-medium text-[#1F2937]">Policy Document</p>
            <p className="text-xs text-gray-500">
              Upload a PDF and/or photos (e.g. a signed hard copy) — employees will see whichever you attach.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-3 text-sm cursor-pointer hover:border-[#730042]/50">
                <FaFilePdf className="text-red-500" />
                {pdfFile ? pdfFile.name : "Attach PDF"}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                />
              </label>
              <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-3 text-sm cursor-pointer hover:border-[#730042]/50">
                <FaImages className="text-[#730042]" />
                {imageFiles.length ? `${imageFiles.length} photo(s) selected` : "Attach Photos"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 p-4 space-y-3">
            <p className="text-sm font-medium text-[#1F2937]">Who is this for?</p>
            <div className="flex gap-3 flex-wrap">
              {ROLE_OPTIONS.map((r) => (
                <label key={r.key} className="flex items-center gap-1.5 text-sm text-gray-600">
                  <input type="checkbox" checked={roles.includes(r.key)} onChange={() => toggleRole(r.key)} className="accent-[#730042]" />
                  {r.label}
                </label>
              ))}
            </div>

            <select
              value={assignmentType}
              onChange={(e) => setAssignmentType(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="ALL">Everyone in the above roles</option>
              <option value="DEPARTMENT">Specific departments</option>
              <option value="LOCATION">Specific locations</option>
            </select>

            {assignmentType === "DEPARTMENT" && (
              <input
                value={departments}
                onChange={(e) => setDepartments(e.target.value)}
                placeholder="Comma-separated department names, e.g. IT, Finance"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            )}
            {assignmentType === "LOCATION" && (
              <input
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                placeholder="Comma-separated locations, e.g. Delhi, Mumbai"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            )}
          </div>

          <div
            className={`rounded-xl border p-4 flex items-start gap-3 ${
              publishNow ? "border-green-200 bg-green-50/60" : "border-amber-200 bg-amber-50/60"
            }`}
          >
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
              className="accent-[#730042] w-4 h-4 mt-0.5"
            />
            <div className="flex-1">
              <label className="text-sm font-medium text-[#1F2937] flex items-center gap-1.5 cursor-pointer" onClick={() => setPublishNow((v) => !v)}>
                <FaBolt className={publishNow ? "text-green-600" : "text-amber-500"} />
                Publish immediately
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                {publishNow
                  ? "Goes live right away — the assigned audience will see it and can acknowledge it."
                  : "Saved as a draft only. Nobody sees it or gets an acknowledge option until you publish it from the list."}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || isPublishing}
            className="flex items-center gap-2 px-4 py-2 bg-[#730042] text-white text-sm rounded-lg hover:bg-[#5c0335] disabled:opacity-60"
          >
            <FaUpload />
            {isPending ? "Creating..." : isPublishing ? "Publishing..." : publishNow ? "Create & Publish" : "Create as Draft"}
          </button>
        </div>
      </form>
    </div>
  );
}  