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
