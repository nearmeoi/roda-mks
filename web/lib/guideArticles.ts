import type { GuideArticle } from "./types";

export const guideArticles: GuideArticle[] = [
  {
    id: "ukuran-sepeda-road-hybrid-gravel",
    category: "Ukuran Sepeda",
    title: "Panduan Ukuran Sepeda Road, Hybrid & Gravel",
    summary: "Cocokkan tinggi badan pelanggan dengan ukuran frame (cm) untuk sepeda drop-bar dan flat-bar.",
    tags: ["road", "hybrid", "gravel", "frame", "tinggi badan", "drop bar", "flat bar"],
    blocks: [
      { type: "paragraph", text: "Tanyakan tinggi badan pelanggan (cm), lalu cocokkan dengan rentang di tabel. Ini estimasi umum industri — kalau ada geometry chart resmi dari brand tertentu, prioritaskan itu." },
      {
        type: "table",
        headers: ["Tinggi Badan", "Ukuran Frame"],
        rows: [
          ["150 - 160 cm", "XS (47-49 cm)"],
          ["160 - 170 cm", "S (50-52 cm)"],
          ["170 - 178 cm", "M (54-55 cm)"],
          ["178 - 185 cm", "L (56-58 cm)"],
          ["185 - 195 cm", "XL (58-61 cm)"],
        ],
      },
      {
        type: "bullets",
        items: [
          "Drop-bar (road/gravel): posisi lebih membungkuk, cocok untuk kecepatan & jarak jauh.",
          "Flat-bar (hybrid): posisi lebih tegak, nyaman untuk commuting harian.",
          "Untuk gravel, banyak pelanggan memilih 1 ukuran lebih kecil dari road murni agar lebih lincah di jalur off-road ringan.",
        ],
      },
    ],
  },
  {
    id: "ukuran-sepeda-mtb",
    category: "Ukuran Sepeda",
    title: "Panduan Ukuran Sepeda Gunung (MTB)",
    summary: "Ukuran frame S/M/L/XL berdasarkan tinggi badan, plus kapan menyarankan roda 27.5\" vs 29\".",
    tags: ["mtb", "gunung", "frame", "tinggi badan", "27.5", "29 inch", "wheel size"],
    blocks: [
      {
        type: "table",
        headers: ["Tinggi Badan", "Ukuran Frame"],
        rows: [
          ["150 - 165 cm", "S"],
          ["165 - 175 cm", "M"],
          ["175 - 185 cm", "L"],
          ["185 - 195 cm", "XL"],
        ],
      },
      {
        type: "bullets",
        items: [
          "Roda 27.5\": lebih lincah, akselerasi lebih cepat — sering dipilih untuk frame kecil (S) atau jalur teknikal.",
          "Roda 29\": menggelinding lebih stabil di kecepatan tinggi dan medan kasar — jadi standar untuk frame M ke atas.",
          "Full suspension vs rigid/hardtail tidak mengubah tabel ukuran di atas — keduanya memakai patokan tinggi badan yang sama.",
        ],
      },
    ],
  },
  {
    id: "ukuran-sepeda-anak",
    category: "Ukuran Sepeda",
    title: "Panduan Ukuran Sepeda Anak",
    summary: "Perkiraan usia dan tinggi badan untuk tiap ukuran roda (12\" - 24\").",
    tags: ["anak", "kids", "roda", "usia", "tinggi badan"],
    blocks: [
      {
        type: "table",
        headers: ["Usia (perkiraan)", "Tinggi Badan", "Ukuran Roda"],
        rows: [
          ["2 - 4 tahun", "85 - 100 cm", "12\""],
          ["3 - 5 tahun", "95 - 110 cm", "14\""],
          ["4 - 6 tahun", "100 - 115 cm", "16\""],
          ["5 - 8 tahun", "110 - 130 cm", "20\""],
          ["8 - 11 tahun", "130 - 145 cm", "24\""],
        ],
      },
      {
        type: "bullets",
        items: [
          "Usia hanya perkiraan kasar — tinggi badan anak jauh lebih akurat untuk menentukan ukuran.",
          "Anak harus bisa menapakkan kedua kaki ke tanah sambil duduk di sadel saat dites langsung.",
          "Kalau tinggi badan pas di antara dua rentang, sarankan ukuran roda yang lebih kecil — anak akan lebih mudah mengendalikannya.",
        ],
      },
    ],
  },
  {
    id: "tingkatan-groupset",
    category: "Groupset",
    title: "Mengenal Tingkatan Groupset",
    summary: "Urutan tingkatan groupset Shimano & SRAM dari yang paling terjangkau sampai paling premium — dan kenapa itu memengaruhi harga sepeda.",
    tags: ["groupset", "shimano", "sram", "deore", "105", "ultegra", "eagle", "tier"],
    blocks: [
      { type: "paragraph", text: "Semakin tinggi tingkatannya, biasanya makin ringan, makin presisi perpindahan giginya, dan makin tahan lama — tapi juga makin mahal. Ini alasan utama dua sepeda yang terlihat mirip bisa punya selisih harga jutaan rupiah." },
      { type: "heading", text: "Shimano - Road" },
      { type: "bullets", items: ["Claris (entry)", "Sora", "Tiagra", "105", "Ultegra", "Dura-Ace (tertinggi)"] },
      { type: "heading", text: "Shimano - MTB (Gunung)" },
      { type: "bullets", items: ["Tourney (entry)", "Altus", "Acera", "Alivio", "Deore", "SLX", "XT", "XTR (tertinggi)"] },
      { type: "heading", text: "SRAM - Road" },
      { type: "bullets", items: ["Apex (entry)", "Rival", "Force", "Red / Red AXS (tertinggi)"] },
      { type: "heading", text: "SRAM - MTB (Eagle)" },
      { type: "bullets", items: ["SX Eagle (entry)", "NX Eagle", "GX Eagle", "X0 Eagle", "XX1 / XX Eagle (tertinggi)"] },
      { type: "paragraph", text: "GX Eagle dan NX Eagle (SRAM) serta 105 dan Deore (Shimano) adalah tingkatan yang paling sering tersedia di stok kita — untuk pelanggan harian/commuting, tingkatan menengah ini biasanya sudah lebih dari cukup." },
    ],
  },
  {
    id: "ukuran-helm",
    category: "Ukuran Aksesori & Apparel",
    title: "Panduan Ukuran Helm",
    summary: "Ukur lingkar kepala (cm) untuk menentukan ukuran helm S/M/L/XL.",
    tags: ["helm", "helmet", "lingkar kepala"],
    blocks: [
      {
        type: "table",
        headers: ["Lingkar Kepala", "Ukuran Helm"],
        rows: [
          ["51 - 55 cm", "S"],
          ["55 - 59 cm", "M"],
          ["59 - 63 cm", "L"],
          ["63 - 67 cm", "XL"],
        ],
      },
      {
        type: "bullets",
        items: [
          "Ukur lingkar kepala di titik terlebar — sekitar 2 cm di atas alis.",
          "Helm yang pas: tidak goyang saat kepala digelengkan, tapi tidak menekan atau terasa sakit.",
        ],
      },
    ],
  },
  {
    id: "ukuran-jersey-apparel",
    category: "Ukuran Aksesori & Apparel",
    title: "Panduan Ukuran Jersey & Apparel",
    summary: "Konversi lingkar dada dan tinggi badan ke ukuran S - XXL untuk jersey dan pakaian bersepeda.",
    tags: ["jersey", "apparel", "baju", "shirt", "ukuran dada"],
    blocks: [
      {
        type: "table",
        headers: ["Ukuran", "Lingkar Dada", "Tinggi Badan"],
        rows: [
          ["S", "86 - 91 cm", "160 - 170 cm"],
          ["M", "91 - 96 cm", "168 - 175 cm"],
          ["L", "96 - 101 cm", "173 - 180 cm"],
          ["XL", "101 - 106 cm", "178 - 185 cm"],
          ["XXL", "106 - 111 cm", "183 - 190 cm"],
        ],
      },
      { type: "paragraph", text: "Jersey cycling biasanya dipotong lebih ketat (aerodinamis) dibanding kaos biasa — kalau pelanggan ragu antara dua ukuran, sarankan naik satu tingkat." },
    ],
  },
  {
    id: "ukuran-sepatu-sepeda",
    category: "Ukuran Aksesori & Apparel",
    title: "Panduan Ukuran Sepatu Sepeda",
    summary: "Tabel konversi EU / US / UK untuk sepatu cleat.",
    tags: ["sepatu", "shoes", "cleat", "footwear"],
    blocks: [
      {
        type: "table",
        headers: ["EU", "US (Pria)", "UK"],
        rows: [
          ["39", "6.5", "6"],
          ["40", "7.5", "7"],
          ["41", "8", "7.5"],
          ["42", "8.5", "8"],
          ["43", "9.5", "9"],
          ["44", "10", "9.5"],
          ["45", "11", "10.5"],
          ["46", "12", "11"],
        ],
      },
      { type: "paragraph", text: "Sepatu cleat biasanya pas rapat (snug) dibanding sepatu biasa — ini normal dan disengaja, bukan tanda salah ukuran, selama jari kaki tidak tertekuk." },
    ],
  },
  {
    id: "promo-diskon-aktif",
    category: "Promo",
    title: "Promo & Diskon Aktif",
    summary: "[Template — isi dengan promo yang sedang berjalan]",
    tags: ["promo", "diskon", "sale"],
    blocks: [
      { type: "heading", text: "Promo Saat Ini" },
      { type: "paragraph", text: "[Ganti bagian ini dengan promo yang sedang berjalan: nama promo, mekanisme diskon, kategori/brand yang termasuk.]" },
      {
        type: "bullets",
        items: [
          "[Nama promo] — [besaran diskon/benefit]",
          "Berlaku: [tanggal mulai] - [tanggal berakhir]",
          "Syarat & ketentuan: [isi syarat]",
        ],
      },
      { type: "paragraph", text: "Update artikel ini di web/lib/guideArticles.ts (id: \"promo-diskon-aktif\") setiap kali promo berubah." },
    ],
  },
  {
    id: "kebijakan-garansi-servis",
    category: "Kebijakan",
    title: "Kebijakan Garansi & Servis",
    summary: "[Template — isi dengan kebijakan garansi dan servis toko]",
    tags: ["garansi", "warranty", "servis", "kebijakan"],
    blocks: [
      { type: "heading", text: "Garansi" },
      {
        type: "table",
        headers: ["Kategori", "Masa Garansi", "Cakupan"],
        rows: [
          ["Frame", "[isi]", "[isi]"],
          ["Groupset", "[isi]", "[isi]"],
          ["Komponen lain", "[isi]", "[isi]"],
        ],
      },
      { type: "heading", text: "Servis" },
      { type: "paragraph", text: "[Ganti bagian ini dengan kebijakan servis toko: apakah ada servis gratis pertama, jadwal servis berkala, biaya sparepart, dsb.]" },
      { type: "paragraph", text: "Update artikel ini di web/lib/guideArticles.ts (id: \"kebijakan-garansi-servis\") setiap kali kebijakan berubah." },
    ],
  },
  {
    id: "cara-menggunakan-roda-stock",
    category: "Panduan Aplikasi",
    title: "Cara Menggunakan Roda Stock",
    summary: "Ringkasan singkat semua fitur aplikasi: cari, scan, suara, SO Week, bandingkan, dan mode ceklis.",
    tags: ["cara pakai", "tutorial", "fitur", "aplikasi"],
    blocks: [
      { type: "heading", text: "Cari Produk" },
      { type: "bullets", items: ["Ketik nama model, kode artikel, atau brand di kotak pencarian.", "Hasil muncul otomatis saat mengetik — tidak perlu menekan Enter."] },
      { type: "heading", text: "Scan Barcode" },
      { type: "bullets", items: ["Tekan ikon barcode di sebelah kotak pencarian.", "Arahkan kamera ke barcode/kode artikel pada produk atau rak."] },
      { type: "heading", text: "Cari dengan Suara" },
      { type: "bullets", items: ["Tekan ikon mikrofon, lalu ucapkan nama produk atau brand.", "Teks akan muncul otomatis di kotak pencarian sambil kamu bicara."] },
      { type: "heading", text: "Favorit" },
      { type: "bullets", items: ["Tekan ikon bintang pada hasil pencarian untuk pin produk yang sering dicari.", "Produk favorit muncul di beranda saat kotak pencarian kosong."] },
      { type: "heading", text: "Bandingkan Produk" },
      { type: "bullets", items: ["Tekan ikon panah-dua-arah pada hingga 3 produk untuk membandingkan.", "Tekan \"Bandingkan\" di bar bawah layar untuk melihat perbandingan spesifikasi berdampingan."] },
      { type: "heading", text: "Mode Ceklis (Salin Banyak Produk)" },
      { type: "bullets", items: ["Tekan ikon ceklis di kotak pencarian untuk masuk mode pilih banyak.", "Pilih beberapa produk, lalu tekan \"Salin WA\" untuk menyalin info semuanya sekaligus."] },
      { type: "heading", text: "SO Week (Stock Opname)" },
      { type: "bullets", items: ["Buka lewat tombol \"SO Week\" di beranda.", "Scan atau cari produk, lalu masukkan jumlah stok fisik yang dihitung."] },
    ],
  },
];
