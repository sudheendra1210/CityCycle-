# ♻️ CityCycle: Smart Waste Management System

**CityCycle** is a high-fidelity, full-stack application designed to revolutionize urban waste collection. It leverages IoT sensor data, advanced Machine Learning models, and interactive GIS mapping to optimize collection routes, predict bin fill levels, and improve city-wide waste management efficiency.

---

## 🚀 Key Features

- **🌐 Interactive Satellite Mapping**: High-quality mapping of all waste bins using Esri World Imagery with detailed road and landmark labels.
- **📍 Unified Global State & Auto-Generation**: Automatically requests user location and seamlessly auto-generates test bins within **2km of your actual location** upon app load, utilizing a single source of truth across the Dashboard, Bins, and Complaints pages.
- **🔄 Real-Time Simulation Engine**: Simulates live IoT behavior by automatically incrementing fill levels, draining battery, fluctuating temperatures, and triggering random collection events every 10 seconds.
- **📏 Haversine Distance Tracking**: Calculates real-time distance between the active user location and every individual bin, actively sorting nearby bins on the dashboard.
- **👤 Smart User Profile**:
  - **New User Flow**: Auto-redirects new users to set their name upon first login.
  - **Hybrid Auth**: Supports both Clerk (Social/Email) and Custom Phone OTP authentication.
  - **Profile Management**: Editable user details and real-time updates.
- **📊 ML-Powered Forecasting & Alerts**: Predictive analytics that forecast bin fill levels, detect anomaly hotspots in 500m radiuses, and issue critical capacity alerts.
- **🚨 Complaint Management**: Fully functional citizen portal for submitting and tracking waste-related complaints tightly integrated with live bin drop-downs and mapping.
- **📱 Responsive UI**: A premium dark-themed dashboard with glassmorphism, gradient accents, and modern aesthetics.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React.js with Vite
- **Mapping**: Leaflet with Esri Satellite Tiles
- **State Management**: React Hooks & Context API (AuthContext, LocationContext, BinsContext)
- **Styling**: Tailwind CSS + Custom Dark Theme
- **Data Mocking**: Real-Time Custom Simulation Engine built in JavaScript
- **Auth**: Clerk (Email/Social) + Custom Axios Interceptors (Phone Auth)

### Backend
- **Framework**: FastAPI (Python)
- **Database**: Convex / SQLite with SQLAlchemy ORM
- **Authentication**: Hybrid (Clerk JWT + Custom JWT for Phone)
- **SMS**: Twilio Integration for OTPs

---

## 📁 Project Structure

```text
├── 📂 backend
│   ├── 📂 app            # FastAPI Application Core
│   │   ├── 📂 models     # SQLAlchemy Models
│   │   ├── 📂 routes     # API Endpoints (Auth, Bins, Complaints)
│   │   └── 📂 utils      # Database & ML Helpers
│   ├── main.py           # Server Entry Point
│   └── requirements.txt  # Python Dependencies
│
├── 📂 frontend
│   ├── 📂 src
│   │   ├── 📂 components # Reusable UI Components
│   │   ├── 📂 pages      # Main Dashboard Pages (Dashboard, Bins, Profile)
│   │   ├── 📂 services   # API Connection logic & Simulation Engine
│   │   └── 📂 contexts   # Global App State (Bins, Location, Auth)
│   └── package.json      # Vite/React configuration
```

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- Python 3.8+
- Node.js 16+
- Twilio Account (for SMS) & Clerk Account (for Auth)

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create a virtual environment
python -m venv venv
# Activate (Windows)
.\venv\Scripts\activate 

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run the developer server
npm run dev
```

---

## 🧪 How to Test

### 1. New User Flow & Auth
- Sign up with a new phone number. Note: In Clerk development mode, use the default OTP `424242` if SMS is rate-limited.
- You will be automatically redirected to a **"Welcome" screen** to enter your name.

### 2. Dynamic Auto-Seeding & Real-Time Bins
- Accept the browser's **Location Permission** prompt upon login.
- The app will automatically detect your coordinates (falling back to Hyderabad if denied) and instantly spawn 25 active smart bins around you.
- Open the **Dashboard** to see the 5 closest bins calculated via Haversine distance, or the **Bins** page to watch the IoT Simulation Engine update fill levels and run collection cycles every 10 seconds in real-time.

### 3. Map & Complaints Integration
- Go to the **Complaints** page.
- Choose a bin from the dropdown—the dropdown only allows selecting valid, live bins currently existing in your global state.
- Submitting the complaint will allow you to highlight and pinpoint the bin directly on the interactive satellite map.

---

## 🛡️ License
Built for the **Integrated Project** initiative. 

© 2026 **CityCycle** | Management System v1.0