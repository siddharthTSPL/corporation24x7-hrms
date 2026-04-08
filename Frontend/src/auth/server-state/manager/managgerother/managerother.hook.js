import { getEmployeeDocuments,forgetPasswordManager, resetManagerPassword, verifyManagerOtpApi,getUsersUnderManager,reviewEmployee  } from "../../../api/managerapi/other/ma.other.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useGetEmployeeDocuments = (uid) => {
     return useQuery({
          queryKey: ["employeeDocuments", uid],
          queryFn: () => getEmployeeDocuments(uid),
     });
};

export const useForgetPasswordManager = () => {
     return useMutation(forgetPasswordManager);
}

export const useResetManagerPassword = () => {
     return useMutation(resetManagerPassword);
}

export const useVerifyManagerOtpApi = () => {
     return useMutation(verifyManagerOtpApi);
}

export const useGetUsersUnderManager = () => {
     return useQuery({
          queryKey: ["usersUnderManager"],
          queryFn: () => getUsersUnderManager(),
     });
};

export const useReviewEmployee = () => {
     return useMutation(reviewEmployee);
}
