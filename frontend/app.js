// URL de tu Backend alojado en Render
const API_URL = "https://licor-store-api.onrender.com";

// Referencias a los elementos del DOM
const modalLogin = document.getElementById('modal-login');
const modalRegister = document.getElementById('modal-register');
const modalCart = document.getElementById('modal-cart');
const liquorGrid = document.getElementById('liquor-grid');
const loadingState = document.getElementById('loading-state');
const totalItemsText = document.getElementById('total-items');
const inputSearch = document.getElementById('input-search');

let licoresGlobales = []; // Guardará el catálogo cargado para filtrado rápido

// Abrir y Cerrar Modales
document.getElementById('btn-open-login')?.addEventListener('click', () => modalLogin?.classList.remove('hidden'));
document.getElementById('btn-close-login')?.addEventListener('click', () => modalLogin?.classList.add('hidden'));

document.getElementById('btn-open-register')?.addEventListener('click', () => modalRegister?.classList.remove('hidden'));
document.getElementById('btn-close-register')?.addEventListener('click', () => modalRegister?.classList.add('hidden'));

document.getElementById('btn-cart')?.addEventListener('click', () => modalCart?.classList.remove('hidden'));
document.getElementById('btn-close-cart')?.addEventListener('click', () => modalCart?.classList.add('hidden'));

// ----------------------------------------------------
// CARGAR Y RENDERIZAR CATÁLOGO DESDE RENDER
// ----------------------------------------------------
async function cargarCatalogo() {
    try {
        if (loadingState) loadingState.classList.remove('hidden');
        
        const response = await fetch(`${API_URL}/licores`);
        if (!response.ok) throw new Error('No se pudo conectar con la cava.');

        licoresGlobales = await response.json();
        renderizarLicores(licoresGlobales);

    } catch (error) {
        if (liquorGrid) {
            liquorGrid.innerHTML = `
                <div class="col-span-full text-center py-10 bg-stone-900/80 border border-red-900/50 rounded p-6">
                    <p class="text-red-400 font-heavy text-lg">⚠️ ERROR AL CARGAR LA CAVA</p>
                    <p class="text-xs text-stone-400 mt-1">${error.message}</p>
                </div>
            `;
        }
    } finally {
        if (loadingState) loadingState.classList.add('hidden');
    }
}

