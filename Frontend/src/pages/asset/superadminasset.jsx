import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  FaPlus, FaTimes, FaCheck, FaEdit, FaTrash, FaSearch, FaFilter,
  FaLaptop, FaDesktop, FaMobileAlt, FaKeyboard, FaMouse, FaHeadphones,
  FaTabletAlt, FaBox, FaExclamationTriangle, FaUndo, FaDownload,
  FaHistory, FaUserShield, FaEllipsisV, FaCubes,
} from "react-icons/fa";
import {
  useGetAllAssetsSuperAdmin,
  useCreateAssetSuperAdmin,
  useUpdateAssetSuperAdmin,
  useDeleteAssetSuperAdmin,
  useAssignAssetToAdmin,
  useRevokeAssetSuperAdmin,
  useGetEmployeesWithAssetsSuperAdmin,
  useGetEmployeeAssetHistorySuperAdmin,
} from "../../auth/server-state/superadmin/asset/superadminasset.hook";
import { useGetAllAdmins } from "../../auth/server-state/superadmin/other/suother.hook";
import EmployeeAssetsPanel from "./EmployeeAssetsPanel";

const ASSET_TYPES = ["laptop","desktop","monitor","keyboard","mouse","headset","mobile","tablet","other"];
const CONDITIONS   = ["new","good","fair","poor"];
const STATUSES     = ["available","assigned","under_maintenance","retired"];

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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
  assigned:          { color:"#730042", bg:"#f7ecf3", border:"#e8d5e2", label:"Fully Assigned" },
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
  model_number:"", purchase_date:"", purchase_price:"", condition:"good", notes:"", quantity:"1",
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
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap"
      style={{ color: m.color, background: m.bg, borderColor: m.border }}
    >
      {m.label}
    </span>
  );
}

