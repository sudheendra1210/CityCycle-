import os
from convex import ConvexClient
from dotenv import load_dotenv

load_dotenv()

class ConvexManager:
    def __init__(self):
        self.url = os.getenv("VITE_CONVEX_URL")
        if not self.url:
            raise ValueError("VITE_CONVEX_URL environment variable is not set")
        self.client = ConvexClient(self.url)

    def get_bins(self):
        return self.client.query("bins:getWithReadings")

    def get_complaints(self, status=None):
        return self.client.query("complaints:get", {"status": status})

    def add_bin_reading(self, bin_id, fill_level, battery_level=None):
        return self.client.mutation("bins:addReading", {
            "bin_id": bin_id,
            "fill_level_percent": fill_level,
            "battery_percent": battery_level
        })

    def create_complaint(self, complaint_data):
        return self.client.mutation("complaints:create", complaint_data)

    def resolve_complaint(self, complaint_id, resolved_by):
        return self.client.mutation("complaints:resolve", {
            "complaint_id": complaint_id,
            "resolved_by": resolved_by
        })

    def upsert_user(self, user_data):
        return self.client.mutation("users:upsert", user_data)

    def get_bin(self, bin_id: str):
        return self.client.query("bins:getById", {"bin_id": bin_id})

    def get_bin_readings(self, bin_id: str, limit: int = None):
        return self.client.query("bins:getReadingsByBinId", {"bin_id": bin_id, "limit": limit})

    def get_vehicles(self):
        return self.client.query("vehicles:get")

    def create_vehicle(self, vehicle_data):
        return self.client.mutation("vehicles:create", vehicle_data)

    def update_vehicle_location(self, vehicle_id, lat, lng):
        return self.client.mutation("vehicles:updateLocation", {
            "vehicle_id": vehicle_id,
            "latitude": lat,
            "longitude": lng
        })

    def get_collections(self, bin_id=None, vehicle_id=None):
        return self.client.query("collections:get", {"bin_id": bin_id, "vehicle_id": vehicle_id})

    def create_collection(self, collection_data):
        return self.client.mutation("collections:create", collection_data)

convex_manager = ConvexManager()
