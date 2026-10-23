"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { grouper, memeAdresse, type PinCommerce, type Zone } from "@/lib/carte";

export type Vue = { centre: [number, number]; zoom: number } | { limites: [number, number][] };

/** Où envoyer la carte : un nouvel objet à chaque demande, même identique.
 * `fiche` : une fiche va s'ouvrir sur le bas de la carte, le point visé doit
 * rester au-dessus. */
export type Cible = { centre: [number, number]; zoom: number; fiche?: boolean };

type Props = {
  pins: PinCommerce[];
  vue: Vue;
  cible: Cible | null;
  actifId: string | null;
  onSelection: (id: string | null) => void;
  onZone: (zone: Zone) => void;
};

// Zoom maximal d'un clic sur un groupe : au-delà, cf. `grouper`, seuls les
// commerces à la même adresse restent ensemble.
const ZOOM_DETAIL = 17;

// Leaflet cherche ses images de marqueur sur un chemin relatif à la feuille de
// style, ce qui ne survit pas au découpage des paquets de Next.js : le repère
// par défaut apparaît en carré cassé. On dessine donc le nôtre en SVG.
function goutte(couleur: string) {
  return L.divIcon({
    className: "",
    html: `<svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 37C15 37 28 22.5 28 14C28 6.8 22.2 1 15 1S2 6.8 2 14C2 22.5 15 37 15 37Z"
            fill="${couleur}" stroke="#F5EFDD" stroke-width="2"/>
      <circle cx="15" cy="14" r="5" fill="#E8B94E"/>
    </svg>`,
    iconSize: [30, 38],
    iconAnchor: [15, 37],
    popupAnchor: [0, -34],
  });
}

const GOUTTE = goutte("#2F6E64");
const GOUTTE_ACTIVE = goutte("#C84A32");

// Une icône par (classe, texte, état) : la recréer à chaque rendu remplaçait
// le DOM de tous les repères au moindre survol de la liste.
const icones = new Map<string, L.DivIcon>();

