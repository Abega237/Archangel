# Guide de build mobile — Archangel

## Option A : PWA installable (la plus rapide, sans store)

### Étape 1 : Déployer le serveur

Le serveur Node.js doit être accessible en **HTTPS** (requis pour les appels et le service worker).

**Railway (recommandé — gratuit)**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```
Notez l'URL fournie, ex. : `https://archangel-production.up.railway.app`

**Render**
1. Créer un compte sur https://render.com
2. New → Web Service → connecter votre repo GitHub
3. Build command : `npm install`
4. Start command : `node server.js`

### Étape 2 : Configurer le domaine dans le code

Dans `server.js`, ajouter votre URL en variable d'environnement :
```bash
# Variable d'environnement Railway/Render
JWT_SECRET=votre-secret-très-long-et-aléatoire
PORT=3000
```

### Étape 3 : Installer sur Android (Chrome)

1. Ouvrir l'URL de votre serveur dans **Chrome sur Android**
2. Menu (⋮) → **"Ajouter à l'écran d'accueil"** ou **"Installer l'application"**
3. L'app apparaît sur l'écran d'accueil, fonctionne en plein écran

### Étape 4 : Installer sur iOS (Safari)

1. Ouvrir l'URL dans **Safari sur iPhone/iPad**
2. Bouton partage (⬆) → **"Sur l'écran d'accueil"**
3. Confirmer → l'app apparaît comme une vraie app

---

## Option B : APK Android natif (Capacitor)

### Prérequis

- Node.js 18+
- Android Studio installé (https://developer.android.com/studio)
- Java JDK 17+
- Variables d'environnement Android configurées :
  ```bash
  # Windows
  setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
  setx PATH "%PATH%;%ANDROID_HOME%\platform-tools"
  
  # Mac/Linux
  export ANDROID_HOME=$HOME/Library/Android/sdk
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  ```

### Étape 1 : Configurer l'URL du serveur

Modifier `capacitor.config.json` :
```json
{
  "server": {
    "url": "https://votre-serveur.railway.app"
  }
}
```

### Étape 2 : Installer Capacitor et ajouter Android

```bash
cd archangel
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/splash-screen
npx cap add android
npx cap sync android
```

### Étape 3 : Personnaliser l'icône Android

```bash
# Copier les icônes générées vers Android
cp public/icons/icon-maskable-512x512.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
# (Répéter pour chaque densité ou utiliser Android Studio Image Asset Studio)
```

### Étape 4 : Build de l'APK

```bash
# Debug (pour tester)
npx cap build android

# Ou ouvrir dans Android Studio
npx cap open android
# Puis : Build → Build Bundle(s)/APK(s) → Build APK(s)
```

### Étape 5 : APK signé (pour le Play Store)

```bash
# Créer un keystore (une seule fois)
keytool -genkey -v -keystore archangel.keystore \
  -alias archangel -keyalg RSA -keysize 2048 -validity 10000

# Build release signé
cd android
./gradlew assembleRelease

# Signer manuellement
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore archangel.keystore \
  app/build/outputs/apk/release/app-release-unsigned.apk archangel

# Optimiser
zipalign -v 4 \
  app/build/outputs/apk/release/app-release-unsigned.apk \
  archangel-release.apk
```

L'APK final `archangel-release.apk` peut être :
- Distribué directement (partage de fichier, envoi par email)
- Publié sur le Google Play Store

---

## Important : Appels vocaux/vidéo

Les appels WebRTC nécessitent **obligatoirement HTTPS**. Ils ne fonctionneront pas en HTTP local.
Avec l'APK Capacitor pointant vers votre serveur Railway/Render (HTTPS), ils fonctionneront normalement.

## Variables d'environnement recommandées (production)

```
JWT_SECRET=changez-moi-en-production-minimum-32-caracteres
PORT=3000
NODE_ENV=production
```
