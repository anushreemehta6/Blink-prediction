"use client"
import Header from "@/components/Header";
import BackgroundGrid from "@/components/bgGrid";
import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { useRouter } from "next/navigation";
export default function PvPPage() {
    return (
       <>
       <BackgroundGrid   />
       <div className="fixed inset-0 w-full h-full overflow-hidden bg-[var(--bg-deep)]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-deep)]/80" />

        <Header currentPrice={null} />

        <div className="relative z-10 flex flex-col justify-center items-center text-center min-h-screen px-4 pt-16">
            <h1>PvP Page</h1>
        </div>
       </div>
       </>
    );
}