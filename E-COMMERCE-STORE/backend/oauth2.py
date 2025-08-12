# backend/oauth2.py

from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from typing import Optional
import logging

# IMPORTANT: Make sure you have SECRET_KEY in your .env file!
# Example: SECRET_KEY="a_very_long_and_random_string_for_security"
load_dotenv()
SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Fallback for weak or missing secret keys, with a warning
if not SECRET_KEY or len(SECRET_KEY) < 32:
    logging.warning(
        "SECURITY WARNING: SECRET_KEY is missing or too short. Generating a temporary key; tokens will be invalid after restart."
    )
    SECRET_KEY = os.urandom(64).hex()

# OAuth2 schemes for admin and customer flows
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")  # For admin
customer_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")  # For customer


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str, credentials_exception):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return username
    except JWTError:
        raise credentials_exception