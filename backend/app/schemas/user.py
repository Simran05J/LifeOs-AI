from pydantic import BaseModel, EmailStr
from typing import Optional

# Shared properties
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    display_name: Optional[str] = None
    is_active: Optional[bool] = True

# Properties to receive via API on creation
class UserCreate(UserBase):
    email: EmailStr
    password: str

# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = None

# Properties returned in API response
class UserResponse(UserBase):
    uid: str

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "uid": "firebase-uid-example",
                "email": "user@example.com",
                "display_name": "John Doe",
                "is_active": True,
            }
        }

class AuthUser(BaseModel):
    uid: str
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    email_verified: bool = False

