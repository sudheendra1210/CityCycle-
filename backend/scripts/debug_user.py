import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.database_models import User
from app.utils.database import SQLALCHEMY_DATABASE_URL

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def debug_user():
    db = SessionLocal()
    user = db.query(User).first()
    if user:
        print(f"User ID: {user.id}")
        for attr in ['clerk_id', 'email', 'name', 'phone', 'role', 'area', 'is_phone_verified', 'created_at']:
            try:
                val = getattr(user, attr)
                print(f"{attr}: {val} (type: {type(val)})")
            except Exception as e:
                print(f"{attr}: ERROR - {e}")
    else:
        print("No users found")
    db.close()

if __name__ == "__main__":
    debug_user()
