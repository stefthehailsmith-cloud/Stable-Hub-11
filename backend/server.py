from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal
from urllib.parse import urlparse

import bcrypt
import jwt
import httpx
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from html import escape

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# ---------------- Mongo ----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ---------------- Constants ----------------
JWT_ALGORITHM = "HS256"
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
EMAIL_BASE_URL = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip().rstrip("/") or "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME") or "Horse Yard Manager"

PRICE_PER_HORSE_MONTHLY = 75.00  # zar per horse per month

# ---------------- Password / JWT ----------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), h.encode("utf-8"))
    except Exception:
        return False

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str, ver: int = 0) -> str:
    return jwt.encode({"sub": user_id, "email": email, "ver": ver, "exp": datetime.now(timezone.utc) + timedelta(minutes=60*24), "type": "access"}, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str, ver: int = 0) -> str:
    return jwt.encode({"sub": user_id, "ver": ver, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=60*60*24, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        h = request.headers.get("Authorization", "")
        if h.startswith("Bearer "):
            token = h[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        if payload.get("ver", 0) != user.get("token_version", 0):
            raise HTTPException(401, "Session expired")
        user["id"] = str(user["_id"])
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

# ---------------- Email ----------------
async def send_password_reset_email(to_email: str, token: str) -> bool:
    base = FRONTEND_URL.rstrip("/")
    link = f"{base}/reset-password?token={token}"
    if not EMAIL_KEY or EMAIL_KEY.startswith("{") or not base.startswith("https://"):
        if urlparse(base).hostname in ("localhost", "127.0.0.1", "::1"):
            logger.warning("Email not configured; password reset link: %s", link)
        else:
            logger.error("Password reset email not configured")
        return False
    brand = escape(EMAIL_FROM_NAME)
    html = (
        f'<div style="padding:24px;font-family:Arial,sans-serif;max-width:520px;margin:0 auto">'
        f'<h2 style="color:#4a2410">Reset your {brand} password</h2>'
        f'<p>We received a request to reset your password. Click the link below to set a new one:</p>'
        f'<p><a href="{escape(link)}" style="background:#4a2410;color:#FAF7F2;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Reset Password</a></p>'
        f'<p style="color:#666">This link expires in 1 hour and can be used once. If you did not request it, ignore this email.</p>'
        f'</div>'
    )
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json={"to": [to_email], "subject": f"Reset your {EMAIL_FROM_NAME} password", "html": html, "from_name": EMAIL_FROM_NAME},
            )
        r.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Password reset email failed: {e}")
        return False

# ---------------- App ----------------
app = FastAPI()
api = APIRouter(prefix="/api")

def oid(s: str) -> ObjectId:
    try:
        return ObjectId(s)
    except Exception:
        raise HTTPException(400, "Invalid id")

def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc["id"] = str(doc.pop("_id"))
    doc.pop("password_hash", None)
    return doc

# ==================== AUTH ====================
class RegisterReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: Literal["manager", "owner"] = "manager"

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class ForgotReq(BaseModel):
    email: EmailStr

class ResetReq(BaseModel):
    token: str
    password: str = Field(min_length=6)

async def check_lockout(ip: str, email: str) -> bool:
    since = datetime.now(timezone.utc) - timedelta(minutes=15)
    count = await db.login_attempts.count_documents({"identifier": f"{ip}:{email}", "created_at": {"$gte": since.isoformat()}})
    return count >= 5

async def record_attempt(ip: str, email: str):
    await db.login_attempts.insert_one({"identifier": f"{ip}:{email}", "email": email, "created_at": utcnow_iso()})

@api.post("/auth/register")
async def register(req: RegisterReq, response: Response):
    email = req.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role": req.role,
        "token_version": 0,
        "created_at": utcnow_iso(),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    at = create_access_token(uid, email, 0)
    rt = create_refresh_token(uid, 0)
    set_auth_cookies(response, at, rt)
    return {"id": uid, "email": email, "name": req.name, "role": req.role}

@api.post("/auth/login")
async def login(req: LoginReq, request: Request, response: Response):
    email = req.email.lower()
    ip = request.client.host if request.client else "unknown"
    if await check_lockout(ip, email):
        raise HTTPException(429, "Too many attempts. Try again in 15 minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        await record_attempt(ip, email)
        raise HTTPException(401, "Invalid credentials")
    await db.login_attempts.delete_many({"identifier": f"{ip}:{email}"})
    uid = str(user["_id"])
    ver = user.get("token_version", 0)
    at = create_access_token(uid, email, ver)
    rt = create_refresh_token(uid, ver)
    set_auth_cookies(response, at, rt)
    return {"id": uid, "email": email, "name": user["name"], "role": user["role"]}

@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}

@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    rt = request.cookies.get("refresh_token")
    if not rt:
        raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(rt, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user or payload.get("ver", 0) != user.get("token_version", 0):
            raise HTTPException(401, "Session expired")
        at = create_access_token(str(user["_id"]), user["email"], user.get("token_version", 0))
        response.set_cookie("access_token", at, httponly=True, secure=True, samesite="none", max_age=60*60*24, path="/")
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

@api.post("/auth/forgot-password")
async def forgot(req: ForgotReq, background_tasks: BackgroundTasks):
    email = req.email.lower()
    generic = {"message": "If that email is registered, a reset link has been sent."}
    since = datetime.now(timezone.utc) - timedelta(minutes=15)
    count = await db.password_reset_requests.count_documents({"email": email, "created_at": {"$gte": since.isoformat()}})
    await db.password_reset_requests.insert_one({"email": email, "created_at": utcnow_iso()})
    if count >= 5:
        return generic
    user = await db.users.find_one({"email": email})
    if not user:
        return generic
    token = secrets.token_urlsafe(32)
    h = hashlib.sha256(token.encode()).hexdigest()
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.password_reset_tokens.insert_one({"token_hash": h, "user_id": str(user["_id"]), "email": email, "expires_at": expires, "used": False, "created_at": utcnow_iso()})
    background_tasks.add_task(send_password_reset_email, user["email"], token)
    return generic

@api.post("/auth/reset-password")
async def reset(req: ResetReq):
    h = hashlib.sha256(req.token.encode()).hexdigest()
    now = datetime.now(timezone.utc)
    doc = await db.password_reset_tokens.find_one_and_update(
        {"token_hash": h, "used": False, "expires_at": {"$gt": now}},
        {"$set": {"used": True}},
    )
    if not doc:
        raise HTTPException(400, "Invalid or expired token")
    uid = ObjectId(doc["user_id"])
    await db.users.update_one({"_id": uid}, {"$set": {"password_hash": hash_password(req.password)}, "$inc": {"token_version": 1}})
    await db.password_reset_tokens.delete_many({"user_id": doc["user_id"], "used": False})
    await db.login_attempts.delete_many({"email": doc["email"]})
    return {"message": "Password updated"}

# ==================== HORSES ====================
class HorseIn(BaseModel):
    name: str
    breed: Optional[str] = None
    color: Optional[str] = None
    dob: Optional[str] = None
    sex: Optional[str] = None
    passport_id: Optional[str] = None
    ueln: Optional[str] = None
    microchip: Optional[str] = None
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    lease_status: Optional[str] = "Owned"  # Owned, Full Lease, Part Lease
    stable_wing: Optional[str] = None
    monthly_livery: float = 0.0
    image_url: Optional[str] = None
    notes: Optional[str] = None

@api.get("/horses")
async def list_horses(user: dict = Depends(get_current_user)):
    q = {"owner_id": user["id"]} if user["role"] == "owner" else {"created_by": user["id"]}
    docs = await db.horses.find(q).sort("name", 1).to_list(500)
    return [clean(d) for d in docs]

@api.post("/horses")
async def create_horse(h: HorseIn, user: dict = Depends(get_current_user)):
    if user["role"] != "manager":
        raise HTTPException(403, "Managers only")
    doc = h.model_dump()
    doc["created_by"] = user["id"]
    doc["created_at"] = utcnow_iso()
    r = await db.horses.insert_one(doc)
    return clean(await db.horses.find_one({"_id": r.inserted_id}))

@api.get("/horses/{hid}")
async def get_horse(hid: str, user: dict = Depends(get_current_user)):
    d = await db.horses.find_one({"_id": oid(hid)})
    if not d:
        raise HTTPException(404, "Not found")
    return clean(d)

@api.put("/horses/{hid}")
async def update_horse(hid: str, h: HorseIn, user: dict = Depends(get_current_user)):
    if user["role"] != "manager":
        raise HTTPException(403, "Managers only")
    await db.horses.update_one({"_id": oid(hid)}, {"$set": h.model_dump()})
    return clean(await db.horses.find_one({"_id": oid(hid)}))

@api.delete("/horses/{hid}")
async def delete_horse(hid: str, user: dict = Depends(get_current_user)):
    if user["role"] != "manager":
        raise HTTPException(403, "Managers only")
    await db.horses.delete_one({"_id": oid(hid)})
    await db.care_events.delete_many({"horse_id": hid})
    await db.feed_plans.delete_many({"horse_id": hid})
    return {"ok": True}

# ==================== CARE EVENTS (Vaccination/Farrier/Dental/Physio) ====================
class CareEventIn(BaseModel):
    horse_id: str
    category: Literal["Vaccination", "Farrier", "Dental", "Physio"]
    date: str  # ISO date
    next_due: Optional[str] = None
    practitioner: Optional[str] = None
    notes: Optional[str] = None
    cost: float = 0.0
    billable_to_owner: bool = True
    completed: bool = True

@api.get("/care-events")
async def list_care(category: Optional[str] = None, horse_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if category:
        q["category"] = category
    if horse_id:
        q["horse_id"] = horse_id
    if user["role"] == "owner":
        horse_ids = [str(d["_id"]) for d in await db.horses.find({"owner_id": user["id"]}).to_list(500)]
        q["horse_id"] = {"$in": horse_ids}
    docs = await db.care_events.find(q).sort("date", -1).to_list(1000)
    return [clean(d) for d in docs]

@api.post("/care-events")
async def create_care(e: CareEventIn, user: dict = Depends(get_current_user)):
    if user["role"] != "manager":
        raise HTTPException(403, "Managers only")
    doc = e.model_dump()
    doc["created_at"] = utcnow_iso()
    r = await db.care_events.insert_one(doc)
    return clean(await db.care_events.find_one({"_id": r.inserted_id}))

@api.delete("/care-events/{eid}")
async def del_care(eid: str, user: dict = Depends(get_current_user)):
    if user["role"] != "manager":
        raise HTTPException(403, "Managers only")
    await db.care_events.delete_one({"_id": oid(eid)})
    return {"ok": True}

# ==================== FEED PLANS ====================
class FeedPlanIn(BaseModel):
    horse_id: str
    morning: Optional[str] = None
    midday: Optional[str] = None
    evening: Optional[str] = None
    supplements: Optional[str] = None
    daily_cost: float = 0.0

@api.get("/feed-plans")
async def list_feed(horse_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"horse_id": horse_id} if horse_id else {}
    return [clean(d) for d in await db.feed_plans.find(q).to_list(500)]

@api.post("/feed-plans")
async def upsert_feed(f: FeedPlanIn, user: dict = Depends(get_current_user)):
    if user["role"] != "manager":
        raise HTTPException(403, "Managers only")
    doc = f.model_dump()
    doc["updated_at"] = utcnow_iso()
    existing = await db.feed_plans.find_one({"horse_id": f.horse_id})
    if existing:
        await db.feed_plans.update_one({"_id": existing["_id"]}, {"$set": doc})
        return clean(await db.feed_plans.find_one({"_id": existing["_id"]}))
    r = await db.feed_plans.insert_one(doc)
    return clean(await db.feed_plans.find_one({"_id": r.inserted_id}))

# ==================== EXPENSES ====================
class ExpenseIn(BaseModel):
    date: str
    category: str  # Hay, Bedding, Feed, Vet, Utilities, Farrier, Other
    description: str
    amount: float
    horse_id: Optional[str] = None
    billable_to_owner: bool = False

@api.get("/expenses")
async def list_exp(user: dict = Depends(get_current_user)):
    docs = await db.expenses.find({}).sort("date", -1).to_list(1000)
    return [clean(d) for d in docs]

@api.post("/expenses")
async def create_exp(e: ExpenseIn, user: dict = Depends(get_current_user)):
    if user["role"] != "manager":
        raise HTTPException(403, "Managers only")
    doc = e.model_dump()
    doc["created_at"] = utcnow_iso()
    r = await db.expenses.insert_one(doc)
    return clean(await db.expenses.find_one({"_id": r.inserted_id}))

@api.delete("/expenses/{eid}")
async def del_exp(eid: str, user: dict = Depends(get_current_user)):
    if user["role"] != "manager":
        raise HTTPException(403, "Managers only")
    await db.expenses.delete_one({"_id": oid(eid)})
    return {"ok": True}

# ==================== COMPETITIONS ====================
class CompetitionIn(BaseModel):
    horse_id: str
    show_name: str
    date: str
    discipline: Optional[str] = None
    class_name: Optional[str] = None
    entry_fee: float = 0.0
    placing: Optional[str] = None
    rider: Optional[str] = None
    notes: Optional[str] = None

@api.get("/competitions")
async def list_comp(user: dict = Depends(get_current_user)):
    docs = await db.competitions.find({}).sort("date", -1).to_list(500)
    return [clean(d) for d in docs]

@api.post("/competitions")
async def create_comp(c: CompetitionIn, user: dict = Depends(get_current_user)):
    if user["role"] != "manager":
        raise HTTPException(403, "Managers only")
    doc = c.model_dump()
    doc["created_at"] = utcnow_iso()
    r = await db.competitions.insert_one(doc)
    return clean(await db.competitions.find_one({"_id": r.inserted_id}))

@api.delete("/competitions/{cid}")
async def del_comp(cid: str, user: dict = Depends(get_current_user)):
    if user["role"] != "manager":
        raise HTTPException(403, "Managers only")
    await db.competitions.delete_one({"_id": oid(cid)})
    return {"ok": True}

# ==================== OWNER STATEMENTS ====================
@api.get("/owner-statements")
async def owner_statements(user: dict = Depends(get_current_user)):
    """Generate monthly statements per owner from horses + billable care/expenses."""
    horses = await db.horses.find({}).to_list(1000)
    if user["role"] == "owner":
        horses = [h for h in horses if h.get("owner_id") == user["id"]]
    now = datetime.now(timezone.utc)
    month_key = now.strftime("%Y-%m")
    month_start = now.replace(day=1).date().isoformat()
    statements = {}
    for h in horses:
        hid = str(h["_id"])
        owner_key = h.get("owner_name") or "Unassigned"
        line_items = [{"desc": f"Monthly livery — {h['name']}", "amount": h.get("monthly_livery", 0)}]
        care = await db.care_events.find({"horse_id": hid, "billable_to_owner": True, "date": {"$gte": month_start}}).to_list(200)
        for c in care:
            line_items.append({"desc": f"{c['category']} — {h['name']} ({c['date'][:10]})", "amount": c.get("cost", 0)})
        exp = await db.expenses.find({"horse_id": hid, "billable_to_owner": True, "date": {"$gte": month_start}}).to_list(200)
        for e in exp:
            line_items.append({"desc": f"{e['category']}: {e['description']} — {h['name']}", "amount": e.get("amount", 0)})
        total = sum(li["amount"] for li in line_items)
        if owner_key not in statements:
            statements[owner_key] = {"owner": owner_key, "month": month_key, "items": [], "total": 0.0, "horses": []}
        statements[owner_key]["items"].extend(line_items)
        statements[owner_key]["total"] += total
        statements[owner_key]["horses"].append(h["name"])
    return list(statements.values())

# ==================== DASHBOARD ====================
@api.get("/dashboard/summary")
async def dashboard(user: dict = Depends(get_current_user)):
    q = {"owner_id": user["id"]} if user["role"] == "owner" else {}
    horses = await db.horses.find(q).to_list(1000)
    horse_ids = [str(h["_id"]) for h in horses]
    today = datetime.now(timezone.utc).date()
    in30 = (today + timedelta(days=30)).isoformat()
    upcoming = await db.care_events.find({"horse_id": {"$in": horse_ids}, "next_due": {"$gte": today.isoformat(), "$lte": in30}}).sort("next_due", 1).to_list(50)
    overdue = await db.care_events.find({"horse_id": {"$in": horse_ids}, "next_due": {"$lt": today.isoformat(), "$ne": None}}).sort("next_due", 1).to_list(50)
    month_start = today.replace(day=1).isoformat()
    exp_month = await db.expenses.find({"date": {"$gte": month_start}}).to_list(500)
    total_livery = sum(h.get("monthly_livery", 0) for h in horses)
    total_expenses = sum(e.get("amount", 0) for e in exp_month)
    sub = await db.payment_transactions.find_one({"user_id": user["id"], "payment_status": "paid"}, sort=[("created_at", -1)])
    return {
        "horse_count": len(horses),
        "upcoming_care": [clean(c) for c in upcoming],
        "overdue_care": [clean(c) for c in overdue],
        "monthly_livery_income": total_livery,
        "monthly_expenses": total_expenses,
        "subscription": {"active": bool(sub), "session_id": sub.get("session_id") if sub else None},
        "yard_monthly_fee": round(len(horses) * PRICE_PER_HORSE_MONTHLY, 2),
    }

# ==================== STRIPE PAYMENTS (Flow B) ====================
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest,
)

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")

class CheckoutReq(BaseModel):
    horse_count: int = Field(ge=1, le=500)
    origin_url: str

@api.post("/payments/checkout")
async def create_checkout(req: CheckoutReq, request: Request, user: dict = Depends(get_current_user)):
    host_url = str(request.base_url)
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    amount = round(req.horse_count * PRICE_PER_HORSE_MONTHLY, 2)
    origin = req.origin_url.rstrip("/")
    body = CheckoutSessionRequest(
        amount=float(amount),
        currency="zar",
        success_url=f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin}/payment/cancel",
        metadata={"user_id": user["id"], "horse_count": str(req.horse_count), "plan": "yard_monthly"},
    )
    session = await sc.create_checkout_session(body)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["id"],
        "amount": amount,
        "currency": "zar",
        "horse_count": req.horse_count,
        "status": "initiated",
        "payment_status": "pending",
        "created_at": utcnow_iso(),
        "updated_at": utcnow_iso(),
    })
    return {"checkout_url": session.url, "session_id": session.session_id}

