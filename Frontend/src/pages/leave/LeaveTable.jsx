"use client";
import { useState, useEffect } from "react";

const leaveTypes = [
  { value: "el", label: "EL — Earned Leave" },
  { value: "sl", label: "SL — Sick Leave" },
  { value: "ml", label: "ML — Maternity Leave" },
  { value: "pl", label: "PL — Privilege Leave" },
];

const statusConfig = [
  { label: "Pending", icon: "⏳", color: "text-yellow-500", border: "border-yellow-400" },
  { label: "Approved", icon: "✅", color: "text-green-500", border: "border-green-400" },
  { label: "Rejected", icon: "❌", color: "text-error", border: "border-error" },
];

const EMPTY_FORM = { leaveType: "", startDate: "", endDate: "", reason: "" };

export default function LeavePage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const calcDays = () => {
    if (!form.startDate || !form.endDate) return 0;
    const diff =
      Math.ceil(
        (new Date(form.endDate) - new Date(form.startDate)) /
          (1000 * 60 * 60 * 24)
      ) + 1;
    return diff > 0 ? diff : 0;
  };

  const days = calcDays();

  return (
    <div className="min-h-screen bg-background px-3 sm:px-6 md:px-10 py-6">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">
              Leave Management
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Track and manage your leave requests
            </p>
          </div>

          <button
            onClick={() => setOpen(true)}
            className=" bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm shadow hover:scale-95 transition"
          >
            + Apply Leave
          </button>
        </div>

        {/* STATUS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {statusConfig.map((s) => (
            <div
              key={s.label}
              className={`bg-white p-4 rounded-xl shadow border-t-4 ${s.border} flex justify-between items-center`}
            >
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>0</p>
              </div>
              <div className="text-2xl">{s.icon}</div>
            </div>
          ))}
        </div>

        {/* EXTRA CARDS (NEW) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

          <div className="bg-white p-4 rounded-xl shadow border-l-4 border-primary">
            <p className="text-xs text-gray-400">Total Leaves</p>
            <h2 className="text-xl font-bold text-primary">12</h2>
          </div>

          <div className="bg-white p-4 rounded-xl shadow border-l-4 border-secondary">
            <p className="text-xs text-gray-400">Remaining Leaves</p>
            <h2 className="text-xl font-bold text-secondary">8</h2>
          </div>

          <div className="bg-white p-4 rounded-xl shadow border-l-4 border-accent">
            <p className="text-xs text-gray-400">This Month</p>
            <h2 className="text-xl font-bold text-accent">2</h2>
          </div>

          <div className="bg-white p-4 rounded-xl shadow border-l-4 border-error">
            <p className="text-xs text-gray-400">Rejected</p>
            <h2 className="text-xl font-bold text-error">1</h2>
          </div>

        </div>

        {/* HISTORY */}
        <div className="bg-white rounded-xl shadow p-5 text-center">
          <p className="text-gray-500 text-sm">No leave records found</p>
        </div>
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-xl sm:rounded-xl p-5">

            <h2 className="text-lg font-bold text-primary mb-4">
              Apply Leave
            </h2>

            <select
              className="w-full border p-2 rounded mb-3"
              onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
            >
              <option>Select Leave Type</option>
              {leaveTypes.map((t) => (
                <option key={t.value}>{t.label}</option>
              ))}
            </select>

            <input
              type="date"
              className="w-full border p-2 rounded mb-3"
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />

            <input
              type="date"
              className="w-full border p-2 rounded mb-3"
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />

            {days > 0 && (
              <p className="text-primary text-sm mb-2">
                {days} days selected
              </p>
            )}

            <textarea
              placeholder="Reason"
              className="w-full border p-2 rounded mb-3"
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="w-1/2 border p-2 rounded"
              >
                Cancel
              </button>
              <button className="w-1/2 bg-primary text-white p-2 rounded">
                Submit
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}