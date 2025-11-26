# Models and endpoints for Project Proposal Form
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from enum import Enum
import uuid

class ProjectType(str, Enum):
    CIVIL = "civil"  # عمرانی
    INDUSTRIAL = "industrial"  # صنعتی
    ECONOMIC = "economic"  # اقتصادی
    SERVICE = "service"  # خدماتی
    ORGANIZATIONAL = "organizational"  # سازمانی

class ProposalStatus(str, Enum):
    DRAFT = "draft"
    PENDING_COO = "pending_coo"  # در انتظار مدیر ارشد عملیات
    REJECTED_BY_COO = "rejected_by_coo"  # رد شده توسط مدیر ارشد
    PENDING_DEV_MANAGER = "pending_dev_manager"  # در انتظار مدیر توسعه
    PENDING_PROJECT_CONTROL = "pending_project_control"  # در انتظار کنترل پروژه
    REGISTERED = "registered"  # ثبت شده با کد پروژه
    COMPLETED = "completed"  # آماده انتقال به امکان‌سنجی

class ProposalActionType(str, Enum):
    CREATED = "created"
    SUBMITTED = "submitted"
    APPROVED_BY_COO = "approved_by_coo"
    REJECTED_BY_COO = "rejected_by_coo"
    ASSIGNED_FEASIBILITY_MANAGER = "assigned_feasibility_manager"
    REGISTERED_PROJECT = "registered_project"
    COMPLETED = "completed"

class ProposalHistory(BaseModel):
    action: ProposalActionType
    actor_id: str
    actor_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None
    from_status: Optional[ProposalStatus] = None
    to_status: Optional[ProposalStatus] = None

class ProjectProposal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    proposal_number: str  # شناسه پیشنهاد
    project_code: Optional[str] = None  # کد پروژه (پس از ثبت)
    
    # مرحله 1: اطلاعات پیشنهاد
    proposer_id: str
    proposer_name: str
    title: str  # عنوان پروژه
    objective: str  # هدف و ضرورت اجرا
    project_type: ProjectType  # نوع پروژه
    description: Optional[str] = None  # توضیحات تکمیلی
    documents: List[str] = []  # مستندات (base64)
    
    # مرحله 2: بررسی مدیر ارشد عملیات
    is_aligned: Optional[bool] = None  # هم‌راستا با اهداف سازمان
    coo_notes: Optional[str] = None
    coo_reviewed_at: Optional[datetime] = None
    
    # مرحله 3: تعیین مسئول امکان‌سنجی
    feasibility_manager_id: Optional[str] = None
    feasibility_manager_name: Optional[str] = None
    dev_manager_notes: Optional[str] = None
    dev_manager_assigned_at: Optional[datetime] = None
    
    # مرحله 4: ثبت پروژه
    project_start_date: Optional[datetime] = None
    control_notes: Optional[str] = None
    registered_at: Optional[datetime] = None
    
    status: ProposalStatus = ProposalStatus.DRAFT
    history: List[ProposalHistory] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectProposalCreate(BaseModel):
    title: str
    objective: str
    project_type: ProjectType
    description: Optional[str] = None
    documents: List[str] = []

class ProjectProposalUpdate(BaseModel):
    title: Optional[str] = None
    objective: Optional[str] = None
    project_type: Optional[ProjectType] = None
    description: Optional[str] = None
    documents: Optional[List[str]] = None

class COOReview(BaseModel):
    is_aligned: bool
    notes: Optional[str] = None

class AssignFeasibilityManager(BaseModel):
    feasibility_manager_id: str
    feasibility_manager_name: str
    notes: Optional[str] = None

class RegisterProject(BaseModel):
    project_code: str
    project_start_date: str  # ISO format
    notes: Optional[str] = None
