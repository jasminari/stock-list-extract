"use client";

import { SessionProvider } from "next-auth/react";
import AmplitudeProvider from "@/components/AmplitudeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AmplitudeProvider />
      {children}
    </SessionProvider>
  );
}
