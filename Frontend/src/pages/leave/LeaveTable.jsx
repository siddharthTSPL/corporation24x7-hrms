import { useState } from "react";

export default function LeavePage() {
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    days: "",
    reason: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    let err = {};

    if (!form.leaveType) err.leaveType = "Required";
    if (!form.startDate) err.startDate = "Required";
    if (!form.endDate) err.endDate = "Required";
    if (!form.days) err.days = "Required";
    if (!form.reason) err.reason = "Required";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      alert("Leave Submitted");
      setOpen(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-[var(--background)] min-h-screen">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-3">
        <h1 className="text-2xl font-bold text-[var(--primary)]">Leave</h1>

        <button
          onClick={() => setOpen(true)}
          className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg"
        >
          + Add Leave
        </button>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {["Pending", "Approved", "Rejected"].map((item, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow">
            <h2 className="text-gray-500">{item}</h2>
            <p className="text-2xl font-bold text-[var(--primary)]">0</p>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Start</th>
              <th className="p-3 text-left">End</th>
              <th className="p-3 text-left">Days</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3">EL</td>
              <td className="p-3">2026-01-01</td>
              <td className="p-3">2026-01-03</td>
              <td className="p-3">3</td>
              <td className="p-3 text-yellow-500">Pending</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-3">
          <div className="bg-white w-full max-w-lg p-6 rounded-xl">

            <h2 className="text-xl font-bold mb-4 text-[var(--primary)]">
              Apply Leave
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              <select
                name="leaveType"
                onChange={handleChange}
                className="p-3 border rounded-lg"
              >
                <option value="">Select Type</option>
                <option value="el">EL</option>
                <option value="sl">SL</option>
                <option value="ml">ML</option>
                <option value="pl">PL</option>
              </select>
              {errors.leaveType && <p className="text-red-500 text-sm">{errors.leaveType}</p>}

              <input
                type="date"
                name="startDate"
                onChange={handleChange}
                className="p-3 border rounded-lg"
              />
              {errors.startDate && <p className="text-red-500 text-sm">{errors.startDate}</p>}

              <input
                type="date"
                name="endDate"
                onChange={handleChange}
                className="p-3 border rounded-lg"
              />
              {errors.endDate && <p className="text-red-500 text-sm">{errors.endDate}</p>}

              <input
                type="number"
                name="days"
                placeholder="Days"
                onChange={handleChange}
                className="p-3 border rounded-lg"
              />
              {errors.days && <p className="text-red-500 text-sm">{errors.days}</p>}

              <textarea
                name="reason"
                placeholder="Reason"
                onChange={handleChange}
                className="p-3 border rounded-lg md:col-span-2"
              />
              {errors.reason && <p className="text-red-500 text-sm">{errors.reason}</p>}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
