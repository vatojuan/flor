from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
import os

# Configuración del contexto de hash de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Clave secreta y algoritmo para tokens JWT
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is required")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Función para verificar una contraseña
def verify_password(plain_password, stored_password):
    if not stored_password:
        return False
    return pwd_context.verify(plain_password, stored_password)

# Función para generar tokens JWT
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
