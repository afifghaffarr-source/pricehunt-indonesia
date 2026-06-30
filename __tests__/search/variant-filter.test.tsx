import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  VariantFilterChips,
  type VariantFilterState,
  type VariantValues,
} from "@/components/search/VariantFilterChips";

// Mock next/link if needed
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const values: VariantValues = {
  storage: ["128GB", "256GB", "512GB"],
  color: ["Midnight", "Starlight"],
  connectivity: ["5G"],
};

const empty: VariantFilterState = { storage: [], color: [], connectivity: [] };

describe("VariantFilterChips", () => {
  it("renders one chip per value across all axes", () => {
    render(
      <VariantFilterChips
        values={values}
        selected={empty}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByTestId("chip-storage-128GB")).toBeInTheDocument();
    expect(screen.getByTestId("chip-storage-256GB")).toBeInTheDocument();
    expect(screen.getByTestId("chip-storage-512GB")).toBeInTheDocument();
    expect(screen.getByTestId("chip-color-Midnight")).toBeInTheDocument();
    expect(screen.getByTestId("chip-color-Starlight")).toBeInTheDocument();
    expect(screen.getByTestId("chip-connectivity-5G")).toBeInTheDocument();
  });

  it("does not render when all axes have no values", () => {
    const noValues: VariantValues = { storage: [], color: [], connectivity: [] };
    const { container } = render(
      <VariantFilterChips
        values={noValues}
        selected={empty}
        onChange={() => undefined}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("clicking a chip toggles selection (OR within axis)", () => {
    const onChange = vi.fn();
    render(
      <VariantFilterChips
        values={values}
        selected={empty}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId("chip-storage-256GB"));
    expect(onChange).toHaveBeenCalledWith({
      storage: ["256GB"],
      color: [],
      connectivity: [],
    });
  });

  it("clicking a selected chip deselects it", () => {
    const onChange = vi.fn();
    render(
      <VariantFilterChips
        values={values}
        selected={{ storage: ["256GB"], color: [], connectivity: [] }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId("chip-storage-256GB"));
    expect(onChange).toHaveBeenCalledWith({
      storage: [],
      color: [],
      connectivity: [],
    });
  });

  it("multi-value within same axis (OR semantics)", () => {
    const onChange = vi.fn();
    render(
      <VariantFilterChips
        values={values}
        selected={{ storage: ["256GB"], color: [], connectivity: [] }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId("chip-storage-512GB"));
    expect(onChange).toHaveBeenCalledWith({
      storage: ["256GB", "512GB"],
      color: [],
      connectivity: [],
    });
  });

  it("multi-axis (AND semantics) — preserves other axes", () => {
    const onChange = vi.fn();
    render(
      <VariantFilterChips
        values={values}
        selected={{ storage: ["256GB"], color: ["Midnight"], connectivity: [] }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId("chip-connectivity-5G"));
    expect(onChange).toHaveBeenCalledWith({
      storage: ["256GB"],
      color: ["Midnight"],
      connectivity: ["5G"],
    });
  });

  it("reset button clears all axes", () => {
    const onChange = vi.fn();
    render(
      <VariantFilterChips
        values={values}
        selected={{ storage: ["256GB", "512GB"], color: ["Midnight"], connectivity: ["5G"] }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId("variant-filter-reset"));
    expect(onChange).toHaveBeenCalledWith(empty);
  });

  it("reset button is hidden when no selection", () => {
    render(
      <VariantFilterChips
        values={values}
        selected={empty}
        onChange={() => undefined}
      />,
    );
    expect(screen.queryByTestId("variant-filter-reset")).toBeNull();
  });

  it("marks selected chips with aria-pressed=true", () => {
    render(
      <VariantFilterChips
        values={values}
        selected={{ storage: ["256GB"], color: [], connectivity: [] }}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByTestId("chip-storage-256GB")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("chip-storage-128GB")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
