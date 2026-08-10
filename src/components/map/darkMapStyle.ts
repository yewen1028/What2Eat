/**
 * Google Maps styling for dark mode on Android (iOS follows
 * `userInterfaceStyle`). Kept deliberately low-contrast so the ember pins are
 * the brightest thing on screen.
 */
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1B1815' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8E827A' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#14100E' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2A2320' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#7A6E66' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3A312C' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0E1416' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#211D1A' }] },
];

/** The light counterpart: strip POI noise so our own pins read clearly. */
export const lightMapStyle = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];
