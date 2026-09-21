# Batterie de vérification de la sécurité et des déclencheurs.
#
# POURQUOI CE FICHIER EXISTE
# Les politiques RLS, les privilèges de colonne et les déclencheurs ne sont
# couverts par aucun test unitaire : ils vivent dans la base, pas dans le code.
# Deux failles ont déjà été introduites puis trouvées à la main — l'une parce
# qu'une politique borne les lignes et jamais les colonnes, l'autre parce qu'un
# déclencheur signait une demande au nom de quelqu'un d'autre. Ce script rejoue
# les scénarios correspondants pour qu'une régression se voie tout de suite.
#
# À LANCER APRÈS CHAQUE MIGRATION.
#
#   npm run qa:securite
#
# CE QU'IL FAIT À LA BASE
# Il crée des comptes jetables en @example.com (domaine réservé aux tests,
# jamais une adresse réelle), joue les scénarios, puis supprime EXACTEMENT les
# comptes qu'il a créés — il n'efface rien d'autre. Les commentaires et
# amitiés produits disparaissent en cascade avec eux.

$ErrorActionPreference = "Stop"

$racine = Split-Path -Parent $PSScriptRoot
$env:Path += ";C:\Program Files\nodejs"

$lignes = Get-Content (Join-Path $racine ".env.local")
function Lire($nom) { ($lignes | Where-Object { $_ -match "^$nom=" }) -replace "^$nom=", "" }

$url = Lire "NEXT_PUBLIC_SUPABASE_URL"
$anon = Lire "NEXT_PUBLIC_SUPABASE_ANON_KEY"
$srv = Lire "SUPABASE_SERVICE_ROLE_KEY"

if (-not $url -or -not $anon -or -not $srv) {
  throw "Variables manquantes dans .env.local (URL, clé anon, clé de service)."
}

$hs = @{ apikey = $srv; Authorization = "Bearer $srv"; "Content-Type" = "application/json" }

$script:total = 0
$script:echecs = 0
$script:creees = @()

function Verifier($nom, $attendu, $obtenu) {
  $script:total += 1
  if ("$attendu" -eq "$obtenu") {
    Write-Host "  OK    $nom" -ForegroundColor Green
  } else {
    $script:echecs += 1
    Write-Host "  ECHEC $nom" -ForegroundColor Red
    Write-Host "          attendu = [$attendu]" -ForegroundColor Red
    Write-Host "          obtenu  = [$obtenu]" -ForegroundColor Red
  }
}

function Appel($bloc) {
  try { & $bloc } catch {
    $r = $_.Exception.Response
    [pscustomobject]@{
      code  = [int]$r.StatusCode
      corps = (New-Object System.IO.StreamReader($r.GetResponseStream())).ReadToEnd()
    }
  }
}

function CodeErreur($reponse) {
  if (-not $reponse.corps) { return $reponse.code }
  try { ($reponse.corps | ConvertFrom-Json).code } catch { $reponse.code }
}

