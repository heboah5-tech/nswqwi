import { Router, type IRouter } from "express";
import {
  detectCountry,
  isAllowedCountry,
  isGeoBlockEnabled,
  GEO_ALLOWED_COUNTRY,
} from "../middlewares/geoBlockMiddleware";

/**
 * Public read-only endpoint used by the storefront's <GeoGate /> on
 * first paint to decide whether to render the app or the regional
 * block page. Mounted BEFORE the geoBlockMiddleware so it stays
 * reachable from blocked countries (otherwise the frontend would have
 * no way to learn it was blocked).
 */
const router: IRouter = Router();

router.get("/check", async (req, res) => {
  const enabled = isGeoBlockEnabled();
  const { country, source } = await detectCountry(req);
  const allowed = !enabled || isAllowedCountry(country);
  res.json({
    enabled,
    country,
    allowed,
    allowedCountry: GEO_ALLOWED_COUNTRY,
    source,
  });
});

export default router;
