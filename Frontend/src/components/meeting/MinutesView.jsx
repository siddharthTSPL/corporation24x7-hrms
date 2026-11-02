import { CheckCircle2, Circle, Gavel, ListChecks, BarChart3, MessageCircleQuestion, Smile, Award, Clock3, Users, FileText } from "lucide-react";
import { Chip } from "./ui";
import { fmtDate, fmtDuration } from "./meetingUtils";

const secToMin = (s) => fmtDuration(Math.max(1, Math.round((s || 0) / 60)));

function Section({ icon: Icon, title, count, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <h4 className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-900">
        <Icon size={15} className="text-[#730042]" aria-hidden="true" /> {title}
        {count > 0 && <span className="ml-auto text-xs font-normal text-gray-600">{count}</span>}
      </h4>
      <div className="p-4 text-sm text-gray-800">{children}</div>
    </section>
  );
}

export const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
    <p className="text-lg font-semibold text-gray-900">{value}</p>
    <p className="text-xs text-gray-600">{label}</p>
  </div>
);

export default function MinutesView({ minutes: r }) {
  const done = r.actionItems.filter((i) => i.status === "done").length;
  const sections = [];

  if (r.decisions.length) {
    sections.push(
      <Section key="decisions" icon={Gavel} title="Decisions" count={r.decisions.length}>
        <ol className="list-decimal space-y-1.5 pl-5">
          {r.decisions.map((d, i) => (
            <li key={i}>
              {d.text}
              {d.by && <span className="text-xs text-gray-600"> · {d.by}</span>}
            </li>
          ))}
        </ol>
      </Section>,
    );
  }

  if (r.actionItems.length) {
    sections.push(
      <Section key="actions" icon={ListChecks} title="Action items" count={r.actionItems.length}>
        <ul className="space-y-2">
          {r.actionItems.map((i, idx) => (
            <li key={idx} className="flex items-start gap-2">
              {i.status === "done" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-label="Done" /> : <Circle size={16} className="mt-0.5 shrink-0 text-gray-400" aria-label="Open" />}
              <div className="min-w-0">
                <p className={i.status === "done" ? "text-gray-600 line-through" : "text-gray-900"}>{i.title}</p>
                <p className="text-xs text-gray-600">
                  {i.assignee}
                  {i.dueDate ? ` · due ${fmtDate(i.dueDate)}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-gray-600">
          {done} of {r.actionItems.length} done
        </p>
      </Section>,
    );
  }

  if (r.agenda.length) {
    sections.push(
      <Section key="agenda" icon={Clock3} title="Agenda" count={r.agenda.length}>
        <ul className="space-y-1.5">
          {r.agenda.map((a, i) => (
            <li key={i} className="flex flex-wrap items-center gap-x-2">
              <span className="font-medium">{a.title}</span>
              <span className="text-xs text-gray-600">
                {secToMin(a.spentSec)}
                {a.plannedMin ? ` of ${a.plannedMin} min` : ""}
              </span>
              {a.overrunSec > 0 && <Chip tone="amber">Over by {secToMin(a.overrunSec)}</Chip>}
              {a.status === "skipped" && <Chip>Skipped</Chip>}
            </li>
          ))}
        </ul>
      </Section>,
    );
  }

  if (r.polls.length) {
    sections.push(
      <Section key="polls" icon={BarChart3} title="Poll results" count={r.polls.length}>
        <div className="space-y-4">
          {r.polls.map((p, i) => (
            <div key={i}>
              <p className="font-medium">
                {p.question} <span className="text-xs font-normal text-gray-600">({p.totalVotes} votes)</span>
              </p>
              <ul className="mt-1.5 space-y-1">
                {p.options.map((o, j) => (
                  <li key={j} className="flex items-center gap-2 text-xs">
                    <span className="w-28 shrink-0 truncate sm:w-40">{o.text}</span>
                    <div className="h-2 flex-1 rounded-full bg-gray-100" aria-hidden="true">
                      <div className="h-2 rounded-full bg-[#730042]" style={{ width: `${p.totalVotes ? (o.votes / p.totalVotes) * 100 : 0}%` }} />
                    </div>
                    <span className="w-6 text-right text-gray-700">{o.votes}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>,
    );
  }

  if (r.questions.total) {
    sections.push(
      <Section key="qa" icon={MessageCircleQuestion} title="Q&A" count={r.questions.total}>
        <p className="text-xs text-gray-600">
          {r.questions.answered} answered · {r.questions.unanswered} still open
        </p>
        {r.questions.highlights.length > 0 && (
          <ul className="mt-2 space-y-2">
            {r.questions.highlights.map((h, i) => (
              <li key={i}>
                <p className="font-medium">Q: {h.question}</p>
                {h.answer && <p className="text-gray-700">A: {h.answer}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>,
    );
  }

  if (r.pulse.length) {
    sections.push(
      <Section key="pulse" icon={Smile} title="Team mood" count={r.pulse.length}>
        <ul className="space-y-1">
          {r.pulse.map((p, i) => (
            <li key={i}>
              {p.prompt}: <span className="font-medium">{p.avg}/5</span> <span className="text-xs text-gray-600">({p.count} responses)</span>
            </li>
          ))}
        </ul>
      </Section>,
    );
  }

  if (r.kudos.length) {
    sections.push(
      <Section key="kudos" icon={Award} title="Kudos" count={r.kudos.length}>
        <ul className="space-y-1">
          {r.kudos.map((k, i) => (
            <li key={i}>
              {k.from} → {k.to}
              {k.message && <span className="text-gray-700">: {k.message}</span>}
            </li>
          ))}
        </ul>
      </Section>,
    );
  }

  if (r.notes) {
    sections.push(
      <Section key="notes" icon={FileText} title="Notes">
        <p className="whitespace-pre-wrap">{r.notes}</p>
      </Section>,
    );
  }

  if (r.attendance.length) {
    sections.push(
      <Section key="attendance" icon={Users} title="Attendance" count={r.attendance.length}>
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {r.attendance.map((a) => (
            <li key={a.key} className="flex justify-between gap-2">
              <span className="truncate">{a.name}</span>
              <span className="shrink-0 text-xs text-gray-600">{secToMin(a.durationSec)}</span>
            </li>
          ))}
        </ul>
      </Section>,
    );
  }

  return <div className="space-y-3">{sections}</div>;
}
