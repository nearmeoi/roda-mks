"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { getAllProducts } from "@/lib/products";
import { titleCase, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import {
  CheckCircle2,
  AlertTriangle,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Copy,
  ExternalLink,
  SlidersHorizontal,
  Bike,
  ShieldCheck,
  RotateCcw
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { copyToClipboard, formatWhatsAppMessage } from "@/lib/copy";

const VERIFIED_STORAGE_KEY = "roda_verified_spec_ids";

export default function SpecsAuditPage() {
  const allProducts = useMemo(() => getAllProducts(), []);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Load verified IDs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VERIFIED_STORAGE_KEY);
      if (saved) {
        setVerifiedIds(new Set(JSON.parse(saved)));
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleVerify = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVerifiedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem(VERIFIED_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Identify bikes and non-bikes
  const bikes = useMemo(() => {
    return allProducts.filter((p) => {
      const cat = (p.category || "").toUpperCase();
      const name = (p.brand + " " + p.model_name).toUpperCase();
      if (cat.includes("NON BIKE") || cat.includes("APPAREL") || cat.includes("PARTS")) return false;
      return (
        cat.includes("BIKE") ||
        name.includes("POLYGON") ||
        name.includes("MARIN") ||
        name.includes("TERN") ||
        name.includes("WIM CYCLE")
      );
    });
  }, [allProducts]);

  // Extract unique brands and categories for filtering
  const availableBrands = useMemo(() => {
    const brands = new Set(bikes.map((b) => titleCase(b.brand)));
    return Array.from(brands).sort();
  }, [bikes]);

  const availableCategories = useMemo(() => {
    const cats = new Set(bikes.map((b) => titleCase(b.category)));
    return Array.from(cats).sort();
  }, [bikes]);

  // Spec Quality Helper
  const getSpecHealth = (p: Product) => {
    const specs = p.specs || {};
    const count = Object.keys(specs).length;
    if (count === 0) return { label: "Kosong", color: "bg-red-500/10 text-red-600 border-red-500/20", isGood: false };
    if (count < 4) return { label: "Minim Spek", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", isGood: false };

    const keysLower = Object.keys(specs).map((k) => k.toLowerCase());
    const hasFrame = keysLower.some((k) => k.includes("frame"));
    const hasDrivetrain = keysLower.some(
      (k) => k.includes("shifter") || k.includes("derailleur") || k.includes("crank") || k.includes("speed") || k.includes("drivetrain")
    );

    if (hasFrame && hasDrivetrain) {
      return { label: "Lengkap & Valid", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", isGood: true };
    }
    return { label: "Spek Standar", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", isGood: true };
  };

  // Filter products based on search & filters
  const filteredBikes = useMemo(() => {
    return bikes.filter((p) => {
      const brand = titleCase(p.brand);
      const cat = titleCase(p.category);
      const health = getSpecHealth(p);
      const isVerified = verifiedIds.has(p.id);

      if (selectedBrand !== "all" && brand !== selectedBrand) return false;
      if (selectedCategory !== "all" && cat !== selectedCategory) return false;

      if (statusFilter === "verified" && !isVerified) return false;
      if (statusFilter === "unverified" && isVerified) return false;
      if (statusFilter === "needs_attention" && health.isGood) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const text = `${p.brand} ${p.model_name} ${p.category} ${p.id} ${JSON.stringify(p.specs || {})}`.toLowerCase();
        return text.includes(q);
      }

      return true;
    });
  }, [bikes, selectedBrand, selectedCategory, statusFilter, searchQuery, verifiedIds]);

  const stats = useMemo(() => {
    const total = bikes.length;
    const verified = bikes.filter((b) => verifiedIds.has(b.id)).length;
    const complete = bikes.filter((b) => getSpecHealth(b).isGood).length;
    return { total, verified, complete };
  }, [bikes, verifiedIds]);

  const handleCopySpecText = async (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = formatWhatsAppMessage(p);
    const ok = await copyToClipboard(text);
    if (ok) showToast("Spesifikasi disalin ke WhatsApp format!");
  };

  return (
    <div className="min-h-screen bg-[#f6f6f8] pb-24 text-gray-900">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-black/10 bg-gray-900/90 px-4 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-lg [animation:fadeSlideUp_0.25s_ease]">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Sticky Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-black/[0.08] bg-white/80 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-base font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent" />
              Verifikasi & Audit Spesifikasi
            </h1>
            <p className="text-[11px] text-gray-500">Pemeriksaan & Validasi Data Sepeda Rodalink</p>
          </div>
        </div>

        <Link
          href="/"
          className="rounded-full border border-black/10 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-all"
        >
          Ke Pencarian
        </Link>
      </div>

      <div className="mx-auto max-w-[680px] px-4 pt-4">
        {/* KPI Dashboard Cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-2xl border border-black/[0.08] bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Sepeda</span>
              <Bike className="h-4 w-4 text-accent" />
            </div>
            <div className="text-2xl font-extrabold text-gray-900">{stats.total}</div>
            <div className="text-[11px] text-gray-500 font-medium">Dalam Katalog</div>
          </div>

          <div className="rounded-2xl border border-black/[0.08] bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Spek Valid</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-600">{stats.complete}</div>
            <div className="text-[11px] text-emerald-600 font-medium">
              {Math.round((stats.complete / stats.total) * 100)}% Terspesifikasi
            </div>
          </div>

          <div className="rounded-2xl border border-black/[0.08] bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Terverifikasi</span>
              <FileCheck className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-extrabold text-blue-600">{stats.verified}</div>
            <div className="text-[11px] text-gray-500 font-medium">Verified Staff</div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-4 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari sepeda, kode artikel, frame, Shimano Deore, 12-Speed..."
              className="w-full rounded-2xl border border-black/10 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none shadow-xs transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Brand Filter */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none shadow-xs hover:border-black/20"
            >
              <option value="all">Semua Brand ({availableBrands.length})</option>
              {availableBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none shadow-xs hover:border-black/20"
            >
              <option value="all">Semua Kategori ({availableCategories.length})</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none shadow-xs hover:border-black/20"
            >
              <option value="all">Semua Status Verification</option>
              <option value="verified">Verified Tercentang ({verifiedIds.size})</option>
              <option value="unverified">Belum Verified</option>
            </select>

            {(selectedBrand !== "all" || selectedCategory !== "all" || statusFilter !== "all" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedBrand("all");
                  setSelectedCategory("all");
                  setStatusFilter("all");
                  setSearchQuery("");
                }}
                className="flex items-center gap-1 rounded-xl bg-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Results Counter */}
        <div className="mb-3 flex items-center justify-between px-1 text-xs font-semibold text-gray-500">
          <span>Menampilkan {filteredBikes.length} Sepeda</span>
          <span>{verifiedIds.size} Produk Dicentang Verifikasi</span>
        </div>

        {/* Bike Audit List */}
        <div className="space-y-3">
          {filteredBikes.map((bike) => {
            const health = getSpecHealth(bike);
            const isVerified = verifiedIds.has(bike.id);
            const isExpanded = expandedId === bike.id;
            const specs = bike.specs || {};
            const keys = Object.keys(specs);

            // Highlight core spec values
            const frameVal = specs["Frame"] || specs["Frame & Fork"] || "—";
            const speedVal = specs["Speed"] || specs["Drivetrain"] || "—";
            const brakeVal = specs["Brake"] || specs["Sistem Pengereman"] || "—";
            const wheelVal = bike.wheel_size || specs["Wheel size"] || specs["Wheel Set"] || "—";

            return (
              <div
                key={bike.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-xs transition-all ${
                  isVerified ? "border-emerald-300 bg-emerald-50/20" : "border-black/[0.08]"
                }`}
              >
                {/* Product Header Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : bike.id)}
                  className="flex cursor-pointer items-start justify-between p-4 hover:bg-gray-50/80 transition-colors"
                >
                  <div className="flex gap-3.5">
                    {bike.images && bike.images[0] ? (
                      <img
                        src={bike.images[0]}
                        alt={bike.model_name}
                        className="h-16 w-16 rounded-xl object-contain border border-black/[0.06] p-1 bg-white"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                        <Bike className="h-7 w-7" />
                      </div>
                    )}

                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="text-[11px] font-bold text-accent uppercase tracking-wide">
                          {titleCase(bike.brand)}
                        </span>
                        <span className="text-[11px] rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
                          {titleCase(bike.category)}
                        </span>
                        <span className={`text-[10.5px] rounded-full border px-2 py-0.5 font-semibold ${health.color}`}>
                          {health.label}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-gray-900 leading-tight">
                        {titleCase(bike.model_name)}
                      </h3>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 font-mono">
                        <span>ID: {bike.id}</span>
                        <span className="font-sans font-semibold text-gray-900">{formatPrice(bike.price)}</span>
                      </div>

                      {/* Quick Pills for Key Specs */}
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                        {frameVal !== "—" && (
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700 font-medium">
                            Frame: <strong className="text-gray-900">{frameVal.slice(0, 28)}</strong>
                          </span>
                        )}
                        {speedVal !== "—" && (
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700 font-medium">
                            Speed: <strong className="text-gray-900">{speedVal}</strong>
                          </span>
                        )}
                        {brakeVal !== "—" && (
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700 font-medium">
                            Brake: <strong className="text-gray-900">{brakeVal.slice(0, 24)}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => toggleVerify(bike.id, e)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                        isVerified
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "border border-black/10 bg-white text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                      <span>{isVerified ? "Verified" : "Verifikasi"}</span>
                    </button>

                    <div className="flex items-center gap-1.5 text-gray-400">
                      <button
                        type="button"
                        onClick={(e) => handleCopySpecText(bike, e)}
                        className="p-1 hover:text-accent"
                        title="Salin WA Format"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <Link
                        href={`/product/${bike.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 hover:text-accent"
                        title="Buka Halaman Detail"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Specifications Table */}
                {isExpanded && (
                  <div className="border-t border-black/[0.08] bg-gray-50/50 p-4 [animation:fadeSlideUp_0.2s_ease]">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Matriks Spesifikasi Lengkap ({keys.length} Atribut)
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopySpecText(bike, e)}
                        className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Salin Format WA</span>
                      </button>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white divide-y divide-black/[0.06]">
                      {keys.map((k) => (
                        <div key={k} className="flex justify-between px-3.5 py-2 text-xs">
                          <span className="font-semibold text-gray-500 w-1/3">{k}</span>
                          <span className="font-medium text-gray-900 w-2/3 text-right">{specs[k]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
