import { FaEllipsisH, FaArrowUp, FaArrowDown } from "react-icons/fa";
import Charts from "./Charts";

export default function Dashboard() {
  const stats = [
    {
      title: "Total Employees",
      value: 763,
      change: "+3.6%",
      positive: true,
    },
    {
      title: "Leaves Today",
      value: 127,
      change: "-3.6%",
      positive: false,
    },
    {
      title: "Present Today",
      value: 88,
      change: "+3.6%",
      positive: true,
    },
    {
      title: "Absent",
      value: 32,
      change: "-3.6%",
      positive: false,
    },
  ];

  return (
    <div className="bg-[var(--background)] min-h-full">
      
      {/* HEADER */}
      <h1 className="text-2xl font-bold text-[var(--primary)] mb-6">
        Dashboard
      </h1>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((item, index) => (
          <div
            key={index}
            className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition"
          >
            
            {/* TOP */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-500 text-sm">{item.title}</p>
              <button className="text-gray-400 hover:text-gray-600">
                <FaEllipsisH />
              </button>
            </div>

            {/* VALUE */}
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {item.value}
            </h2>

            {/* CHANGE */}
            <div className="flex items-center gap-2">
              <span
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full
                  ${
                    item.positive
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-500"
                  }`}
              >
                {item.positive ? <FaArrowUp /> : <FaArrowDown />}
                {item.change}
              </span>

              <span className="text-xs text-gray-400">
                vs last month
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* EXTRA SECTION (OPTIONAL - FUTURE READY) */}
      <div className="grid lg:grid-cols-2 gap-5 mt-8">
        
        {/* Placeholder Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold text-[var(--primary)] mb-3">
            Employee Overview
          </h3>
          <p className="text-gray-400 text-sm">
            (You can add charts here later)
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold text-[var(--primary)] mb-3">
            Recent Activity
          </h3>
          <p className="text-gray-400 text-sm">
            (Recent HR activities will appear here)
          </p>
        </div>
      </div>
      {/* CHART COMPONENT */}
      <Charts/>
    
    </div>
  );
}