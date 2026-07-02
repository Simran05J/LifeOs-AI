from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

class ProfileBase(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=50, description="User's first name")
    last_name: Optional[str] = Field(None, min_length=1, max_length=50, description="User's last name")
    phone_number: Optional[str] = Field(
        None, 
        pattern=r"^\+?[1-9]\d{1,14}$", 
        description="E.164 compliant phone number"
    )
    timezone: Optional[str] = Field("UTC", description="Preferred IANA timezone name, e.g. America/New_York")
    bio: Optional[str] = Field(None, max_length=500, description="A brief biography or description")

class ProfileCreate(ProfileBase):
    email: EmailStr = Field(..., description="Primary contact email address for the user")

class ProfileUpdate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    uid: str = Field(..., description="Firebase Auth Unique User Identifier")
    email: EmailStr = Field(..., description="Primary contact email address")
    created_at: datetime = Field(..., description="Profile creation timestamp")
    updated_at: datetime = Field(..., description="Profile last updated timestamp")

    class Config:
        from_attributes = True
