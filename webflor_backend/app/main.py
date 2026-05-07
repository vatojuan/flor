import os
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging

# --- Configuración del Logger ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# --- Carga de Routers ---
from app.routers import (
    agent,
    auth,
    cv_confirm,
    cv_upload,
    files,
    integration,
    inbox,
    mailing,
    notifications,
    payments,
    screenshot_to_job,
    service_requests,
    users,
    webhooks,
    job,
    proposal,
    apply,
    match,
    admin_templates,
    admin_users,
    admin_config,
    cv_admin_upload,
    email_db_admin,
    job_admin,
    training,
)
from backend.auth import router as admin_auth_router

# --- Configuración de la App ---
load_dotenv()

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="FAP Mendoza API",
    description="API de la plataforma de recursos humanos FAP Mendoza. Gestión de candidatos, ofertas, matching con IA, y comunicaciones.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- Middleware de CORS ---
origins_env = os.getenv("FRONTEND_ORIGINS", "http://localhost:3000,https://fapmendoza.online")
origins = [o.strip() for o in origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# --- Middleware de Logging ---
@app.middleware("http")
async def log_request(request: Request, call_next):
    logger.info("%s %s", request.method, request.url.path)
    response = await call_next(request)
    logger.info("Response: %s", response.status_code)
    return response

# --- Inclusión de Routers (Lógica Original Restaurada) ---
# Cada router es responsable de su propio prefijo.
app.include_router(agent.router)
app.include_router(auth.router)
app.include_router(inbox.router)
app.include_router(mailing.router)
app.include_router(payments.router)
app.include_router(screenshot_to_job.router)
app.include_router(service_requests.router)
app.include_router(cv_confirm.router)
app.include_router(cv_upload.router)
app.include_router(files.router)
app.include_router(integration.router)
app.include_router(users.router)
app.include_router(webhooks.router)
app.include_router(job.router)
app.include_router(apply.router)
app.include_router(proposal.router)
app.include_router(match.router)
app.include_router(admin_templates.router)
app.include_router(admin_users.router)
app.include_router(admin_config.router)
app.include_router(cv_admin_upload.router)
app.include_router(email_db_admin.router)
app.include_router(job_admin.router)
app.include_router(training.router)
app.include_router(notifications.router)
app.include_router(admin_auth_router, prefix="/auth", tags=["admin"])


# --- Endpoints de Raíz ---
@app.get("/")
def home():
    return {"ok": True, "message": "API de FAP Mendoza funcionando."}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.on_event("startup")
def list_routes():
    url_list = [{"path": route.path, "name": route.name} for route in app.routes]
    logger.info("Rutas cargadas:")
    for route in url_list:
        logger.info(f"  - Path: {route['path']}")
