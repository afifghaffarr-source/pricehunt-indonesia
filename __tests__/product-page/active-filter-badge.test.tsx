import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/lib/types";
import type { VariantFilterState } from "@/components/search/VariantFilterChips";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const product: Product = {
  id: "p-1",
  slug: "apple-iphone-16",
  name: "Apple iPhone 16",
  category: "Smartphone",
  description: "",
  imageUrl: "https://placehold.co/400x400",
  prices: [],
  priceHistory: [],
  lowestPrice: 10_000_000,
  highestPrice: 15_000_000,
  averagePrice: 12_500_000,
  dealScore: 80,
  aiVerdict: "",
  specs: {},
};

const emptyFilter: VariantFilterState = {
  storage: [],
  color: [],
  connectivity: [],
};

const fullFilter: VariantFilterState = {
  storage: ["256GB"],
  color: ["Midnight"],
  connectivity: [],
};

describe("ProductCard — active variant filter badge", () => {
  it("does not render the badge when no filter is passed", () => {
    render(<ProductCard product={product} />);
    expect(screen.queryByTestId("active-filter-badge")).toBeNull();
  });

  it("does not render the badge when filter is empty", () => {
    render(<ProductCard product={product} activeVariantFilter={emptyFilter} />);
    expect(screen.queryByTestId("active-filter-badge")).toBeNull();
  });

  it("renders the badge with single storage value", () => {
    render(
      <ProductCard
        product={product}
        activeVariantFilter={{ storage: ["256GB"], color: [], connectivity: [] }}
      />,
    );
    const badge = screen.getByTestId("active-filter-badge");
    expect(badge.textContent).toContain("256GB");
  });

  it("renders the badge with multiple values joined by ·", () => {
    render(<ProductCard product={product} activeVariantFilter={fullFilter} />);
    const badge = screen.getByTestId("active-filter-badge");
    expect(badge.textContent).toContain("256GB");
    expect(badge.textContent).toContain("Midnight");
    expect(badge.textContent).toContain("·");
  });

  it("renders the badge with connectivity value", () => {
    render(
      <ProductCard
        product={product}
        activeVariantFilter={{
          storage: [],
          color: [],
          connectivity: ["5G"],
        }}
      />,
    );
    const badge = screen.getByTestId("active-filter-badge");
    expect(badge.textContent).toContain("5G");
  });

  it("renders the badge with multi-value per axis (OR semantics)", () => {
    render(
      <ProductCard
        product={product}
        activeVariantFilter={{
          storage: ["128GB", "256GB"],
          color: [],
          connectivity: [],
        }}
      />,
    );
    const badge = screen.getByTestId("active-filter-badge");
    expect(badge.textContent).toContain("128GB");
    expect(badge.textContent).toContain("256GB");
  });
});
