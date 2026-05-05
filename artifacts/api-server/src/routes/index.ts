import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ordersRouter from "./orders";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import uploadsRouter from "./uploads";
import visitorsRouter from "./visitors";
import geoRouter from "./geo";
import { geoBlockMiddleware } from "../middlewares/geoBlockMiddleware";

const router: IRouter = Router();

// Health and the geo-check endpoint must stay reachable from any
// country, so they are mounted BEFORE the geo-firewall.
router.use(healthRouter);
router.use("/geo", geoRouter);

// Geo-firewall: restricts everything below to Saudi Arabia (when
// enabled via GEO_BLOCK_ENABLED). The middleware itself bypasses
// admin/dashboard requests via the X-Dashboard-Secret header check.
router.use(geoBlockMiddleware());

router.use(ordersRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(uploadsRouter);
router.use(visitorsRouter);

export default router;
