from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import requests
from typing import Optional, Dict
from jose import jwt
from app.config.clerk_config import CLERK_JWKS_URL, CLERK_AUDIENCE
from app.utils.database import get_db
from sqlalchemy.orm import Session
from app.models.database_models import User, UserRole

from app.utils.convex_client import convex_manager

security = HTTPBearer()

# Cache for JWKS
_jwks_cache = None

def get_jwks():
    global _jwks_cache
    if _jwks_cache is None:
        try:
            response = requests.get(CLERK_JWKS_URL)
            response.raise_for_status()
            _jwks_cache = response.json()
        except Exception as e:
            print(f"Error fetching JWKS: {e}")
            return None
    return _jwks_cache

def verify_clerk_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict:
    """
    Verify JWT token from Clerk and return payload
    """
    token = credentials.credentials
    jwks = get_jwks()
    
    if not jwks:
        raise HTTPException(status_code=500, detail="Could not fetch JWKS from Clerk")

    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        rsa_key = {}
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                rsa_key = {
                    "kty": key.get("kty"),
                    "kid": key.get("kid"),
                    "use": key.get("use"),
                    "n": key.get("n"),
                    "e": key.get("e")
                }
                break
        
        if not rsa_key:
            raise HTTPException(status_code=401, detail="Invalid token")

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=CLERK_AUDIENCE,
            options={"verify_at_hash": False}
        )
        return payload

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


def verify_backend_token(token: str) -> Dict:
    """
    Verify custom JWT issued by our backend
    """
    try:
        payload = jwt.decode(
            token, 
            os.getenv("JWT_SECRET"), 
            algorithms=["HS256"]
        )
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid backend token: {str(e)}")

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> Dict:
    """
    Dependency to get current authenticated user from Convex
    """
    token = credentials.credentials
    
    try:
        header = jwt.get_unverified_header(token)
        if header.get("alg") == "HS256":
            # Backend Token (Legacy support or custom flow)
            payload = verify_backend_token(token)
            clerk_id = payload.get("phone") # Use phone as key if no clerk_id
            user_data = convex_manager.client.query("users:getByClerkId", {"clerk_id": clerk_id})
        else:
            # Clerk Token
            payload = verify_clerk_token(credentials)
            clerk_id = payload.get("sub")
            user_data = convex_manager.client.query("users:getByClerkId", {"clerk_id": clerk_id})
            
            if not user_data:
                # Sync Clerk user to Convex
                email = payload.get("email") or payload.get("email_address")
                metadata = {**payload.get("public_metadata", {}), **payload.get("unsafe_metadata", {})}
                
                user_args = {
                    "clerk_id": clerk_id,
                    "email": email,
                    "name": payload.get("name") or (email.split('@')[0] if email else "User"),
                    "role": metadata.get("role") or "user",
                    "area": metadata.get("area"),
                    "is_phone_verified": False
                }
                convex_manager.upsert_user(user_args)
                user_data = user_args

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

    if not user_data:
        raise HTTPException(status_code=404, detail="User not found in Convex")
        
    return {
        "id": user_data.get('clerk_id'),
        "db_id": user_data.get('_id', 0), # Convex ID
        "name": user_data.get('name'),
        "email": user_data.get('email'),
        "phone": user_data.get('phone'),
        "role": user_data.get('role', 'user'),
        "area": user_data.get('area'),
        "is_phone_verified": user_data.get('is_phone_verified', False)
    }


def require_role(required_role: str):
    """
    Dependency to check if user has required role from DB
    """
    def role_checker(user: Dict = Depends(get_current_user)) -> Dict:
        user_role = user.get("role", "user")
        
        roles_hierarchy = {
            "admin": 3,
            "worker": 2,
            "user": 1
        }
        
        user_level = roles_hierarchy.get(user_role, 0)
        required_level = roles_hierarchy.get(required_role, 0)
        
        if user_level < required_level:
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Required role: {required_role}"
            )
        
        return user
    
    return role_checker


# Optional authentication (doesn't fail if no token)
optional_security = HTTPBearer(auto_error=False)

def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(optional_security)
) -> Optional[Dict]:
    """
    Get user if authenticated, None otherwise
    """
    if not credentials:
        return None
    
    try:
        return get_current_user(credentials)
    except:
        return None
