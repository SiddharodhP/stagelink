import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { Invoice } from "@/types/marketplace";
import { amountInWords } from "@/lib/utils";

/**
 * Vector PDF invoice — real selectable text, not a screenshot.
 *
 * Currency note: amounts use the ISO code rather than a symbol
 * ("USD 12,500"). That is standard on international invoices, and it keeps
 * the built-in PDF fonts usable — several currency signs have no glyph in
 * them and render as a blank box, which a symbol-based format would hit
 * the moment an invoice was raised in anything but dollars.
 */
function money(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-US")}`;
}

function formatDay(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const INK = "#171410";
const MUTED = "#6f695e";
const FAINT = "#9a9488";
const BORDER = "#DCD8D1";
const WASH = "#F4F1EC";
const BRAND = "#d6440f";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: INK,
    lineHeight: 1.35,
  },

  /* header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  brand: { fontSize: 19, fontFamily: "Helvetica-Bold", letterSpacing: -0.3, lineHeight: 1.15 },
  brandTag: { fontSize: 8, color: MUTED, marginTop: 3, lineHeight: 1.2 },
  docType: { fontSize: 22, fontFamily: "Helvetica-Bold", textAlign: "right", lineHeight: 1.15 },
  docNumber: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    marginTop: 4,
    lineHeight: 1.2,
  },
  statusBadge: {
    alignSelf: "flex-end",
    marginTop: 8,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 7,
    letterSpacing: 0.9,
    fontFamily: "Helvetica-Bold",
  },

  rule: { height: 1, backgroundColor: INK, marginBottom: 14 },

  eyebrow: {
    fontSize: 6.8,
    letterSpacing: 1.1,
    color: FAINT,
    fontFamily: "Helvetica-Bold",
    marginBottom: 5,
  },

  /* meta strip */
  metaStrip: {
    flexDirection: "row",
    backgroundColor: WASH,
    borderRadius: 3,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  metaCell: { flex: 1 },
  metaValue: { fontFamily: "Helvetica-Bold", fontSize: 9 },

  /* parties */
  parties: { flexDirection: "row", marginBottom: 16 },
  party: { flex: 1, paddingRight: 18 },
  partyName: { fontFamily: "Helvetica-Bold", fontSize: 10.5, marginBottom: 3 },
  partyLine: { color: MUTED, fontSize: 8.8 },
  taxLine: { fontSize: 8.8, marginTop: 3, fontFamily: "Helvetica-Bold" },

  /* line items */
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    marginBottom: 14,
  },
  thead: {
    flexDirection: "row",
    backgroundColor: WASH,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  trow: { flexDirection: "row", paddingVertical: 11, paddingHorizontal: 12 },
  colDesc: { flex: 1, paddingRight: 12 },
  colQty: { width: 52, textAlign: "center" },
  colRate: { width: 84, textAlign: "right" },
  colAmt: { width: 92, textAlign: "right" },
  th: { fontSize: 6.8, letterSpacing: 0.9, color: FAINT, fontFamily: "Helvetica-Bold" },
  itemTitle: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  itemMeta: { color: MUTED, fontSize: 8.3, marginTop: 2 },

  /* totals */
  totalsWrap: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  wordsBox: { flex: 1, paddingRight: 24, justifyContent: "flex-end" },
  wordsText: { fontSize: 8.8, fontFamily: "Helvetica-Bold", lineHeight: 1.4 },
  totals: { width: 218 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: INK,
    borderRadius: 3,
    paddingVertical: 9,
    paddingHorizontal: 11,
    marginTop: 6,
  },
  grandLabel: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 9.5 },
  grandValue: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 14 },

  /* blocks */
  block: { borderWidth: 1, borderColor: BORDER, borderRadius: 3, padding: 11, marginBottom: 12 },
  blockRow: { flexDirection: "row", marginBottom: 12 },

  signature: {
    marginTop: 14,
    alignSelf: "flex-end",
    width: 190,
    alignItems: "center",
  },
  signLine: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    width: "100%",
    paddingTop: 5,
    textAlign: "center",
    fontSize: 8.3,
    color: MUTED,
  },

  footer: {
    position: "absolute",
    bottom: 30,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: FAINT,
  },
});

