# Firebase & FCM Configuration for NIVAS

Step-by-step guide to configure Firebase (and FCM for push notifications) for **hostel_backend** and **hostel_frontend/mobile** (NIVAS Mobile).

---

## Prerequisites

- Google account
- Firebase CLI (optional): `npm install -g firebase-tools`
- For iOS: Apple Developer account (for APNs key/certificate)

---

## 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com).
2. Click **Add project** (or select an existing project).
3. Enter project name (e.g. **NIVAS**).
4. Disable Google Analytics if you don’t need it (you can enable later).
5. Click **Create project**.

---

## 2. Android app (for NIVAS Mobile)

### No `android/` or `ios/` folder in your project?

Your **hostel_frontend/mobile** app is an **Expo** project. In Expo, the `android/` and `ios/` folders **do not exist** until you run:

```bash
cd hostel_frontend/mobile
npx expo prebuild
```

Until then, use **app.json** for the package name and bundle ID. After you run `expo prebuild`, the native folders are generated and the values from app.json become the `applicationId` (Android) and Bundle Identifier (iOS). You can do Firebase registration **now** with the values below; add the config files (google-services.json, etc.) **after** you run prebuild.

---

### 2.1 Register the Android app

**Your app (Expo):** The Android package name is already set in **`hostel_frontend/mobile/app.json`**:

```json
"android": {
  "package": "com.nivas.hms",
  ...
}
```

So your **Android package name** is: **`com.nivas.hms`**.

