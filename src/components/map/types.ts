import { Coords } from '../../lib/types';

export interface MapMarker {
  id: string;
  coords: Coords;
  /** Restaurant name, drawn on the pin itself. */
  label: string;
  rating: number;
  /** Metres from the user. */
  distance: number;
  /** Top-ranked results get the accent treatment. */
  highlight: boolean;
  isOpen: boolean;
  /**
   * True when nobody has published this place's hours. Distinct from `isOpen:
   * false`, which is a reading: pins are dimmed to mean "shut right now", and
   * dimming one we know nothing about asserts a closure on no evidence.
   */
  hoursUnknown: boolean;
}

export interface EmbedMapProps {
  /** Built by `lib/embed.ts`; carries the API key, so never log it. */
  url: string;
  /** Accessible name for the frame, e.g. "Map of Nasi Kandar Pelita". */
  title: string;
  height: number;
}

export interface MapSurfaceProps {
  origin: Coords;
  markers: MapMarker[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Radius the initial viewport should comfortably contain, in metres. */
  radiusMetres: number;
  /** Increment to re-centre on the user. */
  recenterKey: number;
}
