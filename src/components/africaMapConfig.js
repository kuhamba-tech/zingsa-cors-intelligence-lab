import L from 'leaflet';

export const AFRICA_TILE_LAYERS = {
  hybrid: {
    label: 'Satellite + labels',
    short: '🛰️ Hybrid',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: '0123',
    attribution: '© Google',
    maxZoom: 20,
  },
  satellite: {
    label: 'Satellite imagery',
    short: '🌍 Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    maxZoom: 19,
  },
  street: {
    label: 'Street map',
    short: '🗺️ Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  },
};

export function africaMapTileLayerProps(layerKey) {
  const layer = AFRICA_TILE_LAYERS[layerKey] || AFRICA_TILE_LAYERS.hybrid;
  const props = { url: layer.url, attribution: layer.attribution, maxZoom: layer.maxZoom };
  if (layer.subdomains) props.subdomains = layer.subdomains;
  return props;
}

export const AFRICA_MAP_BOUNDS = L.latLngBounds([-38, -22], [38, 58]);

export function africaCityIcon(name) {
  return L.divIcon({
    className: '',
    html: `<div class="sw-map-city"><span class="sw-map-city-dot"></span><span class="sw-map-city-label">${name}</span></div>`,
    iconSize: [0, 0],
    iconAnchor: [7, 7],
  });
}
