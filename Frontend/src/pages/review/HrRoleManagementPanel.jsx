import React from "react";
import { useGetAllAdmins, useSetAdminHRRole } from "../../auth/server-state/superadmin/other/suother.hook";

const BRAND = {
  pink: "#8B1A4A",
  maroon: "#5C0F30",
  cardBorder: "#E8D5DF",
  mutedText: "#9B7A8A",
  textPrimary: "#2D0A1A",
  accentLight: "#FAF0F5",
};

function getFullName(a) {
  if (a?.f_name) return `${a.f_name} ${a.l_name ?? ""}`.trim();
  return a?.name ?? "Unknown";
}

export default function HrRoleManagementPanel() {
  const { data, isLoading, isError, error, refetch } = useGetAllAdmins();
  const admins = Array.isArray(data) ? data : data?.admins ?? data?.data?.admins ?? [];

  const { mutate: setHRRole, isPending, variables } = useSetAdminHRRole();

  return (
    <div className="bg-white rounded-2xl border-2 shadow-md overflow-hidden" style={{ borderColor: BRAND.maroon }}>
      <div className="p-4 sm:p-5 border-b" style={{ borderColor: BRAND.cardBorder }}>
        <p className="m-0 text-[11px] tracking-[0.1em] uppercase font-medium" style={{ color: BRAND.mutedText }}>
          HR Management
        </p>
        <p className="m-0 mt-1 text-[13px]" style={{ color: BRAND.textPrimary }}>
          Choose which Admins can give the final review approval. Any number of Admins can hold this — the first to act finalises a review.
        </p>
      </div>

      <div className="p-3 sm:p-4">
        {isLoading && (
          <div className="text-center py-8 text-sm" style={{ color: BRAND.mutedText }}>
            Loading admins…
          </div>
        )}
        {isError && (
          <div className="text-center py-6">
            <p className="text-[13px] mb-2" style={{ color: "#8B1A2A" }}>
              {error?.response?.data?.message ?? error?.message ?? "Failed to load admins."}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-xs py-1.5 px-3.5 rounded-lg border cursor-pointer"
              style={{ borderColor: BRAND.pink, color: BRAND.pink, background: BRAND.accentLight }}
            >
              Retry
            </button>
          </div>
        )}
        {!isLoading && !isError && admins.length === 0 && (
          <div className="text-center py-10 text-sm" style={{ color: BRAND.mutedText }}>
            No admins found.
          </div>
        )}
        {!isLoading && !isError && admins.length > 0 && (
          <div className="flex flex-col gap-2">
            {admins.map((a) => {
              const isTogglingThis = isPending && variables?.adminid === a._id;
              return (
                <div
                  key={a._id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border"
                  style={{ borderColor: BRAND.cardBorder, background: a.isHR ? BRAND.accentLight : "#fff" }}
                >
                  <div className="min-w-0">
                    <p className="m-0 text-[13px] font-semibold truncate" style={{ color: BRAND.textPrimary }}>
                      {getFullName(a)}
                    </p>
                    <p className="m-0 text-[11px] truncate" style={{ color: BRAND.mutedText }}>
                      {a.work_email} {a.designation ? `· ${a.designation}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isTogglingThis}
                    onClick={() => setHRRole({ adminid: a._id, isHR: !a.isHR })}
                    className="text-[12px] font-semibold py-1.5 px-3.5 rounded-full cursor-pointer disabled:opacity-40 whitespace-nowrap"
                    style={
                      a.isHR
                        ? { border: `1px solid #B0233A`, color: "#B0233A", background: "#fff" }
                        : { background: `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})`, color: "#fff" }
                    }
                  >
                    {isTogglingThis ? "Updating…" : a.isHR ? "Revoke HR" : "Make HR"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}