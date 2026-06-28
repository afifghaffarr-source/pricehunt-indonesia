import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Shield, Lock, Eye, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - BijakBeli.app Extension",
  description: "How BijakBeli Chrome Extension handles your data — privacy-first, transparent, opt-in.",
  robots: "index, follow",
};

/**
 * Privacy policy for BijakBeli Chrome Extension.
 * Last updated: 2026-06-28
 *
 * Required by Chrome Web Store for all extensions that handle user data
 * (CWS Program Policies § Privacy).
 *
 * Plain language explanations follow each topic — also accessible to
 * non-technical readers.
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          BijakBeli.app Chrome Extension
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: June 28, 2026
        </p>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
        <section>
          <p className="text-lg">
            BijakBeli.app extension is built with <strong>privacy by default</strong>.
            This page explains exactly what data we collect, how we use it,
            and what control you have. We do not sell your data.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <Eye className="h-6 w-6" />
            Data yang Kami Kumpulkan
          </h2>

          <p className="text-muted-foreground">
            When the extension detects you viewing a product page on supported
            Indonesian marketplaces, it extracts:
          </p>

          <ul>
            <li>Product title, price, seller name, rating, sold count</li>
            <li>Product image URL (for thumbnail only — we do not store images server-side)</li>
            <li>The product URL (for deduplication and price history tracking)</li>
            <li>Marketplace identifier (Shopee, Tokopedia, etc.)</li>
          </ul>

          <p className="text-muted-foreground">
            <strong>Data yang TIDAK kami kumpulkan:</strong>
          </p>

          <ul>
            <li>❌ Personal information (name, email, phone, address)</li>
            <li>❌ Browsing history outside of product pages</li>
            <li>❌ Credentials, passwords, or payment details</li>
            <li>❌ Authentication cookies or session tokens</li>
            <li>❌ Any data from non-marketplace websites</li>
          </ul>
        </section>

        <Separator />

        <section>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <Lock className="h-6 w-6" />
            Bagaimana Data Digunakan
          </h2>

          <p className="text-muted-foreground">
            Submitted product data joins a community-priced database used to:
          </p>

          <ol>
            <li>
              Build price history across marketplaces (e.g.,
              &quot;iPhone 15 Pro — average price over 30 days&quot;)
            </li>
            <li>
              Show price comparisons:
              &quot;Shopee Rp15.000.000 vs Tokopedia Rp14.500.000&quot;
            </li>
            <li>
              Detect price drops and notify you (planned feature)
            </li>
          </ol>

          <p className="text-muted-foreground">
            We do not personalize ads, sell data to third parties, or share
            individual browsing behavior with anyone.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="text-2xl font-semibold">Penyimpanan Data</h2>

          <Card>
            <CardHeader>
              <CardTitle>Local (your device)</CardTitle>
              <CardDescription>
                Stored in Chrome&apos;s chrome.storage.local — never leaves your device unless
                explicitly submitted via the extension
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul>
                <li>Submission history (last 200 items)</li>
                <li>Pending retry queue (if submission fails)</li>
                <li>Stats counters (totals, marketplace breakdown)</li>
                <li>Your INGESTION_SECRET (write key — keep it private)</li>
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">
                Clearing data: click &quot;Reset / Ubah Pengaturan&quot; in the popup.
              </p>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Server (BijakBeli database)</CardTitle>
              <CardDescription>
                Submitted product snapshots — aggregated anonymously with the
                community database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Server-stored data is anonymized: we never link submissions to
                individual users. Each row records marketplace, URL, price,
                and timestamp only.
              </p>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section>
          <h2 className="text-2xl font-semibold">Permissions yang Diminta</h2>

          <p className="text-muted-foreground">
            Why each Chrome permission is needed (Chrome Web Store requires
            single-purpose permissions):
          </p>

          <Card>
            <CardContent className="pt-6">
              <dl className="space-y-3">
                <div>
                  <dt className="font-semibold">activeTab</dt>
                  <dd className="text-sm text-muted-foreground">
                    Access current tab only when user clicks &quot;Scrape this page&quot;
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">storage</dt>
                  <dd className="text-sm text-muted-foreground">
                    Save history, queue, and stats on your device
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">tabs</dt>
                  <dd className="text-sm text-muted-foreground">
                    Detect URL changes when navigating between products
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">scripting</dt>
                  <dd className="text-sm text-muted-foreground">
                    Inject marketplace-scraper.js to read product elements
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">alarms</dt>
                  <dd className="text-sm text-muted-foreground">
                    Schedule periodic flush of failed submissions every 5 minutes
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <Trash2 className="h-6 w-6" />
            Kontrol Anda
          </h2>

          <ul>
            <li>
              <strong>Hapus semua data:</strong> Klik &quot;Reset / Ubah Pengaturan&quot; di popup
            </li>
            <li>
              <strong>Uninstall extension:</strong> Otomatis menghapus semua local storage
            </li>
            <li>
              <strong>Nonaktifkan sementara:</strong> Matikan di
              <code>chrome://extensions/</code>
            </li>
            <li>
              <strong>Lihat source code:</strong>{" "}
              <Link
                href="https://github.com/afifghaffarr-source/pricehunt-indonesia"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub repository
                <ExternalLink className="ml-1 inline h-3 w-3" />
              </Link>
            </li>
          </ul>
        </section>

        <Separator />

        <section>
          <h2 className="text-2xl font-semibold">Children&apos;s Privacy</h2>
          <p>
            BijakBeli extension is not directed at children under 13. We do not
            knowingly collect data from minors. If you believe a minor has used
            the extension, contact us for data purge.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="text-2xl font-semibold">Perubahan Policy</h2>
          <p>
            We will post any changes on this page with an updated date. Major
            changes (data scope changes) will be announced via the extension
            popup 7 days before taking effect.
          </p>
        </section>

        <Separator />

        <section>
          <h2 className="text-2xl font-semibold">Kontak</h2>
          <p>
            Pertanyaan tentang privacy? Hubungi:{" "}
            <a
              href="mailto:privacy@bijakbeli.web.id"
              className="text-primary hover:underline"
            >
              privacy@bijakbeli.web.id
            </a>
          </p>
        </section>
      </div>

      <div className="mt-12 text-center">
        <Link href="/extension">
          <button className="text-sm text-muted-foreground hover:text-foreground">
            ← Kembali ke Halaman Extension
          </button>
        </Link>
      </div>
    </div>
  );
}
