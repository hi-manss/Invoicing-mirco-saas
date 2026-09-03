CREATE TABLE business_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  business_name TEXT NOT NULL DEFAULT '',
  legal_name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  state TEXT,
  state_code TEXT,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  logo_data_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO business_settings (id) VALUES (1);
