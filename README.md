# ✈️ Full-Stack AI Travel Planner

A production-grade, AI-powered travel planning and itinerary customization platform. The application builds comprehensive, interactive itineraries, estimates transit costs, plots live routes globally on an interactive map, fetches live weather conditions, and enables users to modify their schedules on the fly.

🔗 **GitHub Repository:** [AVINASHGK16/ai-travel-planner-fullstack](https://github.com/AVINASHGK16/ai-travel-planner-fullstack)  
🌐 **Live Demo (Vercel):** [frontend-five-iota-e0g61pg4et.vercel.app](https://frontend-five-iota-e0g61pg4et.vercel.app/)

---

## 🛠️ Technology Stack

The application is engineered using a robust full-stack architecture:

*   **Frontend (UI/UX):** React (v19), Vite (v5), Tailwind CSS (v4) for styling, Framer Motion for premium animations, Lucide React for modern vector icons.
*   **Backend Server:** Node.js, Express.js for the API layer and API proxies.
*   **Database / Persistence:** MongoDB via Mongoose ORM, with a built-in local JSON file database fallback (`saved_trips.json`) for zero-config offline runs.
*   **AI Engine:** Google Gemini AI API (`gemini-1.5-flash`) for travel plans, itinerary structures, and interactive chatbot assistance.
*   **Maps & Routing:** Leaflet.js with React-Leaflet, using OpenStreetMap tiles. Coordinates resolved globally via the OpenStreetMap Nominatim Geocoding API.
*   **Weather Service:** OpenWeather API proxy integrated via backend endpoint `/api/weather`.
*   **Document Generation:** jsPDF for compiling and downloading print-ready PDF itineraries.

---

## ✨ Features & Capabilities

### 1. Database Synchronization & User-Scoped Cloud Saving
*   Connected the React client with the Express + MongoDB backend.
*   Itineraries are persisted in the cloud and scoped to the logged-in user (filtered by email), separating history between traveler profiles.
*   Graceful fallback to local storage if the backend Express server is offline.

### 2. Live Map Geocoding & Route Tracking
*   Replaced hardcoded coordinate databases with the OpenStreetMap Nominatim Geocoding API.
*   Users can search for *any* city worldwide (e.g., Paris, London, Tokyo), and the map will center, plot starting/destination pins, and map points of interest (POI) like petrol stations, hotels, and dine spots.
*   Added a blurred loading indicator overlay that updates the user while coordinates are resolved.

### 3. Interactive Itinerary Customizer
*   Allows users to add, edit, or delete activities directly on the timeline.
*   Features inline editor form cards to modify time slots, title, description, cost, and icon class.
*   Saves custom edits to the database and dynamically recalculates budget details (miscellaneous and totals) in real time.

### 4. Real-time Weather Proxy
*   Connected the weather panel to retrieve real-time temperatures, wind speeds, and condition alerts from the backend OpenWeather proxy.

### 5. AI Chat Assistant & PDF Exporter
*   An embedded chatbot providing custom tips and packing checklists.
*   One-click download of the complete itinerary formatted into a clean PDF document.

---

## 🚀 Setup & Execution Guide

### Prerequisites
*   Node.js (v20.10.0+ recommended)
*   npm or yarn

### 1. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/AVINASHGK16/ai-travel-planner-fullstack.git
cd ai-travel-planner-fullstack
npm install
```

### 2. Configuration
Copy the `.env.example` file to `.env` in the root directory:
```bash
cp .env.example .env
```
Fill in your API keys in the `.env` file:
```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
WEATHER_API_KEY=your_openweather_api_key_here
MONGO_URI=your_mongodb_connection_string_here (Optional - defaults to JSON file fallback)
```

### 3. Running the Project
To run the full stack, start the backend and frontend dev servers in separate terminal windows:

#### Start the Backend API Server:
```bash
npm run server
```
*Runs on `http://localhost:5000`*

#### Start the Frontend React App:
```bash
npm run dev
```
*Runs on `http://localhost:5173`*

Open `http://localhost:5173` in your browser, log in with any email (e.g., `explorer@gmail.com`), and start planning!
