# SendSnippet

[Open the web app](https://sendsnippet.web.app) · [Download the Android APK](https://github.com/nicolaslee2000/SendSnippet/releases/latest/download/SendSnippet.apk)

Send files and text between devices without an account. Add up to 20 files, up to 10 GiB per file and 20 GiB total, and an optional text snippet up to 64 KiB. Share the 8-character code, link, or QR. Choose a 15-minute, 1-hour, or 24-hour lifetime. The timer starts when the transfer is ready.

The web app supports drag and drop, clipboard files, QR scanning, dark mode, local activity, and sender revocation. Keep the tab open to pause or resume an in-progress file upload. A retry can also reuse files that finished uploading.

Android 8.0 and newer can send from the system share sheet or selected-text actions, open verified SendSnippet links, scan a QR, and save files to Downloads. Long-press the app icon for Send and Receive shortcuts. Use **Quick access → Add Receive tile** to open Receive from Quick Settings. File uploads run in a foreground service with progress and pause controls. Files selected using Android’s document picker can be resumed after reopening the app if Android still grants access to them.

## Local development

Install Node.js 22, JDK 21, Firebase CLI, and Android SDK 36 for Android builds.

- Run `npm ci`, `npm --prefix functions ci`, and `npm run build`.
- Start the services with `firebase emulators:start --project demo-sendsnippet --only auth,firestore,storage,functions,hosting`.
- Run `npm run dev` for the web app. Vite forwards API requests to the Hosting emulator on 5075. The browser connects directly to the local Auth and Storage emulators.
- Run `npm test` for protocol tests, `npm run test:integration` against the emulator, and `npm run test:browser` against Vite in Chrome. Set `SNIPPET_TEST_URL` to test a different URL.
- Run `cd android && ./gradlew -PlocalEmulator=true assembleDebug` for the Android emulator build. It uses `10.0.2.2` to reach the Mac's Firebase emulators and installs beside the release.

## Deployment

The live project is `sendsnippet`. Firebase Hosting serves the web app and routes its API to Cloud Functions in `europe-west1`. Firestore stores transfer metadata. The dedicated Firebase Storage bucket `sendsnippet-transfer-eu` holds file bytes. Clients stream uploads directly to Storage in resumable chunks and download directly through short-lived signed URLs. Users never have to create an account or sign in. The server issues a temporary Firebase upload identity scoped to the draft, and Storage rules enforce the draft state, file slots, and exact sizes.

The receiver needs the link or code. The sender keeps a separate local revocation credential. Firebase stores the text and file bytes in the project, and access is protected by TLS and the transfer credentials. Expiry closes new lookups and download requests. A scheduled function clears expired data and upload identities, and the bucket has a lifecycle backstop for incomplete cleanup. Existing signed download URLs have a maximum lifetime of 15 minutes and are also bounded by the transfer's expiry.

- Run `firebase deploy --project sendsnippet --only functions:sendsnippet-v2,firestore:rules,storage,hosting` as an authorized project administrator.
- The deployed Functions runtime account requires Firestore access, Firebase Auth user cleanup, object access to the transfer bucket, and permission to sign with its own credentials. The Firebase Storage service agent needs the cross-service Firestore rules role.
- Build Android with `cd android && ./gradlew assembleRelease`. Zip-align the unsigned APK, then sign it with the SendSnippet release key using Android SDK Build Tools. Verify it with `apksigner verify --print-certs`. Keep the signing key and passphrase off GitHub. Future updates must use the same key, and its SHA-256 fingerprint is published in `web/public/.well-known/assetlinks.json` for Android App Links.
- Publish the signed APK as `SendSnippet.apk` on the GitHub release for the corresponding source tag.
