import { Router, type IRouter } from "express";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { getDb } from "../lib/firebase";
import { logger } from "../lib/logger";
import { requireDashboardSecret } from "../middlewares/dashboardSecretMiddleware";
import { SEED_PRODUCTS, FEATURED_PRODUCTS } from "../lib/seedProducts";

const router: IRouter = Router();

const productSchema = z.object({
  name_ar: z.string().min(1),
  price: z.number().nonnegative(),
  original_price: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  category: z.string().min(1),
  in_stock: z.boolean().default(true),
  image_url: z.string().default(""),
});

const updateSchema = productSchema.partial();

interface ProductDoc {
  name_ar: string;
  price: number;
  original_price: number;
  discount: number;
  category: string;
  in_stock: boolean;
  image_url: string;
  created_date: FirebaseFirestore.Timestamp | Date | string;
}

function serializeProduct(id: string, data: ProductDoc) {
  let createdDate: string;
  const cd = data.created_date;
  if (cd instanceof Timestamp) {
    createdDate = cd.toDate().toISOString();
  } else if (cd instanceof Date) {
    createdDate = cd.toISOString();
  } else {
    createdDate = String(cd ?? new Date().toISOString());
  }
  return {
    id,
    name_ar: data.name_ar,
    price: data.price,
    original_price: data.original_price,
    discount: data.discount,
    category: data.category,
    in_stock: data.in_stock,
    image_url: data.image_url,
    created_date: createdDate,
  };
}

let seedAttempted = false;
async function ensureSeeded() {
  if (seedAttempted) return;
  seedAttempted = true;
  const db = getDb();
  const existing = await db.collection("products").limit(1).get();
  if (!existing.empty) return;
  logger.info({ count: SEED_PRODUCTS.length }, "Seeding products in Firestore");
  const batch = db.batch();
  for (const p of SEED_PRODUCTS) {
    const ref = db.collection("products").doc();
    batch.set(ref, { ...p, created_date: Timestamp.now() });
  }
  await batch.commit();
}

// Upsert the flagship water-bottle products by `name_ar`. This handles the
// case where the products collection was seeded earlier with the old
// catalog — we still want these three featured items present, and we
// stamp them with the current timestamp so they sort to the top of the
// `created_date desc` listing on the storefront.
let featuredEnsured = false;
async function ensureFeaturedProducts() {
  if (featuredEnsured) return;
  featuredEnsured = true;
  const db = getDb();
  for (const p of FEATURED_PRODUCTS) {
    try {
      const existing = await db
        .collection("products")
        .where("name_ar", "==", p.name_ar)
        .limit(1)
        .get();
      if (!existing.empty) continue;
      await db
        .collection("products")
        .add({ ...p, created_date: Timestamp.now() });
      logger.info({ name_ar: p.name_ar }, "Inserted featured product");
    } catch (err) {
      logger.error({ err, name_ar: p.name_ar }, "Failed to ensure featured product");
    }
  }
}

router.get("/products", async (_req, res) => {
  try {
    await ensureSeeded();
    await ensureFeaturedProducts();
    const snap = await getDb()
      .collection("products")
      .orderBy("created_date", "desc")
      .get();
    const products = snap.docs.map((d) =>
      serializeProduct(d.id, d.data() as ProductDoc),
    );
    res.json(products);
  } catch (err) {
    logger.error({ err }, "Failed to fetch products");
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.post("/products", requireDashboardSecret, async (req, res) => {
  try {
    const data = productSchema.parse(req.body);
    const ref = await getDb()
      .collection("products")
      .add({ ...data, created_date: Timestamp.now() });
    const snap = await ref.get();
    res.status(201).json(serializeProduct(ref.id, snap.data() as ProductDoc));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.issues });
    } else {
      logger.error({ err }, "Failed to create product");
      res.status(500).json({ error: "Failed to create product" });
    }
  }
});

router.patch("/products/:id", requireDashboardSecret, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id) {
      res.status(400).json({ error: "Invalid product id" });
      return;
    }
    const data = updateSchema.parse(req.body);
    const ref = getDb().collection("products").doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    await ref.update(data);
    const snap = await ref.get();
    res.json(serializeProduct(ref.id, snap.data() as ProductDoc));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.issues });
    } else {
      logger.error({ err }, "Failed to update product");
      res.status(500).json({ error: "Failed to update product" });
    }
  }
});

router.delete("/products/:id", requireDashboardSecret, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id) {
      res.status(400).json({ error: "Invalid product id" });
      return;
    }
    const ref = getDb().collection("products").doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    await ref.delete();
    res.json({ success: true, id });
  } catch (err) {
    logger.error({ err }, "Failed to delete product");
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
