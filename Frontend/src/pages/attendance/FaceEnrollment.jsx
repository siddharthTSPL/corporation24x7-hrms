import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  useGetAllEmployee,
  useGetAllAdmins,
} from "../../auth/server-state/adminother/adminother.hook";
import {
  useEnrolledFaces,
  useEnrollFace,
  useRemoveFace,
} from "../../auth/server-state/faceattendance/faceattendance.hook";

function CaptureModal({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [snapshotUrl, setSnapshotUrl] = useState(null);
  const [blob, setBlob] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (err) {
        setError("Could not start camera: " + err.message);
      }
    })();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const size = 480;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const vw = video.videoWidth, vh = video.videoHeight;
    const side = Math.min(vw, vh);
    ctx.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, size, size);
    canvas.toBlob((b) => {
      setBlob(b);
      setSnapshotUrl(URL.createObjectURL(b));
      streamRef.current?.getTracks().forEach((t) => t.stop());
    }, "image/jpeg", 0.9);
  }, []);

  const retake = useCallback(async () => {
    setSnapshotUrl(null);
    setBlob(null);
    setReady(false);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
      audio: false,
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setReady(true);
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-3xl p-4 sm:p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl">
        <p className="font-bold text-gray-900">Capture enrollment photo</p>
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-100">
          <video ref={videoRef} className={`w-full h-full object-cover -scale-x-100 ${!snapshotUrl ? "block" : "hidden"}`} playsInline muted />
          {snapshotUrl && <img src={snapshotUrl} alt="capture" className="w-full h-full object-cover" />}
        </div>
        <canvas ref={canvasRef} className="hidden" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-gray-400">Make sure the face is well-lit, front-facing, and no sunglasses.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-500">Cancel</button>
          {!snapshotUrl ? (
            <button onClick={takePhoto} disabled={!ready} className="flex-1 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 bg-[#7B1C3E]">
              📷 Capture
            </button>
          ) : (
            <>
              <button onClick={retake} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-500">Retake</button>
              <button onClick={() => onCapture(blob)} className="flex-1 text-white rounded-xl py-2.5 text-sm font-bold bg-[#7B1C3E]">
                Use photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FaceEnrollment() {
  const { data: employeeData, isLoading: employeesLoading } = useGetAllEmployee();
  const { data: adminData, isLoading: adminsLoading, error: adminsError } = useGetAllAdmins();
  const { data: faceData, isLoading: facesLoading } = useEnrolledFaces();
  const enrollMutation = useEnrollFace();
  const removeMutation = useRemoveFace();

  const [search, setSearch] = useState("");
  const [captureTarget, setCaptureTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const employees = useMemo(
    () => [...(employeeData?.users || []), ...(adminData?.admins || [])],
    [employeeData, adminData]
  );

  const enrolledIds = useMemo(
    () => new Set((faceData?.profiles || []).map((p) => String(p.employee))),
    [faceData]
  );
  const loading = employeesLoading || facesLoading || adminsLoading;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      `${e.f_name} ${e.l_name} ${e.work_email}`.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const roleInfo = (emp) =>
    emp.type === "manager"
      ? { onModel: "Manager", role: "manager" }
      : emp.type === "admin"
      ? { onModel: "Admin", role: "admin" }
      : { onModel: "User", role: "employee" };

  const handleCaptured = (blob) => {
    const emp = captureTarget;
    setCaptureTarget(null);
    const { onModel, role } = roleInfo(emp);
    enrollMutation.mutate(
      { employeeId: emp._id, onModel, role, photoBlob: blob },
      {
        onSuccess: () => setToast({ kind: "success", text: `${emp.f_name} ${emp.l_name} registered for face attendance.` }),
        onError: (err) => setToast({ kind: "error", text: err.message || "Registration failed" }),
      }
    );
  };

  const handleRemove = (emp) => {
    if (!window.confirm(`Remove ${emp.f_name} ${emp.l_name}'s face profile? They won't be recognised at the kiosk until re-registered.`)) return;
    removeMutation.mutate(emp._id, {
      onSuccess: () => setToast({ kind: "success", text: "Face profile removed." }),
      onError: (err) => setToast({ kind: "error", text: err.message || "Failed to remove" }),
    });
  };

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">Face Attendance — Registration</h1>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Register each employee's face once here. There's no per-person "training" involved — one clear
        photo is converted into a numeric face fingerprint that the kiosk compares live scans against.
        Anyone not registered will see "not registered" at the kiosk instead of being checked in.
      </p>

      {adminsError && (
        <div className="mb-4 rounded-xl px-4 py-2.5 text-sm bg-yellow-50 text-yellow-700 border border-yellow-200">
          Could not load admins for this org — showing employees and managers only.
        </div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#7B1C3E]/30"
      />

      {toast && (
        <div className={`mb-4 rounded-xl px-4 py-2.5 text-sm ${toast.kind === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {toast.text}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {filtered.map((emp) => {
            const isEnrolled = enrolledIds.has(String(emp._id));
            const isBusy =
              (enrollMutation.isPending && enrollMutation.variables?.employeeId === emp._id) ||
              (removeMutation.isPending && removeMutation.variables === emp._id);
            return (
              <div key={emp._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3.5 border-b border-gray-100 last:border-b-0 gap-2 sm:gap-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{emp.f_name} {emp.l_name}
                    <span className="ml-2 text-xs font-normal text-gray-400 capitalize">{emp.type}</span>
                  </p>
                  <p className="text-xs text-gray-400 truncate">{emp.work_email}</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${isEnrolled ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {isEnrolled ? "Registered" : "Not registered"}
                  </span>
                  {isEnrolled ? (
                    <button
                      disabled={isBusy}
                      onClick={() => handleRemove(emp)}
                      className="text-xs font-semibold text-red-500 border border-red-200 rounded-lg px-3 py-1.5 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      disabled={isBusy}
                      onClick={() => setCaptureTarget(emp)}
                      className="text-xs font-bold text-white rounded-lg px-3 py-1.5 disabled:opacity-50 bg-[#7B1C3E]"
                    >
                      {isBusy ? "Saving…" : "Register face"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-gray-400 px-4 sm:px-5 py-6 text-center">No employees match your search.</p>}
        </div>
      )}

      {captureTarget && (
        <CaptureModal onCapture={handleCaptured} onCancel={() => setCaptureTarget(null)} />
      )}
    </div>
  );
}