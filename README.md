# GYFMUN — Setup Guide

## 1. Firebase Project Setup

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project**, enter a name (e.g. `gyfmun`), follow the steps
3. Once created, click **Project Settings** (gear icon) → **Your apps** → **Add app** → choose **Web** (`</>`)
4. Register the app (no need for Firebase Hosting), then copy the `firebaseConfig` object shown
5. Open `js/firebase-config.js` and replace every `YOUR_...` placeholder with your actual values

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef"
};
```

---

## 2. Enable Firestore Database

1. In Firebase Console → **Build** → **Firestore Database** → **Create database**
2. Choose **Start in production mode** (the security rules handle access)
3. Select a region (e.g. `europe-west3`) and click **Enable**

---

## 3. Enable Authentication

1. Firebase Console → **Build** → **Authentication** → **Get started**
2. Under **Sign-in method**, enable **Email/Password**
3. Go to **Users** tab → **Add user**
4. Enter your admin email and a strong password — these are the credentials you'll use to log in to `/admin`

---

## 4. Deploy Firestore Security Rules

### Option A — Firebase CLI (recommended)

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # choose your project, keep defaults
firebase deploy --only firestore:rules
```

### Option B — Firebase Console

1. Firebase Console → **Firestore Database** → **Rules** tab
2. Replace the default rules with the contents of `firestore.rules`
3. Click **Publish**

---

## 5. Run Locally

The site is plain HTML/CSS/JS — no build step needed. Use any static file server:

```bash
# Option A — Node
npx serve .

# Option B — Python
python3 -m http.server 8080

# Option C — VS Code
# Install the "Live Server" extension, right-click index.html → Open with Live Server
```

> **Important:** Open via `http://localhost:...`, not `file://`. Firebase SDK requires HTTP.

---

## 6. Adding the Logo

Drop your logo file at:

```
assets/logo.png
```

The `<img>` tag in `index.html` has an `onerror` fallback — it shows a styled CSS "GYF" emblem if the file is missing, so the site works without the logo.

---

## 7. File Structure

```
GYFMUN/
├── index.html          ← Public registration page
├── admin.html          ← Admin panel (visit /admin.html)
├── firestore.rules     ← Firestore security rules
├── README.md           ← This file
├── css/
│   ├── style.css       ← Public page styles + animations
│   └── admin.css       ← Admin panel styles
├── js/
│   ├── firebase-config.js  ← Firebase config (fill in your values)
│   ├── main.js             ← Particles, scroll reveal, form logic
│   └── admin.js            ← Auth, table, rating badges, modal
└── assets/
    └── logo.png        ← Place your GYF logo here
```

---

## 8. Social Links

The footer currently uses placeholder links:
- Telegram: `https://t.me/gyfmun`
- Instagram: `https://instagram.com/gyfmun`

Update these in `index.html` (the `<footer>` section) to your real handles.
