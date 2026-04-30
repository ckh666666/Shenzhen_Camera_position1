// Intentionally left blank.
// Keep real Mapbox public tokens out of git-tracked files.

// 这里的 'YOUR_MAPBOX_TOKEN_PLACEHOLDER' 是给 GitHub Actions 识别的“靶子”
const secretToken = 'YOUR_MAPBOX_TOKEN_PLACEHOLDER';

window.MAPBOX_ACCESS_TOKEN = secretToken || String(window.MAPBOX_ACCESS_TOKEN || window.MAPBOX_TOKEN || '').trim();
window.MAPBOX_TOKEN = window.MAPBOX_ACCESS_TOKEN;