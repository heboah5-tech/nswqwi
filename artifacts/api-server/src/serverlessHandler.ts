import serverless from "serverless-http";
import app from "./app";

// Wrap the Express app for AWS Lambda / Netlify Functions. We register
// common binary content types so multipart receipt uploads survive the
// base64 encoding round-trip the function gateway performs.
const wrapped = serverless(app, {
  binary: [
    "image/*",
    "application/octet-stream",
    "multipart/form-data",
    "application/pdf",
  ],
});

export const handler = wrapped;
