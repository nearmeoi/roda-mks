import type { Product } from "@/lib/types";
import { formatPrice, getStockStatus, primaryArticleCode, titleCase, totalQuantity } from "@/lib/format";
import { getKeySpecLines, getKelebihanBullets } from "@/lib/copyInfo";

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
  const mainArticleCode = primaryArticleCode(product.sizes);
  const status = getStockStatus(qty);
  const { label: specLabel, lines: specLines } = getKeySpecLines(product);
  const kelebihan = getKelebihanBullets(product.specs);

  let msg = `*RODA STOCK INFO - RODALINK MAKASSAR* 🚲\n\n`;
  msg += `*${titleCase(product.model_name)}*\n`;
  msg += `${formatPrice(product.price)}\n`;

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

  msg += `\nKode: ${mainArticleCode}\n`;
  msg += `Stok: ${status.label} (${qty} unit)`;

  return msg;
}
