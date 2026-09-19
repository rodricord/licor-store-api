// URL de tu Backend alojado en Render (Asegúrate de cambiarla por tu dominio real)
const API_URL = "https://tu-backend-likorkeller.onrender.com";

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

        alert(`¡Registro exitoso! Bienvenido a Likörkeller, ${data.usuario.nombre}.`);
        modalRegister.classList.add('hidden');
        e.target.reset();

    } catch (error) {
        alert(`⚠️ ${error.message}`);
    }
});

// ----------------------------------------------------
// INICIO DE SESIÓN
// ----------------------------------------------------
document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Credenciales inválidas.');
        }

        // Guardar sesión en el navegador
        if (data.token) {
            localStorage.setItem('authToken', data.token);
        }
        localStorage.setItem('userData', JSON.stringify(data.usuario));

        alert(`¡Bienvenido de nuevo, ${data.usuario.nombre || 'Socio'}!`);
        modalLogin.classList.add('hidden');
        e.target.reset();

        // Actualizar la interfaz para reflejar que la sesión está activa
        actualizarEstadoSesion();

    } catch (error) {
        alert(`⚠️ ${error.message}`);
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
        // Ocultar botones de acceso y mostrar el nombre del socio
        if (btnLogin) btnLogin.outerHTML = `<span class="text-caterpillar-gold font-heavy text-xs uppercase px-2 py-1 bg-stone-900 border border-caterpillar-gold/30 rounded-sm">👤 ${userData.nombre}</span>`;
        if (btnRegister) btnRegister.style.display = 'none';
    }
}

// Comprobar la sesión al cargar la página
document.addEventListener('DOMContentLoaded', actualizarEstadoSesion);