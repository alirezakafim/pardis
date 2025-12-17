from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
from enum import Enum
import base64
import openpyxl
from openpyxl.styles import Font, Alignment
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
from project_proposal import (
    ProjectProposal, ProjectProposalCreate, ProjectProposalUpdate,
    COOReview, AssignFeasibilityManager, RegisterProject,
    ProposalStatus, ProposalActionType, ProposalHistory, ProjectType
)
from payment_request import (
    PaymentRequest, PaymentRequestCreate, PaymentRowUpdate,
    PaymentRequestStatus, PaymentReason, PaymentMethod, PaymentRow, PaymentRequestHistory,
    RequestType
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'pardis-paj-khorasan-secret-2024')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ==================== Enums ====================
class UserRole(str, Enum):
    ADMIN = "admin"
    REQUESTER = "requester"
    PROCUREMENT = "procurement"
    FINANCIAL = "financial"
    MANAGEMENT = "management"
    COO = "coo"  # Chief Operating Officer - مدیر ارشد عملیات
    DEV_MANAGER = "dev_manager"  # مدیر توسعه و مهندسی
    PROJECT_CONTROL = "project_control"  # کارشناس کنترل پروژه

class RequestStatus(str, Enum):
    DRAFT = "draft"
    PENDING_PROCUREMENT = "pending_procurement"
    PENDING_MANAGEMENT = "pending_management"
    PENDING_PURCHASE = "pending_purchase"
    PENDING_RECEIPT = "pending_receipt"
    PENDING_INVOICE = "pending_invoice"
    PENDING_FINANCIAL = "pending_financial"
    COMPLETED = "completed"
    REJECTED = "rejected"

class ActionType(str, Enum):
    CREATED = "created"
    SUBMITTED = "submitted"
    INQUIRIES_ADDED = "inquiries_added"
    APPROVED = "approved"
    REJECTED = "rejected"
    RECEIPT_ADDED = "receipt_added"
    INVOICE_UPLOADED = "invoice_uploaded"
    COMPLETED = "completed"

# ==================== Models ====================
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    full_name: str
    password_hash: str
    roles: List[UserRole]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    roles: List[UserRole]

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    roles: Optional[List[UserRole]] = None

class UserResponse(BaseModel):
    id: str
    username: str
    full_name: str
    roles: List[UserRole]

