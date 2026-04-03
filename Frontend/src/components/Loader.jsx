import Lottie from "lottie-react";
import animationData from "../assets/loader.json"; 

export default function Loader() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="w-40 sm:w-56 md:w-64">
        <Lottie animationData={animationData} loop={true} />
      </div>
    </div>
  );
}