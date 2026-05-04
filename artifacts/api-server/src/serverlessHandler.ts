import serverless from "serverless-http";
import app from "./app";

// Wrap the Express app for AWS Lambda / Netlify Functions.
//
// `basePath` strips the function's URL prefix before handing the request to
// Express. Our netlify.toml rewrites `/api/*` → `/.netlify/functions/api/api/:splat`,
// so the function receives `/.netlify/functions/api/api/orders`; after
// stripping `basePath`, Express sees `/api/orders` and the existing
// `app.use("/api", router)` mount matches.
//
// `binary` registers the content types whose bodies must round-trip as
// base64 through the AWS Lambda event envelope, so multipart receipt
// uploads (and image responses) are not corrupted in transit.
const wrapped = serverless(app, {
  basePath: "/.netlify/functions/api",
  binary: [
    "image/*",
    "application/octet-stream",
    "multipart/form-data",
    "application/pdf",
  ],
});

export const handler = wrapped;
