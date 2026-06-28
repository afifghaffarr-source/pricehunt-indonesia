# UU PDP Compliance Statement — BijakBeli Chrome Extension v3.0.1

BijakBeli.app ("we", "the operator") operates the BijakBeli Chrome
Extension ("the extension") under Indonesian jurisdiction. This document
maps our data-handling practices against the relevant articles of
**Undang-Undang Nomor 27 Tahun 2022 tentang Perlindungan Data Pribadi**
(UU PDP, Indonesia Personal Data Protection Law), in force since 17
October 2024, with full compliance deadline 17 October 2025.

This statement supplements (does not replace) the privacy policy at
`/extension/privacy-policy`.

---

## Article 1 (General provisions, definitions)

> UU PDP Definition: "Data Pribadi" (Personal Data) is any data about an
> identifiable natural person, either directly or indirectly.

**Our Position:** The BijakBeli extension does NOT collect "Data Pribadi"
as defined. Specifically:

- ✅ **No name, email, phone, address** — never asked, never stored
- ✅ **No IP address logging** — server-side logs do not retain client IPs
  beyond the standard Web server access log (90 days retention, vendor-managed)
- ✅ **No device fingerprinting** — no canvas/audio fingerprint collection
- ✅ **No cookies set by extension** — `chrome.storage.local` only, no `document.cookie` writes

INGESTION_SECRET is a **shared cryptographic token** issued by our
web-application dashboard to enrolled beta testers. While it
authenticates submissions, it does not identify a natural person
uniquely (it is class-shared; anyone with the token can submit).

---

## Articles 4-5 (Personal Data controller and processor)

| UU PDP Concept | BijakBeli Status |
|---|---|
| **Pengendali Data Pribadi** (Data Controller) | BijakBeli.app operates as the sole controller. Sole proprietor: Afif Ghaffar. |
| **Prosesor Data Pribadi** (Data Processor) | Supabase Inc. (database hosting); Vercel Inc. (web hosting/CDN). Both process on our documented instructions only. |

## Article 6 (Lawful basis for processing)

Indonesian market data is publicly displayed by the marketplace operator.
UU PDP Article 6 enumerates 7 lawful bases; we rely on:

- **Article 6 letter (e) — "Pelaksanaan Perjanjian"** (Performance of a
  Contract): the user voluntarily installs the extension and accepts the
  Privacy Policy; submission of marketplace data is the contracted
  functionality.
- The user is the **active submitter** of product data via browser
  interaction, not the data **subject** of UU PDP.

For watchlist data:
- **Article 6 letter (a) — "Persetujuan"** (Explicit Consent): user
  explicitly adds each product to their watchlist; consent is
  withdrawable at any time by removing the watchlist entry.

## Article 9 (Data subject rights)

BijakBeli extension data-subjects (the users themselves) retain all
article-9 rights through existing controls:

| Right (UU PDP Art 9) | Implementation in BijakBeli |
|---|---|
| Access (huruf a) | All locally-stored data is readable from `chrome://extensions` → Service Worker → Storage |
| Correction (huruf b) | User can edit/delete any watchlist entry from the side panel |
| Deletion (huruf c) | Uninstall the extension = wipe all `chrome.storage.local`. Plus "Hapus semua data" button in sidepanel. |
| Withdrawal of consent (huruf d) | Toggle off notifications opt-in / clear watchlist |
| Objection to automated processing (huruf e) | No automated decision-making or profiling. Price-drop alerts are threshold comparisons, not automated decisions. |
| Data portability (huruf f) | One-click CSV export from side panel. |
| Complaint to authorities (huruf g) | Email `privacy@bijakbeli.id`. Forwarding chain documented for foreseeable escalation to Kominfo. |

## Articles 12-16 (Sensitive personal data)

> UU PDP distinguishes "Data Pribadi Spesifik" (Sensitive Personal Data):
> health, biometric, genetic, sexuality, criminal, financial, child data.

**We collect NONE of these.**

## Articles 24-25 (Cross-border data transfer)

> UU PDP requires explicit consent for transfer of personal data outside
> Indonesian jurisdiction.

- **BijakBeli personal data**: NIL. Nothing to transfer.
- **Marketplace product data**: Publicly available information; not
  "personal data" under UU PDP. Stored in Supabase (default region:
  United States / Singapore — selectable per project). **We commit:
  if requested by a user, this region can be moved to a Supabase
  Singapore or Jakarta region within 30 days at no cost to user.**

## Articles 34-37 (Data breach notification)

> UU PDP requires notification to subjects + authorities within 3×24 hours
> for personal-data breach; new rules in 2026 may shorten to 24 hours.

- **Scope to notify**: BijakBeli holds no personal data, so any breach in
  our database does NOT expose personal data.
- **Commit**: in case of a breach involving non-personal data (e.g.,
  scraped product data), we will:
  - Within 24 hours: publish disclosure at
    `https://www.bijakbeli.web.id/security/incidents/[YYYY-MM-DD]`
  - Notify all known beta testers by email (privacy@bijakbeli.id inbox)
  - Submit voluntary disclosure to BSSN (Badan Siber dan Sandi Negara)
    via their incident-reporting portal

## Articles 46-50 (Records of processing activities / RoPA)

BijakBeli as data controller maintains an internal RoPA (not in this
public repo) covering:
- Processing purpose: market-price community intelligence
- Data categories: publicly displayed marketplace product data (no
  personal data)
- Recipient categories: public news websites showing aggregated price
  trends only (anonymised, by product URL)
- Retention: scrape data retained indefinitely (it's public); user
  watchlist/secret retained until user uninstalls
- Technical safeguards: HTTPS-only, RBAC on Supabase, key rotation
  every 90 days

## Articles 47 (Data Protection Impact Assessment / DPIA)

A DPIA is not formally required (we process no personal data) but has
been conducted voluntarily as part of the privacy-policy certification
in `extension/REJECTION_RESPONSE_KIT.md` Category 6.

---

## Limitations & honest gaps

- We do not retain a formal legal opinion from Indonesian counsel.
  This document is the technical team's best-faith reading of UU PDP.
- The Indonesian Ministry (Kominfo) is still finalizing implementing
  regulations as of 2026-06. If those regulations require additional
  technical measures, we commit to updating this document within 60
  days of their publication.
- We do not collect personal data, so most UU PDP rights described
  above apply in spirit (via the user's own control over their data)
  rather than literally (we are not processing their personal data).

## Contact

For UU PDP questions or complaints:

- Email: privacy@bijakbeli.id (response <72 hours)
- Postal: BijakBeli.app, Afif Ghaffar, [full address on request]
- Regulatory escalation: Kominfo (Kementerian Komunikasi dan Informatika)
  — https://www.kominfo.go.id/

---

> Last updated: 2026-06-28. Reviewed against UU PDP published text; not yet
> reviewed by Indonesian legal counsel. Treat as a technical statement of intent.
