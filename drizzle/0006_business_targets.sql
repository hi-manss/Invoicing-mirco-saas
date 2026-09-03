CREATE TABLE business_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL,
  target_value INTEGER NOT NULL DEFAULT 0,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  notes TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX business_targets_period_idx ON business_targets(period_start, period_end);
CREATE INDEX business_targets_deleted_idx ON business_targets(is_deleted);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount_paise INTEGER NOT NULL,
  payment_method INTEGER NOT NULL DEFAULT 0,
  payment_reference TEXT,
  payment_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX payments_invoice_idx ON payments(invoice_id);
CREATE INDEX payments_date_idx ON payments(payment_date);
CREATE INDEX payments_deleted_idx ON payments(is_deleted);
