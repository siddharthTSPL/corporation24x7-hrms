import { useState } from "react";

export default function AnnouncementPage() {
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);

  const [form, setForm] = useState({
    title: "",
    message: "",
    audience: "all",
    priority: "low",
    expiresAt: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    let err = {};

    if (!form.title) err.title = "Title required";
    if (!form.message) err.message = "Message required";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      setAnnouncements([
        ...announcements,
        { ...form, id: Date.now(), createdAt: new Date() },
      ]);
      setOpen(false);
    }
  };

  const getPriorityStyle = (priority) => {
    if (priority === "high") return "bg-red-100 text-red-600";
    if (priority === "medium") return "bg-yellow-100 text-yellow-600";
    return "bg-green-100 text-green-600";
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[var(--background)]">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-[var(--primary)]">
          Announcements
        </h1>

        <button
          onClick={() => setOpen(true)}
          className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg"
        >
          + Add Announcement
        </button>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {announcements.slice(0, 3).map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow">
            <h2 className="font-semibold text-[var(--primary)] mb-1">
              {item.title}
            </h2>
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {item.message}
            </p>

            <span
              className={`px-2 py-1 text-xs rounded ${getPriorityStyle(
                item.priority
              )}`}
            >
              {item.priority}
            </span>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Title</th>
              <th className="p-3">Audience</th>
              <th className="p-3">Priority</th>
              <th className="p-3">Expiry</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>

          <tbody>
            {announcements.map((item) => (
              <tr key={item.id} className="border-b hover:bg-[var(--background)]">
                <td className="p-3 font-medium">{item.title}</td>
                <td className="p-3">{item.audience}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${getPriorityStyle(item.priority)}`}>
                    {item.priority}
                  </span>
                </td>
                <td className="p-3">
                  {item.expiresAt || "-"}
                </td>
                <td className="p-3">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-3">
          <div className="bg-white w-full max-w-lg p-6 rounded-xl">

            <h2 className="text-xl font-bold mb-4 text-[var(--primary)]">
              Add Announcement
            </h2>

            <div className="flex flex-col gap-3">

              <input
                name="title"
                placeholder="Title"
                onChange={handleChange}
                className="p-3 border rounded-lg"
              />
              {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}

              <textarea
                name="message"
                placeholder="Message"
                onChange={handleChange}
                className="p-3 border rounded-lg"
              />
              {errors.message && <p className="text-red-500 text-sm">{errors.message}</p>}

              <select name="audience" onChange={handleChange} className="p-3 border rounded-lg">
                <option value="all">All</option>
                <option value="employees">Employees</option>
                <option value="managers">Managers</option>
              </select>

              <select name="priority" onChange={handleChange} className="p-3 border rounded-lg">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>

              <input
                type="date"
                name="expiresAt"
                onChange={handleChange}
                className="p-3 border rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