const STATUS: Record<string, { bg: string; border: string; color: string; label: string }> = {
  sent: { bg: "#F0F8FE", border: "#BBE0F6", color: "#1F5E85", label: "AWAITING PAYMENT" },
  acknowledged: { bg: "#FEF7EC", border: "#F5DCB0", color: "#8A5A12", label: "ACKNOWLEDGED" },
  paid: { bg: "#EDF9F2", border: "#B6E4CB", color: "#1D6B44", label: "PAID" },
  cancelled: { bg: WASH, border: BORDER, color: MUTED, label: "WITHDRAWN" },
};

/** Renders a party block, skipping any line the user hasn't filled in. */
function Party({
  label,
  name,
  address,
  email,
  phone,
  taxId,
  taxLabel,
}: {
  label: string;
  name: string;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  taxLabel?: string | null;
}) {
  return (
    <View style={styles.party}>
      <Text style={styles.eyebrow}>{label}</Text>
      <Text style={styles.partyName}>{name}</Text>
      {address ? <Text style={styles.partyLine}>{address}</Text> : null}
      {email ? <Text style={styles.partyLine}>{email}</Text> : null}
      {phone ? <Text style={styles.partyLine}>{phone}</Text> : null}
      {taxId ? (
        <Text style={styles.taxLine}>
          {(taxLabel || "Tax ID") + ": " + taxId}
        </Text>
      ) : null}
    </View>
  );
}

