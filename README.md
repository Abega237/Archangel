# Archangel — Prototype (chat texte temps réel + auth)

Prototype fonctionnel du projet Archangel, couvrant désormais :
- Inscription / connexion (mot de passe hashé, session via cookie JWT), écran d'accueil utilisant l'image fournie
- Chat texte en temps réel (Socket.io) : salon public `#général` (toujours en clair), messages privés et groupes
- **Chiffrement de bout en bout (E2EE) réel** sur les DM (toujours actif) et les groupes (au choix à la création) : RSA-OAEP 2048 bits pour l'échange de clé, AES-256-GCM pour les messages, via l'API WebCrypto du navigateur. La clé privée ne quitte jamais l'appareil (stockée non-extractible dans IndexedDB) ; le serveur ne stocke que du texte chiffré illisible
- Partage de fichiers avec compression automatique des images avant envoi
- Appels vidéo (WebRTC, signaling relayé par le serveur)
- Groupes avec rôles (admin/modérateur/membre), épinglage, catégorie, et **mots-clés de modération personnalisés** (groupes non chiffrés uniquement)
- Recherche avancée (n'indexe jamais le contenu des messages chiffrés)
- Modération : filtrage automatique (liste globale + mots-clés par groupe), signalement, blocage d'utilisateur
- **Messages éphémères** (DM uniquement) : le message s'auto-détruit côté serveur dès que le destinataire l'a affiché à l'écran
- **Envoi différé** : programmez un message à une heure future ; un minuteur serveur le diffuse automatiquement à l'échéance ; liste consultable/annulable avant envoi
- **Statuts détaillés** : Disponible / Absent / Ne pas déranger, propagés en temps réel à vos contacts
- **Fond d'écran personnalisable par conversation** (couleurs prédéfinies ou image), stocké localement par appareil
- Pagination / chargement progressif des messages, mode hors ligne avec cache local et file d'attente d'envoi
- Passe d'accessibilité : labels ARIA sur tous les boutons-icônes, zone de messages annoncée aux lecteurs d'écran (`role="log"`), focus visible, lien d'évitement, modales `role="dialog"`
- Édition / suppression de ses propres messages, présence en ligne, déconnexion fonctionnelle

## Stack
- Backend : Node.js, Express, Socket.io
- Auth : bcryptjs (hash mot de passe) + jsonwebtoken (session via cookie httpOnly)
- Persistance : fichiers JSON locaux (`data/users.json`, `data/messages.json`) — choisi pour éviter toute dépendance native à compiler ; à remplacer par une vraie base (PostgreSQL, SQLite via Prisma, etc.) en production
- Frontend : HTML/CSS/JS vanilla (pas de framework, pour rester simple à lire et modifier)

## Installation

```bash
npm install
```

## Lancement

```bash
node server.js
```

Puis ouvrez **http://localhost:3000** dans le navigateur. Ouvrez un deuxième onglet (ou navigateur en navigation privée) avec un autre compte pour tester le chat en temps réel entre deux utilisateurs.

Le port peut être changé via la variable d'environnement `PORT`. Le secret JWT (à changer en production) via `JWT_SECRET`.

## Chiffrement de bout en bout (E2EE) — ce qui est garanti et ce qui ne l'est pas

J'ai testé tout le protocole cryptographique avec un vrai script utilisant l'API WebCrypto (la même API que votre navigateur utilise) : génération de paires de clés RSA-OAEP, enveloppement d'une clé AES-256-GCM pour chaque participant, déchiffrement de cette clé avec une clé privée qui n'a jamais transité par le réseau, puis chiffrement/déchiffrement réel d'un message. J'ai aussi vérifié directement dans le fichier de données du serveur que seul du texte chiffré illisible y est stocké, jamais le texte en clair.

Ce qui est garanti : pour une conversation privée (DM) ou un groupe créé avec l'option chiffrement activée, le serveur ne peut techniquement pas lire le contenu des messages texte, même si la base de données est compromise.

Ce qui ne l'est PAS :
- **Les pièces jointes ne sont pas chiffrées**, seul le texte l'est. Un fichier envoyé dans une conversation chiffrée reste lisible côté serveur.
- **Pas de synchronisation multi-appareils.** La clé privée est générée et stockée uniquement dans le navigateur où vous l'avez créée (IndexedDB). Si vous vous connectez depuis un autre navigateur ou après avoir vidé les données du site, une nouvelle paire de clés est générée et vous ne pourrez pas déchiffrer l'historique précédent dans ce nouveau contexte.
- **Le salon `#général` n'est jamais chiffré** : c'est un choix délibéré, l'E2EE n'a pas de sens pour un canal ouvert à tous les utilisateurs présents et futurs sans mécanisme de partage rétroactif de clé.
- **Incompatibilité assumée avec le filtrage par mots-clés du modérateur** : si un groupe est chiffré, le serveur ne peut pas lire les messages, donc ne peut pas non plus les filtrer. L'interface désactive d'ailleurs le champ de mots-clés pour les groupes chiffrés, avec une explication affichée.
- **Si crypto.subtle n'est pas disponible** (page servie autrement qu'en `https://` ou `http://localhost`), l'appli bascule automatiquement tous les messages en clair plutôt que de planter silencieusement — un avertissement est alors affiché dans la console du navigateur.
- Je n'ai pas pu tester le rendu réel dans un navigateur (génération de clé au premier login, persistance après rechargement de page, etc.) — seule la mécanique cryptographique a été validée en environnement Node.

