# Session 2 – Smart Waste System Architecture

## 2.1 Data Sources

The CityCycle system ingests data from multiple sources to build a complete picture of urban waste operations.

### Primary Data Sources

| Source | Data Collected | Frequency | Implementation |
|--------|---------------|-----------|----------------|
| **Bin Fill-Level Sensors** | Fill percentage (0-100%), temperature | Every 10 seconds (simulated) | `binGenerator.js`, `bin_simulator.py` |
| **GPS / Geolocation** | User coordinates, bin coordinates | On page load | `LocationContext.jsx`, Browser Geolocation API |
| **Citizen Reports** | Complaint type, location, description, photos | On submission | `Complaints.jsx`, `/api/complaints` |
| **Collection Records** | Waste weight, type composition, timestamp | Per collection event | `Collections.jsx`, `/api/collections` |
| **Vehicle Telemetry** | Vehicle ID, route, capacity | Per route | `Vehicles.jsx`, `/api/vehicles` |

### Generated / Derived Data

| Source | Data Produced | Generator |
|--------|--------------|-----------|
| **ML Predictions** | Future fill levels (24h forecast) | `fill_level_forecaster.py` (Random Forest, XGBoost, ARIMA) |
| **Waste Classification** | Category labels (organic, plastic, metal, paper, glass) | `waste_classifier.py` (Random Forest, Decision Tree) |
| **Route Optimization** | Optimized bin visit sequence, total distance | `route_optimizer.py`, `routeOptimizer.js` |
| **Simulation Engine** | Projected fill timelines, threshold alerts | `bin_simulator.py`, `binGenerator.js` |

---

## 2.2 Data Flow Pipeline

The system follows a 5-stage pipeline: **Capture → Transfer → Store → Analyze → Optimize**

