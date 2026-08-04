"use client";

import { useEffect, useState } from "react";
import { WifiOff, Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaRegister() {
  const [mounted, setMounted] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 1. Register Service Worker immediately
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const registerSw = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("ServiceWorker registered successfully:", reg.scope);
          })
          .catch((err) => {
            console.error("ServiceWorker registration failed:", err);
          });
      };

      if (document.readyState === "complete") {
        registerSw();
      } else {
        window.addEventListener("load", registerSw);
      }
    }

    // 2. Check if already running in standalone PWA mode or dismissed
    if (typeof window !== "undefined") {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);

      // Detect iOS Safari
      const ua = window.navigator.userAgent.toLowerCase();
      const iosDevice = /iphone|ipad|ipod/.test(ua);
      setIsIos(iosDevice);

      // Show install banner for mobile non-standalone users if not dismissed
      const isDismissed = localStorage.getItem("roda_pwa_banner_dismissed") === "true";
      if (!standalone && !isDismissed) {
        setShowInstallBanner(true);
      }
    }

    // 3. Network Online/Offline Listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    // 4. Listen for Chrome/Android PWA Install Prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const isDismissed = typeof window !== "undefined" && localStorage.getItem("roda_pwa_banner_dismissed") === "true";
      if (!isDismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleDismissBanner = () => {
    setShowInstallBanner(false);
    try {
      localStorage.setItem("roda_pwa_banner_dismissed", "true");
    } catch {}
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        handleDismissBanner();
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      alert(
        "Untuk menginstall aplikasi Roda Stock:\n\n" +
          "• Di Chrome PC/Android: Klik ikon 'Install' di address bar (ujung kanan atas browser).\n" +
          "• Di Safari iPhone: Tekan tombol Share 📤 lalu pilih 'Tambah ke Layar Utama'."
      );
    }
  };

  if (!mounted || isStandalone) return null;

  return (
    <>
      {/* Offline Status Badge Banner */}
      {isOffline && (
        <div className="fixed top-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-300/80 bg-amber-500/90 px-4 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition-all [animation:slideDown_0.3s_ease]">
          <WifiOff className="h-3.5 w-3.5" />
          <span>Mode Offline — Menggunakan data lokal toko</span>
        </div>
      )}

      {/* PWA Install App Floating Banner - Light Theme / White */}
      {showInstallBanner && (
        <div className="fixed bottom-20 left-1/2 z-50 flex w-[92%] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/95 p-3.5 text-gray-900 shadow-2xl backdrop-blur-xl transition-all">
          <div className="flex items-center gap-3">
            <img
              src="/icon.png"
              alt="Roda Stock"
              className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-xs border border-black/10"
            />
            <div>
              <p className="text-xs font-bold text-gray-900">Install Roda Stock</p>
              <p className="text-[11px] font-medium text-gray-500">Pasang di HP/Tablet untuk akses cepat offline</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-accent/90 active:scale-95 shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={handleDismissBanner}
              title="Tutup & Jangan Tampilkan Lagi"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Guide Modal */}
      {showIosGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-md"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-5 text-gray-900 shadow-2xl border border-black/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Share className="h-4 w-4 text-accent" />
                Cara Install di iPhone / iPad
              </h3>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="rounded-full bg-gray-100 p-1 text-gray-500 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3 text-xs text-gray-600">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 font-bold text-accent text-[11px]">
                  1
                </span>
                <p>
                  Tekan tombol <strong>Share (Bagikan) 📤</strong> di bilah bawah Safari.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 font-bold text-accent text-[11px]">
                  2
                </span>
                <p>
                  Gulir ke bawah dan pilih <strong>&quot;Tambah ke Layar Utama&quot; (Add to Home Screen)</strong>.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 font-bold text-accent text-[11px]">
                  3
                </span>
                <p>Tekan **Tambah** di pojok kanan atas. Aplikasi Roda Stock siap digunakan!</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="mt-5 w-full rounded-2xl bg-gray-900 py-2.5 text-xs font-bold text-white"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}

