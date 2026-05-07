import { getEmployeeDocuments, forgetPasswordManager, resetManagerPassword, verifyManagerOtpApi, getUsersUnderManager, reviewEmployee, editManagerProfile, changeManagerPassword, getAllExpenseDocuments, getDocumentDetails, getAllPersonalDocuments, getattendance } from "../../../api/managerapi/other/ma.other.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useGetEmployeeDocuments = (uid) => {
    const queryClient = useQueryClient();
    return useMutation(getEmployeeDocuments, {
        mutationKey: ["getEmployeeDocuments"],
        mutationFn: getEmployeeDocuments,
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: ["manager"] });
        },
    });
};

export const useForgetPasswordManager = () => {
    const queryClient = useQueryClient();
    return useMutation(forgetPasswordManager, {
        mutationKey: ["forgetPasswordManager"],
        mutationFn: forgetPasswordManager,
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: ["manager"] });
        },
    });
};

export const useResetManagerPassword = () => {
    const queryClient = useQueryClient();
    return useMutation(resetManagerPassword, {
        mutationKey: ["resetManagerPassword"],
        mutationFn: resetManagerPassword,
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: ["manager"] });
        },
    });
};

export const useVerifyManagerOtpApi = () => {
    const queryClient = useQueryClient();
    return useMutation(verifyManagerOtpApi, {
        mutationKey: ["verifyManagerOtpApi"],
        mutationFn: verifyManagerOtpApi,
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: ["manager"] });
        },
    });
};


export const useGetUsersUnderManager = () => {
    return useQuery({
        queryKey: ["usersUnderManager"],
        queryFn: getUsersUnderManager,
    });
};

export const useReviewEmployee = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["reviewEmployee"],
        mutationFn: reviewEmployee,
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: ["manager"] });
        },
    });
};

export const useUpdateProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["editManagerProfile"],
        mutationFn: editManagerProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["manager"] });
        },
    });
};

export const useUpdatePassword = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["changeManagerPassword"],
        mutationFn: changeManagerPassword,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["manager"] });
        },
    });
};

export const useGetAllExpenseDocuments = () => {
    return useQuery({
        queryKey: ["expenseDocuments"],
        queryFn: getAllExpenseDocuments,
    });
};

export const useGetAllPersonalDocuments = () => {
    return useQuery({
        queryKey: ["personalDocuments"],
        queryFn: getAllPersonalDocuments,
    });
};

export const useGetDocumentDetails = (documentId) => {
    return useQuery({
        queryKey: ["documentDetails", documentId],
        queryFn: () => getDocumentDetails(documentId),
        enabled: !!documentId,
    });
};

export const useGetAttendance = () => {
    return useQuery({
        queryKey: ["attendance"],
        queryFn: getattendance,
    });
};