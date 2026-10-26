import { useQuery, useMutation } from "@tanstack/react-query";
import { getReportCatalog, getReportLookup, runReport, exportReport } from "../../api/reports/reports.api";

export const useReportCatalog = () =>
  useQuery({ queryKey: ["reports", "catalog"], queryFn: getReportCatalog, staleTime: 5 * 60 * 1000 });

export const useReportLookup = (name, q = "", enabled = true) =>
  useQuery({
    queryKey: ["reports", "lookup", name, q],
    queryFn: () => getReportLookup(name, q),
    enabled: !!name && enabled,
    staleTime: 60 * 1000,
  });

export const useRunReport = () => useMutation({ mutationFn: ({ key, body }) => runReport(key, body) });
export const useExportReport = () => useMutation({ mutationFn: ({ key, filters }) => exportReport(key, filters) });