# L'inscription publique exige une confirmation par courriel et refuse
# example.com ; l'API d'administration accepte les deux, ce qui garantit
# qu'aucun message ne part vers une adresse réelle.
function Creer($pseudo, $mail, $parrain) {
  $mdp = "Qa-" + [guid]::NewGuid().ToString("N")
  $meta = @{ pseudo = $pseudo }
  if ($parrain) { $meta.parrain = $parrain }

  $u = Invoke-RestMethod -Method Post -Uri "$url/auth/v1/admin/users" -Headers $hs `
    -Body (@{ email = $mail; password = $mdp; email_confirm = $true; user_metadata = $meta } | ConvertTo-Json -Depth 4)

  $script:creees += $u.id

  $s = Invoke-RestMethod -Method Post -Uri "$url/auth/v1/token?grant_type=password" `
    -Headers @{ apikey = $anon; "Content-Type" = "application/json" } `
    -Body (@{ email = $mail; password = $mdp } | ConvertTo-Json)

  @{ id = $u.id; h = @{ apikey = $anon; Authorization = "Bearer $($s.access_token)"; "Content-Type" = "application/json" } }
}

function Alertes($id, $type) {
  (Invoke-RestMethod -Uri "$url/rest/v1/alerts?select=id&user_id=eq.$id&type=eq.$type" -Headers $hs).Count
}

$suffixe = [guid]::NewGuid().ToString("N").Substring(0, 8)
$deal = (Invoke-RestMethod -Uri "$url/rest/v1/deals?select=id&statut=eq.publie&limit=1" -Headers $hs)[0].id

try {
  # =========================================================================
  Write-Host "`nAmities : une demande ne peut pas etre signee d'autrui" -ForegroundColor Cyan
  # =========================================================================
  # Le parrainage posait la demande AU NOM du parrain, a partir d'un
  # identifiant public. N'importe qui pouvait donc fabriquer une demande signee
  # de sa cible, puis l'accepter lui-meme, et ouvrir la messagerie privee.
  $alice = Creer "qaAlice$suffixe" "qa-alice-$suffixe@example.com" $null
  $mallory = Creer "qaMallory$suffixe" "qa-mallory-$suffixe@example.com" $alice.id

  $rel = Invoke-RestMethod -Uri "$url/rest/v1/friendships?select=id,demandeur,statut&or=(user_a.eq.$($mallory.id),user_b.eq.$($mallory.id))" -Headers $hs
  Verifier "La demande est au nom du filleul" $mallory.id $rel[0].demandeur

  Appel { Invoke-RestMethod -Method Patch -Uri "$url/rest/v1/friendships?id=eq.$($rel[0].id)" -Headers $mallory.h -Body '{"statut":"acceptee"}' } | Out-Null
  $statut = (Invoke-RestMethod -Uri "$url/rest/v1/friendships?select=statut&id=eq.$($rel[0].id)" -Headers $hs)[0].statut
  Verifier "On n'accepte pas sa propre demande" "en_attente" $statut

  $r = Appel { Invoke-RestMethod -Method Post -Uri "$url/rest/v1/messages" -Headers $mallory.h -Body (@{ expediteur = $mallory.id; destinataire = $alice.id; texte = "test" } | ConvertTo-Json) }
  Verifier "La messagerie reste fermee entre inconnus" 42501 (CodeErreur $r)

  Verifier "La personne invitee est la seule prevenue" 1 (Alertes $alice.id "demande_ami")

  # =========================================================================
  Write-Host "`nAmities : l'interlocuteur ne peut pas etre reecrit" -ForegroundColor Cyan
  # =========================================================================
  # Une politique RLS borne les lignes, jamais les colonnes : sans revoke, le
  # destinataire pouvait remplacer user_a/user_b et se fabriquer une amitie.
  $bob = Creer "qaBob$suffixe" "qa-bob-$suffixe@example.com" $null
  $victime = Creer "qaVictime$suffixe" "qa-victime-$suffixe@example.com" $null

  $ua = if ($bob.id -lt $mallory.id) { $bob.id } else { $mallory.id }
  $ub = if ($bob.id -lt $mallory.id) { $mallory.id } else { $bob.id }
  $hb = $bob.h.Clone(); $hb["Prefer"] = "return=representation"
  $lig = Invoke-RestMethod -Method Post -Uri "$url/rest/v1/friendships" -Headers $hb -Body (@{ user_a = $ua; user_b = $ub; demandeur = $bob.id } | ConvertTo-Json)

  $na = if ($victime.id -lt $mallory.id) { $victime.id } else { $mallory.id }
  $nb = if ($victime.id -lt $mallory.id) { $mallory.id } else { $victime.id }
  $r = Appel { Invoke-RestMethod -Method Patch -Uri "$url/rest/v1/friendships?id=eq.$($lig[0].id)" -Headers $mallory.h -Body (@{ user_a = $na; user_b = $nb; statut = "acceptee" } | ConvertTo-Json) }
  Verifier "Reecrire user_a / user_b est refuse" 42501 (CodeErreur $r)

  Invoke-RestMethod -Method Patch -Uri "$url/rest/v1/friendships?id=eq.$($lig[0].id)" -Headers $mallory.h -Body '{"statut":"acceptee"}' | Out-Null
  $ok = (Invoke-RestMethod -Uri "$url/rest/v1/friendships?select=statut&id=eq.$($lig[0].id)" -Headers $hs)[0].statut
  Verifier "Accepter reste possible (non-regression)" "acceptee" $ok

  # =========================================================================
  Write-Host "`nMessagerie et participations" -ForegroundColor Cyan
  # =========================================================================
  $r = Appel { Invoke-RestMethod -Method Patch -Uri "$url/rest/v1/messages?expediteur=eq.$($bob.id)" -Headers $bob.h -Body '{"texte":"reecrit"}' }
  Verifier "Le texte d'un message ne se reecrit pas" 42501 (CodeErreur $r)

  Invoke-RestMethod -Method Post -Uri "$url/rest/v1/deal_participations" -Headers $alice.h -Body (@{ deal_id = $deal; user_id = $alice.id } | ConvertTo-Json) | Out-Null
  $r = Appel { Invoke-RestMethod -Method Post -Uri "$url/rest/v1/deal_participations" -Headers $mallory.h -Body (@{ deal_id = $deal; user_id = $alice.id } | ConvertTo-Json) }
  Verifier "On n'inscrit pas quelqu'un d'autre a un bon plan" 42501 (CodeErreur $r)

  $vues = Invoke-RestMethod -Uri "$url/rest/v1/deal_participations?select=user_id&deal_id=eq.$deal" -Headers $victime.h
  Verifier "Un inconnu ne voit pas qui participe" 0 $vues.Count

  # Surtout pas `$total` : au niveau du script, ce nom désigne le compteur de
  # vérifications, et l'écraser faisait mentir le décompte final.
  $totalParticipants = Invoke-RestMethod -Method Post -Uri "$url/rest/v1/rpc/compte_participants" -Headers $victime.h -Body (@{ p_deal_id = $deal } | ConvertTo-Json)
  Verifier "Le total public reste juste" 1 $totalParticipants

  # =========================================================================
  Write-Host "`nMentions" -ForegroundColor Cyan
  # =========================================================================
  $zoe = Creer "qaZoe$suffixe" "qa-zoe-$suffixe@example.com" $null

  Invoke-RestMethod -Method Post -Uri "$url/rest/v1/comments" -Headers $bob.h -Body (@{ user_id = $bob.id; deal_id = $deal; texte = "Merci @qaZoe$suffixe." } | ConvertTo-Json) | Out-Null
  Verifier "Un point final n'empeche pas la citation" 1 (Alertes $zoe.id "mention")

  Invoke-RestMethod -Method Post -Uri "$url/rest/v1/comments" -Headers $bob.h -Body (@{ user_id = $bob.id; deal_id = $deal; texte = "ecris a qaZoe$suffixe@exemple.fr" } | ConvertTo-Json) | Out-Null
  Verifier "Une adresse e-mail ne cite personne" 1 (Alertes $zoe.id "mention")

  Invoke-RestMethod -Method Post -Uri "$url/rest/v1/comments" -Headers $bob.h -Body (@{ user_id = $bob.id; deal_id = $deal; texte = "je me cite @qaBob$suffixe" } | ConvertTo-Json) | Out-Null
  Verifier "S'auto-citer ne se notifie pas" 0 (Alertes $bob.id "mention")

  # =========================================================================
  Write-Host "`nPseudo" -ForegroundColor Cyan
  # =========================================================================
  $r = Appel { Invoke-RestMethod -Method Patch -Uri "$url/rest/v1/users?id=eq.$($bob.id)" -Headers $hs -Body '{"pseudo":"avec espace"}' }
  Verifier "Un pseudo avec espace est refuse" 23514 (CodeErreur $r)

  $d1 = Creer "qaDoublon$suffixe" "qa-d1-$suffixe@example.com" $null
  $d2 = Creer "qaDoublon$suffixe" "qa-d2-$suffixe@example.com" $null
  $p2 = (Invoke-RestMethod -Uri "$url/rest/v1/users?select=pseudo&id=eq.$($d2.id)" -Headers $hs)[0].pseudo
  Verifier "Une collision de pseudo ne casse pas l'inscription" "qaDoublon${suffixe}2" $p2

  # =========================================================================
  Write-Host "`nAbonnements push" -ForegroundColor Cyan
  # =========================================================================
  $pointDeTerminaison = "https://exemple.test/qa-$suffixe"
  Invoke-RestMethod -Method Post -Uri "$url/rest/v1/rpc/enregistrer_abonnement_push" -Headers $bob.h -Body (@{ p_endpoint = $pointDeTerminaison; p_p256dh = "cle"; p_auth = "auth"; p_user_agent = "qa" } | ConvertTo-Json) | Out-Null
  Verifier "Enregistrement d'un abonnement" 1 (Invoke-RestMethod -Uri "$url/rest/v1/push_subscriptions?select=id&user_id=eq.$($bob.id)" -Headers $hs).Count

  Invoke-RestMethod -Method Post -Uri "$url/rest/v1/rpc/enregistrer_abonnement_push" -Headers $bob.h -Body (@{ p_endpoint = $pointDeTerminaison; p_p256dh = "cle2"; p_auth = "auth2"; p_user_agent = "qa" } | ConvertTo-Json) | Out-Null
  Verifier "Un reabonnement ne cree pas de doublon" 1 (Invoke-RestMethod -Uri "$url/rest/v1/push_subscriptions?select=id&user_id=eq.$($bob.id)" -Headers $hs).Count

  Invoke-RestMethod -Method Post -Uri "$url/rest/v1/rpc/enregistrer_abonnement_push" -Headers $mallory.h -Body (@{ p_endpoint = $pointDeTerminaison; p_p256dh = "cle3"; p_auth = "auth3"; p_user_agent = "qa" } | ConvertTo-Json) | Out-Null
  Verifier "Un autre compte reprend l'appareil" 0 (Invoke-RestMethod -Uri "$url/rest/v1/push_subscriptions?select=id&user_id=eq.$($bob.id)" -Headers $hs).Count

  $vus = Invoke-RestMethod -Uri "$url/rest/v1/push_subscriptions?select=id" -Headers $victime.h
  Verifier "Un tiers ne voit pas les abonnements d'autrui" 0 $vus.Count

  # =========================================================================
  Write-Host "`nCoordonnees" -ForegroundColor Cyan
  # =========================================================================
  $m = (Invoke-RestMethod -Uri "$url/rest/v1/merchant_profiles?select=id&limit=1" -Headers $hs)[0].id
  $r = Appel { Invoke-RestMethod -Method Patch -Uri "$url/rest/v1/merchant_profiles?id=eq.$m" -Headers $hs -Body '{"latitude":47.2,"longitude":null}' }
  Verifier "Une paire de coordonnees incomplete est refusee" 23514 (CodeErreur $r)

  $r = Appel { Invoke-RestMethod -Method Patch -Uri "$url/rest/v1/merchant_profiles?id=eq.$m" -Headers $hs -Body '{"latitude":999,"longitude":12}' }
  Verifier "Une latitude hors domaine est refusee" 23514 (CodeErreur $r)

  $r = Appel { Invoke-RestMethod -Method Patch -Uri "$url/rest/v1/merchant_profiles?id=eq.$m" -Headers $victime.h -Body '{"adresse":"adresse pirate"}' }
  $reste = (Invoke-RestMethod -Uri "$url/rest/v1/merchant_profiles?select=adresse&id=eq.$m" -Headers $hs)[0].adresse
  Verifier "Un tiers ne modifie pas l'adresse d'un commercant" "" "$reste"

  # =========================================================================
  Write-Host "`nBlocage" -ForegroundColor Cyan
  # =========================================================================
  # Bob et Mallory sont deja amis a ce stade (section precedente).
  $r = Appel { Invoke-RestMethod -Method Post -Uri "$url/rest/v1/blocked_users" -Headers $bob.h -Body (@{ blocker_id = $bob.id; blocked_id = $bob.id } | ConvertTo-Json) }
  Verifier "On ne peut pas se bloquer soi-meme" 23514 (CodeErreur $r)

  Invoke-RestMethod -Method Post -Uri "$url/rest/v1/blocked_users" -Headers $bob.h -Body (@{ blocker_id = $bob.id; blocked_id = $mallory.id } | ConvertTo-Json) | Out-Null

  $amitieRestante = Invoke-RestMethod -Uri "$url/rest/v1/friendships?select=id&or=(and(user_a.eq.$($bob.id),user_b.eq.$($mallory.id)),and(user_a.eq.$($mallory.id),user_b.eq.$($bob.id)))" -Headers $hs
  Verifier "Bloquer rompt l'amitie existante" 0 $amitieRestante.Count

  $r = Appel { Invoke-RestMethod -Method Post -Uri "$url/rest/v1/messages" -Headers $mallory.h -Body (@{ expediteur = $mallory.id; destinataire = $bob.id; texte = "coucou" } | ConvertTo-Json) }
  Verifier "La personne bloquee ne peut plus ecrire" 42501 (CodeErreur $r)

  $ua = if ($bob.id -lt $mallory.id) { $bob.id } else { $mallory.id }
  $ub = if ($bob.id -lt $mallory.id) { $mallory.id } else { $bob.id }
  $r = Appel { Invoke-RestMethod -Method Post -Uri "$url/rest/v1/friendships" -Headers $mallory.h -Body (@{ user_a = $ua; user_b = $ub; demandeur = $mallory.id } | ConvertTo-Json) }
  Verifier "Une nouvelle demande d'ami est refusee apres blocage" 42501 (CodeErreur $r)

  $vuParMallory = Invoke-RestMethod -Uri "$url/rest/v1/blocked_users?select=id" -Headers $mallory.h
  Verifier "La personne bloquee ne voit pas qu'elle l'est" 0 $vuParMallory.Count

  $vuParBob = Invoke-RestMethod -Uri "$url/rest/v1/blocked_users?select=id&blocked_id=eq.$($mallory.id)" -Headers $bob.h
  Verifier "Qui bloque voit son propre blocage" 1 $vuParBob.Count

  Invoke-RestMethod -Method Delete -Uri "$url/rest/v1/blocked_users?blocker_id=eq.$($bob.id)&blocked_id=eq.$($mallory.id)" -Headers $bob.h | Out-Null
  Invoke-RestMethod -Method Post -Uri "$url/rest/v1/friendships" -Headers $mallory.h -Body (@{ user_a = $ua; user_b = $ub; demandeur = $mallory.id } | ConvertTo-Json) | Out-Null
  $reouverte = Invoke-RestMethod -Uri "$url/rest/v1/friendships?select=statut&user_a=eq.$ua&user_b=eq.$ub" -Headers $hs
  Verifier "Debloquer rouvre la possibilite d'une demande" "en_attente" $reouverte[0].statut

  # =========================================================================
  Write-Host "`nSignalement d'un message" -ForegroundColor Cyan
  # =========================================================================
  $camille = Creer "qaCamille$suffixe" "qa-camille-$suffixe@example.com" $null
  $david = Creer "qaDavid$suffixe" "qa-david-$suffixe@example.com" $null
  $ua2 = if ($camille.id -lt $david.id) { $camille.id } else { $david.id }
  $ub2 = if ($camille.id -lt $david.id) { $david.id } else { $camille.id }
  Invoke-RestMethod -Method Post -Uri "$url/rest/v1/friendships" -Headers $hs -Body (@{ user_a = $ua2; user_b = $ub2; demandeur = $camille.id; statut = "acceptee" } | ConvertTo-Json) | Out-Null

  $hc = $camille.h.Clone(); $hc["Prefer"] = "return=representation"
  $msg = Invoke-RestMethod -Method Post -Uri "$url/rest/v1/messages" -Headers $hc -Body (@{ expediteur = $camille.id; destinataire = $david.id; texte = "message a signaler" } | ConvertTo-Json)
  $msgId = $msg[0].id

  Invoke-RestMethod -Method Post -Uri "$url/rest/v1/reports" -Headers $david.h -Body (@{ reporter_id = $david.id; target_type = "message"; message_id = $msgId; motif = "contenu_inapproprie" } | ConvertTo-Json) | Out-Null

  # Le code Postgres d'une violation d'unicite (23505), comme partout ailleurs
  # dans ce script — pas le statut HTTP, que CodeErreur ignore des que le corps
  # porte un `.code` structure.
  $r = Appel { Invoke-RestMethod -Method Post -Uri "$url/rest/v1/reports" -Headers $david.h -Body (@{ reporter_id = $david.id; target_type = "message"; message_id = $msgId; motif = "autre" } | ConvertTo-Json) }
  Verifier "Un meme message ne se signale pas deux fois" 23505 (CodeErreur $r)

  $moderateur = Creer "qaModerateur$suffixe" "qa-moderateur-$suffixe@example.com" $null
  Invoke-RestMethod -Method Patch -Uri "$url/rest/v1/users?id=eq.$($moderateur.id)" -Headers $hs -Body '{"role":"admin"}' | Out-Null

  $vuParAdmin = Invoke-RestMethod -Uri "$url/rest/v1/messages?select=id&id=eq.$msgId" -Headers $moderateur.h
  Verifier "Un admin lit un message signale" 1 $vuParAdmin.Count

  $vuParTiers = Invoke-RestMethod -Uri "$url/rest/v1/messages?select=id&id=eq.$msgId" -Headers $victime.h
  Verifier "Un tiers non admin ne lit pas ce message" 0 $vuParTiers.Count

  Invoke-RestMethod -Method Delete -Uri "$url/rest/v1/messages?id=eq.$msgId" -Headers $moderateur.h | Out-Null
  $apresSuppression = Invoke-RestMethod -Uri "$url/rest/v1/messages?select=id&id=eq.$msgId" -Headers $hs
  Verifier "Un admin supprime un message signale" 0 $apresSuppression.Count

  # =========================================================================
  Write-Host "`nAvis sur les commercants" -ForegroundColor Cyan
  # =========================================================================
  $mProfil = Invoke-RestMethod -Uri "$url/rest/v1/merchant_profiles?select=id,user_id&limit=1" -Headers $hs
  $merchantId = $mProfil[0].id
  $proprietaireId = $mProfil[0].user_id

  Invoke-RestMethod -Method Post -Uri "$url/rest/v1/merchant_reviews" -Headers $bob.h -Body (@{ merchant_id = $merchantId; user_id = $bob.id; note = 5; commentaire = "Tres bon accueil" } | ConvertTo-Json) | Out-Null

  # `round(avg(note), 1)` renvoie un numeric a une decimale ("5.0", pas "5") :
  # c'est la forme reelle du JSON renvoye, pas une approximation du test.
  $resume1 = Invoke-RestMethod -Method Post -Uri "$url/rest/v1/rpc/avis_resume" -Headers $victime.h -Body (@{ p_merchant_id = $merchantId } | ConvertTo-Json)
  Verifier "Le resume public reflete le premier avis" "5.0|1" "$($resume1[0].moyenne)|$($resume1[0].total)"

  $r = Appel { Invoke-RestMethod -Method Post -Uri "$url/rest/v1/merchant_reviews" -Headers $bob.h -Body (@{ merchant_id = $merchantId; user_id = $bob.id; note = 3 } | ConvertTo-Json) }
  Verifier "Un meme commercant ne se note pas deux fois" 23505 (CodeErreur $r)

  Invoke-RestMethod -Method Patch -Uri "$url/rest/v1/merchant_reviews?merchant_id=eq.$merchantId&user_id=eq.$($bob.id)" -Headers $bob.h -Body '{"note":3,"commentaire":"Finalement moyen"}' | Out-Null
  $resume2 = Invoke-RestMethod -Method Post -Uri "$url/rest/v1/rpc/avis_resume" -Headers $victime.h -Body (@{ p_merchant_id = $merchantId } | ConvertTo-Json)
  Verifier "Modifier son avis change la moyenne" "3.0|1" "$($resume2[0].moyenne)|$($resume2[0].total)"

  # Le declencheur regarde la correspondance merchant_profiles.user_id, pas
  # auth.uid() : il s'applique donc aussi via la cle de service, ce qui evite
  # d'avoir a se connecter comme le vrai proprietaire pour verifier ce cas.
  # Le message d'erreur contient un caractere accentue ; PowerShell 5.1 lit ce
  # fichier .ps1 en ANSI, donc comparer sur un tel caractere echoue pour de
  # mauvaises raisons (deja vu sur generate-og-image.ps1). On teste plutot le
  # code Postgres de l'exception (P0001 = raise exception explicite) et
  # l'absence de toute ligne creee.
  $r = Appel { Invoke-RestMethod -Method Post -Uri "$url/rest/v1/merchant_reviews" -Headers $hs -Body (@{ merchant_id = $merchantId; user_id = $proprietaireId; note = 5 } | ConvertTo-Json) }
  Verifier "Un commercant ne note pas sa propre boutique (exception levee)" "P0001" (CodeErreur $r)
  $aucunAvisProprietaire = Invoke-RestMethod -Uri "$url/rest/v1/merchant_reviews?select=id&merchant_id=eq.$merchantId&user_id=eq.$proprietaireId" -Headers $hs
  Verifier "... et aucune ligne n'a ete creee" 0 $aucunAvisProprietaire.Count

  Invoke-RestMethod -Method Delete -Uri "$url/rest/v1/merchant_reviews?merchant_id=eq.$merchantId&user_id=eq.$($bob.id)" -Headers $bob.h | Out-Null
  $apresRetrait = Invoke-RestMethod -Method Post -Uri "$url/rest/v1/rpc/avis_resume" -Headers $victime.h -Body (@{ p_merchant_id = $merchantId } | ConvertTo-Json)
  Verifier "Retirer son avis revient a zero" "0|0" "$($apresRetrait[0].moyenne)|$($apresRetrait[0].total)"

} finally {
  # =========================================================================
  Write-Host "`nMenage" -ForegroundColor Cyan
  # =========================================================================
  # Seuls les comptes créés par CE passage sont supprimés : le script ne touche
  # à rien d'autre, même si d'anciens comptes de test traînent.
  foreach ($id in $script:creees) {
    try { Invoke-RestMethod -Method Delete -Uri "$url/auth/v1/admin/users/$id" -Headers $hs | Out-Null } catch { }
  }
  Write-Host "  $($script:creees.Count) compte(s) de test supprime(s)"

  $restes = (Invoke-RestMethod -Uri "$url/rest/v1/push_subscriptions?select=id&endpoint=like.*qa-$suffixe*" -Headers $hs).Count
  Write-Host "  abonnements de test restants : $restes"
}

Write-Host ""
if ($script:echecs -eq 0) {
  Write-Host "===== $($script:total)/$($script:total) verifications passees =====" -ForegroundColor Green
  exit 0
} else {
  Write-Host "===== $($script:total - $script:echecs)/$($script:total) verifications passees, $($script:echecs) ECHEC(S) =====" -ForegroundColor Red
  exit 1
}
