import type { Env } from "../types/env";
import { OrderStatus, PaymentMethod, PaymentStatus, UserRole } from "../constants/enums";

export const INVENTORY_MOVEMENT = { RESTOCK: 0, SALE: 1, ADJUSTMENT: 2, RETURN: 3, CANCELLATION: 4 } as const;

export async function adjustStock(env: Env, userId: number, productId: number, quantityChange: number, reason: string) {
  if (!Number.isInteger(quantityChange) || quantityChange === 0) throw new Error("quantityChange must be a non-zero integer");
  if (!reason.trim()) throw new Error("Reason is required");
  const product = await env.DB.prepare("SELECT id, name, stock_quantity FROM products WHERE id = ? AND is_deleted = 0").bind(productId).first<{ id: number; name: string; stock_quantity: number }>();
  if (!product) throw new Error("Product not found");
  const stockAfter = product.stock_quantity + quantityChange;
  if (stockAfter < 0) throw new Error("Stock cannot become negative");
  const type = quantityChange > 0 ? INVENTORY_MOVEMENT.RESTOCK : INVENTORY_MOVEMENT.ADJUSTMENT;
  const results = await env.DB.batch([
    env.DB.prepare("UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = 0 AND stock_quantity = ?").bind(stockAfter, productId, product.stock_quantity),
    env.DB.prepare("INSERT INTO inventory_movements (product_id, invoice_id, user_id, movement_type, quantity_change, stock_before, stock_after, reason) VALUES (?, NULL, ?, ?, ?, ?, ?, ?)").bind(productId, userId, type, quantityChange, product.stock_quantity, stockAfter, reason.trim())
  ]);
  if (!results[0].success || (results[0].meta.changes ?? 0) !== 1) throw new Error("Stock changed while adjusting inventory; nothing was committed");
  return { productId, productName: product.name, stockBefore: product.stock_quantity, stockAfter, quantityChange };
}
