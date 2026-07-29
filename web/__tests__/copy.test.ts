import { describe, expect, it } from "vitest";
import { formatWhatsAppMessage } from "@/lib/copy";
import type { Product } from "@/lib/types";

function buildProduct(overrides: Partial<Product>): Product {
  return {
    id: "test-id",
    brand: "BRAND",
    model_name: "MODEL",
    category: "ACCESSORIES",
    warehouse: "Outlet",
    variant_extra: null,
    wheel_size: null,
    color_label: null,
    price: 0,
    sizes: [{ size_code: "OS", article_code: 1, quantity: 0, ordered_quantity: null, price: 0 }],
    colors: [],
    images: [],
    specs: {},
    matched: true,
    ...overrides,
  };
}

describe("formatWhatsAppMessage", () => {
  it("formats a rich bike WhatsApp message with all details", () => {
    const product = buildProduct({
      id: "polygon-strattos-7",
      brand: "POLYGON",
      model_name: "STRATTOS 7",
      category: "BIKE-ROAD DROP BAR",
      wheel_size: "700C",
      color_label: "Hitam",
      price: 25000000,
      sizes: [
        { size_code: "S1", article_code: 503769003, quantity: 1, ordered_quantity: null, price: 25000000 },
        { size_code: "M", article_code: 503769004, quantity: 1, ordered_quantity: null, price: 25000000 },
      ],
      colors: ["Black"],
      specs: {
        Brand: "Polygon",
        Frame: "CARBON ENDURANCE",
        Speed: "2x12 Speed",
        Shifter: "SHIMANO 105 R7120, 2x12 SPEED",
        "Rear Derailleur": "SHIMANO 105 R7100",
        "Crank Set": "SHIMANO 105 FC-R7100 50/34T",
        Cassette: "SHIMANO 105 CS-R7101 11-34T",
        Brake: "SHIMANO 105 HYDRAULIC DISC",
        Tire: "SCHWALBE ONE ADDIX TLE 700x30C",
        Genre: "Road",
        Weight: "8.9 kg (Size M)",
      },
    });

    const msg = formatWhatsAppMessage(product);

    expect(msg).toContain("*RODA STOCK INFO - RODALINK MAKASSAR* 🚲");
    expect(msg).toContain("*Strattos 7*");
    expect(msg).toContain("Rp 25.000.000");

    expect(msg).toContain("*Informasi Produk:*");
    expect(msg).toContain("• Genre / Kategori: Road");
    expect(msg).toContain("• Warna: Black");
    expect(msg).toContain("• Ukuran Ready: S1, M");
    expect(msg).toContain("• Bobot: 8.9 kg (Size M)");

    expect(msg).toContain("*Spesifikasi:*");
    expect(msg).toContain("• Frame / Material: CARBON ENDURANCE");
    expect(msg).toContain("• Speed: 2x12 Speed");
    expect(msg).toContain("• Shifter: SHIMANO 105 R7120, 2x12 SPEED");
    expect(msg).toContain("• Rear Derailleur: SHIMANO 105 R7100");
    expect(msg).toContain("• Crank Set: SHIMANO 105 FC-R7100 50/34T");
    expect(msg).toContain("• Cassette: SHIMANO 105 CS-R7101 11-34T");
    expect(msg).toContain("• Rem: SHIMANO 105 HYDRAULIC DISC");
    expect(msg).toContain("• Ukuran Roda: 700C");
    expect(msg).toContain("• Ban: SCHWALBE ONE ADDIX TLE 700x30C");

    expect(msg).toContain("Kode: 503769003, 503769004");
    expect(msg).toContain("Stok: Terbatas (2 unit)");
  });

  it("formats a non-bike WhatsApp message correctly", () => {
    const product = buildProduct({
      id: "xzone-helmet",
      brand: "XZONE",
      model_name: "HELMET KIDS SUPERHERO",
      category: "HELMET",
      color_label: "Hijau",
      price: 158000,
      sizes: [{ size_code: "M", article_code: 742286004, quantity: 8, ordered_quantity: null, price: 158000 }],
      colors: ["Dark Blue", "Pink", "Green"],
      specs: {
        Brand: "Xzone",
        Material: "Glue on shell material",
        Technology: "Antibacterial padding",
        "Air Vents": "5 vents",
        Genre: "Kids",
      },
    });

    const msg = formatWhatsAppMessage(product);

    expect(msg).toContain("*Helmet Kids Superhero*");
    expect(msg).toContain("Rp 158.000");
    expect(msg).toContain("*Informasi Produk:*");
    expect(msg).toContain("• Genre / Kategori: Kids");
    expect(msg).toContain("• Warna: Dark Blue, Pink, Green");
    expect(msg).toContain("• Ukuran Ready: M");

    expect(msg).toContain("*Spesifikasi:*");
    expect(msg).toContain("• Material: Glue on shell material");
    expect(msg).toContain("• Technology: Antibacterial padding");

    expect(msg).toContain("Kode: 742286004");
    expect(msg).toContain("Stok: Tersedia (8 unit)");
  });
});
