import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button';

/**
 * Strict coordinate validator: prevents Leaflet unrecoverable NaN / invalid coordinate crashes
 */
export const isValidCoord = (coord) => {
  if (!Array.isArray(coord) || coord.length < 2) return false;
  const [lat, lon] = coord;
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lon) &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
};

/**
 * Normalizes and sanitizes coordinate tuples, supporting numeric strings and falling back gracefully
 */
export const sanitizeCoord = (coord, fallback = null) => {
  if (!Array.isArray(coord) || coord.length < 2) return fallback;
  const lat = typeof coord[0] === 'number' ? coord[0] : parseFloat(coord[0]);
  const lon = typeof coord[1] === 'number' ? coord[1] : parseFloat(coord[1]);
  if (isValidCoord([lat, lon])) {
    return [lat, lon];
  }
  return fallback;
};

/**
 * React Error Boundary specifically isolating the interactive map component
 */
export class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('Caught map rendering error safely:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-3 my-4">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
          <div>
            <h4 className="font-semibold text-sm text-slate-800">Map Preview Unavailable</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Interactive map could not load route waypoints cleanly. Your turn-by-turn itinerary and transport options remain fully accessible.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => this.setState({ hasError: false })}
          >
            Retry Map
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
