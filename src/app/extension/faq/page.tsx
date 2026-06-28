import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import {
  HelpCircle,
  Shield,
  Wallet,
  Bell,
  Settings,
  AlertTriangle,
  Mail,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  BAHASA_FAQ,
  ENGLISH_FAQ,
  BAHASA_GROUP_ORDER,
  ENGLISH_GROUP_ORDER,
  TOTAL_PERTANYAAN,
  type FAQEntry,
} from "@/app/extension/faq/data";
import { BAHASA_HTML, ENGLISH_HTML } from "@/app/extension/faq/html";
import { FaqKeyboardNav } from "@/components/faq-keyboard-nav";
import { CopySearchLinkButton } from "@/app/extension/faq/copy-search-link-button";

export const metadata: Metadata = {
  title: "FAQ — BijakBeli Chrome Extension",
  description:
    "Pertanyaan yang sering ditanyakan tentang BijakBeli Chrome Extension: setup, keamanan, watchlist, marketplace yang didukung, dan uninstall.",
  alternates: { canonical: "/extension/faq" },
};

// Server-side filter via `?q=` requires dynamic rendering — without this,
// Next.js prerenders the page once with empty searchParams and serves the
// cached HTML for every query.
export const dynamic = "force-dynamic";

// Helpers — server-side text extraction from JSX, plus filter logic
function txt(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) return node.map(txt).join(" ");
  if (node && typeof node === "object" && "props" in (node as Record<string, unknown>)) {
    return txt((node as { props: { children?: unknown } }).props.children);
  }
  return "";
}

function matches(item: FAQEntry, html: string, query: string, tokens: string[]): boolean {
  if (!query) return true;
  const haystack = (item.q + " " + item.a + " " + html).toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

function groupEntries(
  entries: FAQEntry[],
  htmlMap: Record<string, unknown>,
  query: string,
  tokens: string[],
): { title: string; entries: FAQEntry[] }[] {
  const buckets = new Map<string, FAQEntry[]>();
  for (const e of entries) {
    const htmlText = txt(htmlMap[e.id] ?? e.a);
    if (!matches(e, htmlText, query, tokens)) continue;
    if (!buckets.has(e.group)) buckets.set(e.group, []);
    buckets.get(e.group)!.push(e);
  }
  return Array.from(buckets.entries()).map(([title, items]) => ({
    title,
    entries: items,
  }));
}

function buildFaqJsonLd(
  locale: "id" | "en",
  entries: FAQEntry[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "inLanguage": locale,
    "url": `https://www.bijakbeli.web.id/extension/faq${locale === "en" ? "#english" : ""}`,
    "name":
      locale === "id"
        ? "FAQ BijakBeli Chrome Extension"
        : "BijakBeli Chrome Extension FAQ",
    "description":
      locale === "id"
        ? "Pertanyaan yang sering ditanyakan tentang extension BijakBeli untuk marketplace Indonesia."
        : "Frequently asked questions about the BijakBeli Chrome extension for Indonesian marketplaces.",
    "mainEntity": entries.map((e) => ({
      "@type": "Question",
      "name": e.q,
      "url": `https://www.bijakbeli.web.id/extension/faq#${e.id}`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": e.a,
        "url": `https://www.bijakbeli.web.id/extension/faq#${e.id}`,
        "speakable": {
          "@type": "SpeakableSpecification",
          "cssSelector": [`#${e.id} summary`, `#${e.id}`],
          "xpath": [`//details[@id="${e.id}"]/summary/text()`],
        },
      },
    })),
  };
}

interface FAQPageProps {
  searchParams?: Promise<{ q?: string | string[] }>;
}

