const DEFAULT_OBS = {
  name: 'ZINGSA Mazowe Observatory',
  city: 'Harare, Zimbabwe',
  lat: -17.83,
  lon: 31.05,
  altitude: 1480,
  timezone: 'Africa/Harare',
};

const SKY_OBJECTS = [
  {
    id: 'orion-nebula',
    name: 'Orion Nebula',
    catalog: 'M42',
    distance: '1,344 light years',
    constellation: 'Orion',
    visibility: 'Best after sunset in clear southern summer skies.',
    azimuth: 62,
    altitude: 38,
    zoom: 72,
    glow: '#38bdf8',
    magnitude: 4.0,
    type: 'Emission nebula',
    ai_explanation:
      'The Orion Nebula (M42) is a stellar nursery where new stars form from collapsing gas clouds. Its blue-green glow comes from ionized hydrogen excited by young, hot stars at its core. From Zimbabwe it rises in the eastern evening sky during summer months.',
  },
  {
    id: 'omega-centauri',
    name: 'Omega Centauri',
    catalog: 'NGC 5139',
    distance: '15,800 light years',
    constellation: 'Centaurus',
    visibility: 'Low southern horizon; best on moonless winter nights.',
    azimuth: 185,
    altitude: 18,
    zoom: 65,
    glow: '#fbbf24',
    magnitude: 3.7,
    type: 'Globular cluster',
    ai_explanation:
      'Omega Centauri is the brightest globular cluster in the sky, containing millions of ancient stars packed into a dense spherical halo. It orbits the Milky Way and is a favourite target for southern-hemisphere observers.',
  },
  {
    id: 'lmc',
    name: 'Large Magellanic Cloud',
    catalog: 'LMC',
    distance: '163,000 light years',
    constellation: 'Dorado / Mensa',
    visibility: 'Visible most of the year from southern Africa after dusk.',
    azimuth: 210,
    altitude: 42,
    zoom: 48,
    glow: '#a78bfa',
    magnitude: 0.9,
    type: 'Irregular galaxy',
    ai_explanation:
      'The Large Magellanic Cloud is a satellite galaxy of the Milky Way, home to the Tarantula Nebula and numerous star-forming regions. Its diffuse glow spans several degrees of sky.',
  },
  {
    id: 'centaurus-a',
    name: 'Centaurus A',
    catalog: 'NGC 5128',
    distance: '12 million light years',
    constellation: 'Centaurus',
    visibility: 'Mid-southern sky; requires dark skies and moderate altitude.',
    azimuth: 168,
    altitude: 28,
    zoom: 78,
    glow: '#fb7185',
    magnitude: 6.8,
    type: 'Radio galaxy',
    ai_explanation:
      'Centaurus A is one of the closest active galaxies, powered by a supermassive black hole. Its dark dust lane bisects a bright elliptical core — a classic target for astrophotography.',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    catalog: 'Planet',
    distance: '588 million km (avg)',
    constellation: 'Varies',
    visibility: 'Dominant evening planet when above the horizon.',
    azimuth: 245,
    altitude: 55,
    zoom: 85,
    glow: '#fcd34d',
    magnitude: -2.5,
    type: 'Gas giant',
    ai_explanation:
      'Jupiter is the largest planet in the solar system. Through a telescope you may resolve cloud bands and the four Galilean moons. Its position shifts nightly against the zodiac constellations.',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    catalog: 'Planet',
    distance: '1.2 billion km (avg)',
    constellation: 'Varies',
    visibility: 'Evening object when well placed; rings visible at moderate magnification.',
    azimuth: 118,
    altitude: 46,
    zoom: 88,
    glow: '#fde68a',
    magnitude: 0.6,
    type: 'Ringed planet',
    ai_explanation:
      'Saturn\'s ring system is among the most striking sights in amateur astronomy. The Cassini division and major moons become visible under steady seeing and sufficient aperture.',
  },
  {
    id: 'jewel-box',
    name: 'Jewel Box Cluster',
    catalog: 'NGC 4755',
    distance: '6,440 light years',
    constellation: 'Crux',
    visibility: 'Southern cross region; spectacular in binoculars.',
    azimuth: 195,
    altitude: 22,
    zoom: 70,
    glow: '#34d399',
    magnitude: 4.2,
    type: 'Open cluster',
    ai_explanation:
      'The Jewel Box (NGC 4755) is a young open cluster whose contrasting orange supergiant and blue-white stars give it a jewel-like appearance in telescopes and binoculars.',
  },
  {
    id: '47-tuc',
    name: '47 Tucanae',
    catalog: 'NGC 104',
    distance: '13,000 light years',
    constellation: 'Tucana',
    visibility: 'Bright southern globular; visible naked-eye under dark skies.',
    azimuth: 228,
    altitude: 35,
    zoom: 68,
    glow: '#e2e8f0',
    magnitude: 4.0,
    type: 'Globular cluster',
    ai_explanation:
      '47 Tucanae is the second-brightest globular cluster after Omega Centauri. Its dense core resolves into countless stars at higher magnification.',
  },
];

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, max-age=60');
}

