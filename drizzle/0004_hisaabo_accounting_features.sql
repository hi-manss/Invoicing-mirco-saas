ALTER TABLE customers ADD COLUMN credit_limit_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN credit_period_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN reorder_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN purchase_price_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN category TEXT;
ALTER TABLE products ADD COLUMN barcode TEXT;
ALTER TABLE invoices ADD COLUMN due_date TEXT;
ALTER TABLE invoices ADD COLUMN notes TEXT;
ALTER TABLE invoices ADD COLUMN discount_amount_paise INTEGER NOT NULL DEFAULT 0;

CREATE INDEX customers_credit_limit_idx ON customers(credit_limit_paise);
CREATE INDEX products_barcode_idx ON products(barcode);
CREATE INDEX products_category_idx ON products(category);
CREATE INDEX products_reorder_level_idx ON products(reorder_level);
CREATE INDEX invoices_due_date_idx ON invoices(due_date);
CREATE INDEX invoices_payment_status_idx ON invoices(payment_status);
