import { describe, it, expect } from "vitest";
import { variantNormalize } from "@/lib/ingestion/variant-normalizer";

describe("variantNormalize", () => {
  it("extracts storage and color", () => {
    expect(variantNormalize("128GB Hitam")).toEqual({
      storage: "128GB",
      ram: null,
      color: "hitam",
      model: null,
      connectivity: null,
    });
  });

  it("extracts RAM + Indonesian color", () => {
    expect(variantNormalize("8GB RAM Putih")).toEqual({
      storage: "8GB",
      ram: "8GB",
      color: "putih",
      model: null,
      connectivity: null,
    });
  });

  // NB: "ultramarine" is NOT in the closed color list (limited to
  // hitam/putih/merah/biru/hijau/ungu/emas/perak + English set). Expect None for color.
  it("extracts model and connectivity but skips unrecognized colors", () => {
    expect(variantNormalize("iPhone 16 Pro Max 256GB Ultramarine 5G")).toEqual({
      storage: "256GB",
      ram: null,
      color: null,   // ultramarine not in list
      model: "max",  // LAST match in 'Pro Max' (semantic: tier wins)
      connectivity: "5g",
    });
  });

  it("returns all-null on empty string", () => {
    expect(variantNormalize("")).toEqual({
      storage: null, ram: null, color: null, model: null, connectivity: null,
    });
  });

  it("returns all-null on null", () => {
    expect(variantNormalize(null)).toEqual({
      storage: null, ram: null, color: null, model: null, connectivity: null,
    });
  });

  it("returns all-null on undefined", () => {
    expect(variantNormalize(undefined)).toEqual({
      storage: null, ram: null, color: null, model: null, connectivity: null,
    });
  });

  it("handles 1TB", () => {
    expect(variantNormalize("1TB Silver")).toMatchObject({ storage: "1TB", color: "silver" });
  });

  it("handles Dual-SIM", () => {
    expect(variantNormalize("Dual-SIM")).toMatchObject({ connectivity: "dualsim" });
  });

  it("handles NFC", () => {
    expect(variantNormalize("with NFC")).toMatchObject({ connectivity: "nfc" });
  });

  it("English color 'Midnight Black'", () => {
    expect(variantNormalize("256GB - Midnight Black")).toMatchObject({ color: "black" });
  });

  it("returns all-null on unrecognized string", () => {
    expect(variantNormalize("lorem ipsum dolor sit amet")).toEqual({
      storage: null, ram: null, color: null, model: null, connectivity: null,
    });
  });
});