function bulle(classe: string, texte: string, actif: boolean) {
  const cle = `${classe}|${texte}|${actif}`;
  let icone = icones.get(cle);
  if (!icone) {
    // `texte` est toujours produit par l'appli ("-30%", "2 offres", un
    // nombre), jamais saisi par un commerçant : il peut aller tel quel dans le
    // HTML.
    icone = L.divIcon({
      className: "",
      html: `<span class="${classe}${actif ? ` ${classe}-actif` : ""}">${texte}</span>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
      popupAnchor: [0, -18],
    });
    icones.set(cle, icone);
  }
  return icone;
}

function zoneDe(carte: L.Map): Zone {
  const b = carte.getBounds();
  return { nord: b.getNorth(), sud: b.getSouth(), est: b.getEast(), ouest: b.getWest() };
}

/** Entrée ou Espace sur un repère focalisé : Leaflet transmet la touche au
 * repère mais n'en fait jamais un clic, contrairement à un vrai <button>. */
function siValidation(e: L.LeafletEvent, action: () => void) {
  const touche = (e as L.LeafletKeyboardEvent).originalEvent;
  if (touche.key !== "Enter" && touche.key !== " ") return;
  touche.preventDefault();
  action();
}

function Reperes({ pins, cible, actifId, onSelection, onZone }: Omit<Props, "vue">) {
  const carte = useMap();
  const [zoom, setZoom] = useState(() => carte.getZoom());
  // Seuls les repères proches de la vue sont rendus : moins de DOM, et Tab ne
  // parcourt plus des dizaines de repères hors de l'écran.
  const [abords, setAbords] = useState(() => carte.getBounds().pad(0.5));

  useMapEvents({
    // Le zoom se relit ici et pas sur `zoomend` : un vol (flyTo) interrompu
    // par un glisser s'arrête à un zoom intermédiaire sans jamais émettre
    // `zoomend`, et le regroupement restait calculé pour l'ancien zoom.
    moveend: () => {
      onZone(zoneDe(carte));
      setZoom(carte.getZoom());
      setAbords(carte.getBounds().pad(0.5));
    },
    click: () => onSelection(null),
  });

  // `moveend` ne se déclenche pas à l'ouverture : sans ça, la liste resterait
  // vide tant qu'on n'a pas bougé la carte.
  useEffect(() => {
    onZone(zoneDe(carte));
  }, [carte, onZone]);

  // La fiche du commerce choisi couvre jusqu'aux deux tiers bas de la carte :
  // sans ce décalage, son repère finissait caché juste sous elle.
  useEffect(() => {
    if (!cible) return;
    const centre = cible.fiche
      ? carte.unproject(carte.project(cible.centre, cible.zoom).add([0, carte.getSize().y / 4]), cible.zoom)
      : cible.centre;
    carte.flyTo(centre, cible.zoom, { duration: 0.8 });
  }, [carte, cible]);

  function choisir(p: PinCommerce) {
    onSelection(p.id);
    const y = carte.latLngToContainerPoint([p.latitude, p.longitude]).y;
    const hauteur = carte.getSize().y;
    if (y > hauteur * 0.4) carte.panBy([0, y - hauteur * 0.3]);
  }

  const groupes = useMemo(
    () =>
      grouper(
        pins.filter((p) => abords.contains([p.latitude, p.longitude])),
        zoom,
        (lat, lng, z) => carte.project([lat, lng], z),
        64,
        ZOOM_DETAIL
      ),
    [carte, pins, zoom, abords]
  );

  return (
    <>
      {groupes.map((g) => {
        if (g.membres.length === 1) {
          const p = g.membres[0];
          const actif = p.id === actifId;
          return (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={p.etiquette ? bulle("pin-commerce", p.etiquette, actif) : actif ? GOUTTE_ACTIVE : GOUTTE}
              zIndexOffset={actif ? 1000 : 0}
              title={p.nom}
              eventHandlers={{
                click: () => choisir(p),
                keydown: (e) => siValidation(e, () => choisir(p)),
              }}
            />
          );
        }

        const actif = g.membres.some((m) => m.id === actifId);
        const colocalises = memeAdresse(g.membres);
        const zoomer = () =>
          carte.fitBounds(
            L.latLngBounds(g.membres.map((m) => [m.latitude, m.longitude] as [number, number])),
            { padding: [60, 60], maxZoom: ZOOM_DETAIL }
          );

        return (
          <Marker
            key={g.cle}
            position={[g.latitude, g.longitude]}
            icon={bulle("pin-groupe", String(g.membres.length), actif)}
            zIndexOffset={actif ? 1000 : 500}
            title={`${g.membres.length} commerces`}
            // Des commerces à la même adresse ne se sépareront à aucun zoom :
            // on les liste (popup ouverte par Leaflet au clic) au lieu de
            // zoomer pour rien.
            eventHandlers={
              colocalises
                ? { keydown: (e) => siValidation(e, () => (e.target as L.Marker).openPopup()) }
                : { click: zoomer, keydown: (e) => siValidation(e, zoomer) }
            }
          >
            {colocalises && (
              <Popup>
                <span className="block text-xs font-semibold uppercase tracking-wide text-ink/60 mb-1">
                  À cette adresse
                </span>
                {g.membres.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      carte.closePopup();
                      choisir(m);
                    }}
                    className="block w-full text-left font-bold text-ink py-1 hover:underline"
                  >
                    {m.nom}
                  </button>
                ))}
              </Popup>
            )}
          </Marker>
        );
      })}
    </>
  );
}

export default function CarteCommerces({ vue, ...reste }: Props) {
  const cadrage =
    "centre" in vue
      ? { center: vue.centre, zoom: vue.zoom }
      : { bounds: vue.limites, boundsOptions: { padding: [40, 40] as [number, number], maxZoom: 15 } };

  return (
    <MapContainer {...cadrage} scrollWheelZoom className="h-full w-full">
      {/* OpenStreetMap : pas de clé, pas de compte, et l'attribution est une
          obligation de la licence ODbL, pas une politesse. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <Reperes {...reste} />
    </MapContainer>
  );
}
