import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FaLock, FaUnlock, FaShieldAlt } from "react-icons/fa";
import { dpdpHttp, getDpdpToken, getDpdpExpiry, setDpdpToken } from "./dpdpGate";

// Mounted once in main.jsx (inside QueryClientProvider).
// 1) PIN popup, opened by the axios gate (or by a "Unlock" button).
// 2) small chip: shows locked/unlocked state and lets the user lock again.
export default function DpdpPinHost() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [, tick] = useState(0);
  const waiters = useRef([]);

  const loadStatus = async () => {
    try {
      const { data } = await dpdpHttp.get("dpdp/status");
      setStatus(data);
    } catch { setStatus(null); }
  };

  useEffect(() => {
    const onNeed = (e) => { waiters.current.push(e.detail); setPin(""); setErr(""); setOpen(true); };
    const onChange = () => tick((n) => n + 1);
    window.addEventListener("dpdp:pin-required", onNeed);
    window.addEventListener("dpdp:changed", onChange);
    window.addEventListener("focus", loadStatus);
    loadStatus();
    const iv = setInterval(() => { loadStatus(); tick((n) => n + 1); }, 60000);
    return () => {
      window.removeEventListener("dpdp:pin-required", onNeed);
      window.removeEventListener("dpdp:changed", onChange);
      window.removeEventListener("focus", loadStatus);
      clearInterval(iv);
    };
  }, []);

  const close = (ok) => {
    setOpen(false);
    const w = waiters.current; waiters.current = [];
    w.forEach((x) => (ok ? x.resolve() : x.reject(new Error("cancelled"))));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{4,12}$/.test(pin)) { setErr("Enter the numeric PIN given by your Super Admin"); return; }
    setBusy(true); setErr("");
    try {
      const { data } = await dpdpHttp.post("dpdp/pin/verify", { pin });
      setDpdpToken(data.token, data.expiresInMinutes);
      toast.success(`Protected data unlocked for ${data.expiresInMinutes} min`);
      close(true);
      qc.invalidateQueries();
      loadStatus();
    } catch (ex) {
      setErr(ex?.response?.data?.message || "Could not verify PIN");
    } finally { setBusy(false); }
  };

  const lockNow = async () => {
    try { await dpdpHttp.post("dpdp/pin/lock"); } catch { /* ignore */ }
    setDpdpToken(null);
    qc.invalidateQueries();
    loadStatus();
  };

  const unlocked = !!getDpdpToken();
  const exp = getDpdpExpiry();
  const minsLeft = exp ? Math.max(0, Math.ceil((exp - Date.now()) / 60000)) : 0;
  const showChip = status?.enabled && status?.canUnlock;

  return (
    <>
      {showChip && (
        <div className="fixed bottom-4 left-4 z-[60]">
          {unlocked ? (
            <button onClick={lockNow} title="Lock protected data now"
              className="flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-emerald-700">
              <FaUnlock /> Protected data unlocked · {minsLeft}m · Lock
            </button>
          ) : (
            <button onClick={() => { setPin(""); setErr(""); setOpen(true); }}
              className="flex items-center gap-2 rounded-full bg-gray-800 px-3 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-gray-900">
              <FaLock /> Personal data masked · Unlock
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex items-center gap-2 text-[#730042]">
              <FaShieldAlt className="text-xl" />
              <h2 className="text-lg font-semibold">Protected personal data</h2>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Documents and personal identifiers (Aadhaar, PAN, bank details) are protected under DPDP.
              Enter the access PIN issued by your organisation's Super Admin. Every access is logged.
            </p>
            <input autoFocus type="password" inputMode="numeric" autoComplete="off" maxLength={12} value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="Access PIN"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg tracking-[0.4em] outline-none focus:border-[#730042]" />
            {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => close(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button disabled={busy} className="rounded-lg bg-[#730042] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                {busy ? "Checking..." : "Unlock"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
