import { notFound } from "next/navigation";
import { guideArticles } from "@/lib/guideArticles";
import { GuideBlockRenderer } from "@/components/GuideBlockRenderer";
import { BackButton } from "@/components/BackButton";
import { PromoProductsViewer } from "@/components/PromoProductsViewer";

export function generateStaticParams() {
  return guideArticles.map((a) => ({ id: a.id }));
}

export default async function GuideArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = guideArticles.find((a) => a.id === id);
  if (!article) notFound();

  const isPromoArticle = article.category === "Promo" || article.id === "promo-diskon-aktif";

  return (
    <div className="min-h-screen pb-16">
      <div className="sticky top-0 z-10 flex items-center border-b border-black/[0.08] bg-[#f6f6f8]/80 px-5 py-3 backdrop-blur-xl">
        <BackButton />
      </div>

      <div className="mx-auto max-w-[800px] px-4 pt-5 sm:px-6">
        <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-xs font-semibold text-gray-500">
          {article.category}
        </span>
        <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-gray-900">{article.title}</h1>
        <p className="mt-1.5 text-sm text-gray-500">{article.summary}</p>

        <div className="mt-6">
          <GuideBlockRenderer blocks={article.blocks} />
        </div>

        {isPromoArticle && (
          <div className="mt-8">
            <PromoProductsViewer />
          </div>
        )}
      </div>
    </div>
  );
}

