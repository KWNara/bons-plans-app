"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { discountLabel } from "@/lib/dealFormat";

export type RepereDeal = {
  id: string;
  titre: string;
  prix_avant: number | null;
  prix_apres: number | null;
  reduction_pourcentage: number | null;
  date_fin: string | null;
  enseigne: string;
  adresse: string;
  latitude: number;
  longitude: number;
};

type Props = {
  reperes: RepereDeal[];
  centre: { latitude: number; longitude: number };
};

// Leaflet cherche ses images de marqueur sur un chemin relatif à la feuille de
// style, ce qui ne survit pas au découpage des paquets de Next.js : le repère
// par défaut apparaît en carré cassé. On dessine donc le nôtre en SVG, aux
// couleurs de Déniche, ce qui évite en prime trois requêtes par marqueur.
const ICONE = L.divIcon({
  className: "",
  html: `<svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 37C15 37 28 22.5 28 14C28 6.8 22.2 1 15 1S2 6.8 2 14C2 22.5 15 37 15 37Z"
          fill="#2F6E64" stroke="#EFF0E4" stroke-width="2"/>
    <circle cx="15" cy="14" r="5" fill="#E3A23C"/>
  </svg>`,
  iconSize: [30, 38],
  iconAnchor: [15, 37],
  popupAnchor: [0, -34],
});

/** Recadre la vue quand la ville change, la carte n'étant montée qu'une fois. */
function Recadrage({ reperes, centre }: Props) {
  const carte = useMap();

  useEffect(() => {
    if (reperes.length === 0) {
      carte.setView([centre.latitude, centre.longitude], 13);
      return;
    }

    // `fitBounds` sur un repère unique zoome au maximum et donne une vue
    // inutilisable : dans ce cas on se contente de centrer.
    if (reperes.length === 1) {
      carte.setView([reperes[0].latitude, reperes[0].longitude], 15);
      return;
    }

    carte.fitBounds(
      L.latLngBounds(reperes.map((r) => [r.latitude, r.longitude] as [number, number])),
      { padding: [40, 40], maxZoom: 16 }
    );
  }, [carte, reperes, centre]);

  return null;
}

export default function CarteDeals({ reperes, centre }: Props) {
  const position = useMemo<[number, number]>(
    () => [centre.latitude, centre.longitude],
    [centre]
  );

  return (
    <MapContainer
      center={position}
      zoom={13}
      scrollWheelZoom
      className="h-full w-full rounded-card"
    >
      {/* OpenStreetMap : pas de clé, pas de compte, et l'attribution est une
          obligation de la licence ODbL, pas une politesse. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <Recadrage reperes={reperes} centre={centre} />

      {reperes.map((r) => {
        const badge = discountLabel(r);
        return (
          <Marker key={r.id} position={[r.latitude, r.longitude]} icon={ICONE}>
            <Popup>
              <span className="block text-xs font-semibold uppercase tracking-wide text-teal">
                {r.enseigne}
              </span>
              <Link
                href={`/bons-plans/${r.id}`}
                className="block font-bold text-ink leading-snug mt-0.5 hover:underline"
              >
                {r.titre}
              </Link>
              {badge && <span className="block text-tag font-bold mt-0.5">{badge}</span>}
              <span className="block text-ink/60 mt-1">{r.adresse}</span>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