class CostCenter(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_en: str

class Inquiry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    unit_price: float
    quantity: int
    total_price: float
    image_base64: Optional[str] = None
    is_selected: bool = False

class Receipt(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    receipt_number: str
    quantity: int
    unit_price: float
    total_price: float
    confirmed_by_procurement: bool = False
    confirmed_by_requester: bool = False
    procurement_confirmed_at: Optional[datetime] = None
    requester_confirmed_at: Optional[datetime] = None
    procurement_receipt_date: Optional[str] = None
    procurement_receipt_time: Optional[str] = None
    requester_receipt_date: Optional[str] = None
    requester_receipt_time: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RequestHistory(BaseModel):
    action: ActionType
    actor_id: str
    actor_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None
    from_status: Optional[RequestStatus] = None
    to_status: Optional[RequestStatus] = None

class GoodsRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_number: str
    requester_id: str
    requester_name: str
    item_name: str
    quantity: int
    cost_center: str
    need_date: Optional[str] = None
    image_base64: Optional[str] = None
    description: Optional[str] = None
    status: RequestStatus = RequestStatus.DRAFT
    inquiries: List[Inquiry] = []
    receipts: List[Receipt] = []
    invoice_base64: Optional[str] = None
    history: List[RequestHistory] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GoodsRequestCreate(BaseModel):
    item_name: str
    quantity: int
    cost_center: str
    need_date: Optional[str] = None
    image_base64: Optional[str] = None
    description: Optional[str] = None

class GoodsRequestUpdate(BaseModel):
    item_name: Optional[str] = None
    quantity: Optional[int] = None
    cost_center: Optional[str] = None
    need_date: Optional[str] = None
    image_base64: Optional[str] = None
    description: Optional[str] = None

class InquiryCreate(BaseModel):
    unit_price: float
    quantity: int
    total_price: float
    image_base64: Optional[str] = None

class InquirySelect(BaseModel):
    inquiry_id: str
    action: str  # "approve", "reject_with_edit", "reject_complete"

class ActionRequest(BaseModel):
    notes: Optional[str] = None

class ReceiptCreate(BaseModel):
    quantity: int
    unit_price: float
    total_price: float

class ReceiptConfirm(BaseModel):
    receipt_id: str
    receipt_date: str
    receipt_time: str

class InvoiceUpload(BaseModel):
    invoice_base64: str

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    request_id: str
    request_number: str
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== Auth ====================
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

async def create_notification(user_id: str, request_id: str, request_number: str, message: str):
    notification = Notification(
        user_id=user_id,
        request_id=request_id,
        request_number=request_number,
        message=message
    )
    doc = notification.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.notifications.insert_one(doc)

async def get_next_request_number() -> str:
    current_year = 1404  # سال شمسی
    counter_doc = await db.counters.find_one({"type": "request_number", "year": current_year})
    if not counter_doc:
        await db.counters.insert_one({"type": "request_number", "year": current_year, "counter": 1})
        return f"{current_year}-1"
    else:
        new_counter = counter_doc['counter'] + 1
        await db.counters.update_one(
            {"type": "request_number", "year": current_year},
            {"$set": {"counter": new_counter}}
        )
        return f"{current_year}-{new_counter}"

async def get_next_receipt_number() -> str:
    counter_doc = await db.counters.find_one({"type": "receipt_number"})
    if not counter_doc:
        await db.counters.insert_one({"type": "receipt_number", "counter": 1})
        return "R-00001"
    else:
        new_counter = counter_doc['counter'] + 1
        await db.counters.update_one(
            {"type": "receipt_number"},
            {"$set": {"counter": new_counter}}
        )
        return f"R-{new_counter:05d}"

async def get_next_proposal_number() -> str:
    current_year = 1404
    counter_doc = await db.counters.find_one({"type": "proposal_number", "year": current_year})
    if not counter_doc:
        await db.counters.insert_one({"type": "proposal_number", "year": current_year, "counter": 1})
        return f"PP-{current_year}-1"
    else:
        new_counter = counter_doc['counter'] + 1
        await db.counters.update_one(
            {"type": "proposal_number", "year": current_year},
            {"$set": {"counter": new_counter}}
        )
        return f"PP-{current_year}-{new_counter}"

# ==================== Routes ====================

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    # فقط ادمین می‌تواند کاربر جدید ثبت کند
    if UserRole.ADMIN not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can register users")
    
    existing = await db.users.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    
    user = User(
        username=user_data.username,
        full_name=user_data.full_name,
        password_hash=hash_password(user_data.password),
        roles=user_data.roles
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    return {"message": "User created successfully", "user_id": user.id}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    token_data = {
        "user_id": user['id'],
        "username": user['username'],
        "full_name": user['full_name'],
        "roles": user['roles']
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm="HS256")
    
    return {"token": token, "user": token_data}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# User Management
@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(get_current_user)):
    if UserRole.ADMIN not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    if UserRole.ADMIN not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    update_data = {}
    if user_data.full_name:
        update_data['full_name'] = user_data.full_name
    if user_data.password:
        update_data['password_hash'] = hash_password(user_data.password)
    if user_data.roles:
        update_data['roles'] = user_data.roles
    
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No data to update")
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    return {"message": "User updated successfully"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if UserRole.ADMIN not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    return {"message": "User deleted successfully"}

# Cost Centers
@api_router.get("/cost-centers")
async def get_cost_centers(current_user: dict = Depends(get_current_user)):
    centers = await db.cost_centers.find({}, {"_id": 0}).to_list(100)
    if not centers:
        # Initialize default cost centers
        default_centers = [
            CostCenter(name="دفتر", name_en="Office"),
            CostCenter(name="قیر", name_en="Bitumen"),
            CostCenter(name="پارادیزو", name_en="Paradiso")
        ]
        for center in default_centers:
            await db.cost_centers.insert_one(center.model_dump())
        centers = [c.model_dump() for c in default_centers]
    return centers

@api_router.post("/cost-centers")
async def create_cost_center(center: CostCenter, current_user: dict = Depends(get_current_user)):
    if UserRole.ADMIN not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    await db.cost_centers.insert_one(center.model_dump())
    return {"message": "Cost center created", "id": center.id}

@api_router.put("/cost-centers/{center_id}")
async def update_cost_center(center_id: str, name: str, name_en: str, current_user: dict = Depends(get_current_user)):
    if UserRole.ADMIN not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    result = await db.cost_centers.update_one(
        {"id": center_id},
        {"$set": {"name": name, "name_en": name_en}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return {"message": "Cost center updated"}

@api_router.delete("/cost-centers/{center_id}")
async def delete_cost_center(center_id: str, current_user: dict = Depends(get_current_user)):
    if UserRole.ADMIN not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    result = await db.cost_centers.delete_one({"id": center_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return {"message": "Cost center deleted"}

# Goods Requests
@api_router.post("/goods-requests")
async def create_goods_request(request_data: GoodsRequestCreate, current_user: dict = Depends(get_current_user)):
    request_number = await get_next_request_number()
    
    goods_request = GoodsRequest(
        request_number=request_number,
        requester_id=current_user['user_id'],
        requester_name=current_user['full_name'],
        item_name=request_data.item_name,
        quantity=request_data.quantity,
        cost_center=request_data.cost_center,
        image_base64=request_data.image_base64,
        description=request_data.description,
        status=RequestStatus.DRAFT,
        history=[RequestHistory(
            action=ActionType.CREATED,
            actor_id=current_user['user_id'],
            actor_name=current_user['full_name'],
            from_status=None,
            to_status=RequestStatus.DRAFT
        )]
    )
    
    doc = goods_request.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    for i, hist in enumerate(doc['history']):
        doc['history'][i]['timestamp'] = hist['timestamp'].isoformat()
    
    await db.goods_requests.insert_one(doc)
    
    return {"message": "Request created", "request_id": goods_request.id, "request_number": request_number}

@api_router.get("/goods-requests")
async def get_goods_requests(current_user: dict = Depends(get_current_user)):
    user_roles = current_user.get('roles', [])
    user_id = current_user['user_id']
    
    query = {}
    # متقاضی فقط درخواست‌های خودش را می‌بیند
    if UserRole.ADMIN not in user_roles:
        if UserRole.REQUESTER in user_roles and len(user_roles) == 1:
            query['requester_id'] = user_id
    
    requests = await db.goods_requests.find(query, {"_id": 0}).to_list(1000)
    
    # Convert datetime strings
    for req in requests:
        if isinstance(req.get('created_at'), str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
        if isinstance(req.get('updated_at'), str):
            req['updated_at'] = datetime.fromisoformat(req['updated_at'])
    
    return requests

@api_router.get("/goods-requests/{request_id}")
async def get_goods_request(request_id: str, current_user: dict = Depends(get_current_user)):
    request = await db.goods_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    # بررسی دسترسی
    user_roles = current_user.get('roles', [])
    if UserRole.ADMIN not in user_roles:
        if request['requester_id'] != current_user['user_id']:
            # بررسی اینکه آیا کاربر نقشی در این درخواست دارد یا نه
            has_role = any(role in user_roles for role in [UserRole.PROCUREMENT, UserRole.MANAGEMENT, UserRole.FINANCIAL])
            if not has_role:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    return request

@api_router.put("/goods-requests/{request_id}")
async def update_goods_request(request_id: str, request_data: GoodsRequestUpdate, current_user: dict = Depends(get_current_user)):
    request = await db.goods_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if request['requester_id'] != current_user['user_id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    if request['status'] != RequestStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only edit draft requests")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if request_data.item_name:
        update_data['item_name'] = request_data.item_name
    if request_data.quantity:
        update_data['quantity'] = request_data.quantity
    if request_data.cost_center:
        update_data['cost_center'] = request_data.cost_center
    if request_data.image_base64 is not None:
        update_data['image_base64'] = request_data.image_base64
    if request_data.description is not None:
        update_data['description'] = request_data.description
    
    await db.goods_requests.update_one({"id": request_id}, {"$set": update_data})
    return {"message": "Request updated"}

@api_router.post("/goods-requests/{request_id}/submit")
async def submit_request(request_id: str, current_user: dict = Depends(get_current_user)):
    request = await db.goods_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if request['requester_id'] != current_user['user_id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    if request['status'] != RequestStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request already submitted")
    
    history_entry = RequestHistory(
        action=ActionType.SUBMITTED,
        actor_id=current_user['user_id'],
        actor_name=current_user['full_name'],
        from_status=RequestStatus.DRAFT,
        to_status=RequestStatus.PENDING_PROCUREMENT
    )
    
    await db.goods_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": RequestStatus.PENDING_PROCUREMENT,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"history": {
                **history_entry.model_dump(),
                "timestamp": history_entry.timestamp.isoformat()
            }}
        }
    )
    
    # Notify procurement users
    procurement_users = await db.users.find({"roles": UserRole.PROCUREMENT}).to_list(100)
    for user in procurement_users:
        await create_notification(
            user['id'],
            request_id,
            request['request_number'],
            f"درخواست جدید کالا از {current_user['full_name']}"
        )
    
    return {"message": "Request submitted"}

@api_router.post("/goods-requests/{request_id}/inquiries")
async def add_inquiries(request_id: str, inquiries: List[InquiryCreate], current_user: dict = Depends(get_current_user)):
    if UserRole.PROCUREMENT not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    request = await db.goods_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if request['status'] != RequestStatus.PENDING_PROCUREMENT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    
    if len(inquiries) != 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Must provide exactly 3 inquiries")
    
    inquiry_objs = [Inquiry(**inq.model_dump()) for inq in inquiries]
    
    history_entry = RequestHistory(
        action=ActionType.INQUIRIES_ADDED,
        actor_id=current_user['user_id'],
        actor_name=current_user['full_name'],
        from_status=RequestStatus.PENDING_PROCUREMENT,
        to_status=RequestStatus.PENDING_MANAGEMENT
    )
    
    await db.goods_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "inquiries": [inq.model_dump() for inq in inquiry_objs],
                "status": RequestStatus.PENDING_MANAGEMENT,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"history": {
                **history_entry.model_dump(),
                "timestamp": history_entry.timestamp.isoformat()
            }}
        }
    )
    
    # Notify management users
    management_users = await db.users.find({"roles": UserRole.MANAGEMENT}).to_list(100)
    for user in management_users:
        await create_notification(
            user['id'],
            request_id,
            request['request_number'],
            f"استعلام‌های درخواست {request['request_number']} آماده بررسی است"
        )
    
    return {"message": "Inquiries added"}

@api_router.post("/goods-requests/{request_id}/select-inquiry")
async def select_inquiry(request_id: str, selection: InquirySelect, current_user: dict = Depends(get_current_user)):
    if UserRole.MANAGEMENT not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    request = await db.goods_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if request['status'] != RequestStatus.PENDING_MANAGEMENT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    
    if selection.action == "approve":
        # Mark selected inquiry
        inquiries = request['inquiries']
        found = False
        for inq in inquiries:
            if inq['id'] == selection.inquiry_id:
                inq['is_selected'] = True
                found = True
            else:
                inq['is_selected'] = False
        
        if not found:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inquiry not found")
        
        history_entry = RequestHistory(
            action=ActionType.APPROVED,
            actor_id=current_user['user_id'],
            actor_name=current_user['full_name'],
            from_status=RequestStatus.PENDING_MANAGEMENT,
            to_status=RequestStatus.PENDING_PURCHASE,
            notes="استعلام برنده انتخاب شد - تایید"
        )
        
        await db.goods_requests.update_one(
            {"id": request_id},
            {
                "$set": {
                    "inquiries": inquiries,
                    "status": RequestStatus.PENDING_PURCHASE,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {"history": {
                    **history_entry.model_dump(),
                    "timestamp": history_entry.timestamp.isoformat()
                }}
            }
        )
        
        # Notify procurement to purchase
        procurement_users = await db.users.find({"roles": UserRole.PROCUREMENT}).to_list(100)
        for user in procurement_users:
            await create_notification(
                user['id'],
                request_id,
                request['request_number'],
                f"درخواست {request['request_number']} تایید شد. آماده خرید"
            )
        
        return {"message": "Inquiry approved"}
    
    elif selection.action == "reject_with_edit":
        # بازگشت به واحد تامین برای اصلاح
        history_entry = RequestHistory(
            action=ActionType.REJECTED,
            actor_id=current_user['user_id'],
            actor_name=current_user['full_name'],
            from_status=RequestStatus.PENDING_MANAGEMENT,
            to_status=RequestStatus.PENDING_PROCUREMENT,
            notes="عدم تایید - ارجاع به واحد تامین برای اصلاح استعلام‌ها"
        )
        
        await db.goods_requests.update_one(
            {"id": request_id},
            {
                "$set": {
                    "status": RequestStatus.PENDING_PROCUREMENT,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {"history": {
                    **history_entry.model_dump(),
                    "timestamp": history_entry.timestamp.isoformat()
                }}
            }
        )
        
        # Notify procurement
        procurement_users = await db.users.find({"roles": UserRole.PROCUREMENT}).to_list(100)
        for user in procurement_users:
            await create_notification(
                user['id'],
                request_id,
                request['request_number'],
                f"درخواست {request['request_number']} نیاز به اصلاح استعلام‌ها دارد"
            )
        
        return {"message": "Request sent back for inquiry revision"}
    
    elif selection.action == "reject_complete":
        # رد کامل درخواست
        history_entry = RequestHistory(
            action=ActionType.REJECTED,
            actor_id=current_user['user_id'],
            actor_name=current_user['full_name'],
            from_status=RequestStatus.PENDING_MANAGEMENT,
            to_status=RequestStatus.REJECTED,
            notes="عدم تایید کامل درخواست"
        )
        
        await db.goods_requests.update_one(
            {"id": request_id},
            {
                "$set": {
                    "status": RequestStatus.REJECTED,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {"history": {
                    **history_entry.model_dump(),
                    "timestamp": history_entry.timestamp.isoformat()
                }}
            }
        )
        
        # Notify requester
        await create_notification(
            request['requester_id'],
            request_id,
            request['request_number'],
            f"درخواست {request['request_number']} رد شد"
        )
        
        return {"message": "Request completely rejected"}
    
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid action")

@api_router.post("/goods-requests/{request_id}/receipts")
async def add_receipt(request_id: str, receipt_data: ReceiptCreate, current_user: dict = Depends(get_current_user)):
    if UserRole.PROCUREMENT not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    request = await db.goods_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if request['status'] not in [RequestStatus.PENDING_PURCHASE, RequestStatus.PENDING_RECEIPT]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    
    receipt_number = await get_next_receipt_number()
    receipt = Receipt(
        receipt_number=receipt_number,
        quantity=receipt_data.quantity,
        unit_price=receipt_data.unit_price,
        total_price=receipt_data.total_price
    )
    
    history_entry = RequestHistory(
        action=ActionType.RECEIPT_ADDED,
        actor_id=current_user['user_id'],
        actor_name=current_user['full_name'],
        notes=f"رسید {receipt_number} ثبت شد"
    )
    
    await db.goods_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": RequestStatus.PENDING_RECEIPT,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "receipts": {
                    **receipt.model_dump(),
                    "created_at": receipt.created_at.isoformat()
                },
                "history": {
                    **history_entry.model_dump(),
                    "timestamp": history_entry.timestamp.isoformat()
                }
            }
        }
    )
    
    # Notify requester
    await create_notification(
        request['requester_id'],
        request_id,
        request['request_number'],
        f"رسید جدید برای درخواست {request['request_number']} ثبت شد"
    )
    
    return {"message": "Receipt added", "receipt_number": receipt_number}

@api_router.post("/goods-requests/{request_id}/receipts/confirm-procurement")
async def confirm_receipt_procurement(request_id: str, confirm: ReceiptConfirm, current_user: dict = Depends(get_current_user)):
    if UserRole.PROCUREMENT not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    request = await db.goods_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    receipts = request.get('receipts', [])
    receipt_found = False
    for receipt in receipts:
        if receipt['id'] == confirm.receipt_id:
            receipt['confirmed_by_procurement'] = True
            receipt['procurement_confirmed_at'] = datetime.now(timezone.utc).isoformat()
            receipt['procurement_receipt_date'] = confirm.receipt_date
            receipt['procurement_receipt_time'] = confirm.receipt_time
            receipt_found = True
            break
    
    if not receipt_found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    
    await db.goods_requests.update_one(
        {"id": request_id},
        {"$set": {"receipts": receipts, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Receipt confirmed by procurement"}

@api_router.post("/goods-requests/{request_id}/receipts/confirm-requester")
async def confirm_receipt_requester(request_id: str, confirm: ReceiptConfirm, current_user: dict = Depends(get_current_user)):
    request = await db.goods_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if request['requester_id'] != current_user['user_id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    receipts = request.get('receipts', [])
    receipt_found = False
    for receipt in receipts:
        if receipt['id'] == confirm.receipt_id:
            receipt['confirmed_by_requester'] = True
            receipt['requester_confirmed_at'] = datetime.now(timezone.utc).isoformat()
            receipt['requester_receipt_date'] = confirm.receipt_date
            receipt['requester_receipt_time'] = confirm.receipt_time
            receipt_found = True
            break
    
    if not receipt_found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    
    await db.goods_requests.update_one(
        {"id": request_id},
        {"$set": {"receipts": receipts, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Check if all receipts confirmed
    all_confirmed = all(r['confirmed_by_procurement'] and r['confirmed_by_requester'] for r in receipts)
    if all_confirmed:
        await db.goods_requests.update_one(
            {"id": request_id},
            {"$set": {"status": RequestStatus.PENDING_INVOICE}}
        )
        # Notify procurement to upload invoice
        procurement_users = await db.users.find({"roles": UserRole.PROCUREMENT}).to_list(100)
        for user in procurement_users:
            await create_notification(
                user['id'],
                request_id,
                request['request_number'],
                f"رسیدها تایید شد. لطفا فاکتور را بارگذاری کنید"
            )
    
    return {"message": "Receipt confirmed by requester"}

@api_router.post("/goods-requests/{request_id}/invoice")
async def upload_invoice(request_id: str, invoice: InvoiceUpload, current_user: dict = Depends(get_current_user)):
    if UserRole.PROCUREMENT not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    request = await db.goods_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if request['status'] != RequestStatus.PENDING_INVOICE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    
    history_entry = RequestHistory(
        action=ActionType.INVOICE_UPLOADED,
        actor_id=current_user['user_id'],
        actor_name=current_user['full_name'],
        notes="فاکتور بارگذاری شد"
    )
    
    await db.goods_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "invoice_base64": invoice.invoice_base64,
                "status": RequestStatus.PENDING_FINANCIAL,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"history": {
                **history_entry.model_dump(),
                "timestamp": history_entry.timestamp.isoformat()
            }}
        }
    )
    
    # Notify financial users
    financial_users = await db.users.find({"roles": UserRole.FINANCIAL}).to_list(100)
    for user in financial_users:
        await create_notification(
            user['id'],
            request_id,
            request['request_number'],
            f"فاکتور درخواست {request['request_number']} آماده تایید است"
        )
    
    return {"message": "Invoice uploaded"}

@api_router.post("/goods-requests/{request_id}/approve-financial")
async def approve_financial(request_id: str, action: ActionRequest, current_user: dict = Depends(get_current_user)):
    if UserRole.FINANCIAL not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    request = await db.goods_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if request['status'] != RequestStatus.PENDING_FINANCIAL:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    
    history_entry = RequestHistory(
        action=ActionType.COMPLETED,
        actor_id=current_user['user_id'],
        actor_name=current_user['full_name'],
        from_status=RequestStatus.PENDING_FINANCIAL,
        to_status=RequestStatus.COMPLETED,
        notes=action.notes
    )
    
    await db.goods_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": RequestStatus.COMPLETED,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"history": {
                **history_entry.model_dump(),
                "timestamp": history_entry.timestamp.isoformat()
            }}
        }
    )
    
    # Notify requester
    await create_notification(
        request['requester_id'],
        request_id,
        request['request_number'],
        f"درخواست {request['request_number']} تکمیل شد"
    )
    
    return {"message": "Request completed"}

@api_router.post("/goods-requests/{request_id}/reject")
async def reject_request(request_id: str, action: ActionRequest, current_user: dict = Depends(get_current_user)):
    request = await db.goods_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if not action.notes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rejection notes are required")
    
    # Determine previous status based on current status
    status_map = {
        RequestStatus.PENDING_PROCUREMENT: RequestStatus.DRAFT,
        RequestStatus.PENDING_MANAGEMENT: RequestStatus.PENDING_PROCUREMENT,
        RequestStatus.PENDING_PURCHASE: RequestStatus.PENDING_MANAGEMENT,
        RequestStatus.PENDING_INVOICE: RequestStatus.PENDING_RECEIPT,
        RequestStatus.PENDING_FINANCIAL: RequestStatus.PENDING_INVOICE
    }
    
    current_status = request['status']
    if current_status not in status_map:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot reject at this stage")
    
    previous_status = status_map[current_status]
    
    history_entry = RequestHistory(
        action=ActionType.REJECTED,
        actor_id=current_user['user_id'],
        actor_name=current_user['full_name'],
        from_status=current_status,
        to_status=previous_status,
        notes=action.notes
    )
    
    await db.goods_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": previous_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"history": {
                **history_entry.model_dump(),
                "timestamp": history_entry.timestamp.isoformat()
            }}
        }
    )
    
    # Notify relevant users
    await create_notification(
        request['requester_id'],
        request_id,
        request['request_number'],
        f"درخواست {request['request_number']} رد شد"
    )
    
    return {"message": "Request rejected"}

