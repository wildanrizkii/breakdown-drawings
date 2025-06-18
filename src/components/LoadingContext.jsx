"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function LoadingLayout({ children }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000); // Delay 1 detik

    return () => clearTimeout(timer);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/3 -translate-y-1/2 z-50">
        <div className="spinner"></div>
      </div>
    );
  }

  return children;
}
