from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from enum import Enum
import uuid

class PaymentReason(str, Enum):
    ADVANCE = "advance"  # پیش پرداخت
    ON_ACCOUNT = "on_account"  # علی الحساب

class PaymentType(str, Enum):
    CASH = "cash"  # نقدی
    CHECK = "check"  # چک
    BANK_TRANSFER = "bank_transfer"  # واریز بانکی

class PaymentRequestStatus(str, Enum):
    DRAFT = "draft"
    PENDING_FINANCIAL = "pending_financial"
    PENDING_DEV_MANAGER = "pending_dev_manager"
    PENDING_PAYMENT = "pending_payment"
    COMPLETED = "completed"
    REJECTED = "rejected"

class PaymentRow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amount: float
    reason: PaymentReason
    payment_type: Optional[PaymentType] = None
    payment_date: Optional[str] = None
    notes: Optional[str] = None

class PaymentRequestHistory(BaseModel):
    action: str
    actor_id: str
    actor_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None

class PaymentRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_number: str
    requester_id: str
    requester_name: str
    total_amount: float
    payment_rows: List[PaymentRow] = []
    invoice_base64: Optional[str] = None
    status: PaymentRequestStatus = PaymentRequestStatus.DRAFT
    history: List[PaymentRequestHistory] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentRequestCreate(BaseModel):
    total_amount: float
    payment_rows: List[dict]

class PaymentRowUpdate(BaseModel):
    payment_rows: List[dict]
