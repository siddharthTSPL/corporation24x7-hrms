import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

export default function DashboardCharts() {
  // Sample Data (replace with API later)
  const employeeData = [
    { month: "Jan", employees: 400 },
    { month: "Feb", employees: 500 },
    { month: "Mar", employees: 650 },
    { month: "Apr", employees: 700 },
    { month: "May", employees: 780 },
  ];

  const leaveData = [
    { day: "Mon", leaves: 12 },
    { day: "Tue", leaves: 18 },
    { day: "Wed", leaves: 10 },
    { day: "Thu", leaves: 22 },
    { day: "Fri", leaves: 15 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-8">
      
      {/* LINE CHART */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm">
        <h3 className="text-base sm:text-lg font-semibold text-[var(--primary)] mb-4">
          Employee Growth
        </h3>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={employeeData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="employees" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* BAR CHART */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm">
        <h3 className="text-base sm:text-lg font-semibold text-[var(--primary)] mb-4">
          Weekly Leaves
        </h3>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={leaveData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="leaves" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}