export function InvoicePdf({ invoice }: { invoice: Invoice }) {
  const status = STATUS[invoice.status] ?? STATUS.sent;
  const currency = invoice.currency || "USD";
  const isReceipt = invoice.status === "paid";

  const fromName = invoice.from_name || invoice.freelancer?.full_name || "Freelancer";
  const toName =
    invoice.to_name ||
    invoice.client?.company_name ||
    invoice.client?.full_name ||
    "Client";

  const milestoneLabel =
    invoice.milestone_seq && invoice.milestone_count
      ? `Milestone ${invoice.milestone_seq} of ${invoice.milestone_count}`
      : "Milestone";

  return (
    <Document
      title={`${isReceipt ? "Receipt" : "Invoice"} ${invoice.invoice_number}`}
      author={fromName}
      subject={`${invoice.milestone_title} — ${invoice.project_title}`}
      keywords="invoice, freelance, milestone, escrow"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Roster</Text>
            <Text style={styles.brandTag}>Milestone-based freelance marketplace</Text>
          </View>
          <View>
            <Text style={styles.docType}>{isReceipt ? "RECEIPT" : "INVOICE"}</Text>
            <Text style={styles.docNumber}>{invoice.invoice_number}</Text>
            <Text
              style={[
                styles.statusBadge,
                { backgroundColor: status.bg, borderColor: status.border, color: status.color },
              ]}
            >
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.rule} />

        {/* Dates & reference */}
        <View style={styles.metaStrip}>
          <View style={styles.metaCell}>
            <Text style={styles.eyebrow}>ISSUE DATE</Text>
            <Text style={styles.metaValue}>{formatDay(invoice.issued_at)}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.eyebrow}>{isReceipt ? "PAID ON" : "DUE DATE"}</Text>
            <Text style={styles.metaValue}>
              {formatDay(isReceipt ? invoice.paid_at : invoice.due_date)}
            </Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.eyebrow}>PROJECT</Text>
            <Text style={styles.metaValue}>{invoice.project_title}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.eyebrow}>REFERENCE</Text>
            <Text style={[styles.metaValue, { fontSize: 8 }]}>
              {invoice.reference || milestoneLabel}
            </Text>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.parties}>
          <Party
            label="FROM (SERVICE PROVIDER)"
            name={fromName}
            address={invoice.from_address}
            email={invoice.from_email}
            phone={invoice.from_phone}
            taxId={invoice.from_tax_id}
            taxLabel={invoice.from_tax_label}
          />
          <Party
            label="BILL TO"
            name={toName}
            address={invoice.to_address}
            email={invoice.to_email}
            phone={invoice.to_phone}
            taxId={invoice.to_tax_id}
            taxLabel={invoice.to_tax_label}
          />
        </View>

        {/* Line items */}
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, styles.colDesc]}>DESCRIPTION</Text>
            <Text style={[styles.th, styles.colQty]}>QTY</Text>
            <Text style={[styles.th, styles.colRate]}>RATE</Text>
            <Text style={[styles.th, styles.colAmt]}>AMOUNT</Text>
          </View>
          <View style={styles.trow}>
            <View style={styles.colDesc}>
              <Text style={styles.itemTitle}>{invoice.milestone_title}</Text>
              <Text style={styles.itemMeta}>
                {milestoneLabel} — {invoice.project_title}
              </Text>
              {invoice.deliverables ? (
                <Text style={styles.itemMeta}>
                  Deliverables: {invoice.deliverables}
                </Text>
              ) : null}
            </View>
            <Text style={styles.colQty}>1</Text>
            <Text style={styles.colRate}>{money(invoice.amount, currency)}</Text>
            <Text style={[styles.colAmt, { fontFamily: "Helvetica-Bold" }]}>
              {money(invoice.amount, currency)}
            </Text>
          </View>
        </View>

        {/* Totals + amount in words */}
        <View style={styles.totalsWrap}>
          <View style={styles.wordsBox}>
            <Text style={styles.eyebrow}>AMOUNT IN WORDS</Text>
            <Text style={styles.wordsText}>
              {amountInWords(invoice.total_amount, currency)}
            </Text>
          </View>

          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={{ color: MUTED }}>Subtotal</Text>
              <Text>{money(invoice.amount, currency)}</Text>
            </View>
            {invoice.tax_percent > 0 ? (
              <View style={styles.totalRow}>
                <Text style={{ color: MUTED }}>
                  Tax ({invoice.tax_percent}%)
                </Text>
                <Text>{money(invoice.tax_amount, currency)}</Text>
              </View>
            ) : (
              <View style={styles.totalRow}>
                <Text style={{ color: MUTED }}>Tax</Text>
                <Text style={{ color: MUTED }}>Not applicable</Text>
              </View>
            )}
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>
                {isReceipt ? "TOTAL PAID" : "TOTAL DUE"}
              </Text>
              <Text style={styles.grandValue}>
                {money(invoice.total_amount, currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment terms + notes */}
        <View style={styles.blockRow}>
          <View style={[styles.block, { flex: 1, marginRight: 10, marginBottom: 0 }]}>
            <Text style={styles.eyebrow}>PAYMENT TERMS</Text>
            <Text>
              {invoice.payment_terms ||
                "Released from escrow on milestone approval"}
            </Text>
          </View>
          <View style={[styles.block, { flex: 1, marginBottom: 0 }]}>
            <Text style={styles.eyebrow}>PAYMENT METHOD</Text>
            <Text>Roster escrow — funds held against this milestone</Text>
          </View>
        </View>

        {/* Notes and the escrow declaration sit side by side — stacking them
            pushed the signature onto a second, near-empty page. */}
        <View style={styles.blockRow}>
          {invoice.notes ? (
            <View style={[styles.block, { flex: 1, marginRight: 10, marginBottom: 0 }]}>
              <Text style={styles.eyebrow}>NOTES</Text>
              <Text style={{ fontSize: 8.6 }}>{invoice.notes}</Text>
            </View>
          ) : null}

          <View
            style={[
              styles.block,
              {
                flex: 1,
                marginBottom: 0,
                backgroundColor: WASH,
                borderColor: WASH,
              },
            ]}
          >
            <Text style={styles.eyebrow}>ESCROW DECLARATION</Text>
            <Text style={{ fontSize: 8.3, color: MUTED }}>
              {isReceipt
                ? "Funded into escrow before work began and released on approval. No further payment is due."
                : "Funded in escrow. Approving the delivered work releases the held funds — no separate bank transfer is required."}
            </Text>
          </View>
        </View>

        <View style={styles.signature}>
          <Text style={{ fontSize: 8.3, color: MUTED, marginBottom: 14 }}>
            For {fromName}
          </Text>
          <Text style={styles.signLine}>Authorised signatory</Text>
        </View>

        {/* Footer, repeated on every page */}
        <View style={styles.footer} fixed>
          <Text>
            {invoice.invoice_number} · {invoice.project_title}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
          <Text style={{ color: BRAND }}>Generated by Roster · jayree.io</Text>
        </View>
      </Page>
    </Document>
  );
}
