/**
 * Map Canvas — Mapbox GL Spatial Navigation Layer
 *
 * The physical-world base layer of the Workshop infinite canvas.
 * A slowly rotating dark satellite globe renders beneath the
 * particle field, grounding Hugh's digital consciousness in
 * geographic reality.
 *
 * Architecture:
 *   z-index: -2 (below CliffordField at -1)
 *   Dimmed to 35% opacity with dark filter
 *   Globe projection with atmospheric fog
 *   Slow idle rotation (0.01°/frame)
 *   Navigation pheromones trigger flyTo animations
 *
 * @version 1.0 — Phase 6: Mapbox Integration
 * @classification Production Ready
 */

import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

// Mapbox GL loaded dynamically to prevent module-level crashes in Safari
let mapboxgl: any = null;
let mapboxLoaded = false;
let mapboxFailed = false;

const loadMapbox = async () => {
  if (mapboxLoaded || mapboxFailed) return mapboxgl;
  try {
    const mod = await import('mapbox-gl');
    await import('mapbox-gl/dist/mapbox-gl.css');
    mapboxgl = mod.default;
    mapboxLoaded = true;
    return mapboxgl;
  } catch (err) {
    console.warn('[MapCanvas] Mapbox GL failed to load:', err);
    mapboxFailed = true;
    return null;
  }
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

export const MapCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const spinRef = useRef<number>(0);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(mapboxLoaded);

  const activeVisual = useQuery(api.pheromones.getActiveVisual);

  // ─── Load Mapbox GL dynamically ─────────────────────────────
  useEffect(() => {
    if (mapboxLoaded) { setReady(true); return; }
    if (mapboxFailed) return;
    loadMapbox().then(gl => { if (gl) setReady(true); });
  }, []);

  // ─── Initialize Globe ───────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN || !ready || !mapboxgl || mapRef.current) return;

    let map: any;
    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        projection: 'globe',
        center: [-98.58, 39.83],
        zoom: 2.5,
        pitch: 45,
        bearing: -17.6,
        antialias: true,
        interactive: false,
        fadeDuration: 0,
      });
    } catch (err) {
      console.error('[MapCanvas] Mapbox initialization failed:', err);
      return;
    }

    map.on('style.load', () => {
      map.setFog({
        color: 'rgb(10, 10, 10)',
        'high-color': 'rgb(20, 30, 40)',
        'horizon-blend': 0.08,
        'space-color': 'rgb(5, 5, 8)',
        'star-intensity': 0.8,
      });
      setLoaded(true);
    });

    mapRef.current = map;

    const spin = () => {
      if (mapRef.current && !mapRef.current.isMoving()) {
        const center = mapRef.current.getCenter();
        center.lng -= 0.008;
        mapRef.current.setCenter(center);
      }
      spinRef.current = requestAnimationFrame(spin);
    };
    spin();

    return () => {
      cancelAnimationFrame(spinRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, [ready]);

  // ─── Navigation Pheromone Response ──────────────────────────
  useEffect(() => {
    if (!mapRef.current || !loaded || !activeVisual) return;

    for (const p of activeVisual) {
      const content = (p as any).content;

      // Navigation pheromones with coordinates trigger flyTo
      if (content?.type === 'navigation' && content?.coordinates) {
        const coords = content.coordinates;
        mapRef.current.flyTo({
          center: [coords.lng, coords.lat],
          zoom: coords.zoom ?? 12,
          pitch: 60,
          bearing: coords.bearing ?? 0,
          duration: 2000,
          essential: true,
        });
        break; // Only fly to the first navigation target
      }

      // Navigation pheromones with geojson add data layers
      if (content?.type === 'navigation' && content?.geojson) {
        const sourceId = `pheromone-${(p as any)._id}`;
        if (!mapRef.current.getSource(sourceId)) {
          mapRef.current.addSource(sourceId, {
            type: 'geojson',
            data: content.geojson,
          });
          mapRef.current.addLayer({
            id: `${sourceId}-layer`,
            type: 'circle',
            source: sourceId,
            paint: {
              'circle-radius': 6,
              'circle-color': '#4ecdc4',
              'circle-opacity': 0.8,
              'circle-stroke-width': 1,
              'circle-stroke-color': 'rgba(78, 205, 196, 0.3)',
            },
          });
        }
      }
    }
  }, [activeVisual, loaded]);

  // ─── Handle Resize ──────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => mapRef.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // No token = no map (graceful degradation)
  if (!MAPBOX_TOKEN) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -2,
        opacity: 0.35,
        filter: 'brightness(0.5) saturate(0.6)',
        pointerEvents: 'none',
      }}
    />
  );
};

export default MapCanvas;
