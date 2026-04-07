<br />
<div align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/e/ee/Google_Maps_Logo_2020.svg" alt="Logo" width="80" height="80">
  
  <h1 align="center">Basho</h1>

  <p align="center">
    <strong>Trip planning made easy.</strong>
    <br />
    A modern, cinematic, and interactive travel itinerary builder built with React, Leaflet, and Supabase.
    <br />
    <br />
    <a href="https://derajyojith.dev/basho"><strong>View Live Demo »</strong></a>
    <br />
    <br />
    <a href="#features">Features</a>
    ·
    <a href="#quick-start">Quick Start</a>
    ·
    <a href="#tech-stack">Tech Stack</a>
  </p>
</div>

<br />

## 📸 Overview

> **Note:** Drop your stunning UI screenshots here! (Replace `public/screenshot-x.png` with your actual files).

<div align="center">
  
  ![Cinematic Landing Page](https://images.unsplash.com/photo-1524850011238-e3d235c7d4c9?q=80&w=1200&auto=format&fit=crop)  
  *The full-screen cinematic video splash page with Framer Motion typography.*
  
  <br />

  ![Interactive Map & Bucket](https://images.unsplash.com/photo-1499696347576-a05d6cbcd5ba?q=80&w=1200&auto=format&fit=crop)  
  *Drag-and-drop bucket lists from the global sidebar directly into your itinerary.*

</div>

## ✨ Features

- **Google Places V1 Integration:** Instantly search for real-world locations globally with high-resolution thumbnail injections.
- **Cinematic Interactions:** A full-screen `.mp4` atmospheric landing page, complemented by 60fps micro-animations via Framer Motion.
- **Global Mapping Engine:** High-performance, customized Leaflet map tiles highlighting distinct categories (dining, historic, accommodation).
- **Drag & Drop Itineraries:** Fully responsive `dnd-kit` implementation for organizing and structuring complex trip days.
- **Supabase Authentication:** Secure, frictionless backend syncing with seamless Google OAuth routing.
- **Dynamic Routing:** Built-in calculation mapping routes between your saved locations.

## 🚀 Quick Start

To run Basho locally on your machine, follow these steps:

### 1. Clone the repository
```bash
git clone https://github.com/OneAutumnLeef/basho.git
cd basho
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory and add your secure keys:
```env
VITE_SUPABASE_URL=https://<YOUR_SUPABASE_PROJECT>.supabase.co
VITE_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
VITE_GOOGLE_MAPS_API_KEY=<YOUR_API_KEY>
```

### 4. Fire up the Dev Server
```bash
npm run dev
```
Navigate to `http://localhost:8080/` in your browser.

## 🛠️ Tech Stack

- **Frontend:** React + Vite, TypeScript 
- **Styling:** Tailwind CSS, Framer Motion, shadcn/ui
- **State Management:** React Query (TanStack), Zustand
- **Map & Geocoding:** React-Leaflet, Google Places SDK
- **Backend & Auth:** Supabase (PostgreSQL + Google OAuth)
- **Deployment:** GitHub Actions + Vercel / GitHub Pages

---

<div align="center">
  Made with ❤️ by <a href="https://derajyojith.dev/">Deraj</a>.
</div>
