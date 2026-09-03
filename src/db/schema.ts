import {
  sqliteTable,
  integer,
  text,
  index,
  uniqueIndex
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * USER ROLE
 *
 * 0 = USER
 * 1 = ADMIN
 */
export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    name: text("name").notNull(),

    email: text("email").notNull(),

    passwordHash: text("password_hash").notNull(),

    role: integer("role").notNull().default(0),

    isDeleted: integer("is_deleted", { mode: "boolean" })
      .notNull()
      .default(false),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_role_idx").on(table.role),
    index("users_deleted_idx").on(table.isDeleted)
  ]
);

/**
 * LOGIN SESSIONS
 */
export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    tokenHash: text("token_hash").notNull(),

    expiresAt: text("expires_at").notNull(),

    isDeleted: integer("is_deleted", { mode: "boolean" })
      .notNull()
      .default(false),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("sessions_token_unique").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
    index("sessions_deleted_idx").on(table.isDeleted)
  ]
);

/**
 * PRODUCTS / INVENTORY
 */
export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    name: text("name").notNull(),

    sku: text("sku").notNull(),

    hsnCode: text("hsn_code"),

    unit: text("unit").notNull().default("PCS"),

    /**
     * Store money in paise.
     * Example:
     * ₹100.50 = 10050
     */
    sellingPricePaise: integer("selling_price_paise").notNull(),

    gstRate: integer("gst_rate").notNull().default(0),

    stockQuantity: integer("stock_quantity").notNull().default(0),

    isDeleted: integer("is_deleted", { mode: "boolean" })
      .notNull()
      .default(false),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("products_sku_unique").on(table.sku),
    index("products_name_idx").on(table.name),
    index("products_deleted_idx").on(table.isDeleted)
  ]
);

/**
 * CUSTOMERS
 */
export const customers = sqliteTable(
  "customers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    name: text("name").notNull(),

    phone: text("phone"),

    email: text("email"),

    address: text("address"),

    gstin: text("gstin"),

    isDeleted: integer("is_deleted", { mode: "boolean" })
      .notNull()
      .default(false),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    index("customers_name_idx").on(table.name),
    index("customers_phone_idx").on(table.phone),
    index("customers_deleted_idx").on(table.isDeleted)
  ]
);

/**
 * INVOICES
 */
export const invoices = sqliteTable(
  "invoices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    invoiceNumber: text("invoice_number").notNull(),

    customerId: integer("customer_id")
      .references(() => customers.id, { onDelete: "set null" }),

    invoiceDate: text("invoice_date").notNull(),

    subtotalPaise: integer("subtotal_paise").notNull(),

    gstAmountPaise: integer("gst_amount_paise").notNull(),

    totalAmountPaise: integer("total_amount_paise").notNull(),

    /**
     * Payment method enum stored as integer.
     * 0 = CASH
     * 1 = UPI
     * 2 = BANK
     * 3 = CREDIT
     * 4 = OTHER
     */
    paymentMethod: integer("payment_method")
      .notNull()
      .default(0),

    /**
     * Payment status enum stored as integer.
     * 0 = PENDING
     * 1 = PAID
     * 2 = PARTIAL
     * 3 = FAILED
     * 4 = REFUNDED
     */
    paymentStatus: integer("payment_status")
      .notNull()
      .default(0),

    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),

    isDeleted: integer("is_deleted", { mode: "boolean" })
      .notNull()
      .default(false),

    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("invoices_number_unique").on(table.invoiceNumber),
    index("invoices_customer_idx").on(table.customerId),
    index("invoices_created_by_idx").on(table.createdBy),
    index("invoices_date_idx").on(table.invoiceDate),
    index("invoices_deleted_idx").on(table.isDeleted)
  ]
);

/**
 * INVOICE ITEMS
 */
export const invoiceItems = sqliteTable(
  "invoice_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),

    productId: integer("product_id")
      .notNull()
      .references(() => products.id),

    /**
     * Snapshot of product information at invoice time.
     */
    productName: text("product_name").notNull(),

    quantity: integer("quantity").notNull(),

    unitPricePaise: integer("unit_price_paise").notNull(),

    gstRate: integer("gst_rate").notNull(),

    gstAmountPaise: integer("gst_amount_paise").notNull(),

    lineTotalPaise: integer("line_total_paise").notNull(),

    isDeleted: integer("is_deleted", { mode: "boolean" })
      .notNull()
      .default(false)
  },
  (table) => [
    index("invoice_items_invoice_idx").on(table.invoiceId),
    index("invoice_items_product_idx").on(table.productId),
    index("invoice_items_deleted_idx").on(table.isDeleted)
  ]
);
