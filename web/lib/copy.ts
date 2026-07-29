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