### Récupération de clé pour un participant arrivé tardivement

Cas concret : Alice envoie un message chiffré à Bob alors que Bob ne s'est encore jamais connecté (donc n'a pas encore de clé publique enregistrée). Sans précaution, le réflexe naturel serait de générer une nouvelle clé de conversation dès que Bob arrive — ce qui rendrait tous les messages précédents définitivement illisibles, y compris pour Alice. J'ai corrigé ça : si une clé de conversation existe déjà (même partiellement, sans la version de Bob), le client ne crée jamais de nouvelle clé. Il la redemande via l'événement socket `request_conversation_key` à un participant déjà en ligne qui possède la clé, lequel la renveloppe avec la clé publique du nouvel arrivant et la transmet — toujours sans que le serveur ne voie la clé en clair. J'ai testé ce scénario précis de bout en bout (script reproductible dans l'historique de cette conversation) : Bob retrouve bien la clé originale et déchiffre un message envoyé avant même son inscription.

Limite restante, assumée : cette demande de clé n'est relayée qu'en temps réel, elle n'est pas mise en file d'attente. Si **aucun** participant connaissant déjà la clé n'est en ligne au moment où quelqu'un la redemande, le message affiche "clé indisponible" jusqu'à ce que cette personne rouvre la conversation alors qu'un autre participant est connecté (cela se reproduit automatiquement à chaque nouvelle tentative, donc ça finit par se résoudre dès que les deux se croisent en ligne).

## Messages éphémères et envoi différé

Éphémères : limités aux conversations privées (1 expéditeur, 1 destinataire) pour une sémantique sans ambiguïté ; un message s'efface du serveur dès qu'il a été affiché à l'écran du destinataire. Testé via simulation socket : fonctionne.

