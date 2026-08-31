import axios from "axios";
import { useQuery } from "@tanstack/react-query";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

const getReviewCriteria = async () => {
  const res = await api.get("review/criteria");
  return res.data;
};

// Fixed 14 Plus + 14 Minus criteria list, same for every role. Cached
// forever in this session since it never changes at runtime.
export const useReviewCriteria = () => {
  return useQuery({
    queryKey: ["reviewCriteria"],
    queryFn: getReviewCriteria,
    staleTime: Infinity,
  });
};