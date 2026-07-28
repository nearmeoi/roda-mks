import { describe, expect, it } from "vitest";
import { formatWhatsAppMessage } from "@/lib/copy";
import type { Product } from "@/lib/types";

// Base fields shared by all fixtures below, overridden per-test. Shaped per
// web/lib/types.ts's Product interface.
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
  it("includes a Groupset section for a bike product, and no Kelebihan section", () => {
    // Shaped like polygon-strattos-7-blk-fa-700-b from lib/products.json.
    const product = buildProduct({
      id: "polygon-strattos-7-blk-fa-700-b",
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
        Shifter: "SHIMANO 105 R7120, 2x12 SPEED",
        "Rear Derailleur": "SHIMANO 105 R7100",
        "Crank Set": "SHIMANO 105 R7100, 50/34T",
        Cassette: "SHIMANO 105 R7101, 11-34T",
        Genre: "Road",
      },
    });

    const msg = formatWhatsAppMessage(product);

    expect(msg).toContain("*Strattos 7*");
    expect(msg).toContain("Rp 25.000.000");
    expect(msg).toContain("*Groupset:*");
    expect(msg).toContain("• Shifter: SHIMANO 105 R7120, 2x12 SPEED");
    expect(msg).toContain("• Rear Derailleur: SHIMANO 105 R7100");
    expect(msg).toContain("Kode: 503769003");
    expect(msg).toContain("Stok: Terbatas (2 unit)");
    expect(msg).not.toContain("*Kelebihan:*");
  });

  it("includes a Spesifikasi section for a PAA product", () => {
    // Shaped like xzone-helmet-kids-superhero-g from lib/products.json.
    const product = buildProduct({
      id: "xzone-helmet-kids-superhero-g",
      brand: "XZONE",
      model_name: "HELMET KIDS SUPERHERO",
      category: "HELMET",
      color_label: "Hijau",
      price: 158000,
      sizes: [{ size_code: "M", article_code: 742286004, quantity: 8, ordered_quantity: null, price: 158000 }],
      colors: ["Dark Blue", "Pink", "Green"],
      specs: {
        Brand: "Xzone",
        "What's in the box": "1 x Polygon Superhero Kids Bike Helmet",
        Material: "Glue on shell material",
        Technology: "Antibacterial padding",
        "Tipe Fitting": "Regular Fitting",
        "Air Vents": "5 vents",
        Genre: "Kids",
      },
    });

    const msg = formatWhatsAppMessage(product);

    expect(msg).toContain("*Helmet Kids Superhero*");
    expect(msg).toContain("Rp 158.000");
    expect(msg).toContain("*Spesifikasi:*");
    expect(msg).toContain("• Material: Glue on shell material");
    expect(msg).toContain("• Technology: Antibacterial padding");
    expect(msg).toContain("Kode: 742286004");
    expect(msg).toContain("Stok: Tersedia (8 unit)");
  });

  it("omits both the key-spec section and the Kelebihan section when neither has usable data", () => {
    const product = buildProduct({
      id: "test-product-no-specs",
      brand: "GENERIC",
      model_name: "TEST WIDGET",
      category: "ACCESSORIES",
      price: 50000,
      sizes: [{ size_code: "OS", article_code: 999999, quantity: 3, ordered_quantity: null, price: 50000 }],
      specs: {},
    });

    const msg = formatWhatsAppMessage(product);

    expect(msg).toContain("*Test Widget*");
    expect(msg).toContain("Rp 50.000");
    expect(msg).toContain("Kode: 999999");
    expect(msg).toContain("Stok: Terbatas (3 unit)");
    expect(msg).not.toContain("*Groupset:*");
    expect(msg).not.toContain("*Spesifikasi:*");
    expect(msg).not.toContain("*Kelebihan:*");
  });
});
