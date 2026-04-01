import React, { useEffect, useState, useMemo, useCallback } from "react";
import { FaBars, FaSearch, FaBell } from "react-icons/fa";
import { useGetMeAdmin } from "../auth/server-state/adminauth/adminauth.hook";

function Navbar({ collapsed, setCollapsed, data = [] }) {
  const { data: admin } = useGetMeAdmin();
 console.log("Navbar admin data:", admin);
  const [dateTime, setDateTime] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDateTime(
        now.toLocaleString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, []);

  const results = useMemo(() => {
    if (!search.trim()) return [];

    return data.filter((item) =>
      Object.values(item).join(" ").toLowerCase().includes(search.toLowerCase())
    );
  }, [search, data]);

  const handleToggle = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, [setCollapsed]);

  const adminInitial = useMemo(() => {
    return admin?.organisation_name?.trim().charAt(0).toUpperCase() || "A";
  }, [admin]);

  return (
    <div className="w-full bg-white border-b px-4 md:px-6 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          className="hidden md:flex p-2 rounded-lg hover:bg-gray-200"
        >
          <FaBars className="text-black" />
        </button>

        <div className="relative w-full sm:w-60 md:w-72">
          <input
            type="text"
            placeholder="Search employees, departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#730042]"
          />
          <FaSearch className="absolute left-3 top-3 text-gray-400 text-sm" />
        </div>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-4">
        <div className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
          {dateTime}
        </div>

        <div className="relative cursor-pointer">
          <FaBell className="text-lg" />
          <span className="absolute -top-2 -right-2 bg-[#730042] text-white text-[10px] px-1.5 rounded-full">
            2
          </span>
        </div>

        <div className="w-9 h-9 rounded-full bg-[#730042] text-white flex items-center justify-center text-sm font-semibold">
          {adminInitial}
        </div>
      </div>

      {search.trim() && (
        <div className="text-xs text-[#730042] w-full">
          {results.length} result(s) found
        </div>
      )}
    </div>
  );
}

export default React.memo(Navbar);