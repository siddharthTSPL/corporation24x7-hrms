import { useState } from "react";
import toast from "react-hot-toast";
import { Link2, Mail, KeyRound, UserX, ShieldCheck } from "lucide-react";
import { useInviteGuests, useResendGuestPin, useRevokeGuest } from "../../../auth/server-state/meeting/meetingGuest.hook";
import { Btn, Chip, Field, inputCls } from "../ui";
import { GUEST_SKIP_REASON, errMsg, fmtDateTime, guestJoinLink, parseGuestInput } from "../meetingUtils";

// Outsiders (no account) invited by email. Each gets a personal 6-digit PIN by email, opens the
// guest link, and waits in the lobby until the host admits them.
export default function GuestsTab({ meeting: m }) {
  const [text, setText] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const invite = useInviteGuests();
  const resend = useResendGuestPin();
  const revoke = useRevokeGuest();

  const closed = m.status === "ended" || m.status === "cancelled";
  const all = m.guests || [];
  const active = all.filter((g) => !g.revoked);
  const removed = all.filter((g) => g.revoked);
  const parsed = parseGuestInput(text);

  const submit = () => {
    if (!parsed.length) return toast.error("Enter at least one email address");
    invite.mutate(
      { id: m.id, guests: parsed, sendEmail },
      {
        onSuccess: (res) => {
          if (res.added?.length) toast.success(`${res.added.length} guest${res.added.length > 1 ? "s" : ""} invited${sendEmail ? " - PIN emailed" : ""}`);
          (res.skipped || []).forEach((s) => toast(`${s.email}: ${GUEST_SKIP_REASON[s.reason] || s.reason}`, { icon: "⚠️" }));
          if (res.added?.length) setText("");
        },
        onError: (e) => toast.error(errMsg(e)),
      },
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(guestJoinLink(m.id));
      toast.success("Guest link copied");
    } catch {
      toast.error("Couldn't copy - select the link and copy it manually");
    }
  };

  return (
    <div className="space-y-6 p-5">
      <div className="flex gap-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#730042]" />
        <p>
          Guests don't need an account. They get an email with a personal 6-digit PIN, open the guest link, and wait in the lobby until you admit them.
        </p>
      </div>

      {!closed && (
        <section className="space-y-3">
          <Field label="Invite by email" hint="One per line or comma-separated. Optional name: Priya Sharma <priya@example.com>">
            <textarea className={inputCls} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={"client@company.com\nPriya Sharma <priya@example.com>"} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="accent-[#730042]" />
            Email the invitation and PIN now
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Btn onClick={submit} loading={invite.isPending} disabled={!parsed.length}>
              <Mail size={15} /> Invite {parsed.length > 0 ? `${parsed.length} guest${parsed.length > 1 ? "s" : ""}` : ""}
            </Btn>
            <Btn variant="secondary" onClick={copyLink}>
              <Link2 size={15} /> Copy guest link
            </Btn>
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-800">Guests ({active.length})</h3>
        {active.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">No outside guests invited yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {active.map((g) => (
              <li key={g.guestId} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{g.name || g.email}</p>
                  {g.name && <p className="truncate text-xs text-gray-500">{g.email}</p>}
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {g.joinCount > 0 ? <Chip tone="green">Joined {g.joinCount}×{g.lastJoinedAt ? ` · ${fmtDateTime(g.lastJoinedAt)}` : ""}</Chip> : <Chip>Not joined yet</Chip>}
                    {g.locked && <Chip tone="amber">PIN locked</Chip>}
                  </div>
                </div>
                {!closed && (
                  <div className="flex gap-1">
                    <Btn
                      variant="secondary"
                      size="sm"
                      loading={resend.isPending && resend.variables?.guestId === g.guestId}
                      onClick={() => resend.mutate({ id: m.id, guestId: g.guestId }, { onSuccess: (r) => toast.success(r.message || "New PIN emailed"), onError: (e) => toast.error(errMsg(e)) })}
                      title="Email a brand-new PIN (the old one stops working)"
                    >
                      <KeyRound size={13} /> Resend PIN
                    </Btn>
                    <Btn
                      variant="dangerSoft"
                      size="sm"
                      onClick={() =>
                        window.confirm(`Remove ${g.name || g.email}? They will be removed from the meeting if they're in it.`) &&
                        revoke.mutate({ id: m.id, guestId: g.guestId }, { onSuccess: () => toast.success("Guest removed"), onError: (e) => toast.error(errMsg(e)) })
                      }
                    >
                      <UserX size={13} /> Remove
                    </Btn>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {removed.length > 0 && <p className="mt-2 text-xs text-gray-400">{removed.length} removed guest{removed.length > 1 ? "s" : ""} (inviting the same email again restores access with a new PIN).</p>}
      </section>
    </div>
  );
}
