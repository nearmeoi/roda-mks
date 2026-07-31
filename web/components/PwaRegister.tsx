"use client";

import { useEffect, useState } from "react";
import { WifiOff, Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaRegister() {
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("ServiceWorker registered successfully:", reg.scope);
          })
          .catch((err) => {
            console.error("ServiceWorker registration failed:", err);
          });
      });
    }

    // 2. Network Online/Offline Listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    // 3. Listen for PWA Install Prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Only show if user hasn't dismissed before in this session
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <>
      {/* Offline Status Badge Banner */}
      {isOffline && (
        <div className="fixed top-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-300/80 bg-amber-500/90 px-4 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition-all [animation:slideDown_0.3s_ease]">
          <WifiOff className="h-3.5 w-3.5" />
          <span>Mode Offline — Menggunakan data lokal toko</span>
        </div>
      )}

      {/* PWA Install App Banner */}
      {showInstallBanner && deferredPrompt && (
        <div className="fixed bottom-20 left-1/2 z-50 flex w-[90%] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-black/10 bg-gray-900/90 p-3.5 text-white shadow-xl backdrop-blur-xl transition-all">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="Roda Stock" className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm" />
            <div>
              <p className="text-xs font-bold">Install Roda Stock</p>
              <p className="text-[11px] text-gray-300">Pasang di HP untuk akses offline</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-gray-900 transition-all hover:bg-gray-100 active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={() => setShowInstallBanner(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