export default async function FAQPage({ searchParams }: FAQPageProps) {
  const sp = (await (searchParams ?? Promise.resolve({}))) as {
    q?: string | string[];
  };
  const rawQ = Array.isArray(sp?.q) ? sp.q[0] : sp?.q;
  const query = (rawQ ?? "").toString().trim().toLowerCase();
  const hasQuery = query.length >= 2;
  const tokens = hasQuery ? query.split(/\s+/).filter(Boolean) : [];

  const filteredBahasa = groupEntries(BAHASA_FAQ, BAHASA_HTML, query, tokens).sort(
    (a, b) =>
      BAHASA_GROUP_ORDER.indexOf(a.title as typeof BAHASA_GROUP_ORDER[number]) -
      BAHASA_GROUP_ORDER.indexOf(b.title as typeof BAHASA_GROUP_ORDER[number]),
  );
  const filteredEn = groupEntries(ENGLISH_FAQ, ENGLISH_HTML, query, tokens).sort(
    (a, b) =>
      ENGLISH_GROUP_ORDER.indexOf(a.title as typeof ENGLISH_GROUP_ORDER[number]) -
      ENGLISH_GROUP_ORDER.indexOf(b.title as typeof ENGLISH_GROUP_ORDER[number]),
  );

  const matchCount =
    filteredBahasa.reduce((s, g) => s + g.entries.length, 0) +
    filteredEn.reduce((s, g) => s + g.entries.length, 0);

  // JSON-LD schemas — Bahasa always emitted; EN only when Bahasa has matches
  // OR when filter is wide enough to surface EN-only items.
  const jsonLd = hasQuery
    ? [
        buildFaqJsonLd("id", filteredBahasa.flatMap((g) => g.entries)),
        buildFaqJsonLd("en", filteredEn.flatMap((g) => g.entries)),
      ].filter((s) => (s.mainEntity as unknown[]).length > 0)
    : [buildFaqJsonLd("id", BAHASA_FAQ)];

  return (
    <>
      <FaqKeyboardNav />
      {/* JSON-LD structured data — for Google rich snippets + AI ingestion
          (ChatGPT/Perplexity/Gemini will pick this up directly). */}
      {jsonLd.map((schema, i) => (
        <script
          key={`faq-schema-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <a href="#faq-questions" className="skip-to-content">
        Lewati ke daftar pertanyaan
      </a>

      <main className="mx-auto max-w-3xl px-4 py-12 font-sans sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <HelpCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Pertanyaan yang Sering Ditanyakan
          </h1>
          <p className="mx-auto max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
            FAQ tentang BijakBeli Chrome Extension — setup, keamanan,
            marketplace, watchlist, dan uninstall.
          </p>
        </div>

        {/* Search bar — server-rendered form, posts via GET with ?q= hook.
            No client JS / hydration needed. data-* hooks for analytics. */}
        <form
          method="GET"
          action="/extension/faq"
          className="mx-auto mb-4 max-w-xl"
          role="search"
          data-faq-search-form
        >
          <label htmlFor="faq-search" className="sr-only">
            Cari FAQ
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <input
              id="faq-search"
              data-testid="faq-search"
              data-faq-search-input="1"
              data-faq-query={query}
              type="search"
              name="q"
              defaultValue={query}
              placeholder={`Cari di antara ${TOTAL_PERTANYAAN} pertanyaan…`}
              autoComplete="off"
              className="faq-focus-ring w-full rounded-md border border-zinc-300 bg-white py-2 pr-10 pl-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            {hasQuery ? (
              <Link
                href="/extension/faq"
                aria-label="Reset pencarian"
                className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </form>

        {/* Telemetry-style match counter — server-rendered count of ?q= hits.
            Useful for power users to validate keyword presence at a glance.
            data-faq-count exposes the result count for analytics.
            data-faq-hint="0" when the active search yields zero matches so
            analytics can measure dead-end rate. */}
        <div
          className="mx-auto mb-2 max-w-xl text-center text-xs text-zinc-500 dark:text-zinc-400"
          data-testid="faq-match-count"
          data-faq-count={matchCount}
          data-faq-hint={hasQuery && matchCount === 0 ? "0" : "1"}
          aria-live="polite"
        >
          {hasQuery ? (
            matchCount === 0 ? (
              <>Tidak ada pertanyaan cocok untuk &quot;{query}&quot;.</>
            ) : (
              <>
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {matchCount}
                </strong>{" "}
                dari {TOTAL_PERTANYAAN} pertanyaan cocok untuk &quot;
                {query}&quot;.
              </>
            )
          ) : (
            <>
              {TOTAL_PERTANYAAN} pertanyaan · tekan{" "}
              <kbd className="rounded border border-zinc-300 px-1 text-[10px] dark:border-zinc-700">
                /
              </kbd>{" "}
              untuk fokus pencarian ·{" "}
              <kbd className="rounded border border-zinc-300 px-1 text-[10px] dark:border-zinc-700">
                ↑
              </kbd>
              <kbd className="ml-0.5 rounded border border-zinc-300 px-1 text-[10px] dark:border-zinc-700">
                ↓
              </kbd>{" "}
              untuk navigasi pertanyaan
            </>
          )}
        </div>

        {/* Share permalink — visible only when an active query narrows the
            page so the launcher can give someone a direct search URL. Pure
            client component (~30 LOC) that wraps navigator.clipboard. */}
        {hasQuery ? (
          <p className="mx-auto mb-8 max-w-xl text-center">
            <CopySearchLinkButton />
          </p>
        ) : (
          <p className="mx-auto mb-8 max-w-xl" />
        )}

        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          <Badge variant="secondary">
            <Shield className="mr-1 h-3 w-3" /> Open-source
          </Badge>
          <Badge variant="secondary">
            <Wallet className="mr-1 h-3 w-3" /> 100% gratis
          </Badge>
          <Badge variant="secondary">
            <Bell className="mr-1 h-3 w-3" /> Notifikasi opt-in
          </Badge>
        </div>

        {/* Bahasa sections */}
        <div id="faq-questions">
        {filteredBahasa.length === 0 && hasQuery ? (
          <div className="mb-10 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            Coba kata kunci lain (mis. &quot;INGESTION_SECRET&quot;,
            &quot;Tokopedia&quot;, &quot;notifikasi&quot;).<br />
            Atau{" "}
            <Link
              href="/extension/faq"
              className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
            >
              reset pencarian
            </Link>
            .
          </div>
        ) : null}
        {filteredBahasa.map(({ title, entries }) => {
          const Icon =
            title === "Privacy & Keamanan"
              ? Shield
              : title === "Marketplace Support"
                ? Wallet
                : title === "Notifikasi & Watchlist"
                  ? Bell
                  : Settings;
          return (
            <section
              key={title}
              data-faq-section={title}
              className="mb-10"
            >
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
                <Icon className="h-6 w-6 text-emerald-600" />
                {title}
              </h2>
              <div className="space-y-2">
                {entries.map(({ q, a, id }) => (
                  <details
                    key={id}
                    id={id}
                    data-faq-id={id}
                    className="faq-smooth-details group overflow-hidden rounded-lg border border-zinc-200 bg-white transition-colors open:bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:open:bg-zinc-900/40 dark:hover:border-zinc-700"
                  >
                    <summary className="faq-focus-ring flex cursor-pointer list-none items-center justify-between p-4 font-medium text-zinc-900 select-none dark:text-zinc-100">
                      <span className="pr-4">{q}</span>
                      <span
                        aria-hidden="true"
                        className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-600 transition-transform group-open:rotate-45 dark:text-emerald-400"
                      >
                        +
                      </span>
                    </summary>
                    <div className="border-t border-zinc-200 px-4 py-3 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                      {BAHASA_HTML[id] ?? a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          );
        })}

        {/* Troubleshooting quick-ref */}
        <section className="mb-10 rounded-lg border border-amber-500/30 bg-amber-500/5 p-6">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-200">
              Troubleshooting Cepat
            </h2>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Extension tidak scrape halaman marketplace:</strong> Coba
              hard-refresh (Ctrl/Cmd + Shift + R). Cek Console di popup
              (klik kanan icon extension di toolbar → Inspect popup → Console
              tab). Kalau ada error merah, copy-paste ke email ke kami.
            </div>
            <div>
              <strong>Submission queue pending terlalu lama:</strong> Service
              worker kami cek setiap 5 menit. Kalau lebih dari 30 menit,
              kemungkinan besar masalah jaringan atau server maintenance
              (cek <Link href="/" className="underline">bijakbeli.web.id</Link>{" "}
              untuk status).
            </div>
            <div>
              <strong>INGESTION_SECRET tidak diterima:</strong> Cek format:
              harus alphanumeric string panjang, case-sensitive. Ada karakter
              spasi atau baris baru yang ikut ke-paste? Hapus lalu coba lagi.
            </div>
          </div>
        </section>
        </div>

        {/* Contact + helpful links */}
        <section className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Mail className="h-5 w-5 text-blue-600" />
            Masih belum ketemu jawabannya?
          </h2>
          <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
            Tim kami merespons email dalam 72 jam (rata-rata 18 jam). Sertakan:
            Chrome version, URL produk yang bermasalah, screenshot Console output.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:privacy@bijakbeli.id"
              className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              📧 Email Support
            </a>
            <Link
              href="/extension/privacy-policy"
              className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              📋 Privacy Policy
            </Link>
            <a
              href="https://github.com/afifghaffarr-source/pricehunt-indonesia/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              🐛 GitHub Issues
            </a>
            <Link
              href="/extension/faq.json"
              className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              data-faq-json-link
            >
              📥 FAQ JSON (machine-readable)
            </Link>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Last updated: 28 Juni 2026 ·{" "}
          <Link
            href="/extension"
            className="underline underline-offset-2 hover:text-emerald-600"
          >
            Kembali ke extension hub
          </Link>
        </p>

        {/* English translation section */}
        <section
          id="english"
          className="mt-12 border-t border-zinc-200 pt-10 dark:border-zinc-800"
        >
          <h2 className="mb-2 flex items-center gap-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            <span className="text-xl">🌐</span>
            English Version
          </h2>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            Same questions, concise answers for non-Bahasa speakers and
            Chrome Web Store reviewers.
          </p>

          {filteredEn.length === 0 && hasQuery ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              No English matches for that query.
            </div>
          ) : null}
          {filteredEn.map(({ title, entries }) => {
            const Icon =
              title === "Privacy & Security"
                ? Shield
                : title === "Marketplace Support"
                  ? Wallet
                  : title === "Notifications & Watchlist"
                    ? Bell
                    : HelpCircle;
            return (
              <div key={title} className="mb-6">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                  <Icon className="h-5 w-5 text-emerald-600" />
                  {title}
                </h3>
                <div className="space-y-2">
                  {entries.map(({ q, a, id }) => (
                    <details
                      key={id}
                      id={id}
                      className="rounded-lg border border-zinc-200 bg-white transition-colors open:bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:open:bg-zinc-900/40 dark:hover:border-zinc-700"
                    >
                      <summary className="flex cursor-pointer list-none items-center p-3 text-sm font-medium text-zinc-800 select-none dark:text-zinc-200">
                        <span className="pr-3">{q}</span>
                      </summary>
                      <div className="border-t border-zinc-200 px-3 py-2 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                        {ENGLISH_HTML[id] ?? a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </>
  );
}
