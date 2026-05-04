import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm, mkdir } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(artifactDir, "..", "..", "netlify", "functions");

async function buildNetlify() {
  await mkdir(outDir, { recursive: true });
  await rm(path.join(outDir, "api.mjs"), { force: true });
  await rm(path.join(outDir, "api.mjs.map"), { force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/serverlessHandler.ts")],
    platform: "node",
    target: "node20",
    bundle: true,
    format: "esm",
    outfile: path.join(outDir, "api.mjs"),
    logLevel: "info",
    // We bundle everything so Netlify can ship a single self-contained
    // function file (node_bundler = "none" in netlify.toml). Native
    // modules are still externalised so esbuild does not try to resolve
    // .node binaries.
    external: [
      "*.node",
      "fsevents",
    ],
    sourcemap: false,
    minify: false,
    // Many bundled CommonJS deps (express, etc.) call `require`. Provide
    // it as a global in our ESM output so they keep working.
    banner: {
      js: `import { createRequire as __cr } from 'node:module';
import __np from 'node:path';
import __nu from 'node:url';
globalThis.require = __cr(import.meta.url);
globalThis.__filename = __nu.fileURLToPath(import.meta.url);
globalThis.__dirname = __np.dirname(globalThis.__filename);`,
    },
  });

  console.log(`✓ Netlify function bundled → ${path.join(outDir, "api.mjs")}`);
}

buildNetlify().catch((err) => {
  console.error(err);
  process.exit(1);
});
