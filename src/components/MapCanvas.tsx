import { useEffect, useRef } from "react";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { MapPin } from "lucide-react";
import { categoryIcon } from "../icons";
import type { Category, PersonalPin, Point } from "../types";

export interface MapApi {
  zoomIn(): void;
  zoomOut(): void;
  reset(): void;
  focus(point: { x: number; y: number }): void;
}
interface Props {
  points: Point[];
  categories: Category[];
  found: Set<number>;
  selected: number | null;
  pins: PersonalPin[];
  labels: boolean;
  addMode: boolean;
  apiRef: React.RefObject<MapApi | null>;
  onSelect(point: Point): void;
  onPinSelect(pin: PersonalPin): void;
  onAdd(x: number, y: number): void;
  onPosition(x: number, y: number): void;
}
const display = (p: Point) => p.name || p.title;
export default function MapCanvas(props: Props) {
  const node = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    layer = useRef<L.LayerGroup | null>(null);
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    const m = L.map(node.current!, {
      crs: L.CRS.Simple,
      zoomControl: false,
      attributionControl: false,
      minZoom: -3,
      maxZoom: 2,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      maxBounds: [
        [-600, -600],
        [4600, 4600],
      ],
      maxBoundsViscosity: 0.8,
      preferCanvas: true,
    });
    const bounds: L.LatLngBoundsExpression = [
      [0, 0],
      [4000, 4000],
    ];
    L.imageOverlay("/maps/exiled-lands-4000-v1.jpg", bounds, {
      interactive: false,
    }).addTo(m);
    map.current = m;
    layer.current = L.layerGroup().addTo(m);
    const reset = () => {
      m.fitBounds(bounds, { animate: false, padding: [12, 12] });
    };
    reset();
    m.setZoom(m.getZoom() + 0.75, { animate: false });
    m.panTo([1750, 1800], { animate: false });
    props.apiRef.current = {
      zoomIn: () => m.zoomIn(),
      zoomOut: () => m.zoomOut(),
      reset,
      focus: (p) =>
        m.flyTo([4000 - p.y, p.x], Math.max(m.getZoom(), -0.25), {
          duration: 0.5,
        }),
    };
    m.on("click", (e) => {
      if (latest.current.addMode) {
        const x = e.latlng.lng,
          y = 4000 - e.latlng.lat;
        if (x >= 0 && x <= 4000 && y >= 0 && y <= 4000)
          latest.current.onAdd(x, y);
      }
    });
    m.on("mousemove", (e) =>
      latest.current.onPosition(e.latlng.lng, 4000 - e.latlng.lat),
    );
    const obs = new ResizeObserver(() => m.invalidateSize());
    obs.observe(node.current!);
    return () => {
      obs.disconnect();
      m.remove();
      map.current = null;
      props.apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current,
      group = layer.current;
    if (!m || !group) return;
    const cats = new Map(props.categories.map((c) => [c.id, c]));
    const iconCache = new Map<string, string>();
    const render = () => {
      group.clearLayers();
      const visible = m.getBounds().pad(0.2),
        zoom = m.getZoom();
      for (const p of props.points) {
        const latlng = L.latLng(4000 - p.y, p.x);
        if (!visible.contains(latlng)) continue;
        const cat = cats.get(p.categoryId)!;
        const found = props.found.has(p.id),
          selected = p.id === props.selected;
        const isResource = cat.groupId === 756;
        let marker: L.Marker | L.CircleMarker;
        if (isResource && !selected)
          marker = L.circleMarker(latlng, {
            radius: zoom > 0 ? 6 : 4.5,
            color: cat.color,
            weight: 1,
            fillColor: found ? "#5a6570" : cat.color,
            fillOpacity: found ? 0.25 : 0.9,
            opacity: found ? 0.35 : 1,
          });
        else {
          const Icon = categoryIcon(p.categoryId);
          const size = selected ? 28 : zoom <= -1 ? 18 : zoom < 0 ? 23 : 27;
          const key = `${p.categoryId}:${size}`;
          if (!iconCache.has(key))
            iconCache.set(
              key,
              renderToStaticMarkup(
                <Icon size={size * 0.55} strokeWidth={2.2} />,
              ),
            );
          const html = `<span class="map-pin ${found ? "is-found" : ""} ${selected ? "is-selected" : ""}" style="--pin-color:${cat.color};width:${size}px;height:${size}px">${iconCache.get(key)}${found ? "<b>✓</b>" : ""}</span>`;
          marker = L.marker(latlng, {
            icon: L.divIcon({
              html,
              className: "map-marker",
              iconSize: [size, size + 5],
              iconAnchor: [size / 2, size - 1],
            }),
            zIndexOffset: selected ? 2000 : cat.groupId === 750 ? 500 : 0,
            keyboard: true,
            title: display(p),
            alt: display(p),
          });
        }
        const tooltip = document.createElement("span");
        tooltip.textContent = display(p) + (p.name ? "" : " · 待核对");
        marker.bindTooltip(tooltip, {
          direction: "top",
          offset: [0, -18],
          permanent: props.labels && (!isResource || zoom > 0),
          className: "point-tooltip",
        });
        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          if (!latest.current.addMode) latest.current.onSelect(p);
        });
        group.addLayer(marker);
      }
      for (const p of props.pins) {
        const marker = L.marker([4000 - p.y, p.x], {
          icon: L.divIcon({
            html: `<span class="personal-pin">${renderToStaticMarkup(<MapPin size={25} fill="#d6ae6b" />)}</span>`,
            className: "map-marker",
            iconSize: [28, 32],
            iconAnchor: [14, 28],
          }),
          title: p.name,
          zIndexOffset: 3000,
        });
        const t = document.createElement("span");
        t.textContent = p.name;
        marker.bindTooltip(t);
        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          latest.current.onPinSelect(p);
        });
        group.addLayer(marker);
      }
    };
    render();
    m.on("moveend zoomend", render);
    return () => {
      m.off("moveend zoomend", render);
    };
  }, [
    props.points,
    props.categories,
    props.found,
    props.selected,
    props.pins,
    props.labels,
  ]);
  return (
    <div
      className={`map-canvas ${props.addMode ? "adding" : ""}`}
      ref={node}
      aria-label="流放之地交互地图"
    />
  );
}
