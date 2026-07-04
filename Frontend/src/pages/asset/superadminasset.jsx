import { useState, useRef, useEffect } from "react";
import {
  FaPlus, FaTimes, FaCheck, FaEdit, FaTrash, FaSearch, FaFilter,
  FaLaptop, FaDesktop, FaMobileAlt, FaKeyboard, FaMouse, FaHeadphones,
  FaTabletAlt, FaBox, FaExclamationTriangle, FaChevronRight, FaUndo,
  FaHistory, FaUserShield, FaEllipsisV, FaBuilding,
} from "react-icons/fa";
import {
  useGetAllAssetsSuperAdmin,
  useGetAssetByIdSuperAdmin,
  useCreateAssetSuperAdmin,
  useUpdateAssetSuperAdmin,
  useDeleteAssetSuperAdmin,
  useAssignAssetToAdmin,
  useRevokeAssetSuperAdmin,
  useGetAssetsOfPersonSuperAdmin,
} from "../../auth/server-state/superadmin/asset/superadminasset.hook";
import { useGetAllAdmins } from "../../auth/server-state/superadmin/other/suother.hook";

const ASSET_TYPES = ["laptop","desktop","monitor","keyboard","mouse","headset","mobile","tablet","other"];
const CONDITIONS   = ["new","good","fair","poor"];
const STATUSES     = ["available","assigned","under_maintenance","retired"];

const TYPE_ICON = {
  laptop:    <FaLaptop />,
  desktop:   <FaDesktop />,
  monitor:   <FaDesktop />,
  keyboard:  <FaKeyboard />,
  mouse:     <FaMouse />,
  headset:   <FaHeadphones />,
  mobile:    <FaMobileAlt />,
  tablet:    <FaTabletAlt />,
  other:     <FaBox />,
};

const STATUS_META = {
  available:         { color:"#0d9e6e", bg:"#e8f7f1", border:"#a7f3d0", label:"Available" },
  assigned:          { color:"#730042", bg:"#f7ecf3", border:"#e8d5e2", label:"Assigned" },
  under_maintenance: { color:"#b8760a", bg:"#fff8e1", border:"#ffe082", label:"Maintenance" },
  retired:           { color:"#6b7280", bg:"#f3f4f6", border:"#d1d5db", label:"Retired" },
};

const CONDITION_META = {
  new:  { color:"#0d9e6e", label:"New" },
  good: { color:"#2563eb", label:"Good" },
  fair: { color:"#b8760a", label:"Fair" },
  poor: { color:"#d93025", label:"Poor" },
};

const BLANK_FORM = {
  asset_name:"", asset_type:"laptop", serial_number:"", brand:"",
  model_number:"", purchase_date:"", purchase_price:"", condition:"good", notes:"",
};

const inputCls =
  "w-full px-3 py-2.5 bg-[#fdf5f9] border border-[#e8d5e2] rounded-lg text-[13px] " +
  "text-[#0d0209] outline-none transition placeholder:text-[#c499b4] min-h-[44px] " +
  "focus:border-[#730042] focus:ring-2 focus:ring-[#f7ecf3]";

const labelCls = "block text-[10px] font-bold tracking-widest uppercase text-[#7a5568] mb-1.5";

function FLabel({ children, required }) {
  return (
    <label className={labelCls}>
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function StatusChip({ status }) {
  const m = STATUS_META[status] || STATUS_META.available;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
      style={{ color: m.color, background: m.bg, borderColor: m.border }}
    >
      {m.label}
    </span>
  );
}

function ConditionDot({ condition }) {
  const m = CONDITION_META[condition] || CONDITION_META.good;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: m.color }}>
      <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

function AssetIcon({ type }) {
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#f7ecf3] text-[#730042] text-sm flex-shrink-0">
      {TYPE_ICON[type] || <FaBox />}
    </div>
  );
}

