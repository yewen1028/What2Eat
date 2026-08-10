// `react-native-maps` has no web implementation, so the browser always gets the
// schematic. Metro picks this file over `MapSurface.tsx` for platform `web`.
export { SchematicMap as MapSurface } from './SchematicMap';
