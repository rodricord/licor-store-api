import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

# Carga de variables de entorno
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pydantic import BaseModel
import bcrypt
import jwt
import cloudinary
import cloudinary.uploader

# ==========================================
# 0. CONFIGURACIÓN Y VARIABLES DE ENTORNO
# ==========================================
DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Base de datos (Supabase)
engine = create_engine(DATABASE_URL) 
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Cloudinary
cloudinary.config( 
  cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "vojppavk"),
  api_key = os.getenv("CLOUDINARY_API_KEY", "697918439339214"), 
  api_secret = os.getenv("CLOUDINARY_API_SECRET", "r9G3lWXp-1BqZD2MBzmiTltFP20"),
  secure = True
)

# ==========================================
# 1. FUNCIONES AUXILIARES DE SEGURIDAD
# ==========================================
def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode('utf-8')[:72]
    hash_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hash_bytes)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ==========================================
# 2. MODELOS DE BASE DE DATOS (SQLAlchemy)
# ==========================================
class Licor(Base):
    __tablename__ = "licores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    categoria = Column(String)
    precio = Column(Float)
    stock = Column(Integer)
    imagen_url = Column(String)

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=True)

Base.metadata.create_all(bind=engine)

# ==========================================
# 3. ESQUEMAS DE VALIDACIÓN (Pydantic)
# ==========================================
class UsuarioCreate(BaseModel):
    email: str
    password: str

# ==========================================
# 4. INICIALIZACIÓN DE FASTAPI, CORS Y SEGURIDAD
# ==========================================
app = FastAPI(title="Liquor Store API - Módulo Catálogo")

# Configuración de CORS única
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

security = HTTPBearer()

def obtener_usuario_actual(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token ha expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ==========================================
# 5. ENDPOINTS DE LA API
# ==========================================

@app.get("/")
def inicio():
    return {"status": "ok", "mensaje": "API de Licores funcionando en producción"}

@app.post("/registro", status_code=201)
def registrar_usuario(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    usuario_existente = db.query(Usuario).filter(Usuario.email == usuario.email).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    password_encriptada = hash_password(usuario.password)
    nuevo_usuario = Usuario(email=usuario.email, hashed_password=password_encriptada)
    
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    
    return {"mensaje": "Usuario registrado exitosamente", "id": nuevo_usuario.id, "email": nuevo_usuario.email}

@app.post("/login")
def login(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    db_usuario = db.query(Usuario).filter(Usuario.email == usuario.email).first()
    
    if not db_usuario or not verify_password(usuario.password, db_usuario.hashed_password):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    
    access_token = create_access_token(
        data={"sub": db_usuario.email, "user_id": db_usuario.id, "is_admin": db_usuario.is_admin}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "mensaje": "Inicio de sesión exitoso"
    }

# --- RUTAS DE LICORES ---

@app.get("/licores")
def obtener_licores(db: Session = Depends(get_db)):  # <--- PÚBLICO (Sin token)
    return db.query(Licor).all()

@app.post("/licores")
def crear_licor(
    nombre: str, 
    categoria: str, 
    precio: float, 
    stock: int, 
    imagen_url: str = "", 
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual)  # <--- PROTEGIDO
):
    nuevo_licor = Licor(
        nombre=nombre, 
        categoria=categoria, 
        precio=precio, 
        stock=stock, 
        imagen_url=imagen_url
    )
    db.add(nuevo_licor)
    db.commit()
    db.refresh(nuevo_licor)
    return {"mensaje": "Licor guardado en la base de datos con éxito", "producto": nuevo_licor}

@app.put("/licores/{licor_id}")
def actualizar_licor(
    licor_id: int, 
    nombre: str,
    categoria: str,
    precio: float,
    stock: int,
    imagen_url: str = None,
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual)  # <--- PROTEGIDO
):
    licor = db.query(Licor).filter(Licor.id == licor_id).first()
    
    if not licor:
        raise HTTPException(status_code=404, detail="Licor no encontrado")
    
    licor.nombre = nombre
    licor.categoria = categoria
    licor.precio = precio
    licor.stock = stock
    licor.imagen_url = imagen_url
    
    db.commit()
    db.refresh(licor)
    
    return {"mensaje": "Licor actualizado con éxito", "licor": licor} 

@app.delete("/licores/{licor_id}")
def eliminar_licor(
    licor_id: int, 
    db: Session = Depends(get_db),
    usuario_actual: dict = Depends(obtener_usuario_actual)  # <--- PROTEGIDO
):
    licor = db.query(Licor).filter(Licor.id == licor_id).first()
    
    if not licor:
        raise HTTPException(status_code=404, detail="Licor no encontrado")
    
    db.delete(licor)
    db.commit()
    
    return {"mensaje": f"Licor con ID {licor_id} eliminado con éxito"}

@app.post("/subir-imagen/")
def subir_imagen(
    file: UploadFile = File(...),
    usuario_actual: dict = Depends(obtener_usuario_actual)  # <--- PROTEGIDO
):
    try:
        file.file.seek(0)
        resultado = cloudinary.uploader.upload(
            file.file,
            folder="licores"
        )
        return {
            "mensaje": "Imagen subida con éxito",
            "url": resultado.get("secure_url")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir imagen: {str(e)}")

@app.get("/dondestoy")
def donde_estoy():
    return {"ruta_archivo": os.path.abspath(__file__)}