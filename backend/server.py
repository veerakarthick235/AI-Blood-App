from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import math
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'ai_blood')]

# JWT Configuration
SECRET_KEY = os.environ.get("SECRET_KEY", "ai-blood-secret-key-2025-secure")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "sk-emergent-4D7EcA6B48fC6E7EaC")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

# Blood type compatibility matrix
BLOOD_COMPATIBILITY = {
    "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    "O+": ["O+", "A+", "B+", "AB+"],
    "A-": ["A-", "A+", "AB-", "AB+"],
    "A+": ["A+", "AB+"],
    "B-": ["B-", "B+", "AB-", "AB+"],
    "B+": ["B+", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+"],
}

# Create the main app
app = FastAPI(title="AI Blood - Intelligent Blood Supply Network")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: str
    role: str = Field(default="donor")  # donor, patient, hospital, admin

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class DonorProfile(BaseModel):
    blood_type: str
    date_of_birth: Optional[str] = None
    weight: Optional[float] = None
    last_donation_date: Optional[str] = None
    is_available: bool = True
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    medical_conditions: Optional[List[str]] = []

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: str
    role: str
    donor_profile: Optional[DonorProfile] = None
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class BloodRequestCreate(BaseModel):
    blood_type: str
    units_needed: int = 1
    urgency: str = "normal"  # emergency, urgent, normal
    hospital_name: Optional[str] = None
    hospital_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    patient_name: Optional[str] = None
    notes: Optional[str] = None

class BloodRequestResponse(BaseModel):
    id: str
    requester_id: str
    requester_name: str
    blood_type: str
    units_needed: int
    units_fulfilled: int = 0
    urgency: str
    status: str  # pending, matching, fulfilled, cancelled
    hospital_name: Optional[str] = None
    hospital_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    patient_name: Optional[str] = None
    notes: Optional[str] = None
    matched_donors: List[Dict] = []
    ai_recommendation: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class DonorMatch(BaseModel):
    donor_id: str
    donor_name: str
    blood_type: str
    distance_km: float
    compatibility_score: float
    is_available: bool
    last_donation_date: Optional[str] = None

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str  # request, match, donation, system
    is_read: bool = False
    data: Optional[Dict] = None
    created_at: datetime

class DonorUpdateProfile(BaseModel):
    blood_type: Optional[str] = None
    is_available: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    weight: Optional[float] = None
    date_of_birth: Optional[str] = None
    medical_conditions: Optional[List[str]] = None

class AcceptDonationRequest(BaseModel):
    request_id: str

# ============== HELPER FUNCTIONS ==============

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points using Haversine formula (in km)"""
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def get_compatible_blood_types(recipient_type: str) -> List[str]:
    """Get list of compatible donor blood types for a recipient"""
    compatible = []
    for donor_type, can_donate_to in BLOOD_COMPATIBILITY.items():
        if recipient_type in can_donate_to:
            compatible.append(donor_type)
    return compatible

def calculate_compatibility_score(donor: dict, request: dict, distance: float) -> float:
    """Calculate a compatibility score (0-100) based on multiple factors"""
    score = 100.0
    
    # Distance factor (closer is better, max penalty 40 points)
    if distance > 50:
        score -= 40
    elif distance > 20:
        score -= 25
    elif distance > 10:
        score -= 15
    elif distance > 5:
        score -= 5
    
    # Availability factor
    if not donor.get("donor_profile", {}).get("is_available", False):
        score -= 30
    
    # Last donation factor (should be at least 56 days ago)
    last_donation = donor.get("donor_profile", {}).get("last_donation_date")
    if last_donation:
        try:
            last_date = datetime.fromisoformat(last_donation)
            days_since = (datetime.utcnow() - last_date).days
            if days_since < 56:
                score -= 50  # Cannot donate yet
            elif days_since < 84:
                score -= 10  # Recently donated
        except:
            pass
    
    # Exact blood type match bonus
    if donor.get("donor_profile", {}).get("blood_type") == request.get("blood_type"):
        score += 10
    
    return max(0, min(100, score))

async def create_notification(user_id: str, title: str, message: str, notif_type: str, data: dict = None):
    """Create a notification for a user"""
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notif_type,
        "is_read": False,
        "data": data or {},
        "created_at": datetime.utcnow()
    }
    await db.notifications.insert_one(notification)
    return notification

async def get_ai_recommendation(request_data: dict, matched_donors: List[dict]) -> str:
    """Get AI-powered recommendation for blood request matching"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"blood-match-{request_data.get('id', 'unknown')}",
            system_message="""You are an AI assistant for a blood donation matching system. 
            Analyze blood requests and donor matches to provide intelligent recommendations.
            Be concise and helpful. Focus on urgency, compatibility, and logistics."""
        ).with_model("openai", "gpt-4.1-mini")
        
        prompt = f"""
        Blood Request Analysis:
        - Blood Type Needed: {request_data.get('blood_type')}
        - Units Needed: {request_data.get('units_needed')}
        - Urgency: {request_data.get('urgency')}
        - Hospital: {request_data.get('hospital_name', 'Not specified')}
        
        Matched Donors ({len(matched_donors)} found):
        """
        
        for i, donor in enumerate(matched_donors[:5], 1):
            prompt += f"""
        {i}. {donor.get('donor_name', 'Unknown')}
           - Blood Type: {donor.get('blood_type')}
           - Distance: {donor.get('distance_km', 0):.1f} km
           - Compatibility Score: {donor.get('compatibility_score', 0):.0f}/100
           - Available: {'Yes' if donor.get('is_available') else 'No'}
        """
        
        prompt += "\nProvide a brief recommendation (2-3 sentences) on the best matching strategy."
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return response
    except Exception as e:
        logger.error(f"AI recommendation error: {e}")
        return "AI recommendation unavailable. Please review matches manually based on distance and compatibility."

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=Token)
async def register(user: UserCreate):
    # Check if email already exists
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role,
        "password_hash": get_password_hash(user.password),
        "donor_profile": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_dict["id"]})
    
    return Token(
        access_token=access_token,
        user=UserResponse(
            id=user_dict["id"],
            email=user_dict["email"],
            full_name=user_dict["full_name"],
            phone=user_dict["phone"],
            role=user_dict["role"],
            donor_profile=user_dict["donor_profile"],
            created_at=user_dict["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    return Token(
        access_token=access_token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            phone=user["phone"],
            role=user["role"],
            donor_profile=user.get("donor_profile"),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        phone=current_user["phone"],
        role=current_user["role"],
        donor_profile=current_user.get("donor_profile"),
        created_at=current_user["created_at"]
    )

# ============== DONOR ROUTES ==============

@api_router.put("/donor/profile", response_model=UserResponse)
async def update_donor_profile(profile: DonorUpdateProfile, current_user: dict = Depends(get_current_user)):
    """Update donor profile with blood type, availability, and location"""
    
    existing_profile = current_user.get("donor_profile") or {}
    
    update_data = {}
    if profile.blood_type is not None:
        update_data["blood_type"] = profile.blood_type
    if profile.is_available is not None:
        update_data["is_available"] = profile.is_available
    if profile.latitude is not None:
        update_data["latitude"] = profile.latitude
    if profile.longitude is not None:
        update_data["longitude"] = profile.longitude
    if profile.address is not None:
        update_data["address"] = profile.address
    if profile.weight is not None:
        update_data["weight"] = profile.weight
    if profile.date_of_birth is not None:
        update_data["date_of_birth"] = profile.date_of_birth
    if profile.medical_conditions is not None:
        update_data["medical_conditions"] = profile.medical_conditions
    
    merged_profile = {**existing_profile, **update_data}
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "donor_profile": merged_profile,
                "role": "donor",
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    updated_user = await db.users.find_one({"id": current_user["id"]})
    
    return UserResponse(
        id=updated_user["id"],
        email=updated_user["email"],
        full_name=updated_user["full_name"],
        phone=updated_user["phone"],
        role=updated_user["role"],
        donor_profile=updated_user.get("donor_profile"),
        created_at=updated_user["created_at"]
    )

@api_router.get("/donors/nearby", response_model=List[DonorMatch])
async def get_nearby_donors(
    blood_type: str,
    latitude: float,
    longitude: float,
    radius_km: float = 50,
    current_user: dict = Depends(get_current_user)
):
    """Find nearby compatible donors within radius"""
    
    # Get compatible blood types
    compatible_types = get_compatible_blood_types(blood_type)
    
    # Find all donors with compatible blood types
    donors = await db.users.find({
        "role": "donor",
        "donor_profile.blood_type": {"$in": compatible_types},
        "donor_profile.latitude": {"$exists": True},
        "donor_profile.longitude": {"$exists": True}
    }).to_list(1000)
    
    nearby_donors = []
    for donor in donors:
        profile = donor.get("donor_profile", {})
        donor_lat = profile.get("latitude")
        donor_lon = profile.get("longitude")
        
        if donor_lat and donor_lon:
            distance = haversine_distance(latitude, longitude, donor_lat, donor_lon)
            
            if distance <= radius_km:
                score = calculate_compatibility_score(
                    donor,
                    {"blood_type": blood_type},
                    distance
                )
                
                nearby_donors.append(DonorMatch(
                    donor_id=donor["id"],
                    donor_name=donor["full_name"],
                    blood_type=profile.get("blood_type", "Unknown"),
                    distance_km=round(distance, 2),
                    compatibility_score=score,
                    is_available=profile.get("is_available", False),
                    last_donation_date=profile.get("last_donation_date")
                ))
    
    # Sort by compatibility score (highest first)
    nearby_donors.sort(key=lambda x: (-x.compatibility_score, x.distance_km))
    
    return nearby_donors

# ============== BLOOD REQUEST ROUTES ==============

@api_router.post("/requests", response_model=BloodRequestResponse)
async def create_blood_request(request: BloodRequestCreate, current_user: dict = Depends(get_current_user)):
    """Create a new blood request"""
    
    request_dict = {
        "id": str(uuid.uuid4()),
        "requester_id": current_user["id"],
        "requester_name": current_user["full_name"],
        "blood_type": request.blood_type,
        "units_needed": request.units_needed,
        "units_fulfilled": 0,
        "urgency": request.urgency,
        "status": "pending",
        "hospital_name": request.hospital_name,
        "hospital_address": request.hospital_address,
        "latitude": request.latitude,
        "longitude": request.longitude,
        "patient_name": request.patient_name,
        "notes": request.notes,
        "matched_donors": [],
        "ai_recommendation": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.blood_requests.insert_one(request_dict)
    
    # If location provided, find and match donors
    if request.latitude and request.longitude:
        compatible_types = get_compatible_blood_types(request.blood_type)
        
        donors = await db.users.find({
            "role": "donor",
            "donor_profile.blood_type": {"$in": compatible_types},
            "donor_profile.is_available": True,
            "donor_profile.latitude": {"$exists": True}
        }).to_list(100)
        
        matched = []
        for donor in donors:
            profile = donor.get("donor_profile", {})
            donor_lat = profile.get("latitude")
            donor_lon = profile.get("longitude")
            
            if donor_lat and donor_lon:
                distance = haversine_distance(request.latitude, request.longitude, donor_lat, donor_lon)
                
                if distance <= 100:  # 100km radius
                    score = calculate_compatibility_score(donor, request_dict, distance)
                    
                    matched.append({
                        "donor_id": donor["id"],
                        "donor_name": donor["full_name"],
                        "blood_type": profile.get("blood_type"),
                        "distance_km": round(distance, 2),
                        "compatibility_score": score,
                        "is_available": profile.get("is_available", False),
                        "status": "pending"
                    })
                    
                    # Send notification to donor
                    await create_notification(
                        user_id=donor["id"],
                        title="🩸 Blood Donation Request",
                        message=f"Emergency {request.urgency} request for {request.blood_type} blood at {request.hospital_name or 'nearby hospital'}. You are {distance:.1f}km away.",
                        notif_type="request",
                        data={"request_id": request_dict["id"]}
                    )
        
        # Sort by score
        matched.sort(key=lambda x: (-x["compatibility_score"], x["distance_km"]))
        
        # Get AI recommendation
        ai_rec = await get_ai_recommendation(request_dict, matched)
        
        # Update request with matches
        await db.blood_requests.update_one(
            {"id": request_dict["id"]},
            {
                "$set": {
                    "matched_donors": matched[:20],
                    "ai_recommendation": ai_rec,
                    "status": "matching" if matched else "pending",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        request_dict["matched_donors"] = matched[:20]
        request_dict["ai_recommendation"] = ai_rec
        request_dict["status"] = "matching" if matched else "pending"
    
    return BloodRequestResponse(**request_dict)

@api_router.get("/requests", response_model=List[BloodRequestResponse])
async def get_blood_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get blood requests - filtered by user role"""
    
    query = {}
    
    # Donors see requests where they are matched
    if current_user["role"] == "donor":
        query["matched_donors.donor_id"] = current_user["id"]
    # Patients/hospitals see their own requests
    elif current_user["role"] in ["patient", "hospital"]:
        query["requester_id"] = current_user["id"]
    # Admins see all
    
    if status:
        query["status"] = status
    
    requests = await db.blood_requests.find(query).sort("created_at", -1).to_list(100)
    
    return [BloodRequestResponse(**req) for req in requests]

@api_router.get("/requests/{request_id}", response_model=BloodRequestResponse)
async def get_blood_request(request_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific blood request"""
    
    request = await db.blood_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return BloodRequestResponse(**request)

@api_router.post("/requests/{request_id}/accept")
async def accept_donation_request(request_id: str, current_user: dict = Depends(get_current_user)):
    """Donor accepts a blood donation request"""
    
    # Verify user is a donor
    if current_user["role"] != "donor":
        raise HTTPException(status_code=403, detail="Only donors can accept requests")
    
    # Get the request
    request = await db.blood_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Check if donor is in matched list
    matched = request.get("matched_donors", [])
    donor_match = None
    for m in matched:
        if m.get("donor_id") == current_user["id"]:
            donor_match = m
            break
    
    if not donor_match:
        raise HTTPException(status_code=400, detail="You are not matched for this request")
    
    # Update donor's status in matched list
    for m in matched:
        if m.get("donor_id") == current_user["id"]:
            m["status"] = "accepted"
            break
    
    # Update units fulfilled
    new_fulfilled = request.get("units_fulfilled", 0) + 1
    new_status = "fulfilled" if new_fulfilled >= request.get("units_needed", 1) else "matching"
    
    await db.blood_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "matched_donors": matched,
                "units_fulfilled": new_fulfilled,
                "status": new_status,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Update donor's last donation date
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "donor_profile.last_donation_date": datetime.utcnow().isoformat(),
                "donor_profile.is_available": False
            }
        }
    )
    
    # Create donation record
    donation = {
        "id": str(uuid.uuid4()),
        "donor_id": current_user["id"],
        "request_id": request_id,
        "blood_type": current_user.get("donor_profile", {}).get("blood_type"),
        "status": "scheduled",
        "created_at": datetime.utcnow()
    }
    await db.donations.insert_one(donation)
    
    # Notify requester
    await create_notification(
        user_id=request["requester_id"],
        title="✅ Donor Accepted",
        message=f"{current_user['full_name']} has accepted to donate for your blood request.",
        notif_type="match",
        data={"request_id": request_id, "donor_id": current_user["id"]}
    )
    
    return {"message": "Donation accepted successfully", "donation_id": donation["id"]}

# ============== NOTIFICATION ROUTES ==============

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(current_user: dict = Depends(get_current_user)):
    """Get user's notifications"""
    
    notifications = await db.notifications.find(
        {"user_id": current_user["id"]}
    ).sort("created_at", -1).to_list(50)
    
    return [NotificationResponse(**n) for n in notifications]

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    
    await db.notifications.update_many(
        {"user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    
    return {"message": "All notifications marked as read"}

# ============== STATS ROUTES ==============

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    
    stats = {}
    
    if current_user["role"] == "donor":
        # Donor stats
        donations = await db.donations.count_documents({"donor_id": current_user["id"]})
        pending_requests = await db.blood_requests.count_documents({
            "matched_donors.donor_id": current_user["id"],
            "status": {"$in": ["pending", "matching"]}
        })
        
        stats = {
            "total_donations": donations,
            "pending_requests": pending_requests,
            "lives_saved": donations,  # Approximate
            "is_available": current_user.get("donor_profile", {}).get("is_available", False)
        }
    
    elif current_user["role"] in ["patient", "hospital"]:
        # Patient/Hospital stats
        my_requests = await db.blood_requests.count_documents({"requester_id": current_user["id"]})
        fulfilled = await db.blood_requests.count_documents({
            "requester_id": current_user["id"],
            "status": "fulfilled"
        })
        pending = await db.blood_requests.count_documents({
            "requester_id": current_user["id"],
            "status": {"$in": ["pending", "matching"]}
        })
        
        stats = {
            "total_requests": my_requests,
            "fulfilled_requests": fulfilled,
            "pending_requests": pending
        }
    
    elif current_user["role"] == "admin":
        # Admin stats
        total_donors = await db.users.count_documents({"role": "donor"})
        active_donors = await db.users.count_documents({
            "role": "donor",
            "donor_profile.is_available": True
        })
        total_requests = await db.blood_requests.count_documents({})
        fulfilled = await db.blood_requests.count_documents({"status": "fulfilled"})
        
        stats = {
            "total_donors": total_donors,
            "active_donors": active_donors,
            "total_requests": total_requests,
            "fulfilled_requests": fulfilled,
            "fulfillment_rate": round((fulfilled / total_requests * 100) if total_requests > 0 else 0, 1)
        }
    
    # Get unread notification count
    unread_notifs = await db.notifications.count_documents({
        "user_id": current_user["id"],
        "is_read": False
    })
    stats["unread_notifications"] = unread_notifs
    
    return stats

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "AI Blood API - Intelligent Blood Supply Network", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ============== WEBSOCKET ==============

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"WebSocket connected: {user_id}")
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"WebSocket disconnected: {user_id}")
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/api/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages if needed
            message = json.loads(data)
            if message.get("type") == "ping":
                await manager.send_personal_message({"type": "pong"}, user_id)
    except WebSocketDisconnect:
        manager.disconnect(user_id)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    # Create indexes for better performance
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.users.create_index([("donor_profile.blood_type", 1)])
        await db.blood_requests.create_index("id", unique=True)
        await db.blood_requests.create_index([("status", 1), ("created_at", -1)])
        await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
        await db.donations.create_index("donor_id")
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
