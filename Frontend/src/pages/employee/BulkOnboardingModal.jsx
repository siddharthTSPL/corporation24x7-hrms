import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaTimes, FaFileExcel, FaDownload, FaUpload, FaLink, FaCheckCircle,
  FaExclamationTriangle, FaSpinner,
} from "react-icons/fa";
import {
  useDownloadBulkEmployeeTemplate, useBulkUploadEmployees, useBulkImportEmployeesFromSheet,
} from "../../auth/server-state/adminauth/adminauth.hook";

const ACCENT = "#730042";

export default function BulkOnboardingModal({ open, onClose }) {
  const [tab, setTab] = useState("file"); // "file" | "sheet"
  const [file, setFile] = useState(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [result, setResult] = useState(null); // { success, message, errors?, employees?, count? }
  const fileInputRef = useRef(null);

  const { mutate: downloadTemplate, isPending: downloading } = useDownloadBulkEmployeeTemplate();
  const { mutate: uploadFile, isPending: uploading } = useBulkUploadEmployees();
  const { mutate: importSheet, isPending: importing } = useBulkImportEmployeesFromSheet();

  const busy = uploading || importing;

  if (!open) return null;

  const reset = () => {
    setFile(null);
    setSheetUrl("");
    setResult(null);
    setTab("file");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleUpload = () => {
    if (!file) return;
    setResult(null);
    uploadFile(file, { onSuccess: setResult, onError: (err) => setResult({ success: false, message: err?.message || "Upload failed" }) });
  };

  const handleImportSheet = () => {
    if (!sheetUrl.trim()) return;
    setResult(null);
    importSheet(sheetUrl.trim(), { onSuccess: setResult, onError: (err) => setResult({ success: false, message: err?.message || "Import failed" }) });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <FaFileExcel style={{ color: ACCENT }} />
            <h2 className="text-base sm:text-lg font-bold" style={{ color: ACCENT }}>Bulk Employee Onboarding</h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-700"><FaTimes /></button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F9F8F2] border border-[#EEE]">
            <p className="text-xs sm:text-sm text-gray-600 flex-1">
              Onboard many employees at once from an Excel/CSV file or a Google Sheet. Start with the template so your
              columns line up correctly — if any row fails validation, no employees are created until it's fixed.
            </p>
            <button
              onClick={() => downloadTemplate()}
              disabled={downloading}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-semibold whitespace-nowrap"
              style={{ borderColor: ACCENT, color: ACCENT }}
            >
              <FaDownload size={11} />{downloading ? "Preparing…" : "Download Template"}
            </button>
          </div>

          <div className="flex gap-2 border-b">
            <TabButton active={tab === "file"} onClick={() => { setTab("file"); setResult(null); }}>
              Upload Excel / CSV
            </TabButton>
            <TabButton active={tab === "sheet"} onClick={() => { setTab("sheet"); setResult(null); }}>
              Import from Google Sheet
            </TabButton>
          </div>

          {tab === "file" ? (
            <div className="space-y-3">
              <label
                htmlFor="bulk-onboard-file"
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 cursor-pointer hover:bg-[#F9F8F2] transition"
                style={{ borderColor: file ? ACCENT : "#D1D5DB" }}
              >
                <FaUpload style={{ color: ACCENT }} />
                <span className="text-sm font-medium text-gray-700">
                  {file ? file.name : "Click to choose a .xlsx, .xls or .csv file"}
                </span>
                <span className="text-xs text-gray-400">Max 5MB</span>
                <input
                  id="bulk-onboard-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }}
                />
              </label>
              <button
                onClick={handleUpload}
                disabled={!file || busy}
                className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: ACCENT }}
              >
                {uploading ? <span className="flex items-center justify-center gap-2"><FaSpinner className="animate-spin" />Uploading…</span> : "Upload & Onboard"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-600">Google Sheet link</label>
              <div className="flex items-center gap-2 border-2 rounded-xl px-3 py-2" style={{ borderColor: "#D1D5DB" }}>
                <FaLink className="text-gray-400 shrink-0" size={12} />
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => { setSheetUrl(e.target.value); setResult(null); }}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="flex-1 outline-none text-sm"
                />
              </div>
              <p className="text-xs text-gray-400">
                Sharing must be set to "Anyone with the link can view" — Claude can't read private sheets.
              </p>
              <button
                onClick={handleImportSheet}
                disabled={!sheetUrl.trim() || busy}
                className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: ACCENT }}
              >
                {importing ? <span className="flex items-center justify-center gap-2"><FaSpinner className="animate-spin" />Importing…</span> : "Import & Onboard"}
              </button>
            </div>
          )}

          {result && <BulkResult result={result} />}
        </div>
      </div>
    </div>,
    document.body
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition"
      style={active ? { borderColor: ACCENT, color: ACCENT } : { borderColor: "transparent", color: "#9CA3AF" }}
    >
      {children}
    </button>
  );
}

function BulkResult({ result }) {
  if (result.success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
          <FaCheckCircle />{result.message}
        </div>
        {!!result.employees?.length && (
          <div className="max-h-40 overflow-y-auto text-xs text-gray-600 divide-y">
            {result.employees.map((emp) => (
              <div key={emp.empid} className="py-1 flex justify-between gap-2">
                <span>{emp.name} <span className="text-gray-400">({emp.empid})</span></span>
                <span className="text-gray-400">{emp.work_email}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
      <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
        <FaExclamationTriangle />{result.message || "Something went wrong"}
      </div>
      {!!result.errors?.length && (
        <div className="max-h-56 overflow-y-auto rounded-lg border border-red-100 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-red-50 sticky top-0">
              <tr>
                <th className="text-left px-2 py-1.5 font-semibold text-red-700">Row</th>
                <th className="text-left px-2 py-1.5 font-semibold text-red-700">Employee ID</th>
                <th className="text-left px-2 py-1.5 font-semibold text-red-700">Issue</th>
              </tr>
            </thead>
            <tbody>
              {result.errors.map((e, i) => (
                <tr key={i} className="border-t border-red-50">
                  <td className="px-2 py-1.5 text-gray-500">{e.row ?? "—"}</td>
                  <td className="px-2 py-1.5 text-gray-500">{e.empid || "—"}</td>
                  <td className="px-2 py-1.5 text-gray-700">{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}