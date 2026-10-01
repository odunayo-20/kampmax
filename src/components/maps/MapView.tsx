"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  SELECTED_LOCATION_ZOOM,
  getMapStyleUrl,
  isMapConfigured,
} from "@/lib/maps/config";
import type { LatLng } from "@/lib/maps/types";

/** A selectable point drawn on the map (rendered as a GeoJSON layer, so it scales and can be clustered later). */
export interface MapPoint extends LatLng {
  id: string;
  /** Optional marker category, e.g. a Nearby entityType. Unknown kinds render like any other point. */
  kind?: string;
}

/**
 * Circle color by `kind`, as a MapLibre `match` expression. Add an arm here to
 * give another kind its own color — everything else stays the default blue.
 * Typed loosely: MapLibre's style-spec types aren't exported by name from
 * this package's rolled-up `.d.ts`.
 */
const POINT_COLOR_BY_KIND = ["match", ["get", "kind"], "EVENT", "#F59E0B", "#1769E0"] as unknown as string;

const POINTS_SOURCE = "kampmax-points";
const CLUSTERS_LAYER = "kampmax-clusters";
const CLUSTER_COUNT_LAYER = "kampmax-cluster-count";
const POINTS_LAYER = "kampmax-points-circles";
const POINTS_SELECTED_LAYER = "kampmax-points-selected";

