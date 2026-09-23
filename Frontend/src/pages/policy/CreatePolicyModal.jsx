import { useState } from "react";
import { FaTimes, FaFilePdf, FaImages, FaUpload } from "react-icons/fa";
import toast from "react-hot-toast";
import { useCreatePolicy } from "../../auth/server-state/policy/policy.hook";

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

  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("mandatory");
  const [acknowledgementRequired, setAcknowledgementRequired] = useState(true);
  const [deadlineDays, setDeadlineDays] = useState("");

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
        priority,
        acknowledgementRequired,
        acknowledgementDeadlineDays: deadlineDays || undefined,
        assignment,
        pdfFile,
        imageFiles,
      },
      {
        onSuccess: () => {
          toast.success("Policy created as draft. Publish it when ready.");
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-[#1F2937]">Create Policy</h2>
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

          <div className="grid sm:grid-cols-2 gap-4">
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
            <div>
              <label className="text-sm text-gray-600">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="mandatory">Mandatory (must acknowledge)</option>
                <option value="optional">Optional (can read, no gate)</option>
                <option value="informational">Informational (no acknowledgement)</option>
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

          <div className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
            <div>
              <p className="text-sm font-medium text-[#1F2937]">Require acknowledgement</p>
              <p className="text-xs text-gray-500">Blocks HRMS access (for mandatory policies) until acknowledged.</p>
            </div>
            <input
              type="checkbox"
              checked={acknowledgementRequired}
              onChange={(e) => setAcknowledgementRequired(e.target.checked)}
              className="accent-[#730042] w-4 h-4"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Grace period (days, optional)</label>
            <input
              type="number"
              min="0"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value)}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. 7"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[#730042] text-white text-sm rounded-lg hover:bg-[#5c0335] disabled:opacity-60"
          >
            <FaUpload /> {isPending ? "Creating..." : "Create as Draft"}
          </button>
        </div>
      </form>
    </div>
  );
}