# Cahier des charges — Application de bons plans (style Jinka)

## 1. Vision du produit

Une plateforme communautaire où des **commerçants** publient leurs offres/bons plans, organisés par **ville**, consultables par tous les utilisateurs via un fil d'actualité, avec des interactions sociales (like, partage, commentaire) et des profils personnels.

**Positionnement** : croisement entre Jinka (agrégation de bons plans), un réseau social local (façon Nextdoor) et une marketplace d'annonces.

---

## 2. Utilisateurs et rôles

| Rôle | Description | Capacités |
|---|---|---|
| **Visiteur** (non connecté) | Consulte le fil public | Voir les annonces d'une ville, pas d'interaction |
| **Utilisateur standard** | Compte créé | Voir, liker, commenter, partager, avoir une page perso |
| **Commerçant** | Compte "pro" (vérifié) | Tout ce que fait l'utilisateur standard + publier des annonces/bons plans |
| **Admin/modérateur** | Équipe interne | Modération, gestion des villes/catégories, bannissement |

> Question à trancher : un compte peut-il être à la fois "utilisateur" et "commerçant" (ex: un particulier qui devient commerçant), ou faut-il deux types de comptes distincts avec un processus de vérification pour devenir commerçant (SIRET, etc.) ?

---

## 3. Fonctionnalités principales (MVP)

### 3.1 Comptes utilisateurs
- Inscription / connexion (email + mot de passe, + option Google/Apple)
- Choix du statut à l'inscription : particulier ou commerçant
- Pour les commerçants : formulaire d'inscription pro (nom d'enseigne, SIRET, ville principale, catégorie d'activité, logo)
- Récupération de mot de passe
- Vérification email

### 3.2 Localisation par ville
- Sélecteur de ville : recherche par nom de ville **ou** par code postal
- Détection automatique de la position (géolocalisation) avec ville proposée par défaut
- Possibilité de suivre plusieurs villes (ex: ville de résidence + ville de travail)
- Le fil se filtre automatiquement selon la ville sélectionnée

### 3.3 Publication d'annonces (commerçants)
- Titre, description, prix / réduction, catégorie, photo(s)
- Date de validité de l'offre (début/fin)
- Ville(s) de diffusion
- Lien externe optionnel (site du commerçant, Vinted, etc.)
- Statut : brouillon / publié / expiré

### 3.4 Catégories
Exemples : Mode & vêtements, Restauration, Beauté & bien-être, Maison & déco, High-tech, Loisirs, Services, Autre.
- Filtrage du fil par catégorie + ville combinés

### 3.5 Fil d'actualité (feed)
- Fil chronologique ou par pertinence (à définir), filtrable par ville + catégorie
- Chaque post affiche : commerçant, photo, titre, résumé, prix/réduction, ville, nombre de likes/commentaires

### 3.6 Interactions sociales
- **Like** : sur une annonce
- **Repartage** : republier une annonce sur son propre profil (avec ou sans commentaire ajouté)
- **Commentaire** : fil de commentaires sous chaque annonce
- Notifications (like/commentaire/partage reçu)

### 3.7 Page personnelle
- Photo de profil, bio courte, ville
- Historique des annonces repartagées / likées
- Pour les commerçants : page vitrine avec toutes leurs annonces actives, note/avis clients (optionnel v2)

---

## 4. Écrans principaux (web, mobile-first)

1. **Accueil / Fil** — sélecteur de ville en haut, filtres catégorie, liste d'annonces (cards)
2. **Détail d'une annonce** — photos, description complète, commentaires, boutons like/partage
3. **Sélection de ville** — recherche + géolocalisation + villes suivies
4. **Création d'annonce** (commerçant) — formulaire multi-étapes
5. **Page profil utilisateur** — infos, annonces repartagées
6. **Page profil commerçant** — vitrine des annonces actives
7. **Connexion / Inscription** (2 parcours : particulier / commerçant)
8. **Notifications**
9. **Recherche** (par mot-clé, ville, catégorie)
10. **Espace admin/modération** (back-office séparé)

---

## 5. Modèle de données (entités principales)

- **User** : id, email, mot de passe (hash), pseudo, avatar, ville, rôle (particulier/commerçant/admin), date création
- **Merchant profile** : lié à un User, nom enseigne, SIRET, description, logo, catégorie d'activité
- **Deal (annonce)** : id, merchant_id, titre, description, photos[], prix_avant, prix_apres, catégorie, ville(s), date_debut, date_fin, statut, compteur_likes, compteur_partages
- **Like** : user_id, deal_id, date
- **Comment** : id, user_id, deal_id, texte, date
- **Repost (partage)** : id, user_id, deal_id, commentaire_ajouté, date
- **City** : nom, code_postal, région
- **Category** : nom, icône

---

## 6. Stack technique proposée

Priorité **web d'abord**, avec une architecture qui permettra une déclinaison mobile ensuite (idéalement en réutilisant l'API).

| Couche | Choix suggéré | Pourquoi |
|---|---|---|
| Frontend web | Next.js (React) | SEO pour le fil public par ville (important pour l'acquisition), bon écosystème |
| Backend / API | Node.js (NestJS) ou Supabase/Firebase pour aller vite en MVP | API REST/GraphQL réutilisable par une future app mobile |
| Base de données | PostgreSQL | Relationnel, adapté aux relations users/deals/likes/comments |
| Stockage images | S3 / Cloudflare R2 | Photos d'annonces et avatars |
| Auth | Supabase Auth / Auth0 / NextAuth | Gestion email + réseaux sociaux |
| Recherche ville/code postal | API officielle "API Adresse" (Base Adresse Nationale, gratuite, française) | Autocomplétion ville/CP fiable en France |
| Mobile (v2) | React Native ou Flutter | Réutilise l'API existante |

> Pour aller vite en tout premier MVP (validation du concept), Supabase (base de données + auth + storage tout-en-un) permet de sortir un prototype fonctionnel en quelques semaines sans construire tout le backend à la main.

---

## 7. Roadmap suggérée

**Phase 1 — MVP (validation du concept)**
- Comptes (particulier + commerçant), fil par ville, publication d'annonce, like/commentaire/partage, page perso simple
- 1 ville pilote ou quelques villes (ex: Besançon + 2-3 villes voisines) pour tester avant scale national

**Phase 2 — Consolidation**
- Modération (signalement de contenu), notifications, recherche avancée, statistiques pour les commerçants (vues, clics)

**Phase 3 — Extension**
- App mobile native
- Système d'avis/notes commerçants
- Monétisation (mise en avant payante des annonces, abonnement commerçant)

---

## 8. Points à trancher avant de démarrer le dev

1. Un commerçant doit-il être vérifié (SIRET) avant de pouvoir publier, ou est-ce en libre accès au départ ?
2. Modération a priori (validation avant publication) ou a posteriori (signalement) ?
3. Diffusion nationale dès le départ ou lancement progressif ville par ville ?
4. Modèle économique : gratuit pour les commerçants au départ, ou payant dès le lancement ?

---

*Prochaine étape possible : je peux détailler les maquettes d'écrans (wireframes) ou commencer le prototype technique (structure du projet Next.js + Supabase) — dis-moi ce qui t'intéresse.*