# Notifications
@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": current_user['user_id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user['user_id']},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return {"message": "Notification marked as read"}

# Reports
@api_router.get("/reports/excel")
async def export_excel(current_user: dict = Depends(get_current_user)):
    user_roles = current_user.get('roles', [])
    user_id = current_user['user_id']
    
    query = {}
    if UserRole.ADMIN not in user_roles and UserRole.MANAGEMENT not in user_roles:
        if UserRole.REQUESTER in user_roles:
            query['requester_id'] = user_id
    
    requests = await db.goods_requests.find(query, {"_id": 0}).to_list(1000)
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "گزارش درخواست‌ها"
    
    # Headers
    headers = ["شناسه", "نام کالا", "تعداد درخواستی", "مرکز هزینه", "متقاضی", "وضعیت", "تاریخ ایجاد"]
    if UserRole.ADMIN in user_roles or UserRole.MANAGEMENT in user_roles or UserRole.FINANCIAL in user_roles or UserRole.PROCUREMENT in user_roles:
        headers.extend(["تعداد خریداری شده", "قیمت کل خرید (ریال)"])
    
    ws.append(headers)
    
    for request in requests:
        row = [
            request['request_number'],
            request['item_name'],
            request['quantity'],
            request['cost_center'],
            request['requester_name'],
            request['status'],
            str(request['created_at'])
        ]
        
        if UserRole.ADMIN in user_roles or UserRole.MANAGEMENT in user_roles or UserRole.FINANCIAL in user_roles or UserRole.PROCUREMENT in user_roles:
            total_quantity = 0
            total_price = 0
            if request.get('receipts'):
                total_quantity = sum(r['quantity'] for r in request['receipts'])
                total_price = sum(r['total_price'] for r in request['receipts'])
            row.append(total_quantity)
            row.append(total_price)
        
        ws.append(row)
    
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=report.xlsx"}
    )

