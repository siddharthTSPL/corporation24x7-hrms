"use client";

import {
  Users,
  Building2,
  BarChart3,
  Layers,
  Search,
  Eye,
  Pencil
} from "lucide-react";

export default function OrganizationDashboard() {
  return (
    <div className="p-4 md:p-8 space-y-8">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Organization Structure</h1>
          <p className="text-gray-500">
            Manage departments and organizational hierarchy
          </p>
        </div>

        <button className="bg-[var(--primary)] text-white px-5 py-2 rounded-xl flex items-center gap-2 hover:opacity-90">
          <Eye size={18} />
          View Org Chart
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <StatCard icon={<Building2 />} title="Total Departments" value="5" />
        <StatCard icon={<Users />} title="Total Employees" value="5" />
        <StatCard icon={<Layers />} title="Largest Department" value="Engineering (25 employees)" />
        <StatCard icon={<BarChart3 />} title="Average Team Size" value="12 employees per dept" />

      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-4 top-3 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search departments..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>

      {/* ORG HIERARCHY (IMAGE 1 STYLE) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="font-semibold mb-1">Organization Hierarchy</h2>
        <p className="text-sm text-gray-500 mb-6">
          Visual representation of company structure
        </p>

        <div className="flex flex-col items-center gap-8">

          {/* CEO */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl text-center">
            <h3 className="font-semibold">CEO / Managing Director</h3>
            <p className="text-sm">Executive Leadership</p>
          </div>

          {/* Departments */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <MiniCard title="Engineering" name="Mike Manager" count="25 employees" />
            <MiniCard title="Human Resources" name="Sarah HR" count="5 employees" />
            <MiniCard title="IT" name="John Admin" count="8 employees" />
            <MiniCard title="Design" name="Emma Designer" count="12 employees" />
            <MiniCard title="Marketing" name="David Marketing" count="10 employees" />
          </div>

        </div>
      </div>

      {/* DEPARTMENT CARDS (IMAGE 2 STYLE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <DepartmentCard
          title="Engineering"
          desc="Software development and technical operations"
          head="Mike Manager"
          members={2}
          team={["MM", "AE"]}
        />

        <DepartmentCard
          title="Human Resources"
          desc="Employee relations and organizational development"
          head="Sarah HR"
          members={1}
          team={["SH"]}
        />

        <DepartmentCard
          title="IT"
          desc="Information technology and system administration"
          head="John Admin"
          members={1}
          team={["JA"]}
        />

        <DepartmentCard
          title="Design"
          desc="User experience and visual design"
          head="Emma Designer"
          members={1}
          team={["ED"]}
        />

        <DepartmentCard
          title="Marketing"
          desc="Brand promotion and customer acquisition"
          head="David Marketing"
          members={0}
          team={[]}
        />

      </div>

    </div>
  );
}

/* ================= COMPONENTS ================= */

function StatCard({ icon, title, value }) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4">
      <div className="bg-[var(--secondary)] p-3 rounded-xl text-[var(--primary)]">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <h3 className="font-semibold">{value}</h3>
      </div>
    </div>
  );
}

function MiniCard({ title, name, count }) {
  return (
    <div className="bg-gray-100 p-4 rounded-xl text-center">
      <h4 className="font-medium">{title}</h4>
      <p className="text-sm text-gray-500">{name}</p>
      <p className="text-xs mt-2">{count}</p>
    </div>
  );
}

function DepartmentCard({ title, desc, head, members, team }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4">

      <div className="flex justify-between items-center">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs bg-gray-100 px-3 py-1 rounded-full">
          {members} members
        </span>
      </div>

      <p className="text-sm text-gray-500">{desc}</p>

      {/* Head */}
      <div className="bg-gray-100 p-3 rounded-xl">
        <p className="text-xs text-blue-600">Department Head</p>
        <p className="font-medium">{head}</p>
      </div>

      {/* Team */}
      <div>
        <p className="text-sm mb-2">Team Members</p>
        <div className="flex gap-2">
          {team.map((t, i) => (
            <div
              key={i}
              className="w-8 h-8 flex items-center justify-center bg-[var(--primary)] text-white rounded-full text-xs"
            >
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button className="flex-1 border rounded-xl py-2 flex items-center justify-center gap-2 hover:bg-gray-50">
          <Eye size={16} /> View Team
        </button>
        <button className="p-2 border rounded-xl hover:bg-gray-50">
          <Pencil size={16} />
        </button>
      </div>

    </div>
  );
}