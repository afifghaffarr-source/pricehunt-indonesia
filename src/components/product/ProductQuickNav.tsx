/**
 * Quick anchor navigation for the product page.
 * Lets users jump to key sections without scrolling through everything.
 */
const NAV_ITEMS = [
  { href: "#decision", label: "Kapan Beli?" },
  { href: "#prices", label: "Bandingkan Harga" },
  { href: "#total-cost", label: "Hitung Total Bayar" },
  { href: "#alerts", label: "Pantau Harga" },
  { href: "#reviews", label: "Ulasan Pembeli" },
] as const;

export function ProductQuickNav() {
  return (
    <nav
      className="mb-8 flex gap-2 overflow-x-auto rounded-2xl border bg-gradient-to-r from-background to-muted/20 p-2 text-sm shadow-sm"
      aria-label="Navigasi cepat"
    >
      {NAV_ITEMS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="shrink-0 rounded-full px-4 py-2 font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
