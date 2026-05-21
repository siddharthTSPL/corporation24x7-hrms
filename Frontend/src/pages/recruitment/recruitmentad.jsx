import React, { useMemo, useState } from "react";
import {
  useGetAllRequisitions,
  useGetPendingRequisitions,
  useApproveRequisition,
  useRejectRequisition,
  useHoldRequisition,
  useRequestRevision,
} from "../../auth/server-state/adminrecruitment/adrecruitment.hook";
import {
  Briefcase,
  Clock3,
  Users,
  CircleCheckBig,
  CircleX,
  PauseCircle,
  Search,
  FileWarning,
} from "lucide-react";

const StatCard = ({ title, value, icon: Icon }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <h2 className="text-3xl font-bold text-gray-900 mt-2">{value}</h2>
        </div>
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
          <Icon className="w-6 h-6 text-gray-700" />
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    ON_HOLD: "bg-orange-100 text-orange-700",
    REVISION_REQUIRED: "bg-blue-100 text-blue-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || "bg-gray-100 text-gray-700"}`}
    >
      {status}
    </span>
  );
};

const recruitmentad = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [actionMessage, setActionMessage] = useState("");

  const {
    data: requisitionData,
    isLoading,
    error,
  } = useGetAllRequisitions();
  const { data: pendingData } = useGetPendingRequisitions();

  const approveMutation = useApproveRequisition();
  const rejectMutation = useRejectRequisition();
  const holdMutation = useHoldRequisition();
  const revisionMutation = useRequestRevision();

  const requisitions = Array.isArray(requisitionData?.data)
    ? requisitionData.data
    : [];
  const pendingRequisitions = pendingData?.data || [];

  const stats = useMemo(() => {
    return {
      total: requisitions.length,
      pending: requisitions.filter((r) => r.status === "PENDING").length,
      approved: requisitions.filter((r) => r.status === "APPROVED").length,
      rejected: requisitions.filter((r) => r.status === "REJECTED").length,
    };
  }, [requisitions]);

  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((item) => {
      const value = `${item.job_title} ${item.department} ${item.priority}`.toLowerCase();
      return value.includes(search.toLowerCase());
    });
  }, [requisitions, search]);

  const handleApprove = async (id) => {
    await approveMutation.mutateAsync({
      id,
      data: {
        admin_comment: actionMessage,
      },
    });
    setSelected(null);
    setActionMessage("");
  };

  const handleReject = async (id) => {
    await rejectMutation.mutateAsync({
      id,
      data: {
        admin_comment: actionMessage,
      },
    });
    setSelected(null);
    setActionMessage("");
  };

  const handleHold = async (id) => {
    await holdMutation.mutateAsync({
      id,
      data: {
        admin_comment: actionMessage,
      },
    });
    setSelected(null);
    setActionMessage("");
  };

  const handleRevision = async (id) => {
    await revisionMutation.mutateAsync({
      id,
      data: {
        admin_comment: actionMessage,
      },
    });
    setSelected(null);
    setActionMessage("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recruitment Management</h1>
          <p className="text-gray-500 mt-1">
            Manage hiring requisitions and recruitment workflow.
          </p>
        </div>

        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search requisition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard title="Total Requisitions" value={stats.total} icon={Briefcase} />
        <StatCard title="Pending" value={stats.pending} icon={Clock3} />
        <StatCard title="Approved" value={stats.approved} icon={CircleCheckBig} />
        <StatCard title="Rejected" value={stats.rejected} icon={CircleX} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">All Requisitions</h2>
              <p className="text-sm text-gray-500 mt-1">
                Review and manage all recruitment requests.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Job Role</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Department</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Openings</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Priority</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Requested By</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-gray-500">
                      Loading requisitions...
                    </td>
                  </tr>
                ) : filteredRequisitions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-gray-500">
                      No requisitions found.
                    </td>
                  </tr>
                ) : (
                  filteredRequisitions.map((item) => (
                    <tr key={item._id} className="border-t border-gray-100 hover:bg-gray-50 transition-all">
                      <td className="px-6 py-5">
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.job_title}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {item.employment_type}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-gray-700">{item.department}</td>

                      <td className="px-6 py-5 text-gray-700">{item.openings}</td>

                      <td className="px-6 py-5">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                          {item.priority}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="px-6 py-5">
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.requested_by?.f_name} {item.requested_by?.l_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {item.requested_by?.designation}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        {item.status === "PENDING" ? (
                          <button
                            onClick={() => setSelected(item)}
                            className="px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:opacity-90"
                          >
                            Manage
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Pending Requests</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Awaiting admin approval.
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <FileWarning className="w-5 h-5 text-gray-700" />
              </div>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {pendingRequisitions.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">
                  No pending requisitions.
                </div>
              ) : (
                pendingRequisitions.map((item) => (
                  <div
                    key={item._id}
                    className="border border-gray-100 rounded-xl p-4 hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {item.job_title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {item.department}
                        </p>
                      </div>

                      <StatusBadge status={item.status} />
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                      <Users className="w-4 h-4" />
                      <span>{item.openings} openings</span>
                    </div>

                    <button
                      onClick={() => setSelected(item)}
                      className="w-full mt-4 py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:opacity-90"
                    >
                      Review Request
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recruitment Flow</h2>

            <div className="space-y-4">
              {[
                "PENDING",
                "APPROVED",
                "ON_HOLD",
                "REVISION_REQUIRED",
                "REJECTED",
              ].map((step, index) => (
                <div key={step} className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>

                  <div>
                    <p className="font-medium text-gray-900">{step.replaceAll("_", " ")}</p>
                    <p className="text-sm text-gray-500">
                      Recruitment request stage.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selected.job_title}
                </h2>
                <p className="text-gray-500 mt-1">
                  {selected.department} • {selected.openings} openings
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-sm text-gray-500">Employment Type</p>
                <h3 className="font-semibold text-gray-900 mt-1">
                  {selected.employment_type}
                </h3>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-sm text-gray-500">Work Mode</p>
                <h3 className="font-semibold text-gray-900 mt-1">
                  {selected.work_mode}
                </h3>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-sm text-gray-500">Experience</p>
                <h3 className="font-semibold text-gray-900 mt-1">
                  {selected.experience_required}
                </h3>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-sm text-gray-500">Priority</p>
                <h3 className="font-semibold text-gray-900 mt-1">
                  {selected.priority}
                </h3>
              </div>
            </div>

            <div className="mt-5 bg-gray-50 rounded-2xl p-5">
              <p className="text-sm text-gray-500 mb-2">Job Description</p>
              <p className="text-gray-700 leading-relaxed">
                {selected.job_description}
              </p>
            </div>

            <div className="mt-5 bg-gray-50 rounded-2xl p-5">
              <p className="text-sm text-gray-500 mb-2">Skills Required</p>
              <div className="flex flex-wrap gap-2">
                {selected.skills_required?.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium text-gray-700">
                Admin Comment
              </label>

              <textarea
                rows="4"
                value={actionMessage}
                onChange={(e) => setActionMessage(e.target.value)}
                placeholder="Write your approval or rejection message"
                className="w-full mt-2 rounded-2xl border border-gray-200 p-4 outline-none focus:ring-2 focus:ring-black resize-none"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <button
                onClick={() => handleApprove(selected._id)}
                disabled={approveMutation.isPending}
                className="py-3 rounded-xl bg-green-600 text-white font-medium hover:opacity-90 disabled:opacity-60"
              >
                Approve
              </button>

              <button
                onClick={() => handleReject(selected._id)}
                disabled={rejectMutation.isPending}
                className="py-3 rounded-xl bg-red-600 text-white font-medium hover:opacity-90 disabled:opacity-60"
              >
                Reject
              </button>

              <button
                onClick={() => handleHold(selected._id)}
                disabled={holdMutation.isPending}
                className="py-3 rounded-xl bg-orange-500 text-white font-medium hover:opacity-90 disabled:opacity-60"
              >
                Hold
              </button>

              <button
                onClick={() => handleRevision(selected._id)}
                disabled={revisionMutation.isPending}
                className="py-3 rounded-xl bg-blue-600 text-white font-medium hover:opacity-90 disabled:opacity-60"
              >
                Revision
              </button>
            </div>

            {(approveMutation.isError ||
              rejectMutation.isError ||
              holdMutation.isError ||
              revisionMutation.isError) && (
              <div className="mt-4 text-sm text-red-600 font-medium">
                Something went wrong while processing the request.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default recruitmentad;