# ==================== Project Proposal Endpoints ====================
@api_router.post("/project-proposals")
async def create_project_proposal(proposal_data: ProjectProposalCreate, current_user: dict = Depends(get_current_user)):
    proposal_number = await get_next_proposal_number()
    
    proposal = ProjectProposal(
        proposal_number=proposal_number,
        proposer_id=current_user['user_id'],
        proposer_name=current_user['full_name'],
        title=proposal_data.title,
        objective=proposal_data.objective,
        project_type=proposal_data.project_type,
        description=proposal_data.description,
        documents=proposal_data.documents,
        status=ProposalStatus.DRAFT,
        history=[ProposalHistory(
            action=ProposalActionType.CREATED,
            actor_id=current_user['user_id'],
            actor_name=current_user['full_name'],
            to_status=ProposalStatus.DRAFT
        )]
    )
    
    doc = proposal.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    for i, hist in enumerate(doc['history']):
        doc['history'][i]['timestamp'] = hist['timestamp'].isoformat()
    
    await db.project_proposals.insert_one(doc)
    
    return {"message": "Proposal created", "proposal_id": proposal.id, "proposal_number": proposal_number}

@api_router.get("/project-proposals")
async def get_project_proposals(current_user: dict = Depends(get_current_user)):
    user_roles = current_user.get('roles', [])
    user_id = current_user['user_id']
    
    query = {}
    if UserRole.ADMIN not in user_roles:
        special_roles = [UserRole.COO, UserRole.DEV_MANAGER, UserRole.PROJECT_CONTROL]
        has_special_role = any(role in user_roles for role in special_roles)
        if not has_special_role:
            query['proposer_id'] = user_id
    
    proposals = await db.project_proposals.find(query, {"_id": 0}).to_list(1000)
    return proposals

