"use client";
import { useState, useEffect } from "react";
import Clock from "@/components/Clock";
import ShortcutManager from "@/components/ShortcutManager";
import MobileDashboard from "@/components/MobileDashboard";

export default function Dashboard() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!mounted) return null;

  return isMobile ? (
    <MobileDashboard />
  ) : (
    <div>
      <Clock />
      <ShortcutManager />
    </div>
  );
}
