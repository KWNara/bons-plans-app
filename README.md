# Bons Plans — projet Next.js (Point 1)

## Démarrer en local

```bash
npm install
npm run dev
```

Ouvre http://localhost:3000 — tu dois voir "Le projet tourne 🎉".

## Déployer (gratuit)

1. Pousse ce dossier sur un repo GitHub
2. Va sur https://vercel.com, connecte le repo → déploiement automatique
3. Ton site est en ligne en quelques minutes, avec une URL type `bons-plans.vercel.app`

## Étape suivante (Point 2 — modèle de données)

1. Crée un compte gratuit sur https://supabase.com
2. Crée un nouveau projet → récupère l'URL et la clé "anon" dans Project Settings > API
3. Copie `.env.example` vers `.env.local` et remplis les deux valeurs
4. On créera ensemble les tables (users, merchant_profiles, deals, likes, etc.) via
   l'éditeur SQL de Supabase

## Structure du projet

```
app/            → pages (App Router de Next.js)
components/     → composants réutilisables (à remplir au fil des points)
lib/supabase.ts → connexion à la base de données
```
