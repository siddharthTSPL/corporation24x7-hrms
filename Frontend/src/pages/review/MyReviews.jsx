import React from "react";
import { useGetMeUser } from "../../auth/server-state/employee/employeeauth/employeeauth.hook";
import { useRespondToMyReviewAsEmployee } from "../../auth/server-state/employee/employeeother/employeeother.hook";
import MyReviewsList from "./MyReviewsList";

const BRAND = {
  pink: "#8B1A4A",
  maroon: "#5C0F30",
  mutedText: "#9B7A8A",
  textPrimary: "#2D0A1A",
  accentLight: "#FAF0F5",
  accentBorder: "#D4A0B8",
};

export default function MyReviews() {
  const { data, isLoading } = useGetMeUser();
  const reviews = data?.reviews ?? [];
  const { mutate: respond, isPending } = useRespondToMyReviewAsEmployee();

  return (
    <div className="min-h-screen bg-[#F2EEF0] font-['Inter','Helvetica_Neue',sans-serif] px-3 py-8 sm:px-6 sm:py-10 md:px-6 md:py-12 flex justify-center overflow-x-hidden">
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500&display=swap"
        rel="stylesheet"
      />
      <div className="w-full max-w-[760px] min-w-0">
        <div className="mb-8 text-center px-1">
          <div className="inline-block px-4 py-1 border rounded-full text-[11px] tracking-[0.12em] uppercase mb-4" style={{ borderColor: BRAND.accentBorder, color: BRAND.pink, background: BRAND.accentLight }}>
            Performance Review
          </div>
          <h1 className="text-[26px] sm:text-4xl font-bold m-0 mb-3 tracking-[-0.01em]" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: BRAND.textPrimary }}>
            My Reviews
          </h1>
          <p className="text-sm m-0 max-w-[440px] mx-auto leading-relaxed" style={{ color: BRAND.mutedText }}>
            Reviews your manager has given you. Accept them, or add a comment if you'd like to raise a concern.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-sm" style={{ color: BRAND.mutedText }}>
            Loading your reviews…
          </div>
        ) : (
          <MyReviewsList reviews={reviews} onRespond={respond} respondPending={isPending} />
        )}
      </div>
    </div>
  );
}