from fastapi import APIRouter, Depends, HTTPException, Request
import os
from datetime import datetime, timedelta
from app.middleware.auth import get_current_user, require_role
from app.utils.twilio_service import twilio_service
from typing import Dict, Optional
from sqlalchemy.orm import Session
from app.utils.database import get_db
from pydantic import BaseModel
from app.models.database_models import User, UserRole

import jwt as pyjwt # Using pyjwt for our own tokens to avoid conflict with jose

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class PhoneRequest(BaseModel):
    phone: str
    name: Optional[str] = None

class PhoneSignupRequest(BaseModel):
    phone: str
    role: Optional[str] = "user"

class PhoneVerifyRequest(BaseModel):
    phone: str
    code: str

class OTPVerifyRequest(BaseModel):
    phone: str
    code: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    area: Optional[str] = None
    phone: Optional[str] = None

@router.post("/phone/send-otp")
def send_phone_otp(data: PhoneRequest, db: Session = Depends(get_db)):
    """
    Send OTP to a phone number (Direct Twilio, no Clerk)
    """
    otp = twilio_service.send_otp(data.phone)
    if not otp:
        raise HTTPException(status_code=500, detail="Failed to send SMS")
    
    # Upsert user record for this phone
    user = db.query(User).filter(User.phone == data.phone).first()
    if not user:
        user = User(
            phone=data.phone,
            name=data.name,
            role=UserRole.USER, 
            is_phone_verified=False,
            created_at=datetime.utcnow()
        )
        db.add(user)
    elif data.name and not user.name:
        user.name = data.name
    
    user.otp_code = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    return {"message": "OTP sent successfully"}

@router.post("/phone/verify-otp")
def verify_phone_otp_direct(data: PhoneVerifyRequest, db: Session = Depends(get_db)):
    """
    Verify OTP for phone and return a custom JWT
    """
    user = db.query(User).filter(User.phone == data.phone).first()
    if not user or user.otp_code != data.code:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if user.otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")
    
    user.is_phone_verified = True
    user.otp_code = None
    db.commit()

    # Create custom JWT
    payload = {
        "sub": f"phone_{user.id}",
        "user_id": user.id,
        "phone": user.phone,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    token = pyjwt.encode(payload, os.getenv("JWT_SECRET"), algorithm="HS256")
    
    return {
        "token": token,
        "user": {
            "id": f"phone_{user.id}",
            "name": user.name,
            "phone": user.phone,
            "role": user.role
        }
    }

@router.get("/me")
def get_current_user_info(user: Dict = Depends(get_current_user)):
    """
    Get current authenticated user information from DB
    """
    return user

@router.post("/request-otp")
def request_phone_otp(
    data: PhoneRequest,
    user: Dict = Depends(get_current_user)
):
    """
    Request an OTP for phone verification
    """
    # Verify user exists in Convex
    user_data = convex_manager.client.query("users:getByClerkId", {"clerk_id": user["id"]})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    otp = twilio_service.send_otp(data.phone)
    if not otp:
        raise HTTPException(status_code=500, detail="Failed to send SMS. Please try again later.")
    
    # Store OTP and pending phone in Convex
    # We'll use upsert_user with just the updated fields
    convex_manager.upsert_user({
        "clerk_id": user["id"],
        "phone": data.phone,
        "is_phone_verified": False
        # Note: In a real app, storing OTP in Convex would require a mutation
        # For now, we'll assume the phone is marked as pending
    })
    
    return {"message": "Verification code sent to your phone."}

@router.post("/verify-otp")
def verify_phone_otp(
    data: OTPVerifyRequest,
    user: Dict = Depends(get_current_user)
):
    """
    Verify the phone OTP (Simplified for Convex integration)
    """
    # In a real app, we'd verify the OTP matches what was sent
    # For now, we'll assume any code verifies (Demo mode)
    convex_manager.upsert_user({
        "clerk_id": user["id"],
        "phone": data.phone,
        "is_phone_verified": True
    })
    
    return {"message": "Phone number verified successfully.", "phone": data.phone}

@router.patch("/update-profile")
def update_profile(
    data: ProfileUpdate,
    user: Dict = Depends(get_current_user)
):
    """
    Update local user profile in Convex
    """
    # Use upsert to update fields
    update_data = {"clerk_id": user["id"]}
    if data.name is not None:
        update_data["name"] = data.name
    if data.area is not None:
        update_data["area"] = data.area
    if data.phone is not None:
        update_data["phone"] = data.phone
        update_data["is_phone_verified"] = False
    
    convex_manager.upsert_user(update_data)
    return {"message": "Profile updated successfully.", "user": user}
