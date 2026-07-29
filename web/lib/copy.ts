import type { Product } from "@/lib/types";
import { formatPrice, getStockStatus, primaryArticleCode, titleCase, totalQuantity } from "@/lib/format";
import { getProductInfoLines, getDetailedSpecLines, getKelebihanBullets } from "@/lib/copyInfo";

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-999999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    }
  } catch (e) {
    console.error("Failed to copy", e);
    return false;
  }
}

export function formatWhatsAppMessage(product: Product): string {
  const qty = totalQuantity(product.sizes);
  const status = getStockStatus(qty);

  const infoLines = getProductInfoLines(product);
  const { label: specLabel, lines: specLines } = getDetailedSpecLines(product);
  const kelebihan = getKelebihanBullets(product.specs);

  let msg = `*RODA STOCK INFO - RODALINK MAKASSAR* 🚲\n\n`;
  msg += `*${titleCase(product.model_name)}*\n`;
  if (product.price) {
    msg += `${formatPrice(product.price)}\n`;
  }

  if (infoLines.length > 0) {
    msg += `\n*Informasi Produk:*\n`;
    infoLines.forEach((line) => {
      msg += `• ${line}\n`;
    });
  }

  if (specLines.length > 0) {
    msg += `\n*${specLabel}:*\n`;
    specLines.forEach((line) => {
      msg += `• ${line}\n`;
    });
  }

  if (kelebihan.length > 0) {
    msg += `\n*Kelebihan:*\n`;
    kelebihan.forEach((line) => {
      msg += `• ${line}\n`;
    });
  }

  const articleCodes = Array.from(
    new Set(product.sizes.map((s) => s.article_code).filter(Boolean))
  ).join(", ");

  msg += `\nKode: ${articleCodes || primaryArticleCode(product.sizes)}\n`;
  msg += `Stok: ${status.label} (${qty} unit)`;

  return msg;
}

export function formatBulkWhatsAppMessage(products: Product[]): string {
  if (products.length === 0) return "";
  if (products.length === 1) return formatWhatsAppMessage(products[0]);

  let msg = `*DAFTAR HARGA & STOK - RODALINK MAKASSAR* 🚲\n\n`;

  products.forEach((product, idx) => {
    const qty = totalQuantity(product.sizes);
    const priceStr = product.price ? formatPrice(product.price) : "";
    const infoParts: string[] = [];

    infoParts.push(`Stok: ${qty > 0 ? "Ready (" + qty + " unit)" : "Habis"}`);

    const readySizes = Array.from(
      new Set(
        (product.sizes || [])
          .filter((s) => s.quantity > 0)
          .map((s) => (s.size_code && s.size_code.toUpperCase() !== "NONE" ? s.size_code : "All Size"))
      )
    );
    if (readySizes.length > 0) {
      infoParts.push(`Ukuran: ${readySizes.join(", ")}`);
    }

    const colorStr =
      product.colors && product.colors.length > 0
        ? product.colors.map(titleCase).join(", ")
        : product.color_label
        ? titleCase(product.color_label)
        : null;
    if (colorStr) {
      infoParts.push(`Warna: ${colorStr}`);
    }

    msg += `${idx + 1}. *${titleCase(product.model_name)}*`;
    if (priceStr) msg += ` - ${priceStr}`;
    msg += `\n   • ${infoParts.join(" | ")}\n\n`;
  });

  msg += `Total: ${products.length} produk`;

  return msg.trimEnd();
}
