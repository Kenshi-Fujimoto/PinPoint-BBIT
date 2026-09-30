// @vitest-environment jsdom
/**
 * Location-picker regression tests. Only the Leaflet rendering boundary is
 * mocked; the modal, shared data, geofence and selection logic are real. Opening
 * the modal must exercise every map component and hook so missing imports fail
 * here instead of shipping a runtime crash to the reporting forms.
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MapLocationPickerModal from './MapLocationPickerModal';
import { BBIT_MAP_CENTER, clampToCampus } from '../types';
import { findPlaceById, placeCategories, searchPlaces } from '../lib/campusData';

const leaflet = vi.hoisted(() => ({
  map: {
    invalidateSize: vi.fn(),
    flyTo: vi.fn(),
    getZoom: vi.fn(),
  },
  events: {},
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, center, zoom }) => (
    <div data-testid="picker-map" data-center={JSON.stringify(center)} data-zoom={zoom}>
      {children}
    </div>
  ),
  TileLayer: ({ url }) => <div data-testid="tile-layer" data-url={url} />,
  Marker: ({ position, icon }) => (
    <div data-testid="selected-pin" data-position={JSON.stringify(position)} data-icon={icon} />
  ),
  useMap: () => leaflet.map,
  useMapEvents: (events) => {
    leaflet.events = events;
    return leaflet.map;
  },
}));

vi.mock('./map/mapIcons', () => ({ pickerPinIcon: 'picker-pin' }));

vi.mock('./map/CampusLayers', () => {
  const layer = (name) => function MockLayer({ zoom }) {
    return <div data-testid={`layer-${name}`} data-zoom={zoom} />;
  };
  return {
    MAP_THEMES: { satellite: {} },
    CampusBoundary: layer('boundary'),
    CampusGreens: layer('greens'),
    CampusWater: layer('water'),
    CampusRoads: layer('roads'),
    CampusGates: layer('gates'),
    PlaceFootprints: ({ places, zoom, onUse }) => (
      <div data-testid="place-footprints" data-count={places.length} data-zoom={zoom}>
        {places.map((place) => (
          <button key={place.id} type="button" onClick={() => onUse(place)}>
            Pin {place.name}
          </button>
        ))}
      </div>
    ),
  };
});

function renderPicker(overrides = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirmLocation: vi.fn(),
    ...overrides,
  };
  return { ...render(<MapLocationPickerModal {...props} />), props };
}

function selectedPosition() {
  return JSON.parse(screen.getByTestId('selected-pin').getAttribute('data-position'));
}

function nameInput() {
  return screen.getByPlaceholderText('e.g. Main Gate, Central Library, Cricket Ground');
}

beforeEach(() => {
  vi.clearAllMocks();
  leaflet.map.getZoom.mockReturnValue(18);
  leaflet.events = {};
});

afterEach(cleanup);

describe('campus location picker', () => {
  it('does not render the map while closed', () => {
    const { container } = renderPicker({ isOpen: false });
    expect(container.childElementCount).toBe(0);
    expect(leaflet.map.invalidateSize).not.toHaveBeenCalled();
  });

  it('opens with the map, tile layers, pin and all map hooks defined', () => {
    renderPicker();
    expect(screen.getByRole('heading', { name: 'Pinpoint Campus Location' })).toBeTruthy();
    expect(screen.getByTestId('picker-map').getAttribute('data-center')).toBe(JSON.stringify(BBIT_MAP_CENTER));
    expect(screen.getAllByTestId('tile-layer')).toHaveLength(2);
    expect(screen.getByTestId('selected-pin').getAttribute('data-icon')).toBe('picker-pin');
    expect(leaflet.map.invalidateSize).toHaveBeenCalled();
    expect(leaflet.map.flyTo).toHaveBeenCalled();
    expect(leaflet.events.click).toBeTypeOf('function');
    expect(leaflet.events.zoomend).toBeTypeOf('function');
  });

  it('clamps an initial location outside the campus before showing the pin', () => {
    renderPicker({ initialLat: 22, initialLng: 88 });
    const expected = clampToCampus(22, 88);
    expect(selectedPosition()).toEqual(expected);
    expect(leaflet.map.flyTo).toHaveBeenCalledWith(expected, 18.5, { duration: 1 });
  });

  it('switches between satellite and street tiles', () => {
    renderPicker();
    const tileUrls = () => screen.getAllByTestId('tile-layer').map((tile) => tile.getAttribute('data-url'));
    expect(tileUrls().some((url) => url.includes('World_Imagery'))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Satellite' }));
    expect(tileUrls()).toEqual(['https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png']);
    fireEvent.click(screen.getByRole('button', { name: 'Street' }));
    expect(tileUrls()).toHaveLength(2);
    expect(tileUrls().some((url) => url.includes('World_Imagery'))).toBe(true);
  });

  it('toggles the surveyed overlays without removing the selected pin', () => {
    renderPicker();
    expect(screen.getByTestId('place-footprints').getAttribute('data-count')).toBe('50');
    fireEvent.click(screen.getByRole('button', { name: '50 Places' }));
    expect(screen.queryByTestId('place-footprints')).toBeNull();
    expect(screen.queryByTestId('layer-boundary')).toBeNull();
    expect(screen.getByTestId('selected-pin')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '50 Places' }));
    for (const name of ['boundary', 'greens', 'water', 'roads', 'gates']) {
      expect(screen.getByTestId(`layer-${name}`)).toBeTruthy();
    }
  });

  it('filters the place list and footprints using the shared search data', () => {
    renderPicker();
    const search = screen.getByPlaceholderText('Search building, lab, hostel...');
    fireEvent.change(search, { target: { value: 'library' } });
    expect(screen.getByTestId('place-footprints').getAttribute('data-count')).toBe(String(searchPlaces('library').length));
    expect(screen.getByText('Central Library')).toBeTruthy();
    expect(screen.queryByText('Main Gate')).toBeNull();
    fireEvent.change(search, { target: { value: 'zzzzz-no-such-place' } });
    expect(screen.getByTestId('place-footprints').getAttribute('data-count')).toBe('0');
    fireEvent.change(search, { target: { value: '' } });
    expect(screen.getByTestId('place-footprints').getAttribute('data-count')).toBe('50');
  });

  it('filters by category and restores every place with All', () => {
    renderPicker();
    const hostelCategory = placeCategories().find((category) => category.id === 'hostel');
    fireEvent.click(screen.getByRole('button', { name: hostelCategory.label }));
    expect(screen.getByTestId('place-footprints').getAttribute('data-count')).toBe(String(hostelCategory.count));
    expect(screen.queryByText('Main Gate')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByTestId('place-footprints').getAttribute('data-count')).toBe('50');
  });

  it('selects a place from either the list or a footprint and flies to its pin', () => {
    renderPicker();
    const library = findPlaceById('central-library');
    fireEvent.click(screen.getByText(library.name));
    expect(selectedPosition()).toEqual([library.lat, library.lng]);
    expect(nameInput().value).toBe(library.name);
    expect(leaflet.map.flyTo).toHaveBeenCalledWith([library.lat, library.lng], 18.5, { duration: 1 });
    const gate = findPlaceById('main-gate');
    fireEvent.click(screen.getByRole('button', { name: `Pin ${gate.name}` }));
    expect(selectedPosition()).toEqual([gate.lat, gate.lng]);
    expect(nameInput().value).toBe(gate.name);
    expect(leaflet.map.flyTo).toHaveBeenCalledWith([gate.lat, gate.lng], 18.5, { duration: 1 });
  });

  it('clamps map clicks to the campus and rounds coordinates to six decimals', () => {
    renderPicker();
    act(() => leaflet.events.click({ latlng: { lat: 22, lng: 88 } }));
    expect(selectedPosition()).toEqual(clampToCampus(22, 88).map((coordinate) => Number(coordinate.toFixed(6))));
  });

  it('confirms numeric coordinates and a trimmed custom name, then closes', () => {
    const { props } = renderPicker();
    const position = selectedPosition();
    fireEvent.change(nameInput(), { target: { value: '  Library entrance  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Location' }));
    expect(props.onConfirmLocation).toHaveBeenCalledExactlyOnceWith({
      name: 'Library entrance',
      lat: position[0],
      lng: position[1],
    });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('passes the current map zoom to the shared layers', () => {
    renderPicker();
    expect(screen.getByTestId('place-footprints').getAttribute('data-zoom')).toBe('18');
    leaflet.map.getZoom.mockReturnValue(19);
    act(() => leaflet.events.zoomend());
    expect(screen.getByTestId('place-footprints').getAttribute('data-zoom')).toBe('19');
    expect(screen.getByTestId('layer-boundary').getAttribute('data-zoom')).toBe('19');
  });

  it('resets the location and resizes the map when the modal is reopened', () => {
    const { props, rerender } = renderPicker();
    fireEvent.click(screen.getByText('Main Gate'));
    rerender(<MapLocationPickerModal {...props} isOpen={false} />);
    expect(screen.queryByTestId('picker-map')).toBeNull();
    const library = findPlaceById('central-library');
    rerender(
      <MapLocationPickerModal
        {...props}
        initialLat={library.lat}
        initialLng={library.lng}
        initialName={library.name}
      />,
    );
    expect(selectedPosition()).toEqual([library.lat, library.lng]);
    expect(nameInput().value).toBe(library.name);
    expect(leaflet.map.invalidateSize).toHaveBeenCalledTimes(2);
  });
});
