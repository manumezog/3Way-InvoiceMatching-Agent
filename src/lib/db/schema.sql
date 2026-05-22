CREATE TABLE IF NOT EXISTS purchase_orders (
  id          TEXT PRIMARY KEY,
  po_number   TEXT NOT NULL UNIQUE,
  vendor_name TEXT NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'USD',
  line_items  TEXT NOT NULL, -- JSON array of {sku, description, qty, unit_price}
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wms_receipts (
  id          TEXT PRIMARY KEY,
  po_id       TEXT NOT NULL REFERENCES purchase_orders(id),
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  line_items  TEXT NOT NULL -- JSON array of {sku, received_qty}
);

CREATE TABLE IF NOT EXISTS invoices (
  id                 TEXT PRIMARY KEY,
  invoice_number     TEXT NOT NULL UNIQUE,
  vendor_name        TEXT NOT NULL,
  currency           TEXT NOT NULL DEFAULT 'USD',
  pdf_path           TEXT NOT NULL,
  line_items         TEXT NOT NULL, -- JSON array of {sku, description, qty, unit_price}
  status             TEXT NOT NULL DEFAULT 'pending', -- pending | approved | flagged | escalated
  scenario_id        TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS match_results (
  id          TEXT PRIMARY KEY,
  invoice_id  TEXT NOT NULL REFERENCES invoices(id),
  po_id       TEXT REFERENCES purchase_orders(id),
  wms_id      TEXT REFERENCES wms_receipts(id),
  status      TEXT NOT NULL, -- APPROVED | FLAGGED | ESCALATED
  flag_reason TEXT,          -- SHORTAGE | PRICE_MISMATCH | VENDOR_MISMATCH | DUPLICATE | UNAUTHORIZED | FX | etc.
  confidence  REAL NOT NULL,
  explanation TEXT NOT NULL,
  trace_id    TEXT,          -- Langfuse trace ID (Phase 4)
  matched_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wms_po_id       ON wms_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status  ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_results_invoice  ON match_results(invoice_id);
