import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Monitor, Wallet, Check, ChevronDown, X, Loader2 } from "lucide-react";
import { getOrgTeams, saveHRTeam, saveITTeam, saveAccountsTeam } from "../../auth/api/orgteam/orgteam.api";

const keyOf = (p) => `${p.model}:${p._id}`;

/* Searchable dropdown with checkboxes - pick as many people as needed. */
function MultiPicker({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const chosen = useMemo(() => new Set(selected), [selected]);
  const byKey = useMemo(() => new Map(options.map((o) => [keyOf(o), o])), [options]);
  const filtered = options.filter((o) =>
    `${o.name} ${o.uid} ${o.designation} ${o.department} ${o.role}`.toLowerCase().includes(q.toLowerCase()),
  );
  const toggle = (k) => onChange(chosen.has(k) ? selected.filter((x) => x !== k) : [...selected, k]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-600 bg-white"
      >
        <span>{selected.length ? `${selected.length} selected` : placeholder}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, ID, department"
            className="w-full px-3 py-2 text-sm border-b border-slate-200 outline-none rounded-t-lg"
          />
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-400 text-center">No one found</p>
            ) : (
              filtered.map((o) => {
                const k = keyOf(o);
                const on = chosen.has(k);
                return (
                  <button
                    type="button"
                    key={k}
                    onClick={() => toggle(k)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center ${on ? "bg-[#730042] border-[#730042]" : "border-slate-300"}`}>
                      {on && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800 truncate">{o.name}</span>
                      <span className="block text-xs text-slate-400 truncate">
                        {[o.role, o.uid, o.designation, o.department].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selected.map((k) => {
            const p = byKey.get(k);
            if (!p) return null;
            return (
              <span key={k} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-[#730042]/10 text-[#730042] text-xs font-medium">
                {p.name}
                <button type="button" onClick={() => toggle(k)} className="hover:text-red-600"><X className="w-3 h-3" /></button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeamCard({ icon: Icon, title, description, hint, options, initial, saving, onSave }) {
  const [selected, setSelected] = useState(initial);
  useEffect(() => setSelected(initial), [initial]);
  const dirty = JSON.stringify([...selected].sort()) !== JSON.stringify([...initial].sort());

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-[#730042]/10 text-[#730042]"><Icon className="w-5 h-5" /></div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <MultiPicker options={options} selected={selected} onChange={setSelected} placeholder="Select people" />
      <p className="text-xs text-slate-400 mt-3">{hint}</p>
      <div className="flex justify-end mt-4">
        <button
          onClick={() => onSave(selected)}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#730042] text-white text-sm font-semibold disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
        </button>
      </div>
    </div>
  );
}

export default function TeamsPanel({ notify }) {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["org-teams"], queryFn: getOrgTeams });

  const done = (r) => { notify("success", r.message); qc.invalidateQueries({ queryKey: ["org-teams"] }); };
  const fail = (e) => notify("error", e.message || "Could not save");

  const hrMut = useMutation({ mutationFn: (keys) => saveHRTeam(keys.map((k) => k.split(":")[1])), onSuccess: done, onError: fail });
  const toMembers = (keys) => keys.map((k) => { const [model, id] = k.split(":"); return { model, id }; });
  const itMut = useMutation({ mutationFn: (keys) => saveITTeam(toMembers(keys)), onSuccess: done, onError: fail });
  const accMut = useMutation({ mutationFn: (keys) => saveAccountsTeam(toMembers(keys)), onSuccess: done, onError: fail });

  const people = data?.people || [];
  const admins = people.filter((p) => p.model === "Admin");
  const initHR = useMemo(() => (data?.hr || []).map(keyOf), [data]);
  const initIT = useMemo(() => (data?.it || []).map(keyOf), [data]);
  const initAcc = useMemo(() => (data?.accounts || []).map(keyOf), [data]);

  if (isLoading) return <div className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div>;
  if (isError) return <div className="p-8 text-center text-red-500 text-sm">Could not load teams.</div>;

  return (
    <div className="space-y-5">
      <TeamCard
        icon={ShieldCheck}
        title="HR team"
        description="Admins who review and approve overtime requests (and give the final HR acknowledgement on reviews)."
        hint="If no one is selected, every admin can review overtime requests."
        options={admins}
        initial={initHR}
        saving={hrMut.isPending}
        onSave={(k) => hrMut.mutate(k)}
      />
      <TeamCard
        icon={Monitor}
        title="IT team"
        description="Whenever someone new is onboarded, these people get an email to arrange assets, accounts and system access."
        hint="Employees, managers and admins can all be added. If no one is selected, no IT email is sent."
        options={people}
        initial={initIT}
        saving={itMut.isPending}
        onSave={(k) => itMut.mutate(k)}
      />
      <TeamCard
        icon={Wallet}
        title="Accounts team"
        description="Whenever someone new is onboarded, these people get an email to set up their salary structure and payroll."
        hint="Employees, managers and admins can all be added. If no one is selected, no Accounts email is sent."
        options={people}
        initial={initAcc}
        saving={accMut.isPending}
        onSave={(k) => accMut.mutate(k)}
      />
    </div>
  );
}