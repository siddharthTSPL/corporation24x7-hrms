import { useState } from "react";
import { FaTrash, FaFileAlt } from "react-icons/fa";

export default function FileSection() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState([]);

  const [form, setForm] = useState({
    name: "",
    type: "",
    reason: "",
    file: null,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    if (e.target.name === "file") {
      setForm({ ...form, file: e.target.files[0] });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  // ✅ VALIDATION
  const validate = () => {
    let err = {};

    if (!form.name) err.name = "Document name required";
    if (!form.type) err.type = "Type required";
    if (!form.reason) err.reason = "Reason required";
    if (!form.file) err.file = "File required";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      const newFile = {
        ...form,
        id: Date.now(),
        date: new Date().toLocaleDateString(),
      };

      setFiles([newFile, ...files]);
      setOpen(false);

      setForm({
        name: "",
        type: "",
        reason: "",
        file: null,
      });
    }
  };

  return (
    <div className=" min-h-screen p-4 md:p-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
        <h2 className="text-xl font-bold text-[var(--primary)]">
          File / Expense Documents
        </h2>

        <button
          onClick={() => setOpen(true)}
          className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm"
        >
          + Upload File
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full min-w-[650px] text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-3 text-left">Document</th>
              <th className="p-3">Type</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Date</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {files.map((file) => (
              <tr key={file.id} className="border-t hover:bg-gray-50">
                <td className="p-3 flex items-center gap-2">
                  <FaFileAlt className="text-[var(--primary)]" />
                  {file.name}
                </td>
                <td className="p-3">{file.type}</td>
                <td className="p-3">{file.reason}</td>
                <td className="p-3">{file.date}</td>

                <td className="p-3">
                  <div className="flex justify-center">
                    <FaTrash
                      onClick={() =>
                        setFiles(files.filter((f) => f.id !== file.id))
                      }
                      className="cursor-pointer text-gray-500 hover:text-red-500"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL FORM */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-lg max-h-[90vh] overflow-y-auto">

            {/* HEADER */}
            <div className="p-5 border-b">
              <h2 className="text-lg font-semibold text-[var(--primary)]">
                Upload Document
              </h2>
            </div>

            {/* FORM */}
            <div className="p-5 flex flex-col gap-4">

              {/* NAME */}
              <div>
                <input
                  name="name"
                  placeholder="Document Name"
                  onChange={handleChange}
                  className="w-full p-2.5 border rounded-lg text-sm"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              {/* TYPE */}
              <div>
                <select
                  name="type"
                  onChange={handleChange}
                  className="w-full p-2.5 border rounded-lg text-sm"
                >
                  <option value="">Select Type</option>
                  <option value="Travel">Travel</option>
                  <option value="Food">Food</option>
                  <option value="Office">Office Expense</option>
                  <option value="Other">Other</option>
                </select>
                {errors.type && (
                  <p className="text-red-500 text-xs mt-1">{errors.type}</p>
                )}
              </div>

              {/* REASON */}
              <div>
                <textarea
                  name="reason"
                  placeholder="Reason / Description"
                  onChange={handleChange}
                  className="w-full p-2.5 border rounded-lg text-sm"
                />
                {errors.reason && (
                  <p className="text-red-500 text-xs mt-1">{errors.reason}</p>
                )}
              </div>

              {/* FILE */}
              <div>
                <input
                  type="file"
                  name="file"
                  onChange={handleChange}
                  className="w-full text-sm"
                />
                {errors.file && (
                  <p className="text-red-500 text-xs mt-1">{errors.file}</p>
                )}
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 p-5 border-t">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}