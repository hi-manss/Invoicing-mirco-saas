import { sqliteTable, integer, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: integer("role").notNull().default(0),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => [uniqueIndex("users_email_unique").on(table.email), index("users_role_idx").on(table.role), index("users_deleted_idx").on(table.isDeleted)]);

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => [uniqueIndex("sessions_token_unique").on(table.tokenHash), index("sessions_user_idx").on(table.userId), index("sessions_deleted_idx").on(table.isDeleted)]);

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), sku: text("sku").notNull(), hsnCode: text("hsn_code"), unit: text("unit").notNull().default("PCS"),
  sellingPricePaise: integer("selling_price_paise").notNull(), gstRate: integer("gst_rate").notNull().default(0), stockQuantity: integer("stock_quantity").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(0), purchasePricePaise: integer("purchase_price_paise").notNull().default(0), category: text("category"), barcode: text("barcode"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => [uniqueIndex("products_sku_unique").on(table.sku), index("products_name_idx").on(table.name), index("products_deleted_idx").on(table.isDeleted), index("products_barcode_idx").on(table.barcode), index("products_category_idx").on(table.category), index("products_reorder_level_idx").on(table.reorderLevel)]);

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }), name: text("name").notNull(), phone: text("phone"), email: text("email"), address: text("address"), gstin: text("gstin"), stateCode: text("state_code"), creditLimitPaise: integer("credit_limit_paise").notNull().default(0), creditPeriodDays: integer("credit_period_days").notNull().default(0),
  isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => [index("customers_name_idx").on(table.name), index("customers_phone_idx").on(table.phone), index("customers_deleted_idx").on(table.isDeleted), index("customers_gstin_idx").on(table.gstin), index("customers_state_code_idx").on(table.stateCode)]);

export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }), invoiceNumber: text("invoice_number").notNull(), customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }), invoiceDate: text("invoice_date").notNull(), dueDate: text("due_date"),
  subtotalPaise: integer("subtotal_paise").notNull(), gstAmountPaise: integer("gst_amount_paise").notNull(), discountAmountPaise: integer("discount_amount_paise").notNull().default(0), totalAmountPaise: integer("total_amount_paise").notNull(),
  paymentMethod: integer("payment_method").notNull().default(0), paymentStatus: integer("payment_status").notNull().default(0), paymentReference: text("payment_reference"), notes: text("notes"), createdBy: integer("created_by").notNull().references(() => users.id), invoiceStatus: integer("invoice_status").notNull().default(0), isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => [uniqueIndex("invoices_number_unique").on(table.invoiceNumber), index("invoices_customer_idx").on(table.customerId), index("invoices_created_by_idx").on(table.createdBy), index("invoices_date_idx").on(table.invoiceDate), index("invoices_deleted_idx").on(table.isDeleted), index("invoices_status_idx").on(table.invoiceStatus), index("invoices_number_idx").on(table.invoiceNumber), index("invoices_due_date_idx").on(table.dueDate), index("invoices_payment_status_idx").on(table.paymentStatus)]);

export const invoiceItems = sqliteTable("invoice_items", {
  id: integer("id").primaryKey({ autoIncrement: true }), invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }), productId: integer("product_id").notNull().references(() => products.id), productName: text("product_name").notNull(), quantity: integer("quantity").notNull(), unitPricePaise: integer("unit_price_paise").notNull(), gstRate: integer("gst_rate").notNull(), gstAmountPaise: integer("gst_amount_paise").notNull(), lineTotalPaise: integer("line_total_paise").notNull(), isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false)
}, (table) => [index("invoice_items_invoice_idx").on(table.invoiceId), index("invoice_items_product_idx").on(table.productId), index("invoice_items_deleted_idx").on(table.isDeleted)]);
