import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name_ar: text("name_ar").notNull(),
  price: integer("price").notNull().default(0),
  original_price: integer("original_price").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  category: text("category").notNull().default(""),
  in_stock: boolean("in_stock").notNull().default(true),
  image_url: text("image_url").notNull().default(""),
  created_date: timestamp("created_date").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, created_date: true });
export const updateProductSchema = insertProductSchema.partial();

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
export type Product = typeof productsTable.$inferSelect;
