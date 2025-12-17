from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from enum import Enum
import uuid


class RequestType(str, Enum):
    PURCHASE = "purchase"  # خرید کالا/خدمت
    PROJECT = "project"  # پروژه
    PETTY_CASH = "petty_cash"  # تنخواه
    SALARY = "salary"  # حقوق و دستمزد
    OTHER = "other"  # سایر


class PaymentReason(str, Enum):
    PREPAYMENT = "prepayment"  # پیش پرداخت
    SETTLEMENT = "settlement"  # تسویه


class PaymentMethod(str, Enum):
    CASH = "cash"  # نقدی
    CHECK = "check"  # چک
    OTHER = "other"  # سایر


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
    invoice_contract_number: Optional[str] = None  # شماره فاکتور/قرارداد
    reason: PaymentReason  # علت پرداخت
    cost_center: Optional[str] = None  # مرکز هزینه
    payment_method: Optional[PaymentMethod] = None  # روش پرداخت
    payment_method_other: Optional[str] = None  # سایر روش پرداخت
    account_number: Optional[str] = None  # شماره حساب
    bank_name: Optional[str] = None  # نام بانک
    account_holder_name: Optional[str] = None  # نام صاحب حساب
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
    request_type: RequestType  # نوع درخواست
    request_type_other: Optional[str] = None  # سایر نوع درخواست
    total_amount: float
    payment_row: Optional[PaymentRow] = None  # فقط یک ردیف پرداخت
    attachment_base64: Optional[str] = None  # فایل پیوست
    invoice_base64: Optional[str] = None
    status: PaymentRequestStatus = PaymentRequestStatus.DRAFT
    history: List[PaymentRequestHistory] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PaymentRequestCreate(BaseModel):
    request_type: RequestType
    request_type_other: Optional[str] = None
    total_amount: float
    payment_row: dict
    attachment_base64: Optional[str] = None


class PaymentRowUpdate(BaseModel):
    payment_row: dict