Envoi différé : un minuteur serveur vérifie toutes les 10 secondes les messages programmés arrivés à échéance et les diffuse automatiquement. Testé avec un délai de 2 secondes : le message est bien resté invisible jusqu'à l'échéance puis diffusé normalement. Les messages programmés dans une conversation chiffrée sont chiffrés au moment de la programmation (le serveur stocke déjà le ciphertext, rien à déchiffrer pour les envoyer à l'heure dite).

## Conversations privées

Cliquez sur un nom dans "Messages privés" (colonne de gauche) pour ouvrir une conversation 1-à-1 avec cet utilisateur. Chaque conversation privée a un identifiant stable (`dm:<userA>:<userB>`, triés alphabétiquement) ; le serveur vérifie systématiquement que seuls les deux participants peuvent lire ou écrire dans cette conversation, même en cas de tentative directe via l'API ou les sockets.

## Appels vidéo — important

Le bouton 📹 apparaît uniquement dans une conversation privée. Pour tester un appel, il faut **deux navigateurs (ou deux profils/onglets en navigation privée) avec accès caméra/micro autorisés**, connectés en HTTPS ou en localhost (WebRTC l'exige). Le serveur ne fait que relayer la "poignée de main" technique (offre/réponse SDP + candidats ICE) ; je n'ai pu tester ici que ce relais de signaling (vérifié automatiquement), pas un appel audio/vidéo réel avec caméra, ce qui nécessite un vrai navigateur. Si la connexion échoue derrière certains réseaux/pare-feux restrictifs (NAT symétrique), il faudrait ajouter un serveur TURN en plus du serveur STUN public utilisé ici — non inclus dans ce prototype.

## Modération — ce qui est fait et ce qui ne l'est pas

Fait : filtrage automatique par liste de mots interdits (`BANNED_WORDS` dans `server.js`, à étendre), signalement d'un message ou d'un utilisateur (stocké dans `data/reports.json`, pas d'interface d'administration pour les consulter), blocage d'un utilisateur qui coupe les messages privés dans les deux sens.
Pas fait : pas de rôles modérateur/administrateur dans les groupes au-delà du créateur marqué "admin" (aucune action de modération de groupe n'est branchée dessus pour l'instant), pas de détection par IA (juste une liste de mots), pas d'interface pour consulter les signalements.

## Mode hors ligne — ce qui est testé et ce qui ne l'est pas

Important : je n'ai pas pu tester l'IndexedDB ni la compression d'image dans cet environnement (pas de vrai navigateur disponible côté serveur). J'ai vérifié la syntaxe du code et sa logique avec soin, mais **testez-le vous-même en conditions réelles** (onglet, désactivation du Wi-Fi, etc.) avant de vous y fier.

Comportement attendu : les messages déjà reçus dans une conversation sont mis en cache localement (IndexedDB) et restent visibles si vous rouvrez l'appli hors connexion. Si vous envoyez un message hors ligne, il s'affiche immédiatement avec la mention "en attente d'envoi" et est stocké dans une file locale ; à la reconnexion du socket, la file est vidée automatiquement et les messages partent dans l'ordre.

Limite assumée sur la gestion de conflits : c'est volontairement simple ("last write wins" côté serveur, sans fusion). Si vous modifiez un message hors ligne, l'action n'est pas mise en file (seul l'envoi de nouveaux messages l'est) — éditer/supprimer nécessite d'être en ligne dans cette version.

## Structure du projet

```
archangel/
├── server.js        # Serveur Express + routes auth + Socket.io
├── db.js             # Persistance (fichiers JSON)
├── package.json
├── data/              # créé automatiquement au démarrage (users.json, messages.json)
└── public/
    ├── index.html     # Écran auth + écran chat
    ├── style.css      # Thème sombre, accent violet
    └── app.js          # Logique front (auth, socket.io, rendu des messages)
```

## Limites de ce prototype (volontaires, vu le périmètre choisi)

Ce livrable couvre désormais : chat temps réel, auth, E2EE (DM + groupes au choix), messages privés, groupes (rôles/épinglage/catégorie/mots-clés), fichiers (avec compression image), appels vidéo (signaling), recherche, modération, pagination, hors ligne, messages éphémères, envoi différé, statuts détaillés, fond d'écran personnalisable, et une première passe d'accessibilité. Le cahier des charges complet (Archangel) prévoit encore, non traité ici :
- chiffrement de bout en bout des **appels vidéo** (le DTLS de WebRTC chiffre déjà le transport entre les deux navigateurs, mais ce n'est pas le même mécanisme ni la même garantie que le chiffrement applicatif des messages texte)
- 2FA, biométrie, gestion fine des sessions actives (liste des sessions, déconnexion à distance d'un appareil précis)
- synchronisation multi-appareils des clés E2EE (voir section dédiée ci-dessus)
- synchronisation hors ligne avec fusion de modifications concurrentes — la version actuelle ne met en file que les envois, pas les éditions/suppressions faites hors ligne
- audit d'accessibilité par un vrai outil ou une vraie technologie d'assistance (lecteur d'écran) : seules les bonnes pratiques de balisage ont été appliquées, sans validation indépendante

Si vous voulez la suite, dites-moi quel bloc prioriser et je l'ajoute par étapes sur cette même base.

## Notes de sécurité

Ce prototype est fonctionnel mais pas prêt pour la production :
- pas de limitation de débit (rate limiting) sur les routes d'auth
- pas de validation/sanitisation poussée des entrées
- stockage JSON non adapté à la charge ou à la concurrence réelle
- secret JWT en dur par défaut — à définir via variable d'environnement avant tout déploiement
"# Archangel" 
