import sys
import os

# Add the current directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.utils.database import SessionLocal
from app.models.database_models import User, UserRole

def promote_user(identifier, role_name):
    db: Session = SessionLocal()
    try:
        # Try finding by email, phone, or clerk_id
        user = db.query(User).filter(
            (User.email == identifier) | 
            (User.phone == identifier) | 
            (User.clerk_id == identifier) |
            (User.name == identifier)
        ).first()

        if not user:
            print(f"User '{identifier}' not found.")
            return

        try:
            new_role = UserRole(role_name.lower())
        except ValueError:
            print(f"Invalid role: {role_name}. Valid roles are: {[r.value for r in UserRole]}")
            return

        user.role = new_role
        db.commit()
        print(f"Successfully updated user {user.name} ({identifier}) to role: {new_role.value}")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python promote_user.py <email/phone/clerk_id/name> <admin/worker/user>")
        sys.exit(1)
    
    promote_user(sys.argv[1], sys.argv[2])
