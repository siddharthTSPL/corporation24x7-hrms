import React, { useEffect, useState } from "react";
import {
  FaUsers,
  FaClock,
  FaDollarSign,
  FaCalendarAlt,
} from "react-icons/fa";
import Charts from "./Charts";
import { useGetMeAdmin } from "../../auth/server-state/adminauth/adminauth.hook";
import { useGetAllEmployee } from "../../auth/server-state/adminother/adminother.hook";
import { useGetForwardedLeaves } from "../../auth/server-state/adminleave/adminleave.hook";

function Dashboard() {
  const [greeting, setGreeting] = useState("");
  const [thought, setThought] = useState("");

  const { data: admin } = useGetMeAdmin();
  const { data: employeeData, isLoading: employeeLoading } = useGetAllEmployee();
  const { data: leaveData, isLoading: leaveLoading } = useGetForwardedLeaves();

  const totalEmployees = employeeData?.count || 0;
  const pendingApprovals = leaveData?.count || 0;

  const thoughts = [
    "Success is not final, failure is not fatal.",
    "Small steps every day lead to big results.",
    "Teamwork makes the dream work.",
    "Stay positive, work hard, make it happen.",
    "Your only limit is your mindset.",
    "Consistency beats talent.",
    "Dream big. Start small. Act now.",
    "Focus on progress, not perfection.",
    "Great things take time.",
    "Discipline is the bridge to success.",
    "Push yourself, no one else will.",
    "Make today productive.",
    "Success starts with self-belief.",
    "Keep learning, keep growing.",
    "Every day is a new opportunity.",
  ];

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      setGreeting("Good Morning ☀️");
    } else if (hour < 17) {
      setGreeting("Good Afternoon 🌤️");
    } else if (hour < 21) {
      setGreeting("Good Evening 🌆");
    } else {
      setGreeting("Good Night 🌙");
    }

    const randomThought =
      thoughts[Math.floor(Math.random() * thoughts.length)];
    setThought(randomThought);
  }, []);

  const stats = [
    {
      title: "Total Employees",
      value: employeeLoading ? "..." : totalEmployees,
      sub: "+2% from last month",
      icon: <FaUsers />,
      color: "text-green-500",
    },
    {
      title: "Present Today",
      value: 142,
      sub: "8 employees on leave",
      icon: <FaClock />,
    },
    {
      title: "Monthly Payroll",
      value: "$450,000",
      sub: "-1.2% from last month",
      color: "text-red-500",
      icon: <FaDollarSign />,
    },
    {
      title: "Pending Approvals",
      value: leaveLoading ? "..." : pendingApprovals,
      sub: "require attention",
      icon: <FaCalendarAlt />,
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="bg-linear-to-r from-[#00A8E8] to-[#00A8E8] text-white rounded-xl p-5 md:p-6 mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold">
          {greeting},{" "}
          {admin?.organisation_name ? admin.organisation_name : "Admin"}!
        </h1>
        <p className="text-xs sm:text-sm opacity-90 mt-1">{thought}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {stats.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-4 md:p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex justify-between items-center mb-3">
              <p className="text-gray-500 text-sm">{item.title}</p>
              <span className="text-gray-400 text-lg">{item.icon}</span>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-[#1F2937]">
              {item.value}
            </h2>

            <p
              className={`text-xs mt-2 ${
                item.color ? item.color : "text-gray-400"
              }`}
            >
              {item.sub}
            </p>

            {item.title === "Present Today" && (
              <div className="w-full bg-gray-200 h-2 rounded-full mt-3">
                <div className="bg-[#00A8E8] h-2 rounded-full w-[85%]"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Charts />
      </div>
    </div>
  );
}

export default React.memo(Dashboard);