/**
 * RTCM3 Stream Analyzer
 * Detects RTCM3 message frames in a binary buffer and extracts message types.
 * RTCM3 frame: [0xD3][10-bit reserved + 10-bit length][data][3-byte CRC24Q]
 */

export const RTCM_PREAMBLE = 0xD3;

/** Message type → human label + constellation */
export const RTCM_TYPES = {
  1001: { label: 'GPS L1 Obs (old)',      constellation: 'GPS' },
  1002: { label: 'GPS L1 Full Obs',       constellation: 'GPS' },
  1003: { label: 'GPS L1/L2 Obs',         constellation: 'GPS' },
  1004: { label: 'GPS L1/L2 Full Obs',    constellation: 'GPS' },
  1005: { label: 'Station XYZ',           constellation: null },
  1006: { label: 'Station XYZ + Height',  constellation: null },
  1007: { label: 'Antenna Descriptor',    constellation: null },
  1008: { label: 'Antenna S/N',           constellation: null },
  1009: { label: 'GLONASS L1 Obs',        constellation: 'GLONASS' },
  1010: { label: 'GLONASS L1 Full Obs',   constellation: 'GLONASS' },
  1011: { label: 'GLONASS L1/L2 Obs',     constellation: 'GLONASS' },
  1012: { label: 'GLONASS L1/L2 Full',    constellation: 'GLONASS' },
  1019: { label: 'GPS Ephemeris',         constellation: 'GPS' },
  1020: { label: 'GLONASS Ephemeris',     constellation: 'GLONASS' },
  1033: { label: 'Rcvr/Antenna Desc',     constellation: null },
  1042: { label: 'BeiDou Ephemeris',      constellation: 'BeiDou' },
  1044: { label: 'QZSS Ephemeris',        constellation: 'QZSS' },
  1045: { label: 'Galileo F/NAV Eph.',    constellation: 'Galileo' },
  1046: { label: 'Galileo I/NAV Eph.',    constellation: 'Galileo' },
  // GPS MSM
  1071: { label: 'GPS MSM1',  constellation: 'GPS' },
  1072: { label: 'GPS MSM2',  constellation: 'GPS' },
  1073: { label: 'GPS MSM3',  constellation: 'GPS' },
  1074: { label: 'GPS MSM4',  constellation: 'GPS' },
  1075: { label: 'GPS MSM5',  constellation: 'GPS' },
  1076: { label: 'GPS MSM6',  constellation: 'GPS' },
  1077: { label: 'GPS MSM7',  constellation: 'GPS' },
  // GLONASS MSM
  1081: { label: 'GLONASS MSM1', constellation: 'GLONASS' },
  1082: { label: 'GLONASS MSM2', constellation: 'GLONASS' },
  1083: { label: 'GLONASS MSM3', constellation: 'GLONASS' },
  1084: { label: 'GLONASS MSM4', constellation: 'GLONASS' },
  1085: { label: 'GLONASS MSM5', constellation: 'GLONASS' },
  1086: { label: 'GLONASS MSM6', constellation: 'GLONASS' },
  1087: { label: 'GLONASS MSM7', constellation: 'GLONASS' },
  // Galileo MSM
  1091: { label: 'Galileo MSM1', constellation: 'Galileo' },
  1092: { label: 'Galileo MSM2', constellation: 'Galileo' },
  1093: { label: 'Galileo MSM3', constellation: 'Galileo' },
  1094: { label: 'Galileo MSM4', constellation: 'Galileo' },
  1095: { label: 'Galileo MSM5', constellation: 'Galileo' },
  1096: { label: 'Galileo MSM6', constellation: 'Galileo' },
  1097: { label: 'Galileo MSM7', constellation: 'Galileo' },
  // SBAS MSM
  1101: { label: 'SBAS MSM1', constellation: 'SBAS' },
  1107: { label: 'SBAS MSM7', constellation: 'SBAS' },
  // QZSS MSM
  1111: { label: 'QZSS MSM1', constellation: 'QZSS' },
  1117: { label: 'QZSS MSM7', constellation: 'QZSS' },
  // BeiDou MSM
  1121: { label: 'BeiDou MSM1', constellation: 'BeiDou' },
  1122: { label: 'BeiDou MSM2', constellation: 'BeiDou' },
  1123: { label: 'BeiDou MSM3', constellation: 'BeiDou' },
  1124: { label: 'BeiDou MSM4', constellation: 'BeiDou' },
  1125: { label: 'BeiDou MSM5', constellation: 'BeiDou' },
  1126: { label: 'BeiDou MSM6', constellation: 'BeiDou' },
  1127: { label: 'BeiDou MSM7', constellation: 'BeiDou' },
  // NavIC MSM
  1131: { label: 'NavIC MSM1', constellation: 'NavIC' },
  1137: { label: 'NavIC MSM7', constellation: 'NavIC' },
};

/**
 * Scan a Buffer for RTCM3 frames.
 * Returns array of { type, length, offset } objects.
 */
export function scanFrames(buf) {
  const frames = [];
  let i = 0;

  while (i < buf.length - 5) {
    if (buf[i] !== RTCM_PREAMBLE) { i++; continue; }

    // Bytes 1-2: upper 6 bits reserved, lower 10 bits = data length
    const len = ((buf[i + 1] & 0x03) << 8) | buf[i + 2];
    const totalLen = 3 + len + 3; // preamble(1)+length(2) + data + CRC(3)

    if (i + totalLen > buf.length) break; // incomplete frame

    // Message type = first 12 bits of data
    if (len >= 2) {
      const msgType = (buf[i + 3] << 4) | (buf[i + 4] >> 4);
      frames.push({ type: msgType, length: len, offset: i });
    }

    i += totalLen;
  }

  return frames;
}

/** Build a stats summary from a list of frames */
export function summarizeFrames(frames) {
  const typeCounts = {};
  const constellations = new Set();

  for (const f of frames) {
    typeCounts[f.type] = (typeCounts[f.type] || 0) + 1;
    const info = RTCM_TYPES[f.type];
    if (info?.constellation) constellations.add(info.constellation);
  }

  return {
    frameCount: frames.length,
    typeCounts,
    constellations: [...constellations],
    messageTypes: Object.keys(typeCounts).map(Number).sort((a, b) => a - b),
  };
}