function findObject(id) {
  return SKY_OBJECTS.find(o => o.id === id) || SKY_OBJECTS[0];
}

function pointingTolerance(zoom) {
  const z = Number(zoom) || 50;
  return Math.max(1.5, 8 - z * 0.06);
}

function computePointing(object, azimuth, altitude, zoom) {
  const az = Number(azimuth);
  const alt = Number(altitude);
  const offsetAz = az - object.azimuth;
  const offsetAlt = alt - object.altitude;
  const distance = Math.sqrt(offsetAz ** 2 + offsetAlt ** 2);
  const tolerance = pointingTolerance(zoom);
  const aligned = distance <= tolerance;
  const inFov = distance <= tolerance * 2.5;

  return {
    aligned,
    in_fov: inFov,
    offset_az: +offsetAz.toFixed(2),
    offset_alt: +offsetAlt.toFixed(2),
    angular_distance: +distance.toFixed(2),
    tolerance_deg: +tolerance.toFixed(2),
    recommended: {
      azimuth: object.azimuth,
      altitude: object.altitude,
      zoom: object.zoom,
    },
    message: aligned
      ? `${object.name} is centred on the crosshair.`
      : inFov
        ? `${object.name} is in the field of view — adjust azimuth/altitude to centre.`
        : `${object.name} is outside the current field of view.`,
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const lat = req.query?.lat != null ? Number(req.query.lat) : DEFAULT_OBS.lat;
  const lon = req.query?.lon != null ? Number(req.query.lon) : DEFAULT_OBS.lon;

  if (req.method === 'GET') {
    const defaultObject = SKY_OBJECTS[0];
    return res.status(200).json({
      success: true,
      provider: 'ZINGSA Telescope Simulator API',
      location: { ...DEFAULT_OBS, lat, lon },
      telescope: {
        model: 'Simulated 0.6 m Ritchey–Chrétien',
        mount: 'German equatorial (simulated)',
        fov_arcmin: 25,
        default_azimuth: defaultObject.azimuth,
        default_altitude: defaultObject.altitude,
        default_zoom: defaultObject.zoom,
      },
      objects: SKY_OBJECTS.map(({ ai_explanation, ...rest }) => rest),
      default_object_id: defaultObject.id,
      instructions: 'Select an object and point the simulated telescope.',
      endpoints: {
        catalog: 'GET /api/astronomy/telescope',
        actions: 'POST /api/astronomy/telescope { action, objectId, azimuth, altitude, zoom }',
      },
      updated_utc: new Date().toISOString(),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  const { action = 'point', objectId, azimuth, altitude, zoom } = req.body || {};
  const object = findObject(objectId);
  const pointing = computePointing(object, azimuth, altitude, zoom);

  if (action === 'point') {
    return res.status(200).json({
      success: true,
      action: 'point',
      object: { id: object.id, name: object.name, catalog: object.catalog },
      pointing,
      slewing: true,
      slew_target: pointing.recommended,
      message: `Slew initiated toward ${object.name} at Az ${object.azimuth}°, Alt ${object.altitude}°.`,
    });
  }

  if (action === 'track') {
    return res.status(200).json({
      success: true,
      action: 'track',
      object: { id: object.id, name: object.name },
      pointing,
      tracking_active: pointing.aligned,
      sidereal_rate: '15.041 arcsec/s',
      message: pointing.aligned
        ? `Tracking ${object.name} at sidereal rate.`
        : `Cannot lock tracking — centre ${object.name} on the crosshair first.`,
    });
  }

  if (action === 'explain') {
    return res.status(200).json({
      success: true,
      action: 'explain',
      object: { id: object.id, name: object.name, catalog: object.catalog },
      explanation: object.ai_explanation,
      pointing,
      source: 'ZINGSA Astronomy AI (simulated)',
    });
  }

  if (action === 'details') {
    return res.status(200).json({
      success: true,
      action: 'details',
      object: {
        id: object.id,
        name: object.name,
        catalog: object.catalog,
        distance: object.distance,
        constellation: object.constellation,
        visibility: object.visibility,
        magnitude: object.magnitude,
        type: object.type,
      },
      pointing,
    });
  }

  return res.status(400).json({ detail: `Unknown action: ${action}` });
}
