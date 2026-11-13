import { useState } from "react";
import { TrendingUp, Award, Target, ThumbsUp, Trophy, Gift } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGamificationToggle,
  setGamificationToggle,
} from "../../auth/api/gamification/gamificationToggle.api";

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
        checked ? "bg-[#730042]" : "bg-[#e0d6d2]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

const PERKS = [
  [TrendingUp, "XP and levels", "Employees earn XP for attendance, timesheets, training, reviews and policy acknowledgements."],
  [Award, "Achievements", "132 milestone achievements, plus custom company achievements."],
  [Target, "Goals and challenges", "Weekly and monthly goals, team challenges and seasons."],
  [ThumbsUp, "Peer recognition", "Colleagues recognise each other against company values."],
  [Trophy, "Leaderboards", "Individual and department rankings, with privacy controls."],
  [Gift, "Rewards store", "Employees redeem reward points for perks, time off and vouchers, with an approval workflow."],
];

// SuperAdmin: turn the Rewards & Gamification module on/off for the whole organisation.
// Default is OFF. While OFF the Rewards menu items are hidden for everyone and no XP is awarded.
export default function GamificationToggleCard({ onSuccess, onError }) {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["gamification-toggle"],
    queryFn: getGamificationToggle,
    staleTime: 0,
  });
  const [confirmOff, setConfirmOff] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: setGamificationToggle,
    onSuccess: (res) => {
      qc.setQueryData(["gamification-toggle"], (old) => ({ ...(old || {}), enabled: res.enabled }));
      // sidebar (plan-features) + XP chip / hub must pick up the change immediately
      qc.invalidateQueries({ queryKey: ["plan-features"] });
      qc.invalidateQueries({ queryKey: ["gam"] });
      setConfirmOff(false);
      onSuccess?.(res.message || (res.enabled ? "Recognition & Rewards enabled" : "Recognition & Rewards disabled"));
    },
    onError: (err) => {
      setConfirmOff(false);
      onError?.(err.message || "Could not update Recognition & Rewards");
    },
  });

  const enabled = data?.enabled === true;

  const handleChange = (next) => {
    if (!next) return setConfirmOff(true); // ask before switching OFF
    mutate(true);
  };

  return (
    <div className="bg-white rounded-xl border border-[#e8dcd6] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-[#2a1a16] mb-1">Recognition &amp; Rewards</h3>
          <p className="text-sm text-[#8a7a75] max-w-xl">
            Turn the recognition and rewards programme on for your whole organisation. It is off by default. While off,
            the menu is hidden for admins, managers and employees, and nobody earns XP or reward points.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-semibold ${enabled ? "text-emerald-600" : "text-[#b0948a]"}`}>
            {isLoading ? "…" : enabled ? "ON" : "OFF"}
          </span>
          <ToggleSwitch checked={enabled} disabled={isLoading || isError || isPending} onChange={handleChange} />
        </div>
      </div>

      {isError && <p className="text-xs text-red-600 mt-3">Could not load the current setting. Please refresh.</p>}

      {confirmOff && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Switch off Recognition &amp; Rewards?</p>
          <p className="text-xs text-amber-700 mt-1">
            The menu will disappear and no new XP will be awarded. Existing points, achievements and redemptions
            are kept, and come back if you switch it on again.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => mutate(false)}
              className="px-4 py-2 rounded-lg text-sm bg-[#730042] text-white disabled:opacity-50"
            >
              Yes, switch off
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirmOff(false)}
              className="px-4 py-2 rounded-lg text-sm border border-[#e8dcd6] text-[#2a1a16]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {PERKS.map(([Icon, title, text]) => (
          <div key={title} className="flex gap-3 rounded-lg border border-[#f1e8e3] p-3">
            <span className="mt-0.5 text-[#730042]"><Icon size={18} /></span>
            <div>
              <p className="text-sm font-medium text-[#2a1a16]">{title}</p>
              <p className="text-xs text-[#8a7a75] mt-0.5">{text}</p>
            </div>
          </div>
        ))}
      </div>

      {enabled && (
        <p className="text-xs text-[#8a7a75] mt-5">
          Points, challenges, seasons and reward approvals are managed from <b>Rewards Admin</b> in the sidebar.
        </p>
      )}
    </div>
  );
}
