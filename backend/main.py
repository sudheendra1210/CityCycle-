from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import bins, vehicles, collections, complaints, analytics, predictions, forecasting, auth, webhooks
from app.routes import route_optimization, classification, simulation
from app.utils.database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Waste Management API",
    description="Backend API for waste management optimization system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)  # Auth routes
app.include_router(webhooks.router) # clerk webhooks
app.include_router(bins.router, prefix="/api/bins", tags=["Bins"])
app.include_router(vehicles.router, prefix="/api/vehicles", tags=["Vehicles"])
app.include_router(collections.router, prefix="/api/collections", tags=["Collections"])
app.include_router(complaints.router, prefix="/api/complaints", tags=["Complaints"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions"])
app.include_router(forecasting.router, prefix="/api/forecasting", tags=["Forecasting"])
app.include_router(route_optimization.router, prefix="/api/route-optimization", tags=["Route Optimization"])
app.include_router(classification.router, prefix="/api/classification", tags=["Classification"])
app.include_router(simulation.router, prefix="/api/simulation", tags=["Simulation"])

@app.get("/")
def read_root():
    return {
        "message": "Smart Waste Management API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
