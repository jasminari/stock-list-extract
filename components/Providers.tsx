"use client";

import { SessionProvider } from "next-auth/react";
import AmplitudeProvider from "@/components/AmplitudeProvider";
import PwaRegister from "@/components/PwaRegister";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AmplitudeProvider />
      <PwaRegister />
      {children}
    </SessionProvider>
  );
}
