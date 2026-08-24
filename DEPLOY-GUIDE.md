# SK PHONE - INTERNET PAR DEPLOY GUIDE (100% FREE)

## HAL HO GAYA - LIVE SERVER (24 Aug 2026)

**LIVE ADDRESS:** https://skphone.dhsiiktr1.deno.net

- Platform: **Deno Deploy** (FREE, card ki zaroorat NAHI)
- Server file: `server.deno.js` (GitHub repo `dhsiiktr1/skphone`, branch master)
- GitHub se push karo → Deno khud 30 sec mein naya version deploy kar deta hai
- Render.com ab CARD mangta hai is liye use chhorr diya gaya
- APK ka default server ab yehi address hai (`DEFAULT_SERVER` in index.html)

---


## Ye guide kya karayegi
Server PC se Render.com (cloud) par jayega.
Phir **koi bhi, kahin se bhi** — mobile data, doosra sheher, doosra mulk — connect hoga.

---

## STEP 1: Render.com par FREE account banao (5 minute)

1. Browser mein kholo: https://render.com
2. `Get Started` → `Sign up with Google` (sab se asaan)
3. Credit card ki zaroorat NAHI hai.

## STEP 2: Server upload karo (2 tareeqay)

### Tareeqa A — GitHub se (recommended, free):
1. https://github.com par account banao (agar nahi hai)
2. `New repository` → naam do: `skphone` → `Private` → `Create`
3. Repo page par `uploading an existing file` par click karo
4. Ye files drag-drop karo (`E:\MY AI TOOL\M3U Viewer\New folder\softphone-demo` se):
   - `server.js`
   - `package.json`
   - `package-lock.json`
   - `public` folder (poora — index.html, sw.js, manifest.json, icons, SKPhone.apk)
   - **node_modules aur .pem files upload MAT karo**
5. Neeche `Commit changes` dabao

### Tareeqa B — Direct (bina GitHub):
Render "Deploy from Git" maangta hai, is liye Tareeqa A hi best hai.

## STEP 3: Render.com par Web Service banao

1. Render dashboard → `New +` → `Web Service`
2. `Build and deploy from a Git repository` → apna `skphone` repo select karo
3. Settings aise do:

   | Field | Value |
   |-------|-------|
   | Name | `skphone` (ya jo chaho — yehi URL banega) |
   | Region | Singapore (Pakistan ke liye fastest) |
   | Branch | main |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | **Free** |

4. `Create Web Service` dabao — 2-3 minute mein deploy ho jayega
5. Aapka address banega: **https://skphone.onrender.com**

## STEP 4: Test karo

1. PC browser: `https://skphone.onrender.com` kholo — login screen dikhna chahiye
2. Do phones ya phone + PC par alag naam se login karo
3. WiFi band karo, phone ko mobile data par chalao, phir call lagao

---

## TURN SERVER (mobile data / mulk ke bahar calls ke liye)

Code mein pehle se hi FREE TURN add ho chuka hai (Open Relay).
Agar kabhi mobile data par call connect na ho:

1. https://www.metered.ca/tools/openrelay/ par FREE account banao
   (ya ExpressTURN: https://www.expressturn.com — 100GB/month free)
2. Dashboard se TURN credentials copy karo
3. `public/index.html` mein `ICE` wale section mein purana TURN block badal do

## APK UPDATE (naya server address default dena)

1. `public/index.html` kholo, sab se oopar ye line dhundo:
   ```js
   const DEFAULT_SERVER = '';
   ```
2. Isko aise karo:
   ```js
   const DEFAULT_SERVER = 'skphone.onrender.com';
   ```
3. APK rebuild (purane tareeqe se):
   ```powershell
   Copy-Item E:\MY AI TOOL\M3U Viewer\New folder\softphone-demo\public\* E:\MY AI TOOL\M3U Viewer\New folder\SKPhone-app\www\ -Recurse -Force
   cd 'E:\MY AI TOOL\M3U Viewer\New folder\SKPhone-app'
   npx cap copy android
   cd android
   .\gradlew.bat assembleDebug
   ```

---

## Zaroori baatein

- **Free server sota hai:** 15 min idle ke baad Render free instance sleep
  hota hai. Pehli call/connection ~30-50 sec late hogi, uske baad sab fast.
- **Har code change ke baad:** GitHub par files dobara upload karo →
  Render khud-ba-khud naya version deploy kar dega.
- **Local WiFi test abhi bhi chalta hai:** PC par `node server.js` chalao,
  same WiFi phone se `https://<PC-IP>:3443` — bilkul pehle jaisa.
- **Kuch bhi paid nahi hai:** Render free, domain free (.onrender.com),
  TURN free quota, APK local build free.
