import { useState } from "react";
import { FaDownload, FaEye, FaTrash } from "react-icons/fa";

export default function DocumentPage() {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState([]);

  const [form, setForm] = useState({
    title: "",
    employee: "",
    file: null,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "file") {
      setForm({ ...form, file: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const validate = () => {
    let err = {};

    if (!form.title) err.title = "Title required";
    if (!form.employee) err.employee = "Employee required";
    if (!form.file) err.file = "File required";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      const newDoc = {
        id: Date.now(),
        title: form.title,
        employee: form.employee,
        fileUrl: URL.createObjectURL(form.file),
        size: (form.file.size / 1024).toFixed(2),
        uploadedAt: new Date(),
        viewedByManager: false,
      };

      setDocuments([...documents, newDoc]);
      setOpen(false);
    }
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[var(--background)]">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-[var(--primary)]">
          Documents
        </h1>

        <button
          onClick={() => setOpen(true)}
          className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg"
        >
          + Upload Document
        </button>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {documents.slice(0, 3).map((doc) => (
          <div key={doc.id} className="bg-white p-4 rounded-xl shadow">
            <h2 className="font-semibold text-[var(--primary)]">
              {doc.title}
            </h2>
            <p className="text-sm text-gray-500">
              {doc.employee}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {doc.size} KB
            </p>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Title</th>
              <th className="p-3">Employee</th>
              <th className="p-3">Size</th>
              <th className="p-3">Uploaded</th>
              <th className="p-3">Viewed</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b hover:bg-[var(--background)]">
                <td className="p-3 font-medium">{doc.title}</td>
                <td className="p-3">{doc.employee}</td>
                <td className="p-3">{doc.size} KB</td>
                <td className="p-3">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </td>
                <td className="p-3">
                  {doc.viewedByManager ? "Yes" : "No"}
                </td>
                <td className="p-3">
                  <div className="flex justify-center gap-3">
                    <a href={doc.fileUrl} target="_blank">
                      <FaEye className="cursor-pointer text-gray-500 hover:text-[var(--primary)]" />
                    </a>
                    <a href={doc.fileUrl} download>
                      <FaDownload className="cursor-pointer text-gray-500 hover:text-green-600" />
                    </a>
                    <FaTrash className="cursor-pointer text-gray-500 hover:text-red-500" />
                  </div>
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
              Upload Document
            </h2>

            <div className="flex flex-col gap-3">

              <input
                name="title"
                placeholder="Title"
                onChange={handleChange}
                className="p-3 border rounded-lg"
              />
              {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}

              <input
                name="employee"
                placeholder="Employee ID"
                onChange={handleChange}
                className="p-3 border rounded-lg"
              />
              {errors.employee && <p className="text-red-500 text-sm">{errors.employee}</p>}

              <input
                type="file"
                name="file"
                onChange={handleChange}
                className="p-3 border rounded-lg"
              />
              {errors.file && <p className="text-red-500 text-sm">{errors.file}</p>}

            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg">Upload</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
