import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPayrollPolicy,
  setPayrollPolicy,
  resetPayrollPolicy,
  addPayrollAllowance,
  updatePayrollAllowance,
  removePayrollAllowance,
  getPaySchedule,
  setPaySchedule,
  getOrgOwner,
  setEmployeeCTC,
  listSalaryStructures,
  getSalaryStructure,
  reapplyPolicy,
  generatePayroll,
  bulkGeneratePayroll,
  listPayrolls,
  getPayslip,
  updatePayrollStatus,
  deletePayroll,
  bulkUpdatePayrollStatus,
  bulkDeletePayroll,
} from "../../api/payroll/payroll.api";



export const useGetPayrollPolicy = () => {
  return useQuery({
    queryKey: ["payroll-policy"],
    queryFn: getPayrollPolicy,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useSetPayrollPolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setPayrollPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-policy"] });
    },
  });
};

export const useResetPayrollPolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetPayrollPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-policy"] });
    },
  });
};

export const useAddPayrollAllowance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addPayrollAllowance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-policy"] });
    },
  });
};

export const useUpdatePayrollAllowance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, data }) => updatePayrollAllowance(name, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-policy"] });
    },
  });
};

export const useRemovePayrollAllowance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name) => removePayrollAllowance(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-policy"] });
    },
  });
};



export const useGetPaySchedule = () => {
  return useQuery({
    queryKey: ["pay-schedule"],
    queryFn: getPaySchedule,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useSetPaySchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setPaySchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pay-schedule"] });
    },
  });
};



export const useGetOrgOwner = () => {
  return useQuery({
    queryKey: ["payroll-org-owner"],
    queryFn: getOrgOwner,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};

export const useListSalaryStructures = (params) => {
  return useQuery({
    queryKey: ["salary-structures", params],
    queryFn: () => listSalaryStructures(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetSalaryStructure = (employee) => {
  return useQuery({
    queryKey: ["salary-structure", employee],
    queryFn: () => getSalaryStructure(employee),
    enabled: Boolean(employee),
    staleTime: 0,
  });
};

export const useSetEmployeeCTC = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setEmployeeCTC,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-structures"] });
    },
  });
};

export const useReapplyPolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (employee) => reapplyPolicy(employee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-structures"] });
    },
  });
};



export const useGeneratePayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generatePayroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });
};

export const useBulkGeneratePayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkGeneratePayroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });
};



export const useListPayrolls = (params) => {
  return useQuery({
    queryKey: ["payrolls", params],
    queryFn: () => listPayrolls(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetPayslip = (params, enabled) => {
  return useQuery({
    queryKey: ["payslip", params],
    queryFn: () => getPayslip(params),
    enabled: Boolean(enabled && params?.employee && params?.month && params?.year),
    staleTime: 0,
  });
};

export const useUpdatePayrollStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => updatePayrollStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });
};

export const useDeletePayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deletePayroll(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });
};

export const useBulkUpdatePayrollStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, status }) => bulkUpdatePayrollStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });
};

export const useBulkDeletePayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids) => bulkDeletePayroll(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
  });
};