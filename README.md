<div align="center">
  <img src="https://images.prismic.io/derajportfolio/adV7P-zlhpBNhbdU_basho.png?auto=format,compress" alt="Basho Logo" width="90" />

  <h1>Basho</h1>
  <p><strong>Trip planning made easy.</strong></p>
  <p>A cinematic, map-first travel itinerary builder powered by Google Maps, Google Places, and Supabase.</p>

  <a href="https://derajyojith.dev/basho"><strong>→ Live Demo</strong></a>
  &nbsp;·&nbsp;
  <a href="#quick-start">Quick Start</a>
  &nbsp;·&nbsp;
  <a href="#environment-variables">Environment Variables</a>

  <br /><br />

  ![Deploy](https://github.com/OneAutumnLeef/basho/actions/workflows/main.yml/badge.svg)
</div>

---

## What is Basho?

Basho is a modern, glassmorphic trip-planning web application. Think Wanderlog meets Google Maps — you can search any place in the world, explore trending restobars near you, save pins to your personal map, and drag-drop locations into an itinerary bucket for each day of your trip.

The map is the interface. Everything is built around it.

---

## Features

- **Google Maps (Vector)** — Full Google Maps JS SDK with a custom dark cloud style via Map ID. Smooth vector rendering, not raster tiles.
- **Google Places Search** — Live place search powered by the Places API. Real thumbnails, real ratings, real addresses.
- **Trending Feed** — On load, 5 random top-rated restobars in Bangalore are fetched and pinned dynamically. No hardcoded data.
- **Category Markers** — Custom emoji-based markers per category (🍽️ dining, ☕ cafe, 🏛️ historic, etc.) with glow effects on selection.
- **Drag & Drop Itinerary** — Drag any place card from the sidebar into your Trip Bucket using `dnd-kit`. Reorder freely.
- **Cinematic Landing Page** — Full-screen aerial video splash with Framer Motion staggered typography animation.
- **Google OAuth** — One-tap sign-in via Supabase Auth when saving places.
- **Supabase Backend** — Saved places and user data persisted in PostgreSQL via Supabase.
- **GitHub Actions CI/CD** — Auto-deploys to GitHub Pages on every push to `main`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Animation | Framer Motion |
| Map | Google Maps JS SDK (Vector, Map ID) |
| Places & Search | Google Places API |
| Drag & Drop | dnd-kit |
| State / Fetching | TanStack React Query |
| Backend | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| Deployment | GitHub Actions → GitHub Pages |

---

## Quick Start

```bash
git clone https://github.com/OneAutumnLeef/basho.git
cd basho
npm install
```

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
```

```bash
npm run dev
```

Navigate to `http://localhost:8080/basho/`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon public key |
| `VITE_GOOGLE_MAPS_API_KEY` | Yes | Google Maps JS + Places API key |

For GitHub Actions deployment, add `VITE_GOOGLE_MAPS_API_KEY` as a **Repository Secret** under Settings → Secrets → Actions.

---

## Google Cloud APIs Required

Enable these in your Google Cloud Console project:

- ✅ Maps JavaScript API
- ✅ Places API

The Map ID for the custom dark vector style is configured at: **Maps Platform → Map Management**.

---

## Google OAuth Setup

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web Application)
3. Add `https://<your-project>.supabase.co/auth/v1/callback` as an Authorized Redirect URI
4. In Supabase Dashboard → Authentication → Providers → Google, paste the Client ID and Secret
5. Enable the provider and save

---

## Deployment

The app is configured to deploy to `derajyojith.dev/basho` via GitHub Pages.

```bash
git push origin main   # triggers GitHub Actions automatically
```

Vite `base` is set to `/basho/` and React Router has a matching `basename="/basho/"`.

---

<div align="center">
  Built by <a href="https://derajyojith.dev">Deraj Yojith</a>
</div>