function ActionMenu({ asset, onEdit, onDelete, onAssign, onRevoke, onHistory }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7a5568] border border-[#e8d5e2] hover:bg-[#f7ecf3] hover:text-[#730042] transition-colors"
      >
        <FaEllipsisV size={10} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 bg-white border border-[#e8d5e2] rounded-xl shadow-xl min-w-[170px] py-1 overflow-hidden">
          <button onClick={() => { onEdit(asset); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#730042] hover:bg-[#f7ecf3]">
            <FaEdit size={10} /> Edit Details
          </button>
          {asset.status === "available" && (
            <button onClick={() => { onAssign(asset); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#730042] hover:bg-[#f7ecf3]">
              <FaUserShield size={10} /> Assign to Admin
            </button>
          )}
          {asset.status === "assigned" && (
            <button onClick={() => { onRevoke(asset); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#b8760a] hover:bg-[#fff8e1]">
              <FaUndo size={10} /> Revoke Asset
            </button>
          )}
          <button onClick={() => { onHistory(asset); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#7a5568] hover:bg-[#f7ecf3]">
            <FaHistory size={10} /> View History
          </button>
          <div className="border-t border-[#f0dcea] my-1" />
          <button onClick={() => { onDelete(asset); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-600 hover:bg-red-50">
            <FaTrash size={10} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function AssetFormModal({ open, onClose, initial, onSave, loading }) {
  const [form, setForm] = useState(BLANK_FORM);
  useEffect(() => {
    if (open) setForm(initial ? { ...BLANK_FORM, ...initial } : BLANK_FORM);
  }, [open]);
  if (!open) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isEdit = !!initial;
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[rgba(13,2,9,0.7)] backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl shadow-2xl flex flex-col max-h-[94vh] animate-[modalUp_0.22s_ease-out]">
        <div className="sticky top-0 z-10 bg-white px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#e8d5e2] flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-[#0d0209]">{isEdit ? "Edit Asset" : "Add New Asset"}</h2>
            <p className="text-[11px] text-[#c499b4] mt-0.5">{isEdit ? "Update asset details" : "Register a new asset"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[#7a5568] hover:bg-[#f7ecf3] hover:text-[#730042] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
            <FaTimes size={13} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 sm:py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FLabel required>Asset Name</FLabel>
              <input className={inputCls} placeholder="e.g. Dell Latitude 5520" value={form.asset_name} onChange={set("asset_name")} />
            </div>
            <div>
              <FLabel required>Asset Type</FLabel>
              <select className={inputCls} value={form.asset_type} onChange={set("asset_type")}>
                {ASSET_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <FLabel>Condition</FLabel>
              <select className={inputCls} value={form.condition} onChange={set("condition")}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <FLabel>Brand</FLabel>
              <input className={inputCls} placeholder="e.g. Dell, Apple, HP" value={form.brand} onChange={set("brand")} />
            </div>
            <div>
              <FLabel>Model Number</FLabel>
              <input className={inputCls} placeholder="e.g. Latitude 5520" value={form.model_number} onChange={set("model_number")} />
            </div>
            <div>
              <FLabel>Serial Number</FLabel>
              <input className={inputCls} placeholder="Device serial number" value={form.serial_number} onChange={set("serial_number")} />
            </div>
            <div>
              <FLabel>Purchase Price (₹)</FLabel>
              <input className={inputCls} type="number" placeholder="0" value={form.purchase_price} onChange={set("purchase_price")} />
            </div>
            <div>
              <FLabel>Purchase Date</FLabel>
              <input className={inputCls} type="date" value={form.purchase_date} onChange={set("purchase_date")} />
            </div>
            <div className="sm:col-span-2">
              <FLabel>Notes</FLabel>
              <textarea
                className={`${inputCls} resize-none min-h-[80px]`}
                placeholder="Any additional notes…"
                value={form.notes}
                onChange={set("notes")}
              />
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-[#e8d5e2] px-4 sm:px-6 py-3 sm:py-4 flex justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[#e8d5e2] text-[13px] font-medium text-[#7a5568] hover:border-[#730042] hover:text-[#730042] transition-colors min-h-[44px]">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={loading || !form.asset_name || !form.asset_type}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#730042] text-white text-[13px] font-semibold hover:bg-[#4a0029] active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <FaCheck size={10} />
            {loading ? "Saving…" : isEdit ? "Update Asset" : "Add Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignAdminModal({ open, onClose, asset, admins, onAssign, loading }) {
  const [selectedAdmin, setSelectedAdmin] = useState("");
  useEffect(() => { if (open) setSelectedAdmin(""); }, [open]);
  if (!open || !asset) return null;
  const workingAdmins = admins.filter((a) => (a.working_status || "working") === "working");
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[rgba(13,2,9,0.7)] backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl animate-[modalUp_0.22s_ease-out]">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#e8d5e2] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0d0209]">Assign Asset to Admin</h2>
            <p className="text-[11px] text-[#c499b4] mt-0.5 truncate">{asset.asset_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[#7a5568] hover:bg-[#f7ecf3] hover:text-[#730042] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
            <FaTimes size={13} />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center gap-3 p-3 bg-[#f7ecf3] rounded-xl mb-4">
            <AssetIcon type={asset.asset_type} />
            <div>
              <p className="text-[13px] font-bold text-[#0d0209]">{asset.asset_name}</p>
              <p className="text-[11px] text-[#7a5568]">{asset.brand} · {asset.asset_type}</p>
            </div>
          </div>
          <FLabel required>Select Admin</FLabel>
          <select className={inputCls} value={selectedAdmin} onChange={(e) => setSelectedAdmin(e.target.value)}>
            <option value="">Choose an admin…</option>
            {workingAdmins.map((a) => (
              <option key={a._id} value={a._id}>
                {a.f_name} {a.l_name} — {a.designation} ({a.department})
              </option>
            ))}
          </select>
          {workingAdmins.length === 0 && (
            <p className="text-[12px] text-[#b8760a] mt-2 flex items-center gap-1.5">
              <FaExclamationTriangle size={11} /> No active admins available.
            </p>
          )}
        </div>
        <div className="px-4 sm:px-6 pb-4 sm:pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#e8d5e2] text-[13px] font-medium text-[#7a5568] hover:border-[#730042] hover:text-[#730042] transition-colors min-h-[44px]">
            Cancel
          </button>
          <button
            onClick={() => onAssign({ id: asset._id, admin_id: selectedAdmin })}
            disabled={loading || !selectedAdmin}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#730042] text-white text-[13px] font-semibold hover:bg-[#4a0029] active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <FaCheck size={10} />
            {loading ? "Assigning…" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RevokeModal({ open, onClose, asset, onRevoke, loading }) {
  const [returnCondition, setReturnCondition] = useState("good");
  const [returnNotes, setReturnNotes] = useState("");
  useEffect(() => { if (open) { setReturnCondition("good"); setReturnNotes(""); } }, [open]);
  if (!open || !asset) return null;
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[rgba(13,2,9,0.7)] backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl animate-[modalUp_0.22s_ease-out]">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#e8d5e2] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0d0209]">Revoke Asset</h2>
            <p className="text-[11px] text-[#c499b4] mt-0.5">Mark asset as returned</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[#7a5568] hover:bg-[#f7ecf3] hover:text-[#730042] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
            <FaTimes size={13} />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <FaExclamationTriangle size={14} className="text-amber-600 flex-shrink-0" />
            <p className="text-[12px] text-amber-800">
              Revoking will mark <strong>{asset.asset_name}</strong> as returned and set it back to Available.
            </p>
          </div>
          <div>
            <FLabel>Return Condition</FLabel>
            <select className={inputCls} value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)}>
              <option value="good">Good</option>
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          <div>
            <FLabel>Return Notes</FLabel>
            <textarea
              className={`${inputCls} resize-none min-h-[70px]`}
              placeholder="Any notes about the return condition…"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="px-4 sm:px-6 pb-4 sm:pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#e8d5e2] text-[13px] font-medium text-[#7a5568] hover:border-[#730042] hover:text-[#730042] transition-colors min-h-[44px]">
            Cancel
          </button>
          <button
            onClick={() => onRevoke({ id: asset._id, return_condition: returnCondition, return_notes: returnNotes })}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-[13px] font-semibold hover:bg-amber-700 active:scale-95 transition disabled:opacity-50 min-h-[44px]"
          >
            <FaUndo size={10} />
            {loading ? "Revoking…" : "Revoke Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryDrawer({ open, onClose, asset }) {
  if (!open || !asset) return null;
  const history = asset.assignment_history || [];
  return (
    <div className="fixed inset-0 z-[1000] flex" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex-1" onClick={onClose} />
      <div className="w-full max-w-sm bg-white shadow-2xl flex flex-col border-l border-[#e8d5e2] h-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8d5e2] bg-[#fdf5f9]">
          <div>
            <p className="text-sm font-bold text-[#730042]">Assignment History</p>
            <p className="text-[11px] text-[#c499b4] truncate">{asset.asset_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7a5568] hover:bg-[#f7ecf3]">
            <FaTimes size={12} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-[#c499b4] text-center">
              <FaHistory size={24} />
              <p className="text-[12px]">No assignment history yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...history].reverse().map((h, i) => (
                <div key={i} className="p-3 rounded-xl border border-[#e8d5e2] bg-[#fdf5f9]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-[#730042] uppercase tracking-wider">
                      {h.assigned_to_model || "Unknown"}
                    </span>
                    {h.return_condition && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.return_condition === "good" ? "bg-emerald-50 text-emerald-700" : h.return_condition === "damaged" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                        {h.return_condition}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#0d0209] font-semibold">
                    Assigned: {h.assigned_date ? new Date(h.assigned_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </p>
                  {h.returned_date && (
                    <p className="text-[11px] text-[#7a5568] mt-0.5">
                      Returned: {new Date(h.returned_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  )}
                  {h.return_notes && (
                    <p className="text-[11px] text-[#c499b4] mt-1 italic">"{h.return_notes}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ open, onClose, asset, onConfirm, loading }) {
  if (!open || !asset) return null;
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[rgba(13,2,9,0.75)] backdrop-blur-md">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-[modalUp_0.22s_ease-out]">
        <div className="text-center mb-4">
          <div className="text-4xl mb-3">🗑️</div>
          <h3 className="text-base font-bold text-[#0d0209]">Delete Asset?</h3>
          <p className="text-[12px] text-[#7a5568] mt-1">
            Delete <strong>{asset.asset_name}</strong>? This cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#e8d5e2] text-[13px] font-medium text-[#7a5568] hover:border-[#730042] hover:text-[#730042] transition-colors min-h-[44px]">
            Cancel
          </button>
          <button onClick={() => onConfirm(asset._id)} disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 transition disabled:opacity-50 min-h-[44px]">
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssetReturnWarning({ data, onClose }) {
  if (!data?.asset_return_check?.has_pending_assets) return null;
  const { pending_asset_count, assets, message } = data.asset_return_check;
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-[rgba(13,2,9,0.75)] backdrop-blur-md">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-[modalUp_0.22s_ease-out]">
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
          <FaExclamationTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-bold text-amber-800">Assets Not Returned</p>
            <p className="text-[12px] text-amber-700 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <p className="text-[12px] font-semibold text-[#7a5568] mb-3">
          {pending_asset_count} asset{pending_asset_count !== 1 ? "s" : ""} still assigned:
        </p>
        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          {assets.map((a) => (
            <div key={a._id} className="flex items-center gap-3 p-2.5 rounded-xl border border-[#e8d5e2] bg-[#fdf5f9]">
              <AssetIcon type={a.asset_type} />
              <div>
                <p className="text-[12px] font-semibold text-[#0d0209]">{a.asset_name}</p>
                <p className="text-[10px] text-[#7a5568]">{a.asset_id} · {a.brand || a.asset_type}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#c499b4] mb-4">
          The working status has been updated. Please revoke the assets listed above before completing offboarding.
        </p>
        <button onClick={onClose} className="w-full px-4 py-2.5 rounded-xl bg-[#730042] text-white text-[13px] font-semibold hover:bg-[#4a0029] transition min-h-[44px]">
          Understood
        </button>
      </div>
    </div>
  );
}

export function SuperAdminAssetReturnWarning({ data, onClose }) {
  return <AssetReturnWarning data={data} onClose={onClose} />;
}

export default function SuperAdminAssets() {
  const [formModal, setFormModal] = useState({ open: false, editing: null });
  const [assignModal, setAssignModal] = useState({ open: false, asset: null });
  const [revokeModal, setRevokeModal] = useState({ open: false, asset: null });
  const [historyDrawer, setHistoryDrawer] = useState({ open: false, asset: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, asset: null });
  const [filters, setFilters] = useState({ search: "", status: "", asset_type: "" });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useGetAllAssetsSuperAdmin(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v && v !== ""))
  );
  const { data: adminsData } = useGetAllAdmins();

  const { mutate: createAsset, isPending: creating } = useCreateAssetSuperAdmin();
  const { mutate: updateAsset, isPending: updating } = useUpdateAssetSuperAdmin();
  const { mutate: deleteAsset, isPending: deleting } = useDeleteAssetSuperAdmin();
  const { mutate: assignToAdmin, isPending: assigning } = useAssignAssetToAdmin();
  const { mutate: revokeAsset, isPending: revoking } = useRevokeAssetSuperAdmin();

  const assets = data?.assets ?? [];
  const admins = Array.isArray(adminsData?.admins) ? adminsData.admins : [];

  const stats = {
    total: assets.length,
    available: assets.filter((a) => a.status === "available").length,
    assigned: assets.filter((a) => a.status === "assigned").length,
    maintenance: assets.filter((a) => a.status === "under_maintenance").length,
  };

  const handleSave = (form) => {
    if (formModal.editing) {
      updateAsset(
        { id: formModal.editing._id, data: form },
        { onSuccess: () => setFormModal({ open: false, editing: null }) }
      );
    } else {
      createAsset(form, { onSuccess: () => setFormModal({ open: false, editing: null }) });
    }
  };

  const handleAssign = (payload) => {
    assignToAdmin(payload, { onSuccess: () => setAssignModal({ open: false, asset: null }) });
  };

  const handleRevoke = (payload) => {
    revokeAsset(payload, { onSuccess: () => setRevokeModal({ open: false, asset: null }) });
  };

  const handleDelete = (id) => {
    deleteAsset(id, { onSuccess: () => setDeleteModal({ open: false, asset: null }) });
  };

  const historyAsset = historyDrawer.asset
    ? assets.find((a) => a._id === historyDrawer.asset._id) || historyDrawer.asset
    : null;

  return (
    <div className="min-h-screen bg-[#fdf5f9] p-3 sm:p-5 lg:p-7 font-[system-ui,sans-serif] text-[#0d0209]">
      <style>{`@keyframes modalUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}`}</style>

      <div className="flex items-center justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0d0209] tracking-tight">Asset Management</h1>
          <p className="text-[12px] text-[#7a5568] mt-0.5">{stats.total} assets across your organisation</p>
        </div>
        <button
          onClick={() => setFormModal({ open: true, editing: null })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#730042] text-white text-[13px] font-semibold hover:bg-[#4a0029] active:scale-95 transition min-h-[44px]"
        >
          <FaPlus size={10} /> Add Asset
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        {[
          { label: "Total Assets", value: stats.total, color: "#730042", bg: "#f7ecf3" },
          { label: "Available", value: stats.available, color: "#0d9e6e", bg: "#e8f7f1" },
          { label: "Assigned", value: stats.assigned, color: "#2563eb", bg: "#eff6ff" },
          { label: "Maintenance", value: stats.maintenance, color: "#b8760a", bg: "#fff8e1" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#e8d5e2] shadow-sm p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: s.color }} />
            <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: s.color }}>{s.label}</p>
            <p className="text-3xl font-bold text-[#0d0209]">{isLoading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#e8d5e2] shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-[#e8d5e2] bg-[#fdf5f9]">
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c499b4]" size={11} />
              <input
                className={`${inputCls} pl-9`}
                placeholder="Search assets…"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12px] font-semibold transition-colors min-h-[44px] ${showFilters ? "bg-[#730042] text-white border-[#730042]" : "border-[#e8d5e2] text-[#7a5568] hover:border-[#730042] hover:text-[#730042]"}`}
            >
              <FaFilter size={10} /> Filters
            </button>
          </div>
          {showFilters && (
            <div className="flex gap-2 flex-wrap">
              <select className={`${inputCls} flex-1 min-w-[130px]`} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
                <option value="">All Status</option>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>)}
              </select>
              <select className={`${inputCls} flex-1 min-w-[130px]`} value={filters.asset_type} onChange={(e) => setFilters((f) => ({ ...f, asset_type: e.target.value }))}>
                <option value="">All Types</option>
                {ASSET_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <button onClick={() => setFilters({ search: "", status: "", asset_type: "" })} className="px-3 py-2 rounded-xl border border-[#e8d5e2] text-[12px] text-[#7a5568] hover:text-red-600 hover:border-red-200 transition-colors min-h-[44px]">
                Clear
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-[#c499b4]">
            <span className="text-2xl">⏳</span>
            <p className="text-[12px]">Loading assets…</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
            <FaBox size={32} className="text-[#e8d5e2]" />
            <p className="text-[14px] font-semibold text-[#7a5568]">No assets found</p>
            <p className="text-[12px] text-[#c499b4]">Add your first asset to start tracking company property.</p>
            <button onClick={() => setFormModal({ open: true, editing: null })} className="mt-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#730042] text-white text-[13px] font-semibold hover:bg-[#4a0029] transition min-h-[44px]">
              <FaPlus size={10} /> Add First Asset
            </button>
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-[#e8d5e2] bg-[#fdf5f9]">
                    {["Asset", "Type", "Brand / Serial", "Condition", "Status", "Assigned To", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#7a5568] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f7ecf3]">
                  {assets.map((asset) => (
                    <tr key={asset._id} className="hover:bg-[#fdf5f9] transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <AssetIcon type={asset.asset_type} />
                          <div>
                            <p className="text-[13px] font-semibold text-[#0d0209]">{asset.asset_name}</p>
                            <p className="text-[10px] text-[#c499b4] font-mono">{asset.asset_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-semibold text-[#730042] capitalize">{asset.asset_type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[12px] text-[#0d0209] font-medium">{asset.brand || "—"}</p>
                        <p className="text-[10px] text-[#c499b4] font-mono">{asset.serial_number || "—"}</p>
                      </td>
                      <td className="px-4 py-3"><ConditionDot condition={asset.condition} /></td>
                      <td className="px-4 py-3"><StatusChip status={asset.status} /></td>
                      <td className="px-4 py-3">
                        {asset.assigned_to ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#f7ecf3] flex items-center justify-center text-[9px] font-bold text-[#730042] flex-shrink-0">
                              {((asset.assigned_to.f_name || "?")[0] + (asset.assigned_to.l_name || "?")[0]).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-[#0d0209]">{asset.assigned_to.f_name} {asset.assigned_to.l_name}</p>
                              <p className="text-[10px] text-[#c499b4]">{asset.assigned_to_model}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#c499b4] text-[12px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ActionMenu
                            asset={asset}
                            onEdit={(a) => setFormModal({ open: true, editing: a })}
                            onDelete={(a) => setDeleteModal({ open: true, asset: a })}
                            onAssign={(a) => setAssignModal({ open: true, asset: a })}
                            onRevoke={(a) => setRevokeModal({ open: true, asset: a })}
                            onHistory={(a) => setHistoryDrawer({ open: true, asset: a })}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-[#f7ecf3]">
              {assets.map((asset) => (
                <div key={asset._id} className="px-4 py-3 flex items-start gap-3 hover:bg-[#fdf5f9] transition-colors">
                  <AssetIcon type={asset.asset_type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-[13px] font-semibold text-[#0d0209] truncate">{asset.asset_name}</p>
                      <StatusChip status={asset.status} />
                    </div>
                    <p className="text-[10px] text-[#c499b4] font-mono mb-1">{asset.asset_id}</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <ConditionDot condition={asset.condition} />
                      {asset.brand && <span className="text-[11px] text-[#7a5568]">{asset.brand}</span>}
                      {asset.assigned_to && (
                        <span className="text-[11px] text-[#730042] font-medium">
                          → {asset.assigned_to.f_name} {asset.assigned_to.l_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <ActionMenu
                    asset={asset}
                    onEdit={(a) => setFormModal({ open: true, editing: a })}
                    onDelete={(a) => setDeleteModal({ open: true, asset: a })}
                    onAssign={(a) => setAssignModal({ open: true, asset: a })}
                    onRevoke={(a) => setRevokeModal({ open: true, asset: a })}
                    onHistory={(a) => setHistoryDrawer({ open: true, asset: a })}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {!isLoading && assets.length > 0 && (
          <div className="px-4 sm:px-5 py-2.5 border-t border-[#e8d5e2] bg-[#fdf5f9]">
            <p className="text-[11px] text-[#c499b4]">Showing {assets.length} asset{assets.length !== 1 ? "s" : ""}</p>
          </div>
        )}
      </div>

      <AssetFormModal
        open={formModal.open}
        onClose={() => setFormModal({ open: false, editing: null })}
        initial={formModal.editing}
        onSave={handleSave}
        loading={creating || updating}
      />

      <AssignAdminModal
        open={assignModal.open}
        onClose={() => setAssignModal({ open: false, asset: null })}
        asset={assignModal.asset}
        admins={admins}
        onAssign={handleAssign}
        loading={assigning}
      />

      <RevokeModal
        open={revokeModal.open}
        onClose={() => setRevokeModal({ open: false, asset: null })}
        asset={revokeModal.asset}
        onRevoke={handleRevoke}
        loading={revoking}
      />

      <HistoryDrawer
        open={historyDrawer.open}
        onClose={() => setHistoryDrawer({ open: false, asset: null })}
        asset={historyAsset}
      />

      <DeleteConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, asset: null })}
        asset={deleteModal.asset}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}