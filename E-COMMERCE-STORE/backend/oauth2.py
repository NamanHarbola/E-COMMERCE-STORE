# backend/oauth2.py

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import os
from dotenv import load_dotenv

# IMPORTANT: Make sure you have SECRET_KEY in your .env file!
# Example: SECRET_KEY="a_very_long_and_random_string_for_security"
load_dotenv()
SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-secret-change-me"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login") # For admin
customer_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login") # For customer

def create_access_token(data: dict):
    to_encode = data.copy()
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