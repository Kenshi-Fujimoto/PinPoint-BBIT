# Google sign-in setup

PinPoint uses **Firebase Authentication** for Google accounts. The browser app cannot authenticate a real Google account until it has the Firebase web-app configuration for the correct Firebase project **and** Google is enabled as a sign-in provider.

> The `VITE_FIREBASE_*` values below are Firebase's public web configuration. They are bundled into the browser by Vite and are not service-account secrets. **Never** add a Firebase Admin SDK / service-account JSON key to this repository or a `VITE_*` variable.

## 1. Create or choose the Firebase project

1. Open the [Firebase console](https://console.firebase.google.com/) and create/select the PinPoint project.
2. In **Project settings → General → Your apps**, add a **Web** app if one does not already exist.
3. Copy all six values from the displayed `firebaseConfig` object:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

## 2. Enable Google Authentication

1. Go to **Build → Authentication → Sign-in method**.
2. Select **Google**, click **Enable**, choose a project support email, and save.
3. In **Authentication → Settings → Authorized domains**, add every host where users will open PinPoint:
   - `localhost` for local development;
   - the production custom domain (for example, `pinpoint.example.edu`); and
   - the exact Vercel deployment host (for example, `pinpoint-bbit.vercel.app`) when it is used directly.

Firebase matches domains exactly. Add a preview host before testing it; a random preview host is not automatically covered by the production domain. A Google sign-in popup that reports **“This website is not authorised”** means this step is missing for the current host.

## 3. Configure the app

### Local development

```bash
cp .env.example .env.local
```

Replace every `YOUR_...` value in `.env.local` with the values copied in step 1, then restart Vite:

```bash
npm run dev
```

`.env.local` is ignored by Git and must not be committed.

### Vercel

In **Vercel → Project → Settings → Environment Variables**, add these six variables for the environments that should support login (normally **Production** and **Preview**):

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Redeploy after changing them. `VITE_*` variables are substituted while Vite builds the frontend, so changing them without a new build does not update an existing deployment.

## 4. Verify the complete flow

1. Open PinPoint at an authorized URL in a normal browser window.
2. Select **Sign In** → **Continue with Google**.
3. Select a real Google account and approve the Firebase prompt.
4. Confirm that the avatar/name appears in the navigation bar.
5. Refresh the page: the Firebase session should remain signed in.
6. Select **Sign Out** and confirm that member-only actions prompt for Google sign-in again.

PinPoint opens the normal Google popup first. If the browser blocks a popup (common in some installed PWAs), it automatically uses Firebase's redirect flow instead and restores the Firebase session when the user returns.

## Troubleshooting

| What the user sees | What to fix |
| --- | --- |
| **Google sign-in is not configured for this deployment** | Add all six `VITE_FIREBASE_*` values and redeploy/restart the app. |
| **This website is not authorised for Google sign-in** | Add the current host, without `https://` or a path, to Firebase Authentication's Authorized domains. |
| **Google sign-in is disabled** | Enable the Google provider in Firebase Authentication → Sign-in method. |
| The popup closes or is blocked | Allow popups for the site; PinPoint will attempt the redirect fallback if the popup is blocked. |
| Login works locally but not after deployment | Add the deployed host to Authorized domains and make sure the Vercel environment has all six variables, followed by a redeploy. |

## Security follow-up

Signing in only proves who the user is. Before campus-wide use, deploy Firestore Security Rules that use `request.auth` to restrict creates/updates/deletes and make staff permissions server-verifiable. The browser must not be treated as the authorization boundary.