export interface MapViewProps {
  /** Selectable points (e.g. Nearby results). */
  points?: MapPoint[];
  selectedPointId?: string | null;
  onPointSelect?: (id: string) => void;
  /** Whether points should be clustered at lower zoom levels. Default: true. */
  clustered?: boolean;
  /** Optional callback fired with debounced viewport bounds when map movement settles. */
  onBoundsChange?: (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void;
  /** Re-fit the camera to the points (and marker) whenever this key changes. */
  fitKey?: string;
  /** Marker position. When null, no marker is shown. */
  marker?: LatLng | null;
  /** Click on the map (only fires when `onSelect` is provided). */
  onSelect?: (point: LatLng) => void;
  /** Whether the marker can be dragged; requires `onSelect`. */
  draggable?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Reusable MapLibre map rendering a MapTiler style with MapLibre clustering.
 * MapLibre lives in refs and is created exactly once; prop changes update the
 * existing instance, so React re-renders never rebuild the map.
 */
export function MapView({
  marker = null,
  onSelect,
  draggable = false,
  points,
  selectedPointId = null,
  onPointSelect,
  clustered = true,
  onBoundsChange,
  fitKey,
  className,
  ariaLabel = "Map",
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);
  const onSelectRef = useRef(onSelect);
  const draggableRef = useRef(draggable);
  const markerPropRef = useRef(marker);
  const onPointSelectRef = useRef(onPointSelect);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const fitKeyRef = useRef(fitKey);
  const fittedKeyRef = useRef<string | undefined>(undefined);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(isMapConfigured() ? "loading" : "error");
  const configured = isMapConfigured();

  useEffect(() => {
    onSelectRef.current = onSelect;
    draggableRef.current = draggable;
    markerPropRef.current = marker;
    onPointSelectRef.current = onPointSelect;
    onBoundsChangeRef.current = onBoundsChange;
    fitKeyRef.current = fitKey;
  });

  // Create the map once.
  useEffect(() => {
    if (!configured || !containerRef.current) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    import("maplibre-gl")
      .then((lib) => {
        if (cancelled || !containerRef.current) return;
        libRef.current = lib;
        const start = markerPropRef.current;
        const map = new lib.Map({
          container: containerRef.current,
          style: getMapStyleUrl(),
          center: [(start ?? DEFAULT_MAP_CENTER).longitude, (start ?? DEFAULT_MAP_CENTER).latitude],
          zoom: start ? SELECTED_LOCATION_ZOOM : DEFAULT_MAP_ZOOM,
          attributionControl: { compact: true },
        });
        mapRef.current = map;
        map.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");

        map.on("load", () => {
          if (!cancelled) setStatus("ready");
        });
        // Only a failure before the first load is fatal (bad key / style). Later tile errors are transient.
        map.on("error", () => {
          if (!cancelled && !map.loaded()) setStatus((s) => (s === "ready" ? s : "error"));
        });
        map.on("click", (e) => {
          onSelectRef.current?.({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
        });

        resizeObserver = new ResizeObserver(() => map.resize());
        resizeObserver.observe(containerRef.current);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [configured]);

  // Sync the marker + camera with props.
  const lat = marker?.latitude;
  const lng = marker?.longitude;
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib || status !== "ready") return;

    if (lat === undefined || lng === undefined) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      const m = new lib.Marker({ draggable: draggableRef.current, color: "#1769E0" }).setLngLat([lng, lat]).addTo(map);
      m.on("dragend", () => {
        const p = m.getLngLat();
        onSelectRef.current?.({ latitude: p.lat, longitude: p.lng });
      });
      markerRef.current = m;
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }
    markerRef.current.setDraggable(draggable);

    const current = map.getCenter();
    if (fitKeyRef.current === undefined && (Math.abs(current.lat - lat) > 1e-6 || Math.abs(current.lng - lng) > 1e-6)) {
      map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), SELECTED_LOCATION_ZOOM), duration: 400 });
    }
  }, [lat, lng, draggable, status]);

  // Draw points and cluster layers once the style is ready; later changes only swap the data.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !points) return;
    const data = {
      type: "FeatureCollection" as const,
      features: points.map((p) => ({
        type: "Feature" as const,
        properties: { id: p.id, kind: p.kind ?? "" },
        geometry: { type: "Point" as const, coordinates: [p.longitude, p.latitude] },
      })),
    };
    const source = map.getSource(POINTS_SOURCE);
    if (source && "setData" in source) {
      (source as unknown as { setData: (d: typeof data) => void }).setData(data);
      return;
    }
    map.addSource(POINTS_SOURCE, {
      type: "geojson",
      data,
      cluster: clustered,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    if (clustered) {
      map.addLayer({
        id: CLUSTERS_LAYER,
        type: "circle",
        source: POINTS_SOURCE,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#1769E0",
            10,
            "#0F4BB8",
            30,
            "#0B2345",
          ] as unknown as string,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            16,
            10,
            20,
            30,
            26,
          ] as unknown as number,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFFFFF",
        },
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: "symbol",
        source: POINTS_SOURCE,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
        },
        paint: {
          "text-color": "#FFFFFF",
        },
      });

      map.on("click", CLUSTERS_LAYER, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTERS_LAYER] });
        const feature = features[0];
        const clusterId = feature?.properties?.cluster_id;
        if (clusterId == null) return;
        const sourceInstance = map.getSource(POINTS_SOURCE) as unknown as {
          getClusterExpansionZoom: (id: number, cb: (err: unknown, zoom: number) => void) => void;
        };
        const coords =
          feature?.geometry?.type === "Point"
            ? (feature.geometry as GeoJSON.Point).coordinates as [number, number]
            : undefined;

        if (sourceInstance && typeof sourceInstance.getClusterExpansionZoom === "function") {
          sourceInstance.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            if (coords) {
              map.easeTo({ center: coords, zoom: Math.min(zoom + 0.5, 18), duration: 400 });
            }
          });
        } else if (coords) {
          map.easeTo({ center: coords, zoom: map.getZoom() + 2, duration: 400 });
        }
      });

      map.on("mouseenter", CLUSTERS_LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", CLUSTERS_LAYER, () => {
        map.getCanvas().style.cursor = "";
      });
    }

    map.addLayer({
      id: POINTS_LAYER,
      type: "circle",
      source: POINTS_SOURCE,
      filter: clustered ? (["!", ["has", "point_count"]] as any) : undefined,
      paint: {
        "circle-radius": 7,
        "circle-color": POINT_COLOR_BY_KIND,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#FFFFFF",
      },
    });

    map.addLayer({
      id: POINTS_SELECTED_LAYER,
      type: "circle",
      source: POINTS_SOURCE,
      filter: ["==", ["get", "id"], ""],
      paint: {
        "circle-radius": 11,
        "circle-color": "#0B2345",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#FFFFFF",
      },
    });

    map.on("click", POINTS_LAYER, (e) => {
      const id = e.features?.[0]?.properties?.id;
      if (typeof id === "string") onPointSelectRef.current?.(id);
    });
    map.on("mouseenter", POINTS_LAYER, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", POINTS_LAYER, () => {
      map.getCanvas().style.cursor = "";
    });
  }, [points, status, clustered]);

  // Highlight + reveal the selected point (auto-expanding cluster if needed).
  const selected = selectedPointId ? points?.find((p) => p.id === selectedPointId) : undefined;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !map.getLayer(POINTS_SELECTED_LAYER)) return;
    map.setFilter(POINTS_SELECTED_LAYER, ["==", ["get", "id"], selectedPointId ?? ""]);
    if (selected) {
      const bounds = map.getBounds();
      const currentZoom = map.getZoom();
      const needsZoom = currentZoom < 14;
      const needsPan = !bounds.contains([selected.longitude, selected.latitude]);
      if (needsPan || needsZoom) {
        map.easeTo({
          center: [selected.longitude, selected.latitude],
          zoom: Math.max(currentZoom, 15),
          duration: 350,
        });
      }
    }
  }, [selectedPointId, selected, points, status]);

  // Viewport bounds change reporting with settling debounce
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !onBoundsChange) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleMoveEnd = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (!mapRef.current) return;
        const b = mapRef.current.getBounds();
        onBoundsChangeRef.current?.({
          minLat: (b as unknown as { getSouth: () => number }).getSouth?.() ?? -90,
          maxLat: (b as unknown as { getNorth: () => number }).getNorth?.() ?? 90,
          minLng: (b as unknown as { getWest: () => number }).getWest?.() ?? -180,
          maxLng: (b as unknown as { getEast: () => number }).getEast?.() ?? 180,
        });
      }, 400);
    };

    map.on("moveend", handleMoveEnd);
    return () => {
      if (timer) clearTimeout(timer);
      map.off("moveend", handleMoveEnd);
    };
  }, [status, onBoundsChange]);

  // Fit the camera when the search context (fitKey) changes — never on every render.
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib || status !== "ready" || fitKey === undefined || fittedKeyRef.current === fitKey) return;
    const bounds = new lib.LngLatBounds();
    let count = 0;
    for (const p of points ?? []) {
      bounds.extend([p.longitude, p.latitude]);
      count++;
    }
    if (lat !== undefined && lng !== undefined) {
      bounds.extend([lng, lat]);
      count++;
    }
    if (count === 0) return;
    fittedKeyRef.current = fitKey;
    if (count === 1) map.easeTo({ center: bounds.getCenter(), zoom: 14, duration: 300 });
    else map.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 300 });
  }, [fitKey, points, status, lat, lng]);

  function recenter() {
    if (lat === undefined || lng === undefined) return;
    mapRef.current?.easeTo({ center: [lng, lat], zoom: SELECTED_LOCATION_ZOOM, duration: 400 });
  }

  if (!configured) {
    return (
      <div
        role="status"
        className={cn("flex h-64 flex-col items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 px-4 text-center", className)}
      >
        <MapPin className="mb-2 h-6 w-6 text-neutral-400" aria-hidden />
        <p className="text-sm font-medium text-neutral-800">Map unavailable</p>
        <p className="mt-1 text-xs text-neutral-500">The map isn&apos;t configured yet. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className={cn("relative h-64 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100", className)}>
      <div ref={containerRef} className="h-full w-full" role="application" aria-label={ariaLabel} />
      {status === "ready" && lat !== undefined && (
        <button
          type="button"
          onClick={recenter}
          aria-label="Center map on selected location"
          className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 bg-white text-neutral-700 shadow-sm hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
        >
          <Crosshair className="h-4 w-4" aria-hidden />
        </button>
      )}
      {status === "loading" && (
        <div role="status" className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-sm text-neutral-500">
          Loading map…
        </div>
      )}
      {status === "error" && (
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-50 px-4 text-center">
          <p className="text-sm font-medium text-neutral-800">The map couldn&apos;t load</p>
          <p className="mt-1 text-xs text-neutral-500">Check your connection and reload the page.</p>
        </div>
      )}
    </div>
  );
}
