// Intentionally left blank.
// Keep real Mapbox public tokens out of git-tracked files.
window.MAPBOX_ACCESS_TOKEN = String(window.MAPBOX_ACCESS_TOKEN || window.MAPBOX_TOKEN || '').trim();
window.MAPBOX_TOKEN = window.MAPBOX_ACCESS_TOKEN;
