export interface FaqItem {
  question: string;
  answer: string;
}

export function buildFaqJsonLd(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function serializeFaqJsonLd(items: readonly FaqItem[]): string {
  return JSON.stringify(buildFaqJsonLd(items)).replace(/</g, "\\u003c");
}
