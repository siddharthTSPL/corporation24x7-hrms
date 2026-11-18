import { useEffect, useState } from "react";
import { FaLock, FaUnlock } from "react-icons/fa";
import { getDpdpToken, getDpdpExpiry, setDpdpToken } from "./dpdpGate";
import { useDpdpStatus, useLockDpdp } from "../auth/server-state/dpdp/dpdp.hook";

export default function DpdpLockCard() {
  const { data: status } = useDpdpStatus();
  const lock = useLockDpdp();
  const [, tick] = useState(0);

  useEffect(() => {
    const onChange = () => tick((n) => n + 1);
    window.addEventListener("dpdp:changed", onChange);
    const iv = setInterval(onChange, 30000);
    return () => {
      window.removeEventListener("dpdp:changed", onChange);
      clearInterval(iv);
    };
  }, []);

  const unlocked = !!getDpdpToken();
  const exp = getDpdpExpiry();
  const minsLeft = exp ? Math.max(0, Math.ceil((exp - Date.now()) / 60000)) : 0;
  const canUnlock = !!status?.canUnlock;

  const openPin = () => window.dispatchEvent(new CustomEvent("dpdp:open-pin"));
  const lockNow = () => lock.mutate(undefined, { onSettled: () => setDpdpToken(null) });

  return (
    <div className="mx-auto w-full max-w-4xl rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-full ${unlocked ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
            {unlocked ? <FaUnlock /> : <FaLock />}
          </div>
          <div>
            <h2 className="font-semibold">Protected personal data</h2>
            <p className="text-sm text-gray-600">
              {!canUnlock
                ? "Your role does not need a PIN. Your own details are always visible to you."
                : unlocked
                  ? `Unlocked. Aadhaar, PAN, bank and phone are visible for ${minsLeft} more minute(s).`
                  : "Locked. Aadhaar, PAN, bank and phone are masked. Documents ask for the PIN when you open them."}
            </p>
          </div>
        </div>
        {canUnlock && (
          unlocked ? (
            <button onClick={lockNow} disabled={lock.isPending} className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50">Lock now</button>
          ) : (
            <button onClick={openPin} className="rounded-lg bg-[#730042] px-4 py-2 text-sm font-medium text-white hover:opacity-90">Unlock with PIN</button>
          )
        )}
      </div>
    </div>
  );
}
