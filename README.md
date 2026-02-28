# Bombo

Application mobile React Native / Expo.

## Get started (Development)

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

### Features requiring a Development Build

Some features are **not available in Expo Go** and require a development build (`npx expo run:ios` or `npx expo run:android`):

| Feature | Reason |
|---------|--------|
| **iOS Share Extension** | Requires native entitlements and app groups |
| **Shared Keychain (JWT sync)** | Requires `accessGroup` entitlement for SecureStore |
| **Android Share Intent** | Requires `react-native-share-menu` native module |
| **iOS 26+ Native Tabs** | Uses `expo-router/unstable-native-tabs` |

To create a development build:

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

---

## Installation sur iPhone (Production Build)

Cette section explique comment installer l'application sur un vrai iPhone depuis un Mac.

### Prérequis

- **macOS** avec Xcode installé (version 15+ recommandée)
- **Compte Apple Developer** (gratuit ou payant)
- **iPhone** connecté en USB au Mac
- **CocoaPods** installé (`sudo gem install cocoapods`)

### Étapes d'installation

#### 1. Installer les dépendances

```bash
npm install
```

#### 2. Générer le projet natif iOS

```bash
npx expo prebuild --platform ios
```

Cette commande crée le dossier `ios/` avec le projet Xcode natif.

#### 3. Installer les dépendances CocoaPods

```bash
cd ios && pod install && cd ..
```

#### 4. Ouvrir le projet dans Xcode

```bash
open ios/BomboMobile.xcworkspace
```

**Important** : Ouvrir le fichier `.xcworkspace` et non `.xcodeproj`.

#### 5. Configurer la signature dans Xcode

1. Dans Xcode, sélectionner le projet **BomboMobile** dans le navigateur
2. Aller dans l'onglet **Signing & Capabilities**
3. Cocher **Automatically manage signing**
4. Sélectionner votre **Team** (compte Apple Developer)
5. Si le Bundle Identifier est pris, le modifier (ex: `com.votrenom.bombomobile`)

#### 6. Préparer l'iPhone

1. Connecter l'iPhone au Mac via USB
2. Sur l'iPhone : **Réglages > Confidentialité et sécurité > Mode développeur** → Activer
3. Faire confiance à l'ordinateur si demandé

#### 7. Configurer le mode Release (recommandé)

Pour que l'app fonctionne de façon autonome (sans connexion au Mac) :

1. Dans Xcode : **Product → Scheme → Edit Scheme**
2. Cliquer sur **Run** dans la colonne de gauche
3. Changer **Build Configuration** de `Debug` à `Release`
4. Fermer la fenêtre

#### 8. Build et installation

1. Dans Xcode, sélectionner votre iPhone comme destination (en haut à gauche)
2. Appuyer sur **Cmd + R** ou cliquer sur le bouton Play
3. Attendre la compilation et l'installation

#### 9. Faire confiance à l'application (première installation)

Sur l'iPhone :
1. **Réglages > Général > Gestion des appareils (ou VPN et gestion des appareils)**
2. Trouver votre profil développeur
3. Cliquer sur **Faire confiance**

### Commandes utiles

| Action | Commande |
|--------|----------|
| Rebuild complet | `npx expo prebuild --platform ios --clean` |
| Nettoyer le build Xcode | `Cmd + Shift + K` dans Xcode |
| Mettre à jour les pods | `cd ios && pod install --repo-update` |

### Résolution de problèmes

**"Could not find module..."** ou erreur de module natif :
```bash
cd ios && pod install && cd ..
# Puis rebuild dans Xcode (Cmd + Shift + K, puis Cmd + R)
```

**Erreur de signature** :
- Vérifier que le compte Apple Developer est bien configuré dans Xcode > Preferences > Accounts
- Modifier le Bundle Identifier si nécessaire

**L'app ne se lance pas sur l'iPhone** :
- Vérifier que le Mode développeur est activé sur l'iPhone
- Faire confiance au profil développeur dans les réglages

---

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.
