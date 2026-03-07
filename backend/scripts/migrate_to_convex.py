import asyncio
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import sys
import os
import traceback
from datetime import datetime

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.database_models import Base, Bin, BinReading, Complaint, User, Vehicle, Collection
from app.utils.convex_client import convex_manager
from app.utils.database import SQLALCHEMY_DATABASE_URL

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def to_ms(dt):
    if dt is None: return None
    if isinstance(dt, str):
        try:
            # Handle standard SQLite format
            dt = datetime.fromisoformat(dt.split('.')[0])
        except:
            return None
    return int(dt.timestamp() * 1000)

async def migrate_data():
    db = SessionLocal()
    try:
        # 1. Migrate Users
        print("Migrating users...")
        result = db.execute(text("SELECT * FROM users"))
        for row in result:
            try:
                # Use dictionary-style access for raw SQL rows
                convex_manager.client.mutation("users:upsert", {
                    "clerk_id": row.clerk_id if row.clerk_id else f"legacy-{row.id}",
                    "email": row.email,
                    "name": row.name,
                    "phone": row.phone,
                    "role": row.role,
                    "area": row.area,
                    "is_phone_verified": bool(row.is_phone_verified),
                    "created_at": to_ms(row.created_at)
                })
            except Exception as e:
                print(f"Failed to migrate user {row.id}: {e}")

        # 2. Migrate Bins
        print("Migrating bins...")
        result = db.execute(text("SELECT * FROM bins"))
        for row in result:
            try:
                convex_manager.client.mutation("bins:create", {
                    "bin_id": row.bin_id,
                    "latitude": float(row.latitude),
                    "longitude": float(row.longitude),
                    "bin_type": row.bin_type,
                    "capacity_liters": int(row.capacity_liters),
                    "zone": row.zone,
                    "area_name": row.area_name,
                    "sensor_type": row.sensor_type,
                    "ward": int(row.ward) if row.ward else None
                })
            except Exception as e:
                print(f"Failed to migrate bin {row.bin_id}: {e}")

        # 3. Migrate Bin Readings
        print("Migrating bin readings...")
        result = db.execute(text("SELECT * FROM bin_readings"))
        for row in result:
            try:
                convex_manager.client.mutation("bins:addReading", {
                    "bin_id": row.bin_id,
                    "fill_level_percent": float(row.fill_level_percent),
                    "battery_percent": float(row.battery_percent) if row.battery_percent else None,
                    "weight_kg": float(row.weight_kg) if row.weight_kg else None,
                    "temperature_c": float(row.temperature_c) if row.temperature_c else None
                })
            except Exception as e:
                print(f"Failed to migrate reading for bin {row.bin_id}: {e}")

        # 4. Migrate Complaints
        print("Migrating complaints...")
        result = db.execute(text("SELECT * FROM complaints"))
        for row in result:
            try:
                convex_manager.client.mutation("complaints:create", {
                    "complaint_id": row.complaint_id,
                    "bin_id": row.bin_id,
                    "complaint_type": row.complaint_type,
                    "description": row.description,
                    "latitude": float(row.latitude),
                    "longitude": float(row.longitude),
                    "area_name": row.area_name,
                    "urgency": row.urgency,
                })
            except Exception as e:
                print(f"Failed to migrate complaint {row.complaint_id}: {e}")

        print("Migration completed successfully!")

    except Exception as e:
        print(f"Migration failed: {e}")
        print(traceback.format_exc())
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(migrate_data())
