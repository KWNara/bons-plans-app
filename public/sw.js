// Le nom porte une version : le gestionnaire « activate » supprime tout cache
// dont la clé diffère, donc l'incrémenter est ce qui purge l'ancien contenu.
// Sans cette incrémentation au renommage de l'application, la page hors-ligne
// mise en cache continuait d'afficher « Bons Plans » chez qui l'avait installée
// avant — indéfiniment.
const CACHE_NAME = "deniche-shell-v2";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  );
});

// ---------------------------------------------------------------------------
// Notifications push
// ---------------------------------------------------------------------------

self.addEventListener("push", (event) => {
  // Une charge utile illisible ne doit pas faire échouer l'affichage : certains
  // services de push envoient des messages de contrôle sans corps JSON.
  let donnees = {};
  try {
    donnees = event.data ? event.data.json() : {};
  } catch {
    donnees = { titre: "Déniche", corps: event.data ? event.data.text() : "" };
  }

  const titre = donnees.titre || "Déniche";

  event.waitUntil(
    self.registration.showNotification(titre, {
      body: donnees.corps || "",
      // Les icônes vivent sous /icons/ (cf. public/manifest.json) : à la racine
      // elles renvoient 404 et la notification s'affiche avec l'icône par
      // défaut du navigateur, sans rien qui rappelle Déniche.
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      // Le tag regroupe les notifications d'une même conversation : dix
      // messages d'affilée remplacent la précédente au lieu d'empiler dix
      // bannières.
      tag: donnees.tag || undefined,
      data: { url: donnees.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const cible = new URL(event.notification.data?.url || "/", self.location.origin).href;

  // On réutilise un onglet déjà ouvert sur l'application plutôt que d'en
  // empiler un nouveau à chaque notification.
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      for (const fenetre of fenetres) {
        if (fenetre.url.startsWith(self.location.origin) && "focus" in fenetre) {
          fenetre.navigate(cible);
          return fenetre.focus();
        }
      }
      return self.clients.openWindow(cible);
    })
  );
});