function ConditionDot({ condition }) {
  const m = CONDITION_META[condition] || CONDITION_META.good;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap" style={{ color: m.color }}>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

function AssetIcon({ type }) {
  return (
    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-[#f7ecf3] text-[#730042] text-sm flex-shrink-0">
      {TYPE_ICON[type] || <FaBox />}
    </div>
  );
}

function QuantityPill({ available, total }) {
  const empty = available <= 0;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap"
      style={{
        color: empty ? "#730042" : "#0d9e6e",
        background: empty ? "#f7ecf3" : "#e8f7f1",
        borderColor: empty ? "#e8d5e2" : "#a7f3d0",
      }}
    >
      <FaCubes size={9} /> {available}/{total}
    </span>
  );
}

function activeAssignments(asset) {
  return (asset?.assignments || []).filter((a) => !a.is_returned);
}

// Display label for assigned_to_model — "User" (the backend/DB model name) is shown as "Employee".
function roleLabel(model) {
  if (model === "User") return "Employee";
  return model || "Unknown";
}

function AssigneeStack({ asset }) {
  const active = activeAssignments(asset);
  if (active.length === 0) return <span className="text-[#c499b4] text-[12px]">—</span>;
  const shown = active.slice(0, 2);
  const extra = active.length - shown.length;
  return (
    <div className="flex flex-col gap-1">
      {shown.map((a) => {
        const p = a.assigned_to || {};
        return (
          <div key={a._id} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#FBEAF0] flex items-center justify-center text-[9px] font-bold text-[#730042] flex-shrink-0">
              {((p.f_name || "?")[0] + (p.l_name || "?")[0]).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#730042] truncate">
                {p.f_name} {p.l_name} {a.quantity > 1 ? `× ${a.quantity}` : ""}
              </p>
              <p className="text-[10px] text-[#993556] truncate">{roleLabel(a.assigned_to_model)}</p>
            </div>
          </div>
        );
      })}
      {extra > 0 && <span className="text-[10px] text-[#993556] font-semibold">+{extra} more</span>}
    </div>
  );
}

function ActionMenu({ asset, onEdit, onDelete, onAssign, onAssignments }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const MENU_WIDTH = 200;
  const MARGIN = 8;
  const GAP = 6;

  const computePosition = () => {
    const btn = btnRef.current;
    const menu = menuRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuHeight = menu ? menu.offsetHeight : 190;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const spaceLeft = rect.left;
    const spaceRight = viewportW - rect.right;
    let left;
    if (spaceLeft >= MENU_WIDTH + GAP || spaceLeft >= spaceRight) {
      left = rect.left - MENU_WIDTH - GAP;
    } else {
      left = rect.right + GAP;
    }
    if (left < MARGIN) left = MARGIN;
    if (left + MENU_WIDTH > viewportW - MARGIN) left = viewportW - MENU_WIDTH - MARGIN;

    let top = rect.top + rect.height / 2 - menuHeight / 2;
    const minTop = MARGIN;
    const maxTop = viewportH - MARGIN - menuHeight;
    if (top < minTop) top = minTop;
    if (top > maxTop) top = Math.max(minTop, maxTop);

    setCoords({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    computePosition();
    setReady(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleReposition = () => computePosition();
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const canAssign = (asset.available_quantity ?? 0) > 0 && asset.status !== "retired" && asset.status !== "under_maintenance";
  const hasAssignments = (asset.assignments || []).length > 0;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={() => setOpen((p) => !p)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7a5568] border border-[#e8d5e2] hover:bg-[#f7ecf3] hover:text-[#730042] transition-colors flex-shrink-0"
      >
        <FaEllipsisV size={10} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            width: MENU_WIDTH,
            visibility: ready ? "visible" : "hidden",
          }}
          className="z-[2000] bg-white border border-[#e8d5e2] rounded-xl shadow-xl py-1 overflow-hidden"
        >
          <button onClick={() => { onEdit(asset); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#730042] hover:bg-[#f7ecf3]">
            <FaEdit size={10} /> Edit Details
          </button>
          {canAssign && (
            <button onClick={() => { onAssign(asset); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#730042] hover:bg-[#f7ecf3]">
              <FaUserShield size={10} /> Assign to Admin
            </button>
          )}
          <button onClick={() => { onAssignments(asset); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#7a5568] hover:bg-[#f7ecf3]">
            <FaHistory size={10} /> {hasAssignments ? "Manage Assignments" : "View Assignments"}
          </button>
          <div className="border-t border-[#f0dcea] my-1" />
          <button onClick={() => { onDelete(asset); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-600 hover:bg-red-50">
            <FaTrash size={10} /> Delete
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

function AssetFormModal({ open, onClose, initial, onSave, loading }) {
  const [form, setForm] = useState(BLANK_FORM);
  useEffect(() => {
    if (open) {
      setForm(initial ? { ...BLANK_FORM, ...initial, quantity: String(initial.total_quantity ?? 1) } : BLANK_FORM);
    }
  }, [open]);
  if (!open) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isEdit = !!initial;
  const assignedCount = isEdit ? (initial.total_quantity ?? 1) - (initial.available_quantity ?? 0) : 0;
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[rgba(13,2,9,0.7)] backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[90vh] animate-[modalUp_0.22s_ease-out]">
        <div className="sticky top-0 z-10 bg-white px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#e8d5e2] flex items-center justify-between rounded-t-2xl">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#0d0209] truncate">{isEdit ? "Edit Asset" : "Add New Asset"}</h2>
            <p className="text-[11px] text-[#c499b4] mt-0.5 truncate">{isEdit ? "Update asset details" : "Register a new asset and its stock quantity"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[#7a5568] hover:bg-[#f7ecf3] hover:text-[#730042] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center flex-shrink-0">
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
              <FLabel required>{isEdit ? "Total Quantity" : "Quantity"}</FLabel>
              <input
                className={inputCls}
                type="number"
                min={1}
                step={1}
                placeholder="1"
                value={form.quantity}
                onChange={set("quantity")}
              />
              {isEdit ? (
                <p className="text-[10px] text-[#c499b4] mt-1">
                  {assignedCount} unit{assignedCount === 1 ? "" : "s"} currently assigned · lowering this reduces available stock
                </p>
              ) : (
                <p className="text-[10px] text-[#c499b4] mt-1">How many units of this asset are being added, e.g. 100 laptops</p>
              )}
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
              <FLabel>Purchase Price (₹ per unit)</FLabel>
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
        <div className="sticky bottom-0 bg-white border-t border-[#e8d5e2] px-4 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#e8d5e2] text-[13px] font-medium text-[#7a5568] hover:border-[#730042] hover:text-[#730042] transition-colors min-h-[44px]">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={loading || !form.asset_name || !form.asset_type || !form.quantity || Number(form.quantity) < 1}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#730042] text-white text-[13px] font-semibold hover:bg-[#4a0029] active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
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
  const [quantity, setQuantity] = useState("1");
  useEffect(() => { if (open) { setSelectedAdmin(""); setQuantity("1"); } }, [open]);
  if (!open || !asset) return null;

  const workingAdmins = admins.filter((a) => (a.working_status || "working") === "working");
  const available = asset.available_quantity ?? 0;
  const qtyNum = Number(quantity);
  const qtyValid = Number.isInteger(qtyNum) && qtyNum >= 1 && qtyNum <= available;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[rgba(13,2,9,0.7)] backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl max-h-[94vh] sm:max-h-[90vh] overflow-y-auto animate-[modalUp_0.22s_ease-out]">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#e8d5e2] flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#0d0209]">Assign Asset to Admin</h2>
            <p className="text-[11px] text-[#c499b4] mt-0.5 truncate">{asset.asset_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[#7a5568] hover:bg-[#f7ecf3] hover:text-[#730042] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center flex-shrink-0">
            <FaTimes size={13} />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center gap-3 p-3 bg-[#f7ecf3] rounded-xl mb-4">
            <AssetIcon type={asset.asset_type} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#0d0209] truncate">{asset.asset_name}</p>
              <p className="text-[11px] text-[#7a5568] truncate">{asset.brand} · {asset.asset_type}</p>
            </div>
            <QuantityPill available={available} total={asset.total_quantity ?? 1} />
          </div>
          <div className="mb-4">
            <FLabel required>Quantity to Assign</FLabel>
            <input
              className={inputCls}
              type="number"
              min={1}
              max={available}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <p className="text-[10px] text-[#c499b4] mt-1">{available} unit{available === 1 ? "" : "s"} available right now</p>
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
              <FaExclamationTriangle size={11} className="flex-shrink-0" /> No active admins available.
            </p>
          )}
        </div>
        <div className="px-4 sm:px-6 pb-4 sm:pb-5 flex flex-col-reverse sm:flex-row gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#e8d5e2] text-[13px] font-medium text-[#7a5568] hover:border-[#730042] hover:text-[#730042] transition-colors min-h-[44px]">
            Cancel
          </button>
          <button
            onClick={() => onAssign({ id: asset._id, admin_id: selectedAdmin, quantity: qtyNum })}
            disabled={loading || !selectedAdmin || !qtyValid}
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

function RevokeModal({ open, onClose, asset, assignment, onRevoke, loading }) {
  const [returnCondition, setReturnCondition] = useState("good");
  const [returnNotes, setReturnNotes] = useState("");
  useEffect(() => { if (open) { setReturnCondition("good"); setReturnNotes(""); } }, [open]);
  if (!open || !asset || !assignment) return null;
  const p = assignment.assigned_to || {};
  return (
    <div
      className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[rgba(13,2,9,0.7)] backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl max-h-[94vh] sm:max-h-[90vh] overflow-y-auto animate-[modalUp_0.22s_ease-out]">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#e8d5e2] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0d0209]">Revoke Asset</h2>
            <p className="text-[11px] text-[#c499b4] mt-0.5">Mark unit(s) as returned</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[#7a5568] hover:bg-[#f7ecf3] hover:text-[#730042] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center flex-shrink-0">
            <FaTimes size={13} />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
          <div className="flex items-start sm:items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <FaExclamationTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-[12px] text-amber-800">
              Revoking {assignment.quantity} unit{assignment.quantity > 1 ? "s" : ""} of <strong>{asset.asset_name}</strong> from{" "}
              <strong>{p.f_name} {p.l_name}</strong> will return them to available stock.
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
        <div className="px-4 sm:px-6 pb-4 sm:pb-5 flex flex-col-reverse sm:flex-row gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#e8d5e2] text-[13px] font-medium text-[#7a5568] hover:border-[#730042] hover:text-[#730042] transition-colors min-h-[44px]">
            Cancel
          </button>
          <button
            onClick={() => onRevoke({ id: asset._id, assignment_id: assignment._id, return_condition: returnCondition, return_notes: returnNotes })}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-[13px] font-semibold hover:bg-amber-700 active:scale-95 transition disabled:opacity-50 min-h-[44px]"
          >
            <FaUndo size={10} />
            {loading ? "Revoking…" : "Revoke"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignmentsDrawer({ open, onClose, asset, onRevokeClick }) {
  if (!open || !asset) return null;
  const all = asset.assignments || [];
  const active = all.filter((a) => !a.is_returned);
  const past = all.filter((a) => a.is_returned).slice().reverse();
  return (
    <div className="fixed inset-0 z-[1000] flex" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="hidden sm:block flex-1" onClick={onClose} />
      <div className="w-full sm:max-w-sm bg-white shadow-2xl flex flex-col border-l border-[#e8d5e2] h-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8d5e2] bg-[#fdf5f9]">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#730042]">Assignments</p>
            <p className="text-[11px] text-[#c499b4] truncate">{asset.asset_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7a5568] hover:bg-[#f7ecf3] flex-shrink-0">
            <FaTimes size={12} />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-[#e8d5e2] bg-[#F9F8F2] flex flex-wrap items-center gap-2">
          <QuantityPill available={asset.available_quantity ?? 0} total={asset.total_quantity ?? 1} />
          <span className="text-[11px] text-[#993556]">units available / total</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-[#7a5568] mb-2">Currently Assigned</p>
            {active.length === 0 ? (
              <p className="text-[12px] text-[#c499b4]">No units currently assigned.</p>
            ) : (
              <div className="space-y-2">
                {active.map((a) => {
                  const p = a.assigned_to || {};
                  return (
                    <div key={a._id} className="p-3 rounded-xl border border-[#e8d5e2] bg-[#fdf5f9] flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-[#0d0209]">{p.f_name} {p.l_name}</p>
                        <p className="text-[10px] text-[#993556] uppercase tracking-wide">{roleLabel(a.assigned_to_model)} · {a.quantity} unit{a.quantity > 1 ? "s" : ""}</p>
                        <p className="text-[11px] text-[#7a5568] mt-1">
                          Since {a.assigned_date ? new Date(a.assigned_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </p>
                      </div>
                      <button
                        onClick={() => onRevokeClick(asset, a)}
                        className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-700 text-[11px] font-semibold hover:bg-amber-50 flex-shrink-0 self-start"
                      >
                        <FaUndo size={9} /> Revoke
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-[#7a5568] mb-2">History</p>
            {past.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-[#c499b4] text-center">
                <FaHistory size={20} />
                <p className="text-[12px]">No returned assignments yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {past.map((h) => {
                  const p = h.assigned_to || {};
                  return (
                    <div key={h._id} className="p-3 rounded-xl border border-[#e8d5e2] bg-[#fdf5f9]">
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                        <span className="text-[11px] font-bold text-[#730042] uppercase tracking-wider">
                          {p.f_name} {p.l_name} · {roleLabel(h.assigned_to_model)}
                        </span>
                        {h.return_condition && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.return_condition === "good" ? "bg-emerald-50 text-emerald-700" : h.return_condition === "damaged" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                            {h.return_condition}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#0d0209] font-semibold">
                        Assigned: {h.assigned_date ? new Date(h.assigned_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} · {h.quantity} unit{h.quantity > 1 ? "s" : ""}
                      </p>
                      {h.returned_date && (
                        <p className="text-[11px] text-[#7a5568] mt-0.5">
                          Returned: {new Date(h.returned_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      )}
                      {h.return_notes && (
                        <p className="text-[11px] text-[#c499b4] mt-1 italic break-words">"{h.return_notes}"</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ open, onClose, asset, onConfirm, loading }) {
  if (!open || !asset) return null;
  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[rgba(13,2,9,0.75)] backdrop-blur-md">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl p-6 animate-[modalUp_0.22s_ease-out]">
        <div className="text-center mb-4">
          <div className="text-4xl mb-3">🗑️</div>
          <h3 className="text-base font-bold text-[#0d0209]">Delete Asset?</h3>
          <p className="text-[12px] text-[#7a5568] mt-1">
            Delete <strong>{asset.asset_name}</strong>? This cannot be undone.
          </p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3">
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

export function SuperAdminAssetReturnWarning({ data, onClose }) {
  if (!data?.asset_return_check?.has_pending_assets) return null;
  const { pending_asset_count, assets, message } = data.asset_return_check;
  return (
    <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[rgba(13,2,9,0.75)] backdrop-blur-md">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl p-5 sm:p-6 max-h-[94vh] overflow-y-auto animate-[modalUp_0.22s_ease-out]">
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
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[#0d0209] truncate">{a.asset_name}</p>
                <p className="text-[10px] text-[#7a5568] truncate">{a.asset_id} · {a.brand || a.asset_type}</p>
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

export default function SuperAdminAssets() {
  const [formModal, setFormModal] = useState({ open: false, editing: null });
  const [assignModal, setAssignModal] = useState({ open: false, asset: null });
  const [revokeModal, setRevokeModal] = useState({ open: false, asset: null, assignment: null });
  const [assignmentsDrawer, setAssignmentsDrawer] = useState({ open: false, asset: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, asset: null });
  const [filters, setFilters] = useState({ status: "", asset_type: "" });
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [activeTab, setActiveTab] = useState("assets"); // "assets" | "employees"
  const pageRef = useRef(null);

  const { data, isLoading } = useGetAllAssetsSuperAdmin(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
  );
  const { data: adminsData } = useGetAllAdmins();

  const { mutate: createAsset, isPending: creating } = useCreateAssetSuperAdmin();
  const { mutate: updateAsset, isPending: updating } = useUpdateAssetSuperAdmin();
  const { mutate: deleteAsset, isPending: deleting } = useDeleteAssetSuperAdmin();
  const { mutate: assignToAdmin, isPending: assigning } = useAssignAssetToAdmin();
  const { mutate: revokeAsset, isPending: revoking } = useRevokeAssetSuperAdmin();

  const rawAssets = data?.assets ?? [];
  const admins = adminsData?.admins ?? [];

  const assets = search
    ? rawAssets.filter((a) =>
        a.asset_name?.toLowerCase().includes(search.toLowerCase()) ||
        a.asset_id?.toLowerCase().includes(search.toLowerCase()) ||
        a.brand?.toLowerCase().includes(search.toLowerCase()) ||
        a.serial_number?.toLowerCase().includes(search.toLowerCase())
      )
    : rawAssets;

  const totalUnits = rawAssets.reduce((s, a) => s + (a.total_quantity ?? 1), 0);
  const availableUnits = rawAssets.reduce((s, a) => s + (a.available_quantity ?? 0), 0);
  const stats = {
    totalTypes: rawAssets.length,
    totalUnits,
    availableUnits,
    assignedUnits: totalUnits - availableUnits,
    maintenance: rawAssets.filter((a) => a.status === "under_maintenance").length,
  };

  const handleSave = (form) => {
    const quantityNum = Math.max(1, Math.floor(Number(form.quantity) || 1));
    if (formModal.editing) {
      const { quantity, ...rest } = form;
      updateAsset(
        { id: formModal.editing._id, data: { ...rest, total_quantity: quantityNum } },
        { onSuccess: () => setFormModal({ open: false, editing: null }) }
      );
    } else {
      createAsset({ ...form, quantity: quantityNum }, { onSuccess: () => setFormModal({ open: false, editing: null }) });
    }
  };

  const handleAssign = (payload) => {
    assignToAdmin(payload, { onSuccess: () => setAssignModal({ open: false, asset: null }) });
  };

  const handleRevoke = (payload) => {
    revokeAsset(payload, { onSuccess: () => setRevokeModal({ open: false, asset: null, assignment: null }) });
  };

  const handleDelete = (id) => {
    deleteAsset(id, { onSuccess: () => setDeleteModal({ open: false, asset: null }) });
  };

  const drawerAsset = assignmentsDrawer.asset
    ? rawAssets.find((a) => a._id === assignmentsDrawer.asset._id) || assignmentsDrawer.asset
    : null;

  function exportCsv() {
    const headers = ["Asset ID","Name","Type","Brand","Model Number","Serial Number","Condition","Total Quantity","Available Quantity","Assigned Units","Status","Purchase Date","Purchase Price"];
    const rows = rawAssets.map((a) => [
      a.asset_id ?? "",
      a.asset_name ?? "",
      a.asset_type ?? "",
      a.brand ?? "",
      a.model_number ?? "",
      a.serial_number ?? "",
      a.condition ?? "",
      a.total_quantity ?? 1,
      a.available_quantity ?? 0,
      (a.total_quantity ?? 1) - (a.available_quantity ?? 0),
      STATUS_META[a.status]?.label ?? a.status ?? "",
      a.purchase_date ? new Date(a.purchase_date).toLocaleDateString("en-IN") : "",
      a.purchase_price ?? "",
    ]);
    const escape = (v) => { const s = String(v ?? ""); return s.includes(",")||s.includes('"')||s.includes("\n") ? `"${s.replace(/"/g,'""')}"` : s; };
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `asset-management-${Date.now()}.csv`);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 2600);
  }

  return (
    <div className="min-h-screen bg-[#F9F8F2] p-3 sm:p-4 md:p-6 lg:p-8 font-['DM_Sans',system-ui,sans-serif] text-[#0d0209]">
      <style>{`@keyframes modalUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}`}</style>

      <div className="max-w-7xl mx-auto" ref={pageRef}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-[#730042] tracking-tight">Asset Management</h1>
            <p className="text-[11px] sm:text-xs md:text-sm text-[#993556] mt-0.5 break-words">
              {stats.totalTypes} asset types · {stats.totalUnits} units · {stats.assignedUnits} assigned · {stats.availableUnits} available
            </p>
          </div>
          <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              onClick={exportCsv}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#730042] text-[#730042] text-[13px] font-semibold hover:bg-[#f7ecf3] active:scale-95 transition min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              <FaDownload size={10} /> Export CSV
            </button>
            <button
              onClick={() => setFormModal({ open: true, editing: null })}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-semibold hover:opacity-90 active:scale-95 transition min-h-[44px] w-full sm:w-auto"
              style={{ background: "#730042" }}
            >
              <FaPlus size={10} /> Add Asset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {[
            { label: "Total Units", value: stats.totalUnits, color: "#730042", bg: "#FBEAF0" },
            { label: "Available", value: stats.availableUnits, color: "#0d9e6e", bg: "#e8f7f1" },
            { label: "Assigned", value: stats.assignedUnits, color: "#2563eb", bg: "#eff6ff" },
            { label: "Maintenance", value: stats.maintenance, color: "#b8760a", bg: "#fff8e1" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-[#F4C0D1] shadow-sm p-3 sm:p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: s.color }} />
              <p className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase mb-1 truncate" style={{ color: s.color }}>{s.label}</p>
              <p className="text-2xl sm:text-3xl font-bold text-[#730042]">{isLoading ? "—" : s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4 sm:mb-6 border-b border-[#F4C0D1]">
          <button
            onClick={() => setActiveTab("assets")}
            className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors -mb-px min-h-[44px] ${
              activeTab === "assets" ? "border-[#730042] text-[#730042]" : "border-transparent text-[#993556] hover:text-[#730042]"
            }`}
          >
            Assets
          </button>
          <button
            onClick={() => setActiveTab("employees")}
            className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors -mb-px min-h-[44px] ${
              activeTab === "employees" ? "border-[#730042] text-[#730042]" : "border-transparent text-[#993556] hover:text-[#730042]"
            }`}
          >
            Employee Assets
          </button>
        </div>

        {activeTab === "employees" ? (
          <EmployeeAssetsPanel
            useEmployees={useGetEmployeesWithAssetsSuperAdmin}
            useHistory={useGetEmployeeAssetHistorySuperAdmin}
          />
        ) : (
        <div className="bg-white rounded-2xl border border-[#F4C0D1] overflow-hidden">
          <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-[#F4C0D1] bg-[#F9F8F2]">
            <div className="flex flex-col sm:flex-row gap-2 mb-2">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#993556]" size={11} />
                <input
                  className="w-full pl-9 pr-3 py-2.5 bg-[#fdf5f9] border border-[#e8d5e2] rounded-lg text-[13px] text-[#0d0209] outline-none transition placeholder:text-[#c499b4] min-h-[44px] focus:border-[#730042] focus:ring-2 focus:ring-[#f7ecf3]"
                  placeholder="Search assets…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-[12px] font-semibold transition-colors min-h-[44px] ${showFilters ? "bg-[#730042] text-white border-[#730042]" : "border-[#F4C0D1] text-[#730042] hover:bg-[#FBEAF0]"}`}
              >
                <FaFilter size={10} /> Filters
              </button>
            </div>
            {showFilters && (
              <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                <select
                  className={`${inputCls} flex-1 min-w-full sm:min-w-[130px]`}
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="">All Status</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>)}
                </select>
                <select
                  className={`${inputCls} flex-1 min-w-full sm:min-w-[130px]`}
                  value={filters.asset_type}
                  onChange={(e) => setFilters((f) => ({ ...f, asset_type: e.target.value }))}
                >
                  <option value="">All Types</option>
                  {ASSET_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
                <button
                  onClick={() => { setFilters({ status: "", asset_type: "" }); setSearch(""); }}
                  className="px-3 py-2 rounded-xl border border-[#F4C0D1] text-[12px] text-[#993556] hover:text-red-600 hover:border-red-200 transition-colors min-h-[44px] w-full sm:w-auto"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-[#993556]">
              <span className="text-2xl">⏳</span>
              <p className="text-[12px]">Loading assets…</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
              <FaBox size={32} className="text-[#F4C0D1]" />
              <p className="text-[14px] font-semibold text-[#993556]">No assets found</p>
              <p className="text-[12px] text-[#c499b4]">Add your first asset to start tracking company property.</p>
              <button onClick={() => setFormModal({ open: true, editing: null })} className="mt-1 flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-semibold hover:opacity-90 transition min-h-[44px]" style={{ background: "#730042" }}>
                <FaPlus size={10} /> Add First Asset
              </button>
            </div>
          ) : (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-[#F4C0D1] bg-[#F9F8F2]">
                      {["Asset", "Type", "Brand / Serial", "Condition", "Quantity", "Status", "Assigned To", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#993556] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FBEAF0]">
                    {assets.map((asset) => (
                      <tr key={asset._id} className="hover:bg-[#FEF4F9] transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <AssetIcon type={asset.asset_type} />
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-[#730042] truncate">{asset.asset_name}</p>
                              <p className="text-[10px] text-[#993556] font-mono truncate">{asset.asset_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-semibold text-[#730042] capitalize">{asset.asset_type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[12px] text-[#730042] font-medium truncate max-w-[140px]">{asset.brand || "—"}</p>
                          <p className="text-[10px] text-[#993556] font-mono truncate max-w-[140px]">{asset.serial_number || "—"}</p>
                        </td>
                        <td className="px-4 py-3"><ConditionDot condition={asset.condition} /></td>
                        <td className="px-4 py-3">
                          <QuantityPill available={asset.available_quantity ?? 0} total={asset.total_quantity ?? 1} />
                        </td>
                        <td className="px-4 py-3"><StatusChip status={asset.status} /></td>
                        <td className="px-4 py-3">
                          <AssigneeStack asset={asset} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="onClick={(e)=>e.stopPropagation()}">
                            <ActionMenu
                              asset={asset}
                              onEdit={(a) => setFormModal({ open: true, editing: a })}
                              onDelete={(a) => setDeleteModal({ open: true, asset: a })}
                              onAssign={(a) => setAssignModal({ open: true, asset: a })}
                              onAssignments={(a) => setAssignmentsDrawer({ open: true, asset: a })}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="lg:hidden divide-y divide-[#FBEAF0]">
                {assets.map((asset) => (
                  <div key={asset._id} className="px-3 sm:px-4 py-3 flex items-start gap-3 hover:bg-[#FEF4F9] transition-colors">
                    <AssetIcon type={asset.asset_type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                        <p className="text-[13px] font-semibold text-[#730042] break-words">{asset.asset_name}</p>
                        <StatusChip status={asset.status} />
                      </div>
                      <p className="text-[10px] text-[#993556] font-mono mb-1 truncate">{asset.asset_id}</p>
                      <div className="flex flex-wrap gap-2 items-center mb-1">
                        <ConditionDot condition={asset.condition} />
                        {asset.brand && <span className="text-[11px] text-[#993556] truncate max-w-[120px]">{asset.brand}</span>}
                        <QuantityPill available={asset.available_quantity ?? 0} total={asset.total_quantity ?? 1} />
                      </div>
                      {activeAssignments(asset).length > 0 && (
                        <p className="text-[11px] text-[#730042] font-medium">
                          → {activeAssignments(asset).length} holder{activeAssignments(asset).length > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    <ActionMenu
                      asset={asset}
                      onEdit={(a) => setFormModal({ open: true, editing: a })}
                      onDelete={(a) => setDeleteModal({ open: true, asset: a })}
                      onAssign={(a) => setAssignModal({ open: true, asset: a })}
                      onAssignments={(a) => setAssignmentsDrawer({ open: true, asset: a })}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {!isLoading && assets.length > 0 && (
            <div className="px-3 sm:px-5 py-2.5 border-t border-[#F4C0D1] bg-[#F9F8F2]">
              <p className="text-[11px] text-[#993556]">Showing {assets.length} of {rawAssets.length} assets</p>
            </div>
          )}
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
        onClose={() => setRevokeModal({ open: false, asset: null, assignment: null })}
        asset={revokeModal.asset}
        assignment={revokeModal.assignment}
        onRevoke={handleRevoke}
        loading={revoking}
      />

      <AssignmentsDrawer
        open={assignmentsDrawer.open}
        onClose={() => setAssignmentsDrawer({ open: false, asset: null })}
        asset={drawerAsset}
        onRevokeClick={(asset, assignment) => setRevokeModal({ open: true, asset, assignment })}
      />

      <DeleteConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, asset: null })}
        asset={deleteModal.asset}
        onConfirm={handleDelete}
        loading={deleting}
      />

      {exportDone && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[9999] flex items-center justify-center sm:justify-start gap-2 px-4 py-3 rounded-xl bg-[#0d0209] text-white text-[13px] font-medium shadow-2xl">
          <FaCheck size={11} className="text-emerald-400 flex-shrink-0" /> CSV exported!
        </div>
      )}
    </div>
  );
}