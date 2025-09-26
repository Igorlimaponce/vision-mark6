from datetime import timedelta
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_active_user, get_current_user, check_organization_access
from app.core.security import create_access_token
from app.crud.crud_user import authenticate_user
from app.core.config import settings
from app.crud import crud_user
from app.db.session import get_db
from app.schemas.user import User, UserCreate, UserUpdate, LoginRequest, LoginResponse, Token
from app.db.models.user import User as UserModel

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(
    user_credentials: LoginRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.email, expires_delta=access_token_expires
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=User.from_orm(user)
    )


@router.post("/register", response_model=User)
def register(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
) -> Any:
    """
    Create new user.
    """
    user = crud_user.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    user = crud_user.create_user(db, user=user_in)
    return user


@router.get("/me", response_model=User)
def read_user_me(
    current_user: UserModel = Depends(get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    return current_user


@router.put("/me", response_model=User)
def update_user_me(
    *,
    db: Session = Depends(get_db),
    password: Optional[str] = None,
    full_name: Optional[str] = None,
    email: Optional[str] = None,
    current_user: UserModel = Depends(get_current_active_user),
) -> Any:
    """
    Update own user.
    """
    current_user_data = UserUpdate(**current_user.__dict__)
    if password is not None:
        current_user_data.password = password
    if full_name is not None:
        current_user_data.full_name = full_name
    if email is not None:
        current_user_data.email = email
    
    user = crud_user.update_user(db, user_id=current_user.id, user=current_user_data)
    return user


@router.get("/", response_model=List[User])
def read_users(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search by email or name"),
    current_user: UserModel = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve users from the same organization.
    """
    users = crud_user.get_users(
        db,
        organization_id=current_user.organization_id,
        skip=skip,
        limit=limit,
        search=search
    )
    return users


@router.post("/", response_model=User)
def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
    current_user: UserModel = Depends(get_current_active_user),
) -> Any:
    """
    Create new user in the same organization.
    Only admin can create users.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Ensure the new user is created in the same organization
    user_in.organization_id = current_user.organization_id
    
    user = crud_user.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    user = crud_user.create_user(db, user=user_in)
    return user


@router.get("/{user_id}", response_model=User)
def read_user(
    *,
    db: Session = Depends(get_db),
    user_id: str,
    current_user: UserModel = Depends(get_current_active_user),
) -> Any:
    """
    Get a specific user by id.
    """
    user = crud_user.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if the user belongs to the same organization
    if user.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return user


@router.put("/{user_id}", response_model=User)
def update_user(
    *,
    db: Session = Depends(get_db),
    user_id: str,
    user_in: UserUpdate,
    current_user: UserModel = Depends(get_current_active_user),
) -> Any:
    """
    Update a user.
    Only admin can update other users.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = crud_user.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if the user belongs to the same organization
    if user.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = crud_user.update_user(db, user_id=user_id, user=user_in)
    return user


@router.delete("/{user_id}")
def delete_user(
    *,
    db: Session = Depends(get_db),
    user_id: str,
    current_user: UserModel = Depends(get_current_active_user),
) -> Any:
    """
    Delete a user.
    Only admin can delete users.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = crud_user.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if the user belongs to the same organization
    if user.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Prevent self-deletion
    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete yourself"
        )
    
    success = crud_user.delete_user(db, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}
