ALTER TABLE invoices ADD COLUMN payment_reference TEXT;
ALTER TABLE invoices ADD COLUMN invoice_status INTEGER NOT NULL DEFAULT 0;

CREATE TABLE inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  movement_type INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX inventory_movements_product_idx ON inventory_movements(product_id);
CREATE INDEX inventory_movements_invoice_idx ON inventory_movements(invoice_id);
CREATE INDEX inventory_movements_user_idx ON inventory_movements(user_id);
CREATE INDEX inventory_movements_type_idx ON inventory_movements(movement_type);
CREATE INDEX inventory_movements_created_idx ON inventory_movements(created_at);
CREATE INDEX invoices_status_idx ON invoices(invoice_status);
CREATE INDEX invoices_number_idx ON invoices(invoice_number);
