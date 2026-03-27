import { useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";

export default function EmployeeTable() {
  const [open, setOpen] = useState(false);

  const [employees, setEmployees] = useState([]);

  const [form, setForm] = useState({
    uid: "",
    department: "",
    under_manager: "",
    f_name: "",
    l_name: "",
    work_email: "",
    gender: "",
    marital_status: "single",
    password: "",
    personal_contact: "",
    e_contact: "",
    role: "employee",
    status: "active",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    let err = {};

    if (!form.uid) err.uid = "Required";
    if (!form.department) err.department = "Required";
    if (!form.under_manager) err.under_manager = "Required";
    if (!form.f_name) err.f_name = "Required";
    if (!form.l_name) err.l_name = "Required";
    if (!form.work_email || !/\S+@\S+\.\S+/.test(form.work_email)) err.work_email = "Valid email required";
    if (!form.gender) err.gender = "Required";
    if (!form.password || form.password.length < 6) err.password = "Min 6 chars";
    if (!form.personal_contact) err.personal_contact = "Required";
    if (!form.e_contact) err.e_contact = "Required";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      setEmployees([...employees, { ...form, id: Date.now() }]);
      setOpen(false);
    }
  };

  const getStatusStyle = (status) => {
    return status === "active"
      ? "bg-green-100 text-green-600"
      : "bg-red-100 text-red-500";
  };

  return (
    <div className="p-4 md:p-6 mt-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-xl font-bold text-[var(--primary)]">
          Employee List
        </h2>

        <button
          onClick={() => setOpen(true)}
          className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg"
        >
          + Add Employee
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3">Department</th>
              <th className="p-3">Email</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b hover:bg-[var(--background)]">
                <td className="p-3 font-medium">
                  {emp.f_name} {emp.l_name}
                </td>
                <td className="p-3">{emp.department}</td>
                <td className="p-3">{emp.work_email}</td>
                <td className="p-3">{emp.personal_contact}</td>
                <td className="p-3">
                  <span className={`px-3 py-1 text-xs rounded-full ${getStatusStyle(emp.status)}`}>
                    {emp.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex justify-center gap-3">
                    <FaEdit className="cursor-pointer text-gray-500 hover:text-[var(--primary)]" />
                    <FaTrash className="cursor-pointer text-gray-500 hover:text-red-500" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL FORM */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-3">
          <div className="bg-white w-full max-w-2xl p-6 rounded-xl max-h-[90vh] overflow-y-auto">

            <h2 className="text-xl font-bold mb-4 text-[var(--primary)]">
              Add Employee
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              <input name="uid" placeholder="UID" onChange={handleChange} className="p-3 border rounded-lg" />
              {errors.uid && <p className="text-red-500 text-sm">{errors.uid}</p>}

              <select name="department" onChange={handleChange} className="p-3 border rounded-lg">
                <option value="">Department</option>
                <option value="OPR">OPR</option>
                <option value="BPO">BPO</option>
                <option value="ENG">ENG</option>
              </select>

              <input name="under_manager" placeholder="Manager ID" onChange={handleChange} className="p-3 border rounded-lg" />

              <input name="f_name" placeholder="First Name" onChange={handleChange} className="p-3 border rounded-lg" />
              <input name="l_name" placeholder="Last Name" onChange={handleChange} className="p-3 border rounded-lg" />

              <input name="work_email" placeholder="Email" onChange={handleChange} className="p-3 border rounded-lg" />

              <select name="gender" onChange={handleChange} className="p-3 border rounded-lg">
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>

              <select name="marital_status" onChange={handleChange} className="p-3 border rounded-lg">
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
              </select>

              <input type="password" name="password" placeholder="Password" onChange={handleChange} className="p-3 border rounded-lg" />

              <input name="personal_contact" placeholder="Phone" onChange={handleChange} className="p-3 border rounded-lg" />
              <input name="e_contact" placeholder="Emergency Contact" onChange={handleChange} className="p-3 border rounded-lg" />

              <select name="status" onChange={handleChange} className="p-3 border rounded-lg">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

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
