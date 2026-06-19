# Bag Man Dashboard — Setup Guide

## What you'll end up with
A live dashboard at `bagman.miketaylor.nyc` behind a password, 
that auto-updates whenever you edit your Google Sheet.

---

## Step 1: Set up your Google Sheet

1. Go to Google Sheets and create a new spreadsheet
2. Rename the first tab to **Bookscan** and create 4 more tabs:
   - **Press**
   - **Events**
   - **Bulk Orders**
   - **Social**

### Tab: Bookscan
Headers in row 1 (exact spelling):
```
Week | Label | Sales | GR Added | GR To Read | GR Ratings | GR Promo | Pending | Note
```
Example row:
```
Wk 1 | Oct 14–18 | 1992 | 28 | 19 | 4 | FALSE | FALSE |
```
- GR Promo: TRUE for Wks 6–8 (Nov 21–Dec 1 paid promotion)
- Pending: TRUE for weeks where Bookscan data hasn't arrived yet

### Tab: Press
Headers:
```
Outlet | Type | Date | Week | Tier
```
Types: Article / Broadcast TV / Podcast / Review / Newsletter
Tiers: 1 (Gold) / 2 (Silver) / 3 (Bronze)

### Tab: Events
Headers:
```
Name | Week | Date | Type | Attendance
```
Leave Attendance blank if unknown.

### Tab: Bulk Orders
Headers:
```
Buyer | Date | Qty | Week | Note
```

### Tab: Social
Headers:
```
Date | Platform | Content | Collab | Views | Collaborators | Week
```
Platform: Instagram or LinkedIn
Collab: TRUE or FALSE
Use "Pre" for the Week column on pre-launch posts.

---

## Step 2: Publish the Sheet

1. In Google Sheets: **File → Share → Publish to web**
2. Select **"Entire Document"** and **CSV** format
3. Click **Publish** and confirm
4. This makes the sheet publicly readable (data only, not editable)

## Step 3: Get your Sheet ID and Tab GIDs

Your Sheet ID is in the URL:
```
https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
```

For each tab's GID, click the tab and look at the URL:
```
https://docs.google.com/spreadsheets/d/.../edit#gid=XXXXXXXX
```

Open `src/sheets.js` and update:
```javascript
const SHEET_ID = 'paste-your-sheet-id-here'

const TABS = {
  bookscan:    '0',        // replace with actual gid
  press:       '123456',   // replace with actual gid
  events:      '234567',   // replace with actual gid
  bulk:        '345678',   // replace with actual gid
  social:      '456789',   // replace with actual gid
}
```

## Step 4: Change the password (optional)

Open `src/App.jsx` and find:
```javascript
const PASSWORD = 'bagman2025'
```
Change it to whatever you want.

---

## Step 5: Deploy to Vercel

1. Go to **github.com** and create a free account if you don't have one
2. Create a new repository called `bagman-dashboard` and upload this folder
   (or use GitHub Desktop for a drag-and-drop experience)
3. Go to **vercel.com**, sign up with your GitHub account
4. Click **"Add New Project"** → select your `bagman-dashboard` repo
5. Leave all settings as default → click **Deploy**
6. Vercel gives you a URL like `bagman-dashboard-xyz.vercel.app` — it's live!

---

## Step 6: Connect your Squarespace domain

1. In Vercel: go to your project → **Settings → Domains**
2. Add `bagman.miketaylor.nyc`
3. Vercel shows you a CNAME record to add, like:
   ```
   Type: CNAME
   Name: bagman
   Value: cname.vercel-dns.com
   ```
4. In Squarespace: **Settings → Domains → miketaylor.nyc → DNS Settings**
5. Add a Custom Record with those values
6. Wait 10–30 minutes for it to propagate
7. Visit `bagman.miketaylor.nyc` — you're live!

---

## Ongoing updates

**To update data:** Just edit your Google Sheet. 
The dashboard pulls fresh data every time someone loads the page, 
or hits the ↻ Refresh button.

**To update the password:** Edit `src/App.jsx`, push to GitHub — 
Vercel auto-redeploys in ~30 seconds.

**To add new weeks:** Add rows to the Bookscan tab. 
Everything recalculates automatically.

---

## Need help?

Paste any error messages into your chat with Claude and 
the exact step where you got stuck.
