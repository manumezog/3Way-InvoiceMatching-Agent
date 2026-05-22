CREATE TABLE IF NOT EXISTS purchase_orders (
  id          TEXT PRIMARY KEY,
  po_number   TEXT NOT NULL UNIQUE,
  vendor_name TEXT NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'USD',
  line_items  JSONB NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

CREATE TABLE IF NOT EXISTS wms_receipts (
  id          TEXT PRIMARY KEY,
  po_id       TEXT NOT NULL REFERENCES purchase_orders(id),
  received_at TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  line_items  JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id             TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  vendor_name    TEXT NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'USD',
  pdf_path       TEXT NOT NULL,
  line_items     JSONB NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  scenario_id    TEXT,
  created_at     TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

CREATE TABLE IF NOT EXISTS match_results (
  id          TEXT PRIMARY KEY,
  invoice_id  TEXT NOT NULL REFERENCES invoices(id),
  po_id       TEXT REFERENCES purchase_orders(id),
  wms_id      TEXT REFERENCES wms_receipts(id),
  status      TEXT NOT NULL,
  flag_reason TEXT,
  confidence  REAL NOT NULL,
  explanation TEXT NOT NULL,
  trace_id    TEXT,
  matched_at  TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

CREATE INDEX IF NOT EXISTS idx_wms_po_id      ON wms_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_results_invoice ON match_results(invoice_id)
