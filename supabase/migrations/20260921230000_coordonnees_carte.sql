-- Coordonnées pour la carte.
--
-- Rien dans le schéma ne portait de position : ni les villes, ni les
-- commerçants. Deux niveaux sont ajoutés, parce qu'ils répondent à deux besoins
-- différents — la ville sert à cadrer la carte, l'adresse du commerçant sert à
-- poser les repères.
--
-- Pas de PostGIS : deux colonnes numériques suffisent pour afficher des points
-- et cadrer une vue. Introduire une extension géospatiale pour ça coûterait
-- plus cher en complexité que ce qu'elle rapporterait.

alter table cities
  add column latitude double precision,
  add column longitude double precision;

alter table merchant_profiles
  add column adresse text,
  add column latitude double precision,
  add column longitude double precision;

-- Le commerçant renseigne son adresse depuis son espace, elle est donc
-- modifiable — contrairement au SIRET et aux identifiants Stripe, qui restent
-- hors de portée du client (cf. 20260908120000).
grant update (adresse, latitude, longitude) on merchant_profiles to authenticated;

-- La lecture de cette table est accordée colonne par colonne : sans cette
-- ligne, les trois nouvelles colonnes restaient invisibles et toute requête les
-- demandant échouait en bloc — la carte affichait « indisponible ».
grant select (adresse, latitude, longitude) on merchant_profiles to anon, authenticated;

-- Même raison pour les villes, dont la lecture n'est pas restreinte mais dont
-- on explicite le privilège pour rester cohérent si elle venait à l'être.
grant select (latitude, longitude) on cities to anon, authenticated;

-- Un repère n'a de sens que si les deux coordonnées sont présentes : une
-- latitude seule placerait le commerçant au large du golfe de Guinée.
alter table merchant_profiles
  add constraint merchant_profiles_coordonnees_completes check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  );

alter table cities
  add constraint cities_coordonnees_completes check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  );
