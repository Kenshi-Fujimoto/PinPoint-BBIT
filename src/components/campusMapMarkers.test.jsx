/**
 * Campus maps must render location points, not the approximate rectangles
 * stored in the place catalogue. Mock only Leaflet's browser-dependent layer
 * components so both real map components can be checked in the node test suite.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BBIT_CAMPUS_PLACES } from '../types';
import InteractiveMap from './InteractiveMap';
import MapLocationPickerModal from './MapLocationPickerModal';

vi.mock('leaflet', () => ({
  default: { divIcon: (options) => options },
}));

vi.mock('react-leaflet', async () => {
  const { createElement, Fragment } = await import('react');
  const childrenOnly = ({ children }) => createElement(Fragment, null, children);
  const areaLayer = () => createElement('div', { 'data-map-area': true });

  return {
    MapContainer: childrenOnly,
    TileLayer: () => null,
    Marker: ({ children, position, icon }) => createElement('div', {
      'data-map-marker': icon.className,
      'data-position': JSON.stringify(position),
    }, children),
    Popup: childrenOnly,
    Tooltip: childrenOnly,
    Polygon: areaLayer,
    Rectangle: areaLayer,
    Circle: areaLayer,
    useMap: () => ({ flyTo() {}, invalidateSize() {} }),
    useMapEvents: () => ({ getZoom: () => 17 }),
  };
});

function expectCampusPoints(html, iconClass) {
  const markers = html.match(new RegExp(`data-map-marker="${iconClass}"`, 'g')) || [];
  expect(markers).toHaveLength(BBIT_CAMPUS_PLACES.length);
  expect(html).not.toContain('data-map-area');

  for (const place of BBIT_CAMPUS_PLACES) {
    expect(html).toContain(`data-position="[${place.lat},${place.lng}]"`);
  }
  expect(html).toContain('Cricket Ground');
  expect(html).toContain('BBIT Public School');
}

describe('Campus maps: point markers only', () => {
  it('keeps all 50 satellite-map points and labels without drawing place polygons', () => {
    const html = renderToStaticMarkup(<InteractiveMap />);
    expectCampusPoints(html, 'custom-dot-pin');
  });

  it('preserves civic and lost-item pins alongside the campus points', () => {
    const html = renderToStaticMarkup(
      <InteractiveMap
        civicIssues={[{
          id: 'test-civic',
          title: 'Reported road hazard',
          category: 'pothole',
          status: 'reported',
          urgencyUpvotes: 1,
          location: { lat: 22.4589, lng: 88.1695, name: 'Campus' },
        }]}
        lostFoundItems={[{
          id: 'test-lost',
          title: 'Lost keys',
          type: 'lost',
          category: 'keys_cards',
          status: 'reported',
          location: { lat: 22.4594, lng: 88.1685, name: 'Campus' },
        }]}
      />,
    );
    expectCampusPoints(html, 'custom-dot-pin');
    expect(html.match(/data-map-marker="custom-map-pin"/g)).toHaveLength(2);
  });

  it('keeps picker dots, labels and the selected pin without any area boxes', () => {
    const html = renderToStaticMarkup(<MapLocationPickerModal isOpen />);
    expectCampusPoints(html, 'picker-building-dot');
    expect(html.match(/data-map-marker="custom-picker-pin"/g)).toHaveLength(1);
    expect(html).toContain('Toggle campus place markers');
    expect(html).not.toContain('Building Outlines');
  });

  it('does not render the location picker when it is closed', () => {
    expect(renderToStaticMarkup(<MapLocationPickerModal isOpen={false} />)).toBe('');
  });
});