@api_router.get("/project-proposals/{proposal_id}")
async def get_project_proposal(proposal_id: str, current_user: dict = Depends(get_current_user)):
    proposal = await db.project_proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return proposal

@api_router.put("/project-proposals/{proposal_id}")
async def update_project_proposal(proposal_id: str, proposal_data: ProjectProposalUpdate, current_user: dict = Depends(get_current_user)):
    proposal = await db.project_proposals.find_one({"id": proposal_id})
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if proposal['proposer_id'] != current_user['user_id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    if proposal['status'] != ProposalStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only edit draft proposals")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if proposal_data.title:
        update_data['title'] = proposal_data.title
    if proposal_data.objective:
        update_data['objective'] = proposal_data.objective
    if proposal_data.project_type:
        update_data['project_type'] = proposal_data.project_type
    if proposal_data.description is not None:
        update_data['description'] = proposal_data.description
    if proposal_data.documents is not None:
        update_data['documents'] = proposal_data.documents
    
    await db.project_proposals.update_one({"id": proposal_id}, {"$set": update_data})
    return {"message": "Proposal updated"}

@api_router.post("/project-proposals/{proposal_id}/submit")
async def submit_proposal(proposal_id: str, current_user: dict = Depends(get_current_user)):
    proposal = await db.project_proposals.find_one({"id": proposal_id})
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if proposal['proposer_id'] != current_user['user_id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    if proposal['status'] != ProposalStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Proposal already submitted")
    
    history_entry = ProposalHistory(
        action=ProposalActionType.SUBMITTED,
        actor_id=current_user['user_id'],
        actor_name=current_user['full_name'],
        from_status=ProposalStatus.DRAFT,
        to_status=ProposalStatus.PENDING_COO
    )
    
    await db.project_proposals.update_one(
        {"id": proposal_id},
        {
            "$set": {
                "status": ProposalStatus.PENDING_COO,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "history": {
                    **history_entry.model_dump(),
                    "timestamp": history_entry.timestamp.isoformat()
                }
            }
        }
    )
    
    coo_users = await db.users.find({"roles": UserRole.COO}).to_list(100)
    for user in coo_users:
        await create_notification(
            user['id'],
            proposal_id,
            proposal['proposal_number'],
            f"پیشنهاد پروژه جدید: {proposal['title']}"
        )
    
    return {"message": "Proposal submitted"}

@api_router.post("/project-proposals/{proposal_id}/coo-review")
async def coo_review_proposal(proposal_id: str, review: COOReview, current_user: dict = Depends(get_current_user)):
    if UserRole.COO not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    proposal = await db.project_proposals.find_one({"id": proposal_id})
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if proposal['status'] != ProposalStatus.PENDING_COO:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    
    if review.is_aligned:
        history_entry = ProposalHistory(
            action=ProposalActionType.APPROVED_BY_COO,
            actor_id=current_user['user_id'],
            actor_name=current_user['full_name'],
            from_status=ProposalStatus.PENDING_COO,
            to_status=ProposalStatus.PENDING_DEV_MANAGER,
            notes=review.notes
        )
        
        await db.project_proposals.update_one(
            {"id": proposal_id},
            {
                "$set": {
                    "is_aligned": True,
                    "coo_notes": review.notes,
                    "coo_reviewed_at": datetime.now(timezone.utc).isoformat(),
                    "status": ProposalStatus.PENDING_DEV_MANAGER,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {
                    "history": {
                        **history_entry.model_dump(),
                        "timestamp": history_entry.timestamp.isoformat()
                    }
                }
            }
        )
        
        dev_managers = await db.users.find({"roles": UserRole.DEV_MANAGER}).to_list(100)
        for user in dev_managers:
            await create_notification(
                user['id'],
                proposal_id,
                proposal['proposal_number'],
                f"پیشنهاد پروژه {proposal['title']} نیاز به تعیین مسئول امکان‌سنجی دارد"
            )
        
        return {"message": "Proposal approved by COO"}
    else:
        history_entry = ProposalHistory(
            action=ProposalActionType.REJECTED_BY_COO,
            actor_id=current_user['user_id'],
            actor_name=current_user['full_name'],
            from_status=ProposalStatus.PENDING_COO,
            to_status=ProposalStatus.REJECTED_BY_COO,
            notes=review.notes
        )
        
        await db.project_proposals.update_one(
            {"id": proposal_id},
            {
                "$set": {
                    "is_aligned": False,
                    "coo_notes": review.notes,
                    "coo_reviewed_at": datetime.now(timezone.utc).isoformat(),
                    "status": ProposalStatus.REJECTED_BY_COO,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {
                    "history": {
                        **history_entry.model_dump(),
                        "timestamp": history_entry.timestamp.isoformat()
                    }
                }
            }
        )
        
        await create_notification(
            proposal['proposer_id'],
            proposal_id,
            proposal['proposal_number'],
            f"پیشنهاد پروژه {proposal['title']} رد شد"
        )
        
        return {"message": "Proposal rejected by COO"}

@api_router.post("/project-proposals/{proposal_id}/assign-manager")
async def assign_feasibility_manager(proposal_id: str, assignment: AssignFeasibilityManager, current_user: dict = Depends(get_current_user)):
    if UserRole.DEV_MANAGER not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    proposal = await db.project_proposals.find_one({"id": proposal_id})
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if proposal['status'] != ProposalStatus.PENDING_DEV_MANAGER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    
    history_entry = ProposalHistory(
        action=ProposalActionType.ASSIGNED_FEASIBILITY_MANAGER,
        actor_id=current_user['user_id'],
        actor_name=current_user['full_name'],
        from_status=ProposalStatus.PENDING_DEV_MANAGER,
        to_status=ProposalStatus.PENDING_PROJECT_CONTROL,
        notes=f"مسئول امکان‌سنجی: {assignment.feasibility_manager_name}"
    )
    
    await db.project_proposals.update_one(
        {"id": proposal_id},
        {
            "$set": {
                "feasibility_manager_id": assignment.feasibility_manager_id,
                "feasibility_manager_name": assignment.feasibility_manager_name,
                "dev_manager_notes": assignment.notes,
                "dev_manager_assigned_at": datetime.now(timezone.utc).isoformat(),
                "status": ProposalStatus.PENDING_PROJECT_CONTROL,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "history": {
                    **history_entry.model_dump(),
                    "timestamp": history_entry.timestamp.isoformat()
                }
            }
        }
    )
    
    control_users = await db.users.find({"roles": UserRole.PROJECT_CONTROL}).to_list(100)
    for user in control_users:
        await create_notification(
            user['id'],
            proposal_id,
            proposal['proposal_number'],
            f"پیشنهاد پروژه {proposal['title']} نیاز به ثبت رسمی و کد پروژه دارد"
        )
    
    return {"message": "Feasibility manager assigned"}

@api_router.post("/project-proposals/{proposal_id}/register")
async def register_project(proposal_id: str, registration: RegisterProject, current_user: dict = Depends(get_current_user)):
    if UserRole.PROJECT_CONTROL not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    proposal = await db.project_proposals.find_one({"id": proposal_id})
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if proposal['status'] != ProposalStatus.PENDING_PROJECT_CONTROL:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    
    history_entry = ProposalHistory(
        action=ProposalActionType.REGISTERED_PROJECT,
        actor_id=current_user['user_id'],
        actor_name=current_user['full_name'],
        from_status=ProposalStatus.PENDING_PROJECT_CONTROL,
        to_status=ProposalStatus.COMPLETED,
        notes=f"کد پروژه: {registration.project_code}"
    )
    
    await db.project_proposals.update_one(
        {"id": proposal_id},
        {
            "$set": {
                "project_code": registration.project_code,
                "project_start_date": registration.project_start_date,
                "control_notes": registration.notes,
                "registered_at": datetime.now(timezone.utc).isoformat(),
                "status": ProposalStatus.COMPLETED,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "history": {
                    **history_entry.model_dump(),
                    "timestamp": history_entry.timestamp.isoformat()
                }
            }
        }
    )
    
    if proposal.get('feasibility_manager_id'):
        await create_notification(
            proposal['feasibility_manager_id'],
            proposal_id,
            proposal['proposal_number'],
            f"پروژه {proposal['title']} با کد {registration.project_code} ثبت شد"
        )
    
    await create_notification(
        proposal['proposer_id'],
        proposal_id,
        proposal['proposal_number'],
        f"پیشنهاد پروژه شما با کد {registration.project_code} ثبت شد"
    )
    
    return {"message": "Project registered successfully", "project_code": registration.project_code}

# ==================== Payment Request Endpoints ====================
async def get_next_payment_number() -> str:
    current_year = 1404
    counter_doc = await db.counters.find_one({"type": "payment_number", "year": current_year})
    if not counter_doc:
        await db.counters.insert_one({"type": "payment_number", "year": current_year, "counter": 1})
        return f"PAY-{current_year}-1"
    else:
        new_counter = counter_doc['counter'] + 1
        await db.counters.update_one(
            {"type": "payment_number", "year": current_year},
            {"$set": {"counter": new_counter}}
        )
        return f"PAY-{current_year}-{new_counter}"

@api_router.post("/payment-requests")
async def create_payment_request(request_data: PaymentRequestCreate, current_user: dict = Depends(get_current_user)):
    payment_number = await get_next_payment_number()
    
    # Create payment rows
    payment_rows = []
    for row in request_data.payment_rows:
        payment_rows.append(PaymentRow(
            amount=row.get('amount', 0),
            reason=row.get('reason', PaymentReason.ADVANCE),
            notes=row.get('notes')
        ))
    
    payment_request = PaymentRequest(
        request_number=payment_number,
        requester_id=current_user['user_id'],
        requester_name=current_user['full_name'],
        total_amount=request_data.total_amount,
        payment_rows=payment_rows,
        status=PaymentRequestStatus.DRAFT,
        history=[PaymentRequestHistory(
            action="created",
            actor_id=current_user['user_id'],
            actor_name=current_user['full_name']
        )]
    )
    
    doc = payment_request.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    for i, hist in enumerate(doc['history']):
        doc['history'][i]['timestamp'] = hist['timestamp'].isoformat()
    
    await db.payment_requests.insert_one(doc)
    
    return {"message": "Payment request created", "request_id": payment_request.id, "request_number": payment_number}

@api_router.get("/payment-requests")
async def get_payment_requests(current_user: dict = Depends(get_current_user)):
    user_roles = current_user.get('roles', [])
    user_id = current_user['user_id']
    
    query = {}
    if UserRole.ADMIN not in user_roles:
        special_roles = [UserRole.FINANCIAL, UserRole.DEV_MANAGER]
        has_special_role = any(role in user_roles for role in special_roles)
        if not has_special_role:
            query['requester_id'] = user_id
    
    requests = await db.payment_requests.find(query, {"_id": 0}).to_list(1000)
    return requests

@api_router.get("/payment-requests/{request_id}")
async def get_payment_request(request_id: str, current_user: dict = Depends(get_current_user)):
    request = await db.payment_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return request

@api_router.put("/payment-requests/{request_id}")
async def update_payment_request(request_id: str, request_data: PaymentRequestCreate, current_user: dict = Depends(get_current_user)):
    request = await db.payment_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if request['requester_id'] != current_user['user_id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    if request['status'] != PaymentRequestStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only edit draft requests")
    
    # Update payment rows
    payment_rows = []
    for row in request_data.payment_rows:
        payment_rows.append({
            "id": str(uuid.uuid4()),
            "amount": row.get('amount', 0),
            "reason": row.get('reason', PaymentReason.ADVANCE),
            "notes": row.get('notes'),
            "payment_type": None,
            "payment_date": None
        })
    
    await db.payment_requests.update_one(
        {"id": request_id},
        {"$set": {
            "total_amount": request_data.total_amount,
            "payment_rows": payment_rows,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Payment request updated"}

@api_router.post("/payment-requests/{request_id}/submit")
async def submit_payment_request(request_id: str, current_user: dict = Depends(get_current_user)):
    request = await db.payment_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if request['requester_id'] != current_user['user_id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    if request['status'] != PaymentRequestStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request already submitted")
    
    history_entry = {
        "action": "submitted",
        "actor_id": current_user['user_id'],
        "actor_name": current_user['full_name'],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": PaymentRequestStatus.PENDING_FINANCIAL,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"history": history_entry}
        }
    )
    
    # Notify financial users
    financial_users = await db.users.find({"roles": UserRole.FINANCIAL}).to_list(100)
    for user in financial_users:
        await create_notification(
            user['id'],
            request_id,
            request['request_number'],
            f"درخواست پرداخت جدید از {current_user['full_name']}"
        )
    
    return {"message": "Payment request submitted"}

@api_router.post("/payment-requests/{request_id}/set-payment-types")
async def set_payment_types(request_id: str, data: PaymentRowUpdate, current_user: dict = Depends(get_current_user)):
    if UserRole.FINANCIAL not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    request = await db.payment_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if request['status'] != PaymentRequestStatus.PENDING_FINANCIAL:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    
    # Update payment types for each row
    payment_rows = request.get('payment_rows', [])
    for update_row in data.payment_rows:
        for row in payment_rows:
            if row['id'] == update_row.get('id'):
                row['payment_type'] = update_row.get('payment_type')
    
    history_entry = {
        "action": "payment_type_set",
        "actor_id": current_user['user_id'],
        "actor_name": current_user['full_name'],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "notes": "نوع پرداخت تعیین شد"
    }
    
    await db.payment_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "payment_rows": payment_rows,
                "status": PaymentRequestStatus.PENDING_DEV_MANAGER,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"history": history_entry}
        }
    )
    
    # Notify dev manager users
    dev_manager_users = await db.users.find({"roles": UserRole.DEV_MANAGER}).to_list(100)
    for user in dev_manager_users:
        await create_notification(
            user['id'],
            request_id,
            request['request_number'],
            f"درخواست پرداخت {request['request_number']} آماده تایید است"
        )
    
    return {"message": "Payment types set"}

@api_router.post("/payment-requests/{request_id}/approve-dev-manager")
async def approve_payment_dev_manager(request_id: str, action: ActionRequest, current_user: dict = Depends(get_current_user)):
    if UserRole.DEV_MANAGER not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    request = await db.payment_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if request['status'] != PaymentRequestStatus.PENDING_DEV_MANAGER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    
    history_entry = {
        "action": "approved_by_dev_manager",
        "actor_id": current_user['user_id'],
        "actor_name": current_user['full_name'],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "notes": action.notes or "تایید شد توسط مدیر توسعه"
    }
    
    await db.payment_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": PaymentRequestStatus.PENDING_PAYMENT,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"history": history_entry}
        }
    )
    
    # Notify financial users for final payment
    financial_users = await db.users.find({"roles": UserRole.FINANCIAL}).to_list(100)
    for user in financial_users:
        await create_notification(
            user['id'],
            request_id,
            request['request_number'],
            f"درخواست پرداخت {request['request_number']} تایید شد - آماده پرداخت"
        )
    
    return {"message": "Payment approved by dev manager"}

@api_router.post("/payment-requests/{request_id}/reject-dev-manager")
async def reject_payment_dev_manager(request_id: str, action: ActionRequest, current_user: dict = Depends(get_current_user)):
    if UserRole.DEV_MANAGER not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    request = await db.payment_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if request['status'] != PaymentRequestStatus.PENDING_DEV_MANAGER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    
    history_entry = {
        "action": "rejected_by_dev_manager",
        "actor_id": current_user['user_id'],
        "actor_name": current_user['full_name'],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "notes": action.notes or "رد شد"
    }
    
    await db.payment_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": PaymentRequestStatus.REJECTED,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"history": history_entry}
        }
    )
    
    # Notify requester
    await create_notification(
        request['requester_id'],
        request_id,
        request['request_number'],
        f"درخواست پرداخت {request['request_number']} رد شد"
    )
    
    return {"message": "Payment rejected"}

class FinalPaymentData(BaseModel):
    payment_date: str
    invoice_base64: Optional[str] = None
    notes: Optional[str] = None

@api_router.post("/payment-requests/{request_id}/process-payment")
async def process_payment(request_id: str, data: FinalPaymentData, current_user: dict = Depends(get_current_user)):
    if UserRole.FINANCIAL not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    request = await db.payment_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if request['status'] != PaymentRequestStatus.PENDING_PAYMENT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    
    # Update payment date for all rows
    payment_rows = request.get('payment_rows', [])
    for row in payment_rows:
        row['payment_date'] = data.payment_date
    
    history_entry = {
        "action": "completed",
        "actor_id": current_user['user_id'],
        "actor_name": current_user['full_name'],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "notes": data.notes or "پرداخت انجام شد"
    }
    
    await db.payment_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "payment_rows": payment_rows,
                "invoice_base64": data.invoice_base64,
                "status": PaymentRequestStatus.COMPLETED,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"history": history_entry}
        }
    )
    
    # Notify requester
    await create_notification(
        request['requester_id'],
        request_id,
        request['request_number'],
        f"درخواست پرداخت {request['request_number']} تکمیل شد"
    )
    
    return {"message": "Payment completed"}

# Initialize admin user
@app.on_event("startup")
async def initialize_admin():
    admin_exists = await db.users.find_one({"username": "admin"})
    if not admin_exists:
        admin = User(
            username="admin",
            full_name="مدیر سیستم",
            password_hash=hash_password("admin123"),
            roles=[UserRole.ADMIN]
        )
        doc = admin.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.users.insert_one(doc)
        logging.info("Admin user created: username=admin, password=admin123")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()