import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ordersRouter from "./orders";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import uploadsRouter from "./uploads";
import visitorsRouter from "./visitors";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ordersRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(uploadsRouter);
router.use(visitorsRouter);

export default router;