```
┌────────────────────────────────────────────────────────────────────────┐
│                    CITYCYCLE DATA FLOW PIPELINE                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────────────┐   │
│  │   CAPTURE    │    │   TRANSFER   │    │        STORE          │   │
│  │              │    │              │    │                       │   │
│  │ • IoT Sensors│───▶│ • REST APIs  │───▶│ • SQLite Database     │   │
│  │ • GPS        │    │ • WebSockets │    │ • Trained ML Models   │   │
│  │ • User Input │    │ • JSON/HTTP  │    │ • Local State (React) │   │
│  │ • Geolocation│    │              │    │                       │   │
│  └──────────────┘    └──────────────┘    └───────────┬───────────┘   │
│                                                      │               │
│                                                      ▼               │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                        ANALYZE                               │    │
│  │                                                              │    │
│  │  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐  │    │
│  │  │  Fill-Level      │  │   Waste      │  │     Bin        │  │    │
│  │  │  Forecasting     │  │ Classification│  │  Simulation    │  │    │
│  │  │  (RF, XGB, ARIMA)│  │ (RF, DT)     │  │  (Time-series) │  │    │
│  │  └────────┬────────┘  └──────┬───────┘  └───────┬────────┘  │    │
│  │           │                  │                   │            │    │
│  └───────────┼──────────────────┼───────────────────┼────────────┘    │
│              │                  │                   │                 │
│              ▼                  ▼                   ▼                 │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                        OPTIMIZE                              │    │
│  │                                                              │    │
│  │  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐  │    │
│  │  │  Route           │  │  Threshold   │  │   Dashboard    │  │    │
│  │  │  Optimization    │  │  Alerts      │  │  Visualization │  │    │
│  │  │  (Nearest-Nbr)   │  │  (Critical)  │  │  (Leaflet+    │  │    │
│  │  │                  │  │              │  │   Recharts)    │  │    │
│  │  └─────────────────┘  └──────────────┘  └────────────────┘  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2.3 System Architecture

### High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                   │
│                                                                  │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │Dashboard │ │Forecasting│ │Simulation│ │ Classification   │  │
│  │  Page    │ │   Page    │ │   Page   │ │     Page         │  │
│  └────┬─────┘ └─────┬─────┘ └────┬─────┘ └────────┬─────────┘  │
│       │             │            │                 │             │
│  ┌────┴─────────────┴────────────┴─────────────────┴─────────┐  │
│  │              Services Layer (Axios HTTP Clients)           │  │
│  │  binGenerator.js │ routeOptimizer.js │ predictionEngine.js│  │
│  └─────────────────────────────┬─────────────────────────────┘  │
│                                │                                 │
│  ┌─────────────────────────────┴─────────────────────────────┐  │
│  │   Contexts (AuthContext, LocationContext)                  │  │
│  │   • User authentication state                             │  │
│  │   • Geolocation coordinates                               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │   UI Components                                           │  │
│  │   • BinMap (Leaflet)    • DashboardStats                  │  │
│  │   • Charts (Recharts)   • AlertsPanel                     │  │
│  │   • NearbyBins          • ModelComparison                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ REST API (JSON over HTTP)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI / Python)                    │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │   API Routes                                              │  │
│  │   /api/bins  │ /api/forecasting │ /api/classification     │  │
│  │   /api/simulation │ /api/route-optimization               │  │
│  │   /api/predictions │ /api/analytics │ /api/complaints     │  │
│  │   /api/auth  │ /api/collections │ /api/vehicles           │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │   ML Engine (scikit-learn, pandas, numpy)                 │  │
│  │                                                           │  │
│  │   fill_level_forecaster.py  │  waste_classifier.py        │  │
│  │   bin_simulator.py          │  route_optimizer.py         │  │
│  │   data_preprocessor.py      │  advanced_route_optimizer.py│  │
│  │   predictor.py                                            │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │   Data Layer                                              │  │
│  │   • SQLite + SQLAlchemy ORM                               │  │
│  │   • Trained Model Storage (joblib serialized .pkl files)  │  │
│  │   • 36 pre-trained models in /ml/trained_models/          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │   Middleware & Auth                                       │  │
│  │   • Clerk JWT verification (social/email)                 │  │
│  │   • Custom JWT (phone OTP)                                │  │
│  │   • Role-based access control (admin, worker, user)       │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite | Component-based UI with hot-reload dev server |
| **Mapping** | Leaflet + CARTO Dark Tiles | Interactive bin map with markers, routes, popups |
| **Charts** | Recharts | Gradient trend charts, pie charts, bar charts |
| **Styling** | Tailwind CSS + Custom CSS | Glassmorphism, animations, dark theme |
| **Backend** | FastAPI (Python 3.8+) | High-performance async REST API |
| **Database** | SQLite + SQLAlchemy | Local persistent storage |
| **ML** | scikit-learn, XGBoost, statsmodels | Prediction, classification, simulation |
| **Auth** | Clerk + Custom JWT | Hybrid authentication (social + phone OTP) |

---

## 2.4 API Endpoint Map

| Endpoint Group | Base Path | Key Operations |
|---------------|-----------|----------------|
| **Authentication** | `/api/auth` | Login, signup, OTP, profile |
| **Bins** | `/api/bins` | CRUD, seed, fill readings |
| **Forecasting** | `/api/forecasting` | Train models, predict, compare, feature importance |
| **Classification** | `/api/classification` | Train classifier, classify sample, confusion matrix |
| **Simulation** | `/api/simulation` | Run simulation, compare thresholds |
| **Route Optimization** | `/api/route-optimization` | Optimize route, get vehicle routes |
| **Predictions** | `/api/predictions` | Batch predictions, route optimization |
| **Analytics** | `/api/analytics` | Summary stats, trends |
| **Complaints** | `/api/complaints` | Submit, track, update status |
| **Collections** | `/api/collections` | Log collections, waste composition |

---

*This document is part of the CityCycle Integrated Project — Session 2 deliverable.*