1. **Add the Android app in Firebase**  
   - Go to [Firebase Console](https://console.firebase.google.com) → your project → **Project Overview** → click the **Android** icon (Add app).  
   - **Android package name**: enter **`com.nivas.hms`**.  
   - **App nickname**: e.g. `NIVAS Mobile (Android)`.  
   - **Debug signing certificate**: optional for now.  
   - Click **Register app**.

**If you later switch to bare React Native** (no Expo): the package name will be in `android/app/build.gradle` as `applicationId`. Use that value in Firebase instead.

### 2.2 Download `google-services.json`

1. Download **google-services.json** from the Firebase setup wizard.
2. **You need the `android/` folder first.** From your mobile project root run:
   ```bash
   cd hostel_frontend/mobile
   npx expo prebuild
   ```
   This creates `android/` and `ios/` using the values in app.json.
3. Place the file here:
   ```
   hostel_frontend/mobile/android/app/google-services.json
   ```
3. Add to `.gitignore` (recommended so it’s not committed):
   ```
   # Firebase
   **/google-services.json
   **/GoogleService-Info.plist
   ```
   If you prefer to commit it (e.g. for CI), keep it in version control and omit from `.gitignore`.

### 2.3 Enable FCM (Android)

- Cloud Messaging is **on by default** for Android. No extra step in the Console.

---

## 3. iOS app (for NIVAS Mobile)

### 3.1 Register the iOS app

**Your app (Expo):** The iOS bundle ID is already set in **`hostel_frontend/mobile/app.json`**:

```json
"ios": {
  "bundleIdentifier": "com.nivas.hms",
  ...
}
```

So your **iOS bundle ID** is: **`com.nivas.hms`**.

1. **Add the iOS app in Firebase**  
   - Firebase Console → your project → **Project Overview** → click the **iOS** icon.  
   - **iOS bundle ID**: enter **`com.nivas.hms`**.  
   - **App nickname**: e.g. `NIVAS Mobile (iOS)`.  
   - **App Store ID**: optional; leave blank for now.  
   - Click **Register app**.

### 3.2 Download `GoogleService-Info.plist`

1. Download **GoogleService-Info.plist** from the setup wizard.
2. **You need the `ios/` folder first.** If you haven’t already, run from your mobile project root:
   ```bash
   cd hostel_frontend/mobile
   npx expo prebuild
   ```
3. Place the file in the app directory (folder name may be `NIVAS Mobile` or your app name from app.json):
   ```
   hostel_frontend/mobile/ios/NIVAS Mobile/GoogleService-Info.plist
   ```
   (If the folder has a different name, use the one that contains `Info.plist`.)
4. Add it in Xcode: right-click the app target → **Add Files to "NIVAS Mobile"** → select `GoogleService-Info.plist` → check **Copy items if needed** and the app target.

### 3.3 Enable Push Notifications (APNs)

1. **Apple Developer**: [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/) → **Keys** → create a new key, enable **Apple Push Notifications service (APNs)**.
2. Download the `.p8` key (only once). Note **Key ID** and **Team ID**; the **Bundle ID** is your app’s bundle ID.
3. In **Firebase Console** → **Project Settings** (gear) → **Cloud Messaging** tab → **Apple app configuration**.
4. Under **APNs Authentication Key**, upload the `.p8` file and enter **Key ID** and **Team ID** (and **Bundle ID** if asked).
5. In Xcode: select the app target → **Signing & Capabilities** → **+ Capability** → add **Push Notifications** (and **Background Modes** → **Remote notifications** if you use background handling).

---

## 4. Backend: Service account (FCM Admin / HTTP v1)

The backend uses this to send push notifications via FCM.

### 4.1 Generate service account key

1. Firebase Console → **Project Settings** (gear) → **Service accounts**.
2. Click **Generate new private key** → confirm. A JSON file downloads (e.g. `nivas-firebase-adminsdk-xxxxx.json`).

### 4.2 Store the key securely

**Option A – File (local/dev)**

1. Move the JSON to a safe location **outside** the repo, e.g.  
   `C:\secure\nivas-firebase-key.json` (Windows) or `~/secure/nivas-firebase-key.json`.
2. In `hostel_backend/.env` add:
   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=C:\secure\nivas-firebase-key.json
   ```
   Or, if you paste the JSON content (not recommended for production):
   ```env
   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
   ```

**Option B – Environment variable (production)**

- Set `FIREBASE_SERVICE_ACCOUNT_JSON` to the **entire JSON string** in your production environment (e.g. Azure App Service, AWS, etc.). Do not commit this value.

### 4.3 Add to `.env.example`

In `hostel_backend/.env.example` add:

```env
# Firebase (FCM) – path to service account JSON file, or use FIREBASE_SERVICE_ACCOUNT_JSON with raw JSON
FIREBASE_SERVICE_ACCOUNT_PATH=
# FIREBASE_SERVICE_ACCOUNT_JSON=
```

Do **not** put the real key or path to a real key in `.env.example`; use placeholders only.

---

## 5. Backend: Install Firebase Admin SDK

From `hostel_backend`:

```bash
npm install firebase-admin
```

The backend will initialize the SDK using either `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_JSON` (see `docs/notifications-fcm.md` for the send flow and audience resolution).

---

## 6. Mobile app: Package name and bundle ID

Set them once so Firebase and your app match.

**hostel_frontend/mobile/app.json** (add under `expo`):

```json
{
  "expo": {
    "name": "NIVAS Mobile",
    "slug": "nivas-mobile",
    "version": "1.0.0",
    "android": {
      "package": "com.yourapp.hms",
      "adaptiveIcon": { "backgroundColor": "#ffffff" }
    },
    "ios": {
      "bundleIdentifier": "com.yourapp.hms",
      "supportsTablet": true
    }
  }
}
```

Replace `com.yourapp.hms` with your real package name / bundle ID (e.g. `com.miniorange.hms`). Use the **same** values when registering Android and iOS apps in Firebase.

---

## 7. Mobile: FCM SDK (React Native Firebase)

The plan uses **FCM** (not Expo Push) so the backend stays independent of Expo.

- For **Expo**: you need a **development build** (native code). Install:
  - `@react-native-firebase/app`
  - `@react-native-firebase/messaging`
- Then run **expo prebuild** so `android/` and `ios/` are generated; add `google-services.json` and `GoogleService-Info.plist` as in sections 2 and 3.
- Follow [React Native Firebase – Expo](https://rnfirebase.io/) for exact version and config plugin steps for your Expo SDK version.

If you prefer **Expo Push Notifications** instead of FCM, the backend would need to call Expo’s push API; the plan in `announcements_refurbish_plan_7fe59d36.plan.md` is written for FCM.

---

## 8. Checklist

| Step | Done |
|------|------|
| Firebase project created | ☐ |
| Android app registered; `google-services.json` in `android/app/` | ☐ |
| iOS app registered; `GoogleService-Info.plist` in `ios/` and Xcode | ☐ |
| APNs key uploaded in Firebase (Cloud Messaging) | ☐ |
| Push Notifications capability in Xcode | ☐ |
| Service account key generated and path/JSON in backend `.env` | ☐ |
| `firebase-admin` installed in hostel_backend | ☐ |
| `app.json` has `android.package` and `ios.bundleIdentifier` | ☐ |
| Mobile FCM SDK + prebuild (or Expo Push) configured | ☐ |

---

## 9. Next steps

- Implement **push token API** and **FCM send service** in the backend as in the plan (Section 7.3).
- Add **backend doc** `hostel_backend/docs/notifications-fcm.md` for: overview, enums, FCM send flow, audience resolution, frontend publish flow, and step-by-step FCM configuration (this file can reference the steps above).

Once this is done, your project is configured for Firebase and FCM; the rest is application logic (tokens, audience resolution, and sending on announcement create).
