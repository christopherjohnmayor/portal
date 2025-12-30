import AppSidebar from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import AppSidebarNav from "@/components/app-sidebar-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function AppLayout({
  children,
  disableScroll = false,
}: {
  children: React.ReactNode;
  disableScroll?: boolean;
}) {
  return (
    <SidebarProvider
      className={`${geistSans.className} ${geistMono.variable} h-dvh overflow-hidden`}
    >
      <AppSidebar intent="inset" collapsible="dock" />
      <SidebarInset className="overflow-hidden min-h-0">
        <AppSidebarNav />
        <div
          className={`flex-1 min-h-0 ${disableScroll ? "overflow-hidden" : "overflow-auto"
            }`}
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
