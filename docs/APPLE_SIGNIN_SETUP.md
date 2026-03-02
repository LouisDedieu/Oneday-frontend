# Apple Sign-In Setup Guide

This document explains how to complete Apple Sign-In integration once you have an Apple Developer account.

## Prerequisites

- Apple Developer Program membership ($99/year)
- Access to [Apple Developer Portal](https://developer.apple.com/)
- Access to [Supabase Dashboard](https://supabase.com/dashboard)

---

## Step 1: Configure App ID in Apple Developer Portal

1. Go to **Certificates, Identifiers & Profiles**(https://developer.apple.com/account/resources) > **Identifiers**
2. Select your App ID (`com.onedaytravel.app`) or create it if it doesn't exist
3. Enable **Sign in with Apple** capability
4. Click **Save**

---

## Step 2: Create a Service ID (for Supabase)

Supabase needs a Service ID to handle the OAuth flow on the server side.

1. Go to **Certificates, Identifiers & Profiles** > **Identifiers**
2. Click **+** to register a new identifier
3. Select **Services IDs** and click **Continue**
4. Enter:
   - **Description**: `Oneday Web Auth`
   - **Identifier**: `com.onedaytravel.app.auth` (must be different from App ID)
5. Click **Continue** then **Register**
6. Click on the newly created Service ID
7. Enable **Sign in with Apple** and click **Configure**
8. Set:
   - **Primary App ID**: `com.onedaytravel.app`
   - **Domains**: `ylehqgyfkwgeusreawdo.supabase.co` (your Supabase project domain)
   - **Return URLs**: `https://ylehqgyfkwgeusreawdo.supabase.co/auth/v1/callback`
9. Click **Save**

---

## Step 3: Create a Private Key

1. Go to **Certificates, Identifiers & Profiles** > **Keys**
2. Click **+** to create a new key
3. Enter:
   - **Key Name**: `Oneday Apple Sign-In Key`
4. Enable **Sign in with Apple** and click **Configure**
5. Select your Primary App ID (`com.onedaytravel.app`)
6. Click **Save** then **Continue** then **Register**
7. **Download the key file** (`.p8`) - you can only download it once!
8. Note the **Key ID** displayed on the screen

---

## Step 4: Get Your Team ID

1. Go to [Apple Developer Account](https://developer.apple.com/account)
2. Look at the top right or in **Membership Details**
3. Note your **Team ID** (10-character alphanumeric string)

---

## Step 5: Configure Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** > **Providers**
4. Find **Apple** and click to configure
5. Enable Apple provider
6. Fill in:
   - **Client ID (Service ID)**: `com.onedaytravel.app.auth`
   - **Secret Key**: Content of the `.p8` file you downloaded
   - **Key ID**: The Key ID from Step 3
   - **Team ID**: Your Team ID from Step 4
7. Click **Save**

---

## Step 6: Rebuild the App

After configuring everything, rebuild the iOS app:

```bash
# Clean and regenerate native project
rm -rf ios
npx expo prebuild --platform ios --clean

# Open in Xcode
open ios/Oneday.xcworkspace
```

In Xcode:
1. Select the **Oneday** target
2. Go to **Signing & Capabilities**
3. Verify **Sign in with Apple** capability is present
4. Build and run on a device

---

## Testing

1. Launch the app on a physical iOS device (iOS 13+)
2. Go to the login screen
3. Tap **Continuer avec Apple**
4. Complete the Apple authentication flow
5. You should be logged in

---

## Troubleshooting

### "Apple Sign-In is not available on this device"
- Apple Sign-In requires iOS 13 or later
- Simulators may not fully support Apple Sign-In
- Test on a physical device

### "Invalid client_id"
- Verify the Service ID matches exactly in Supabase
- Check that the Service ID is configured with Sign in with Apple enabled

### "Invalid redirect_uri"
- Verify the Return URL in Apple Developer Portal matches Supabase callback URL
- Format: `https://<your-project>.supabase.co/auth/v1/callback`

### "No identity token received"
- User may have cancelled the authentication
- Try again and complete the Face ID/Touch ID verification

### Apple Sign-In button not showing
- Check `appleAvailable` state - it's false if the device doesn't support it
- Apple Sign-In is not available on Android (the button is hidden)

---

## Summary of Values Needed

| Value | Where to Find | Where to Use |
|-------|--------------|--------------|
| **App ID** | Apple Developer Portal > Identifiers | Xcode project |
| **Service ID** | Create in Apple Developer Portal | Supabase Client ID |
| **Team ID** | Apple Developer Account > Membership | Supabase |
| **Key ID** | Apple Developer Portal > Keys | Supabase |
| **Private Key (.p8)** | Download when creating key | Supabase Secret Key |

---

## Code Already Implemented

The following code changes have been made and are ready to use:

### app.json
- Added `expo-apple-authentication` plugin
- Added `usesAppleSignIn: true` for iOS
- Added `com.apple.developer.applesignin` entitlement

### context/AuthContext.tsx
- Added `signInWithApple()` function using `expo-apple-authentication`
- Uses Supabase `signInWithIdToken()` with Apple provider

### app/login.tsx
- Added Apple Sign-In button (only visible on iOS devices that support it)
- Button styled to match Google Sign-In button

---

## Android Support

Apple Sign-In is **only available on iOS**. The button is automatically hidden on Android devices.

If you want to support Apple Sign-In on Android in the future, you would need to:
1. Implement a web-based OAuth flow
2. Use `WebBrowser.openAuthSessionAsync()` similar to Google Sign-In
3. This requires additional server-side configuration
