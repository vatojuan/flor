# backend/auth.py
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.auth import SECRET_KEY, ALGORITHM
from app.database import get_db_connection

ACCESS_TOKEN_EXPIRE_MINUTES = 30

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

limiter = Limiter(key_func=get_remote_address)

@router.post("/admin-login", tags=["auth"])
@limiter.limit("5/minute")
async def admin_login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            'SELECT id, email, password, role FROM "User" WHERE email = %s AND role = %s',
            (form_data.username, "admin"),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="Usuario o contraseña incorrectos")

        user_id, email, stored_password, role = row

        if not stored_password or not verify_password(form_data.password, stored_password):
            raise HTTPException(status_code=400, detail="Usuario o contraseña incorrectos")

        access_token = create_access_token(
            data={"sub": email, "role": role},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error en la autenticación")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