@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    rec = await db.payment_transactions.find_one({"session_id": session_id})
    if not rec:
        raise HTTPException(404, "Not found")
    if rec.get("payment_status") != "paid":
        try:
            sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
            st = await sc.get_checkout_status(session_id)
            if st.payment_status == "paid" or st.status == "complete":
                await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {"status": "completed", "payment_status": "paid", "updated_at": utcnow_iso()}},
                )
                rec = await db.payment_transactions.find_one({"session_id": session_id})
        except Exception as e:
            logger.warning(f"stripe status poll failed: {e}")
    return {"session_id": rec["session_id"], "status": rec["status"], "payment_status": rec["payment_status"], "amount": rec.get("amount"), "horse_count": rec.get("horse_count")}

@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body_bytes = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    try:
        wh = await sc.handle_webhook(body_bytes, sig)
    except Exception as e:
        logger.error(f"webhook err: {e}")
        raise HTTPException(400, "Invalid webhook")
    if wh.session_id:
        await db.payment_transactions.update_one(
            {"session_id": wh.session_id, "payment_status": {"$ne": "paid"}},
            {"$set": {"payment_status": wh.payment_status or "paid", "status": "completed", "updated_at": utcnow_iso()}},
        )
    return {"ok": True}

# ---------------- Mount ----------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", FRONTEND_URL).split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Startup ----------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.password_reset_tokens.create_index("token_hash", unique=True)
    await db.login_attempts.create_index("email")
    await db.login_attempts.create_index("identifier")
    await db.password_reset_requests.create_index("email")
    await db.horses.create_index("owner_id")
    await db.care_events.create_index("horse_id")
    await db.care_events.create_index("next_due")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_pw),
            "name": "Tom Hailsmith", "role": "manager", "token_version": 0, "created_at": utcnow_iso()
        })
        logger.info(f"Seeded admin: {admin_email}")
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})

@app.on_event("shutdown")
async def shutdown():
    client.close()

@api.get("/")
async def root():
    return {"message": "Horse Yard Manager API", "version": "1.0"}
