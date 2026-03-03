# Apple Sign-In Setup Guide

Ce document explique comment configurer Apple Sign-In pour l'application Oneday.

## Informations de l'application

| Valeur | |
|--------|---|
| **Bundle Identifier** | `com.onedaytravel.mobile` |
| **Service ID** | `com.onedaytravel.mobile.auth` |
| **App Name** | Oneday |

---

## Prérequis

- Apple Developer Program membership ($99/year)
- Accès au [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
- Accès au [Supabase Dashboard](https://supabase.com/dashboard)

---

## Étape 1 : Configurer l'App ID dans Apple Developer Portal

1. Va sur **[Identifiers](https://developer.apple.com/account/resources/identifiers/list)**
2. Trouve ou crée l'App ID `com.onedaytravel.mobile`
3. Clique dessus pour l'éditer
4. Scroll jusqu'à **Sign in with Apple** et **coche la case**
5. Clique **Save**

---

## Étape 2 : Créer un Service ID

Le Service ID est nécessaire pour que Supabase puisse valider les tokens Apple.

1. Va sur **[Identifiers](https://developer.apple.com/account/resources/identifiers/list)**
2. Clique sur **+** (bouton bleu en haut)
3. Sélectionne **Services IDs** puis **Continue**
4. Remplis :
   - **Description** : `Oneday Auth Service`
   - **Identifier** : `com.onedaytravel.mobile.auth`
5. Clique **Continue** puis **Register**
6. **Clique sur le Service ID** que tu viens de créer
7. **Coche** "Sign in with Apple" et clique sur **Configure**
8. Dans la popup :
   - **Primary App ID** : Sélectionne `com.onedaytravel.mobile`
   - **Domains and Subdomains** : Ajoute ton domaine Supabase (ex: `ylehqgyfkwgeusreawdo.supabase.co`)
   - **Return URLs** : Ajoute `https://ylehqgyfkwgeusreawdo.supabase.co/auth/v1/callback`
9. Clique **Save** puis **Continue** puis **Save**

---

## Étape 3 : Créer une Private Key

1. Va sur **[Keys](https://developer.apple.com/account/resources/authkeys/list)**
2. Clique sur **+** (bouton bleu)
3. Remplis :
   - **Key Name** : `Oneday Sign In Key`
4. **Coche** "Sign in with Apple" et clique **Configure**
5. Sélectionne `com.onedaytravel.mobile` comme Primary App ID
6. Clique **Save** puis **Continue** puis **Register**
7. **TÉLÉCHARGE LE FICHIER .p8** (tu ne peux le télécharger qu'une seule fois !)
8. **Note le Key ID** affiché (ex: `ABC123XYZ`)

---

## Étape 4 : Récupérer ton Team ID

1. Va sur [Apple Developer Account](https://developer.apple.com/account)
2. Regarde en haut à droite ou dans **Membership Details**
3. Note ton **Team ID** (10 caractères, ex: `ABCD1234EF`)

---

## Étape 5 : Configurer Supabase

1. Va sur ton [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionne ton projet
3. Va dans **Authentication** > **Providers**
4. Trouve **Apple** et clique pour configurer
5. **Active** le provider Apple
6. Remplis :
   - **Client ID (Service ID)** : `com.onedaytravel.mobile.auth`
   - **Secret Key** : Colle le **contenu complet** du fichier `.p8` (incluant `-----BEGIN PRIVATE KEY-----` et `-----END PRIVATE KEY-----`)
   - **Key ID** : Le Key ID de l'étape 3
   - **Team ID** : Ton Team ID de l'étape 4
7. Clique **Save**

---

## Étape 6 : Rebuild l'application iOS

Après avoir tout configuré, rebuild l'app :

```bash
# Nettoie et regénère le projet natif
rm -rf ios
npx expo prebuild --platform ios --clean

# Ouvre dans Xcode
open ios/Oneday.xcworkspace
```

Dans Xcode :
1. Sélectionne la target **Oneday**
2. Va dans **Signing & Capabilities**
3. Vérifie que **Sign in with Apple** est présent
4. Build et run sur un **appareil physique** (pas le simulateur)

---

## Checklist de vérification

Avant de tester, vérifie :

- [ ] App ID `com.onedaytravel.mobile` a "Sign in with Apple" activé
- [ ] Service ID `com.onedaytravel.mobile.auth` existe et est configuré
- [ ] Le Service ID a le bon domaine Supabase et Return URL
- [ ] Private Key (.p8) a été créée et téléchargée
- [ ] Supabase Apple provider est activé avec les bonnes valeurs
- [ ] L'app a été rebuild avec `expo prebuild --clean`

---

## Troubleshooting

### "Connexion Apple impossible" (erreur générique)

**Cause la plus fréquente** : Configuration Supabase incorrecte.

Vérifie dans Supabase :
1. Le **Client ID** doit être le **Service ID** (`com.onedaytravel.mobile.auth`), pas le bundle identifier
2. La **Secret Key** doit inclure les lignes `-----BEGIN PRIVATE KEY-----` et `-----END PRIVATE KEY-----`
3. Le **Key ID** et **Team ID** doivent être corrects

### "Apple Sign-In is not available on this device"

- Nécessite iOS 13+
- Les simulateurs ne supportent pas toujours Apple Sign-In
- Teste sur un **appareil physique**

### Le bouton Apple n'apparaît pas

- Normal sur Android (le bouton est masqué automatiquement)
- Sur iOS, vérifie que `AppleAuthentication.isAvailableAsync()` retourne `true`

### "Invalid client_id"

- Vérifie que le Service ID dans Supabase correspond exactement à celui créé dans Apple Developer Portal
- Le Service ID doit être `com.onedaytravel.mobile.auth` (pas le bundle identifier)

### "Invalid redirect_uri"

- Vérifie que le Return URL dans Apple Developer Portal correspond exactement à Supabase :
  `https://[ton-projet].supabase.co/auth/v1/callback`

---

## Résumé des valeurs

| Valeur | Où la trouver | Où l'utiliser |
|--------|---------------|---------------|
| **Bundle ID** | `app.json` | Apple Developer Portal (App ID) |
| **Service ID** | Tu le crées | Apple Portal + Supabase Client ID |
| **Team ID** | Apple Developer > Membership | Supabase |
| **Key ID** | Apple Developer > Keys | Supabase |
| **Private Key (.p8)** | Téléchargé lors de la création | Supabase Secret Key |
