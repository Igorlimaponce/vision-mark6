from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.db.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password


def get_user(db: Session, user_id: UUID) -> Optional[User]:
    """
    Busca um usuário por ID.
    """
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """
    Busca um usuário por email.
    """
    return db.query(User).filter(User.email == email).first()


def get_users(
    db: Session, 
    organization_id: UUID,
    skip: int = 0, 
    limit: int = 100,
    search: Optional[str] = None
) -> List[User]:
    """
    Lista usuários de uma organização com opção de busca.
    """
    query = db.query(User).filter(User.organization_id == organization_id)
    
    if search:
        search_filter = or_(
            User.email.ilike(f"%{search}%"),
            User.full_name.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    return query.offset(skip).limit(limit).all()


def create_user(db: Session, user: UserCreate) -> User:
    """
    Cria um novo usuário.
    """
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        role=user.role,
        organization_id=user.organization_id,
        is_active=user.is_active
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user_id: UUID, user: UserUpdate) -> Optional[User]:
    """
    Atualiza um usuário existente.
    """
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        return None
    
    update_data = user.dict(exclude_unset=True)
    
    # Hash password if provided
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: UUID) -> bool:
    """
    Remove um usuário.
    """
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        return False
    
    db.delete(db_user)
    db.commit()
    return True


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Autentica um usuário com email e senha.
    """
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def is_active(user: User) -> bool:
    """
    Verifica se o usuário está ativo.
    """
    return user.is_active == "Y"


def count_users_by_organization(db: Session, organization_id: UUID) -> int:
    """
    Conta o número de usuários em uma organização.
    """
    return db.query(func.count(User.id)).filter(User.organization_id == organization_id).scalar()
