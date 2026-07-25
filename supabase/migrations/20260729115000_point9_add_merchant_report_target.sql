-- Étape 1/2 du Point 9 : Postgres exige que cette valeur soit "committée"
-- avant de pouvoir être utilisée dans une contrainte — d'où ce fichier
-- séparé, à exécuter AVANT 20260729120000_point9_moderation_signalement.sql.

alter type report_target add value 'merchant';