function renderizarLicores(lista) {
    if (!liquorGrid) return;

    if (totalItemsText) {
        totalItemsText.textContent = `${lista.length} producto(s) en existencia`;
    }

    if (lista.length === 0) {
        liquorGrid.innerHTML = `
            <div class="col-span-full text-center py-12 text-stone-500 font-heavy uppercase tracking-widest text-sm">
                No se encontraron destilados que coincidan con la búsqueda.
            </div>
        `;
        return;
    }

    const userData = JSON.parse(localStorage.getItem('userData')) || {};
    const userRole = userData.rol || 'cliente';

    liquorGrid.innerHTML = lista.map(licor => {
        // Imagen por defecto si no existe en Cloudinary
        const imagenUrl = licor.imagen_url || 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?q=80&w=400';
        
        return `
            <div class="bg-barrel-card border border-barrel-border rounded-sm overflow-hidden flex flex-col justify-between hover:border-caterpillar-gold/50 transition-all duration-300 group shadow-xl">
                <div>
                    <div class="relative h-56 bg-stone-950/80 p-4 flex items-center justify-center overflow-hidden">
                        <img src="${imagenUrl}" alt="${licor.nombre}" class="h-48 object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)]">
                        <span class="absolute top-2 left-2 bg-stone-900/90 border border-barrel-border text-caterpillar-gold text-[10px] font-heavy uppercase px-2 py-0.5 rounded-sm">
                            ${licor.categoria || 'Destilado'}
                        </span>
                    </div>

                    <div class="p-4 space-y-2">
                        <h3 class="font-heavy text-lg text-white uppercase tracking-wide group-hover:text-caterpillar-gold transition-colors">
                            ${licor.nombre}
                        </h3>
                        <p class="text-xs text-raw-steel line-clamp-2 leading-relaxed">
                            ${licor.descripcion || 'Sin descripción disponible.'}
                        </p>
                    </div>
                </div>

                <div class="p-4 pt-0 space-y-3">
                    <div class="flex justify-between items-end border-t border-barrel-border/50 pt-3">
                        <div>
                            <p class="text-[10px] text-raw-steel uppercase font-bold">Precio Socio</p>
                            <p class="font-heavy text-xl text-caterpillar-gold">$${parseFloat(licor.precio).toFixed(2)}</p>
                        </div>
                        <span class="text-[10px] ${licor.stock > 0 ? 'text-emerald-400' : 'text-red-400'} font-semibold">
                            ${licor.stock > 0 ? `Stock: ${licor.stock}` : 'Agotado'}
                        </span>
                    </div>

                    <button class="w-full bg-stone-800 hover:bg-caterpillar-gold hover:text-black text-caterpillar-gold border border-caterpillar-gold/30 hover:border-caterpillar-gold font-heavy text-xs uppercase py-2.5 rounded-sm transition-all flex items-center justify-center gap-2">
                        <span>Añadir a Carretilla</span>
                    </button>

                    ${(userRole === 'admin' || userRole === 'supervisor') ? `
                        <div class="flex gap-2 pt-1 border-t border-stone-800">
                            <button class="w-1/2 bg-stone-900 hover:bg-stone-800 text-stone-300 text-[10px] font-heavy uppercase py-1 border border-stone-700 rounded-sm">✏️ Editar</button>
                            ${userRole === 'admin' ? `
                                <button class="w-1/2 bg-red-950/40 hover:bg-red-900/60 text-red-400 text-[10px] font-heavy uppercase py-1 border border-red-900/50 rounded-sm">🗑️ Eliminar</button>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Búsqueda en vivo
inputSearch?.addEventListener('input', (e) => {
    const termino = e.target.value.toLowerCase();
    const filtrados = licoresGlobales.filter(l => 
        l.nombre.toLowerCase().includes(termino) || 
        (l.categoria && l.categoria.toLowerCase().includes(termino))
    );
    renderizarLicores(filtrados);
});


// ----------------------------------------------------
// REGISTRO DE USUARIOS
// ----------------------------------------------------
document.getElementById('form-register')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('reg-nombre').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Error al completar el registro.');
        }

        modalRegister.classList.add('hidden');
        e.target.reset();
        mostrarNotificacionExito(`¡Registro exitoso! Bienvenido, ${data.nombre || nombre}.`);

    } catch (error) {
        mostrarNotificacionError(error.message);
    }
});


// ----------------------------------------------------
// INICIO DE SESIÓN CON JWT Y MANEJO DE ROLES (RBAC)
// ----------------------------------------------------
document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    let errorBox = document.getElementById('modal-login-error');
    if (!errorBox) {
        errorBox = document.createElement('p');
        errorBox.id = 'modal-login-error';
        errorBox.className = 'text-red-500 text-xs text-center font-semibold mb-3 hidden transition-all';
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) e.target.insertBefore(errorBox, submitBtn);
        else e.target.appendChild(errorBox);
    }

    errorBox.classList.add('hidden');
    errorBox.textContent = '';

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const mensaje = (response.status === 401)
                ? 'Correo o contraseña incorrectos.'
                : (data.detail || 'Error al iniciar sesión.');
            throw new Error(mensaje);
        }

        // GUARDAR DATOS EN LOCALSTORAGE SEGÚN LA RESPUESTA DE FASTAPI
        if (data.access_token) {
            localStorage.setItem('authToken', data.access_token);
        }
        
        const nombreUsuario = email.split('@')[0];
        const rolUsuario = data.rol || 'cliente'; // Capturamos 'admin', 'supervisor' o 'cliente'

        localStorage.setItem('userData', JSON.stringify({
            email: email,
            nombre: nombreUsuario,
            rol: rolUsuario
        }));

        modalLogin.classList.add('hidden');
        e.target.reset();

        actualizarEstadoSesion();
        cargarCatalogo(); // Recargar catálogo para actualizar la UI según permisos del rol
        mostrarNotificacionExito(`¡Bienvenido de nuevo, ${nombreUsuario}! (Rol: ${rolUsuario.toUpperCase()})`);

    } catch (error) {
        errorBox.textContent = `⚠️ ${error.message}`;
        errorBox.classList.remove('hidden');
    }
});


// ----------------------------------------------------
// GESTIÓN DEL ESTADO DE LA SESIÓN EN EL FRONTEND
// ----------------------------------------------------
function actualizarEstadoSesion() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    const btnLogin = document.getElementById('btn-open-login');
    const btnRegister = document.getElementById('btn-open-register');

    if (userData) {
        if (btnLogin) {
            btnLogin.outerHTML = `
                <div class="relative inline-block text-left" id="user-menu-wrapper">
                    <button id="btn-user-dropdown" class="flex items-center gap-2 text-caterpillar-gold font-heavy text-xs uppercase px-3 py-1.5 bg-stone-900 border border-caterpillar-gold/30 rounded-sm hover:border-caterpillar-gold transition-colors focus:outline-none">
                        <span>👤 ${userData.nombre}</span>
                        <span class="text-[10px] bg-caterpillar-gold/20 text-caterpillar-gold px-1.5 py-0.5 rounded border border-caterpillar-gold/40">${userData.rol.toUpperCase()}</span>
                        <span class="text-[10px]">▼</span>
                    </button>
                    
                    <div id="user-dropdown-menu" class="hidden absolute right-0 mt-2 w-48 bg-stone-900 border border-stone-800 rounded shadow-xl z-50 py-1">
                        <div class="px-4 py-2 border-b border-stone-800">
                            <p class="text-[10px] text-stone-400 uppercase font-bold">Sesión Activa (${userData.rol})</p>
                            <p class="text-xs text-stone-200 truncate font-mono">${userData.email}</p>
                        </div>
                        <button id="btn-logout" class="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-stone-800 hover:text-red-300 transition-colors">
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            `;

            const dropdownBtn = document.getElementById('btn-user-dropdown');
            const dropdownMenu = document.getElementById('user-dropdown-menu');

            dropdownBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownMenu?.classList.toggle('hidden');
            });

            window.addEventListener('click', () => {
                if (!dropdownMenu?.classList.contains('hidden')) {
                    dropdownMenu?.classList.add('hidden');
                }
            });

            document.getElementById('btn-logout')?.addEventListener('click', cerrarSesion);
        }
        if (btnRegister) btnRegister.style.display = 'none';
    }
}

// Función para Cerrar Sesión
function cerrarSesion() {
    localStorage.removeItem('userData');
    localStorage.removeItem('authToken');
    mostrarNotificacionExito('Has cerrado sesión correctamente.');
    
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// Comprobar la sesión y cargar productos al inicio
document.addEventListener('DOMContentLoaded', () => {
    actualizarEstadoSesion();
    cargarCatalogo();
});

// Tecla ESC y cierres de modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        modalRegister?.classList.add('hidden');
        modalLogin?.classList.add('hidden');
        modalCart?.classList.add('hidden');
    }
});

window.addEventListener('click', (e) => {
    if (e.target === modalRegister) modalRegister.classList.add('hidden');
    if (e.target === modalLogin) modalLogin.classList.add('hidden');
    if (e.target === modalCart) modalCart.classList.add('hidden');
});

// Notificaciones Toast
function mostrarNotificacionExito(mensaje) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-5 right-5 z-50 bg-stone-900 border border-caterpillar-gold text-caterpillar-gold px-4 py-3 rounded shadow-lg text-sm font-semibold transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2';
    toast.innerHTML = `<span>✓</span> <span>${mensaje}</span>`;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('opacity-0', '-translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function mostrarNotificacionError(mensaje) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-5 right-5 z-50 bg-stone-900 border border-red-500 text-red-400 px-4 py-3 rounded shadow-lg text-sm font-semibold transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2';
    toast.innerHTML = `<span>⚠️</span> <span>${mensaje}</span>`;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('opacity-0', '-translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}