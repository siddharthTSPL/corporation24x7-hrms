import { getEmployeeDocuments,forgetPasswordManager, resetManagerPassword, verifyManagerOtpApi,getUsersUnderManager,reviewEmployee , editManagerProfile, changeManagerPassword } from "../../../api/managerapi/other/ma.other.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useGetEmployeeDocuments = (uid) => {
    const queryClient = useQueryClient();

    return useMutation(getEmployeeDocuments, {
         mutationKey: ["getEmployeeDocuments"],
         mutationFn:getEmployeeDocuments,
         onSuccess: () => {
              queryClient.removeQueries({ queryKey: ["manager"] });
         },
    })
};

export const useForgetPasswordManager = () => {
   const queryClient = useQueryClient();

   return useMutation(forgetPasswordManager, {
        mutationKey: ["forgetPasswordManager"],
        mutationFn:forgetPasswordManager,
        onSuccess: () => {
             queryClient.removeQueries({ queryKey: ["manager"] });
        },
   })
}

export const useResetManagerPassword = () => {
    const queryClient = useQueryClient();

    return useMutation(resetManagerPassword, {
         mutationKey: ["resetManagerPassword"],
         mutationFn:resetManagerPassword,
         onSuccess: () => {
              queryClient.removeQueries({ queryKey: ["manager"] });
         },
    })
}

export const useVerifyManagerOtpApi = () => {
    const queryClient = useQueryClient();

    return useMutation(verifyManagerOtpApi, {
         mutationKey: ["verifyManagerOtpApi"],
         mutationFn:verifyManagerOtpApi,
         onSuccess: () => {
              queryClient.removeQueries({ queryKey: ["manager"] });
         },
    })
}

export const useGetUsersUnderManager = () => {
   const queryClient = useQueryClient();

   return useMutation(getUsersUnderManager, {
        mutationKey: ["getUsersUnderManager"],
        mutationFn:getUsersUnderManager,
        onSuccess: () => {
             queryClient.removeQueries({ queryKey: ["manager"] });
        },
   })
};

export const useReviewEmployee = () => {
   const queryClient = useQueryClient();

   return useMutation(reviewEmployee, {
        mutationKey: ["reviewEmployee"],
        mutationFn:reviewEmployee,
        onSuccess: () => {
             queryClient.removeQueries({ queryKey: ["manager"] });
        },
   })
}

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

export const useUpdatePassword= () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["changeManagerPassword"],
    mutationFn: changeManagerPassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager"] });
    },
  });
};