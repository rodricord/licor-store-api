// URL de tu Backend alojado en Render
const API_URL = "https://licor-store-api.onrender.com";

// Referencias a las modales
const modalLogin = document.getElementById('modal-login');
const modalRegister = document.getElementById('modal-register');

// Abrir y Cerrar Modales
document.getElementById('btn-open-login')?.addEventListener('click', () => modalLogin.classList.remove('hidden'));
document.getElementById('btn-close-login')?.addEventListener('click', () => modalLogin.classList.add('hidden'));

document.getElementById('btn-open-register')?.addEventListener('click', () => modalRegister.classList.remove('hidden'));
document.getElementById('btn-close-register')?.addEventListener('click', () => modalRegister.classList.add('hidden'));

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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Error al completar el registro.');
        }

        const nombreRegistrado = data.nombre || data.usuario?.nombre || nombre;

        modalRegister.classList.add('hidden');
        e.target.reset();
        mostrarNotificacionExito(`¡Registro exitoso! Bienvenido, ${nombreRegistrado}.`);

    } catch (error) {
        mostrarNotificacionError(error.message);
    }
});


// ----------------------------------------------------
// INICIO DE SESIÓN
// ----------------------------------------------------
document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const email = emailInput.value;
    const password = passwordInput.value;

    // Buscar o crear el contenedor de error dentro del modal
    let errorBox = document.getElementById('modal-login-error');
    if (!errorBox) {
        errorBox = document.createElement('p');
        errorBox.id = 'modal-login-error';
        errorBox.className = 'text-red-500 text-xs text-center font-semibold mb-3 hidden transition-all';
        // Insertar justo antes del botón de submit
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            e.target.insertBefore(errorBox, submitBtn);
        } else {
            e.target.appendChild(errorBox);
        }
    }

    // Ocultar mensaje de error previo
    errorBox.classList.add('hidden');
    errorBox.textContent = '';

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            // Manejo de credenciales incorrectas (401 Unauthorized)
            const mensaje = (response.status === 401)
                ? 'Correo o contraseña incorrectos.'
                : (data.detail || data.message || 'Error al iniciar sesión.');
            throw new Error(mensaje);
        }

        const nombreUsuario = data.nombre || data.usuario?.nombre || email.split('@')[0];

        if (data.token) {
            localStorage.setItem('authToken', data.token);
        }
        
        localStorage.setItem('userData', JSON.stringify({
            email: email,
            nombre: nombreUsuario,
            ...(data.usuario || {})
        }));

        modalLogin.classList.add('hidden');
        e.target.reset();

        actualizarEstadoSesion();
        mostrarNotificacionExito(`¡Bienvenido de nuevo, ${nombreUsuario}!`);

    } catch (error) {
        // Mostrar la alerta en rojo dentro del modal
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
                        <span class="text-[10px]">▼</span>
                    </button>
                    
                    <div id="user-dropdown-menu" class="hidden absolute right-0 mt-2 w-44 bg-stone-900 border border-stone-800 rounded shadow-xl z-50 py-1">
                        <div class="px-4 py-2 border-b border-stone-800">
                            <p class="text-[10px] text-stone-400 uppercase font-bold">Socio Activo</p>
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
                dropdownMenu.classList.toggle('hidden');
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

// Comprobar la sesión al cargar la página
document.addEventListener('DOMContentLoaded', actualizarEstadoSesion);

// Cerrar modales al presionar la tecla Escape (ESC)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.getElementById('modal-register')?.classList.add('hidden');
        document.getElementById('modal-login')?.classList.add('hidden');
    }
});

// Cerrar modales al hacer clic en el fondo oscuro
window.addEventListener('click', (e) => {
    const modalRegister = document.getElementById('modal-register');
    const modalLogin = document.getElementById('modal-login');

    if (e.target === modalRegister) modalRegister.classList.add('hidden');
    if (e.target === modalLogin) modalLogin.classList.add('hidden');
});

// ----------------------------------------------------
// NOTIFICACIONES ELEGANTES (TOASTS)
// ----------------------------------------------------
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