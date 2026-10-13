import { FiAlertTriangle } from "react-icons/fi";
import { usePlanFeatures } from "../auth/server-state/planFeature/planFeature.hook";

// Shown once the free trial has ended and the organisation has crossed the
// free-tier storage cap. SuperAdmin/Admin get an "upgrade your plan" message
// with a link; Manager/Employee get a softer "contact your organization"
// message, since they can't act on it themselves.
export default function StorageLimitBanner({ role }) {
  const { data: planFeatures } = usePlanFeatures();
  const storage = planFeatures?.storage;
  const isAdminRole = role === "superadmin" || role === "admin";

  if (storage?.limitReached) {
    return (
      <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <FiAlertTriangle className="mt-0.5 shrink-0 text-red-500" size={20} />
        <div className="text-sm text-red-700">
          <p className="font-semibold">Storage limit reached</p>
          {isAdminRole ? (
            <p className="mt-0.5">
              You've used {storage.usedFormatted} of your {storage.limitFormatted} free storage.
              {" "}Please upgrade to the{" "}
              <a
                href="https://torchxsuite.com"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline"
              >
                Basic or Advance plan
              </a>{" "}
              for unlimited storage and to keep using TorchX Talent.
            </p>
          ) : (
            <p className="mt-0.5">
              Your organisation has reached its free storage limit. Please contact your organization.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Trial just ended (no paid license yet), storage still fine — nothing is
  // blocked, only a heads-up that the org is now on limited (Basic) features.
  if (planFeatures?.trialJustEnded) {
    return (
      <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={20} />
        <div className="text-sm text-amber-800">
          <p className="font-semibold">Your free trial has expired</p>
          <p className="mt-0.5">
            You can keep enjoying TorchX Talent with limited (Basic plan) features and{" "}
            {storage?.limitFormatted || "5 MB"} of free storage.
            {isAdminRole ? (
              <>
                {" "}Upgrade to the{" "}
                <a
                  href="https://torchxsuite.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline"
                >
                  Basic or Advance plan
                </a>{" "}
                for unlimited storage and to unlock everything again.
              </>
            ) : (
              " Contact your organization if you need more."
            )}
          </p>
        </div>
      </div>
    );
  }

  return null;
}