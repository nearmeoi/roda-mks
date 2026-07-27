import type { Product } from "@/lib/types";
import { formatPrice, primaryArticleCode, totalQuantity } from "@/lib/format";

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

  let msg = `*RODA STOCK INFO - RODALINK MAKASSAR* 🚲\n\n`;
  msg += `*Model:* ${product.model_name}\n`;
  msg += `*Brand:* ${product.brand}\n`;
  msg += `*Kategori:* ${product.category}\n`;
  if (product.price) {
    msg += `*Harga:* ${formatPrice(product.price)}\n`;
  }
  msg += `*Kode Artikel:* ${mainArticleCode}\n`;

  const colors = product.colors && product.colors.length > 0 ? product.colors.join(", ") : product.color_label;
  if (colors) {
    msg += `*Warna:* ${colors}\n`;
  }
  if (product.wheel_size) {
    msg += `*Ukuran Roda:* ${product.wheel_size}\n`;
  }

  msg += `\n*Status Stok Gudang:* ${qty > 0 ? `Ready (${qty} unit)` : "Kosong (0 unit)"}\n`;

  if (product.sizes && product.sizes.length > 0) {
    msg += `*Detail Stok per Ukuran:*\n`;
    product.sizes.forEach((s) => {
      const szName = s.size_code ? `Size ${s.size_code}` : "All Size";
      const stockTxt = s.quantity > 0 ? `${s.quantity} unit` : "Kosong";
      msg += `• ${szName} (Kode: ${s.article_code}) : *${stockTxt}*\n`;
    });
  }

  msg += `\n📍 *Lokasi:* ${product.warehouse}`;
  return msg;
}
