import {
  FaCircle,
  FaUsers,
  FaCalendarAlt,
  FaDollarSign,
} from "react-icons/fa";

export default function ActivityEvents() {
  const activities = [
    {
      name: "Alice Employee applied for vacation leave",
      time: "10 minutes ago",
      status: "pending",
      color: "bg-yellow-500",
    },
    {
      name: "Mike Manager checked in at Office",
      time: "25 minutes ago",
      status: "success",
      color: "bg-green-500",
    },
    {
      name: "November payroll processing completed",
      time: "2 hours ago",
      status: "success",
      color: "bg-green-500",
    },
    {
      name: "Emma Designer submitted travel expense",
      time: "3 hours ago",
      status: "pending",
      color: "bg-yellow-500",
    },
  ];

  const events = [
    {
      title: "Team Meeting",
      date: "2024-12-15 at 10:00 AM",
      icon: <FaUsers />,
      bg: "bg-blue-100",
      color: "text-blue-600",
    },
    {
      title: "John Admin Birthday",
      date: "2024-12-16 at All Day",
      icon: <FaCalendarAlt />,
      bg: "bg-pink-100",
      color: "text-pink-600",
    },
    {
      title: "Payroll Processing",
      date: "2024-12-20 at 2:00 PM",
      icon: <FaDollarSign />,
      bg: "bg-green-100",
      color: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">

      {/* 🔹 RECENT ACTIVITIES */}
      <div className=" rounded-2xl p-4 sm:p-6 shadow-sm">

        <h2 className="text-base sm:text-lg font-semibold text-[#730042]">
          Recent Activities
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mb-4">
          Latest updates across the organization
        </p>

        <div className="space-y-4">
          {activities.map((item, index) => (
            <div
              key={index}
              className="flex items-start justify-between gap-3"
            >
              {/* LEFT */}
              <div className="flex items-start gap-3">
                <span
                  className={`w-2.5 h-2.5 mt-2 rounded-full ${item.color}`}
                ></span>

                <div>
                  <p className="text-sm text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.time}</p>
                </div>
              </div>

              {/* STATUS */}
              <span
                className={`text-[10px] px-2 py-1 rounded-md capitalize
                  ${
                    item.status === "success"
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>

        {/* BUTTON */}
        <button className="mt-5 w-full border rounded-lg py-2 text-sm hover:bg-gray-50">
          View All Activities
        </button>
      </div>

      {/* 🔹 UPCOMING EVENTS */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">

        <h2 className="text-base sm:text-lg font-semibold text-[#730042]">
          Upcoming Events
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mb-4">
          Don't miss these important dates
        </p>

        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={index} className="flex items-center gap-3">

              {/* ICON */}
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-lg ${event.bg}`}
              >
                <span className={`${event.color}`}>{event.icon}</span>
              </div>

              {/* TEXT */}
              <div>
                <p className="text-sm text-gray-800">{event.title}</p>
                <p className="text-xs text-gray-400">{event.date}</p>
              </div>
            </div>
          ))}
        </div>

        {/* BUTTON */}
        <button className="mt-5 w-full border rounded-lg py-2 text-sm hover:bg-gray-50">
          View Calendar
        </button>
      </div>
    </div>
  );
}