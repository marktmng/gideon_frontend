/**
 * Ensures `@mediapipe/tasks-vision/vision_bundle_mjs.js.map` exists so Create React App's
 * `source-map-loader` does not emit ENOENT warnings during `npm start` or `npm run build`.
 */
const fs = require('fs');
const path = require('path');

const mapPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@mediapipe',
  'tasks-vision',
  'vision_bundle_mjs.js.map'
);

try {
  const dir = path.dirname(mapPath);
  if (fs.existsSync(dir) && !fs.existsSync(mapPath)) {
    fs.writeFileSync(
      mapPath,
      JSON.stringify({
        version: 3,
        file: 'vision_bundle.mjs',
        sources: [],
        names: [],
        mappings: '',
      }),
      'utf8'
    );
  }
} catch {
  // Ignore if node_modules is read-only
}

