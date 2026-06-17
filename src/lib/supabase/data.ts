/**
 * Barrel file for backward compatibility.
 *
 * Original src/lib/supabase/data.ts (595 lines) was split into:
 * - ./transforms: pure data transformations (no DB)
 * - ./products:   product + offer queries
 * - ./prices:     price + history + stats queries
 * - ./user-data:  wishlist + alert queries
 *
 * All existing imports from "@/lib/supabase/data" continue to work
 * unchanged via these re-exports.
 */
export * from "./transforms";
export * from "./products";
export * from "./prices";
export * from "./user-data";
