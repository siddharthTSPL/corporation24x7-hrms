import { FaEdit, FaTrash } from "react-icons/fa";

export default function EmployeeTable() {
  const employees = [
    {
      id: 1,
      name: "Amit Sharma",
      role: "Developer",
      department: "IT",
      status: "Active",
    },
    {
      id: 2,
      name: "Priya Singh",
      role: "HR Manager",
      department: "HR",
      status: "On Leave",
    },
    {
      id: 3,
      name: "Rahul Verma",
      role: "Designer",
      department: "UI/UX",
      status: "Active",
    },
    {
      id: 4,
      name: "Neha Gupta",
      role: "Accountant",
      department: "Finance",
      status: "Inactive",
    },
  ];

  const getStatusStyle = (status) => {
    if (status === "Active")
      return "bg-green-100 text-green-600";
    if (status === "On Leave")
      return "bg-yellow-100 text-yellow-600";
    return "bg-red-100 text-red-500";
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm mt-8">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <h3 className="text-lg font-semibold text-[var(--primary)]">
          Employee List
        </h3>

        <button className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm hover:opacity-90">
          + Add Employee
        </button>
      </div>

      {/* TABLE WRAPPER (SCROLL ON MOBILE) */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          
          {/* HEADER */}
          <thead>
            <tr className="text-left text-gray-500 text-sm border-b">
              <th className="py-3">Name</th>
              <th className="py-3">Role</th>
              <th className="py-3">Department</th>
              <th className="py-3">Status</th>
              <th className="py-3 text-center">Actions</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {employees.map((emp) => (
              <tr
                key={emp.id}
                className="border-b hover:bg-[var(--background)] transition"
              >
                <td className="py-3 font-medium text-gray-800">
                  {emp.name}
                </td>

                <td className="py-3 text-gray-600">
                  {emp.role}
                </td>

                <td className="py-3 text-gray-600">
                  {emp.department}
                </td>

                <td className="py-3">
                  <span
                    className={`px-3 py-1 text-xs rounded-full ${getStatusStyle(
                      emp.status
                    )}`}
                  >
                    {emp.status}
                  </span>
                </td>

                <td className="py-3">
                  <div className="flex justify-center gap-3 text-gray-500">
                    <button className="hover:text-[var(--primary)]">
                      <FaEdit />
                    </button>
                    <button className="hover:text-red-500">
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE NOTE */}
      <p className="text-xs text-gray-400 mt-2 sm:hidden">
        Scroll horizontally to view more →
      </p>
    </div>
  );
}