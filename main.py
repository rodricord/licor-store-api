from fastapi import FastAPI, Depends
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# 1. Configurar la Base de Datos (SQLAlchemy creará este archivo automáticamente)
DATABASE_URL = "sqlite:///./licores.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 2. DEFINIR LA TABLA DEL CATÁLOGO DE LICORES
class Licor(Base):
    __tablename__ = "licores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    categoria = Column(String)  # Vino, Whisky, Cerveza, Rum, Tequila
    precio = Column(Float)
    stock = Column(Integer)
    imagen_url = Column(String) # Guardará la ruta de la foto JPG

# Crear las tablas automáticamente en la base de datos
Base.metadata.create_all(bind=engine)

# 3. Inicializar la API con FastAPI

app = FastAPI(title="Liquor Store API - Módulo Catálogo")
# Función para abrir y cerrar la conexión a la base de datos de forma limpia
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- RUTAS DE LA API (ENDPOINTS) ---

@app.get("/")
def inicio():
    return {"status": "ok", "mensaje": "API de Licores funcionando en Windows"}

# Ruta para ver todas las botellas registradas
@app.get("/licores")
def obtener_licores(db: Session = Depends(get_db)):
    return db.query(Licor).all()

# Ruta para agregar una botella nueva
@app.post("/licores")
def crear_licor(
    nombre: str, 
    categoria: str, 
    precio: float, 
    stock: int, 
    imagen_url: str = "", 
    db: Session = Depends(get_db)
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
@app.delete("/licores/{licor_id}")
def eliminar_licor(licor_id: int, db: Session = Depends(get_db)):
    # Buscamos el licor por su ID
    licor = db.query(Licor).filter(Licor.id == licor_id).first()
    
    # Si no existe, enviamos un error 404
    if not licor:
        raise HTTPException(status_code=404, detail="Licor no encontrado")
    
    # Lo eliminamos de la base de datos
    db.delete(licor)
    db.commit()
    
    return {"mensaje": f"Licor con ID {licor_id} eliminado con éxito"}
# Módulo para Editar/Actualizar Licor
@app.put("/licores/{licor_id}")
def actualizar_licor(
    licor_id: int, 
    nombre: str,
    categoria: str,
    precio: float,
    stock: int,
    imagen_url: str = None,
    imagen_url_2: str = None,
    db: Session = Depends(get_db)
):
    # 1. Buscamos el licor por su ID
    licor = db.query(Licor).filter(Licor.id == licor_id).first()
    
    # 2. Si no existe, lanza error 404
    if not licor:
        raise HTTPException(status_code=404, detail="Licor no encontrado")
    
    # 3. Asignamos los nuevos valores
    licor.nombre = nombre
    licor.categoria = categoria
    licor.precio = precio
    licor.stock = stock
    licor.imagen_url = imagen_url
    licor.imagen_url_2 = imagen_url_2
    
    # 4. Guardamos los cambios
    db.commit()
    db.refresh(licor)
    
    return {"mensaje": "Licor actualizado con éxito", "licor": licor} 

import cloudinary
import cloudinary.uploader
from fastapi import File, UploadFile

# 1. Configuración de tu cuenta en la nube
cloudinary.config( 
  cloud_name = "vojppavk", # Probablemente sea "vojppavk"
  api_key = "697918439339214", 
  api_secret = "r9G3lWXp-1BqZD2MBzmiTltFP20",
  secure = True
)

# 2. Ruta para procesar y subir la foto
@app.post("/subir-imagen/")
def subir_imagen(file: UploadFile = File(...)):
    try:
        # 1. Aseguramos que el archivo se lea desde el principio
        file.file.seek(0)
        
        # 2. Subimos el archivo a Cloudinary
        resultado = cloudinary.uploader.upload(
            file.file,
            folder="licores"  # Opcional: crea una carpeta en Cloudinary
        )
        
        # 3. Retornamos la URL segura
        return {
            "mensaje": "Imagen subida con éxito",
            "url": resultado.get("secure_url")
        }
    except Exception as e:
        # Si algo falla, devolverá el error exacto en lugar de congelarse
        raise HTTPException(status_code=500, detail=f"Error al subir imagen: {str(e)}")