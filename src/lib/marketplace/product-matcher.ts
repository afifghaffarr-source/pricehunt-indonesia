import type { BijakBeliDiscoveredProduct } from "@/lib/vexo/types";
import { normalizeTitle } from "@/lib/vexo/normalizers";

interface MatchGroup {
  canonicalTitle: string;
  products: BijakBeliDiscoveredProduct[];
  avgConfidence: number;
}

function similarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export function matchProducts(products: BijakBeliDiscoveredProduct[]): MatchGroup[] {
  const groups: MatchGroup[] = [];
  const used = new Set<string>();

  for (const product of products) {
    if (used.has(product.id)) continue;

    const group: MatchGroup = {
      canonicalTitle: product.normalizedTitle,
      products: [product],
      avgConfidence: product.confidenceScore,
    };
    used.add(product.id);

    for (const other of products) {
      if (used.has(other.id)) continue;
      if (product.marketplace === other.marketplace) continue;

      const sim = similarity(product.normalizedTitle, other.normalizedTitle);
      if (sim >= 0.6) {
        group.products.push(other);
        used.add(other.id);
      }
    }

    group.avgConfidence =
      group.products.reduce((sum, p) => sum + p.confidenceScore, 0) / group.products.length;

    groups.push(group);
  }

  return groups.sort((a, b) => b.avgConfidence - a.avgConfidence);
}

export function findBestMatch(
  productName: string,
  products: BijakBeliDiscoveredProduct[]
): BijakBeliDiscoveredProduct | null {
  const normalizedName = normalizeTitle(productName);

  let best: { product: BijakBeliDiscoveredProduct; score: number } | null = null;

  for (const product of products) {
    const sim = similarity(normalizedName, product.normalizedTitle);
    const score = sim * 0.6 + product.confidenceScore * 0.4;

    if (!best || score > best.score) {
      best = { product, score };
    }
  }

  return best && best.score > 0.4 ? best.product : null;
}
