// URL de tu Backend alojado en Render
const API_URL = "https://licor-store-api.onrender.com";

// Configuración de Stripe
const STRIPE_PUBLIC_KEY = "pk_test_51USm4dD6jo0C7QhKYLhydyA5i3YNQgjUz1f8TQR4xJrpUm6aue4YlkDK2sLN8o3BLqVnRbuiGyIgwiKO3C2kdCEB00NltclxK1"; 
let stripe = null;
let cardElement = null;

// Intentar inicializar Stripe
if (window.Stripe) {
    stripe = Stripe(STRIPE_PUBLIC_KEY);
}

// Referencias a los elementos del DOM
const modalLogin = document.getElementById('modal-login');
const modalRegister = document.getElementById('modal-register');
const modalCart = document.getElementById('modal-cart');
const modalCheckout = document.getElementById('modal-checkout');
const modalSuccess = document.getElementById('payment-success-modal');
const modalImagePreview = document.getElementById('modal-image-preview');
const liquorGrid = document.getElementById('liquor-grid');
const loadingState = document.getElementById('loading-state');
const totalItemsText = document.getElementById('total-items');
const inputSearch = document.getElementById('input-search');

// Estado global de la aplicación
let licoresGlobales = []; 
let carrito = JSON.parse(localStorage.getItem('carritoLicores')) || [];

// ----------------------------------------------------
// MANEJO DE MODALES Y NAVEGACIÓN
// ----------------------------------------------------
document.getElementById('btn-open-login')?.addEventListener('click', () => modalLogin?.classList.remove('hidden'));
document.getElementById('btn-close-login')?.addEventListener('click', () => modalLogin?.classList.add('hidden'));

document.getElementById('btn-open-register')?.addEventListener('click', () => modalRegister?.classList.remove('hidden'));
document.getElementById('btn-close-register')?.addEventListener('click', () => modalRegister?.classList.add('hidden'));

document.getElementById('btn-cart')?.addEventListener('click', () => {
    renderizarCarrito();
    modalCart?.classList.remove('hidden');
});
document.getElementById('btn-close-cart')?.addEventListener('click', () => modalCart?.classList.add('hidden'));

document.getElementById('btn-close-checkout')?.addEventListener('click', () => modalCheckout?.classList.add('hidden'));

// Evento Cerrar Modal de Comprobante Exitoso
document.getElementById('close-success-modal-btn')?.addEventListener('click', () => {
    modalSuccess?.classList.add('hidden');
});

// Evento Cerrar Modal de Vista Previa
document.getElementById('btn-close-image-preview')?.addEventListener('click', cerrarVistaPreviaImagen);

// ----------------------------------------------------
// VISTA PREVIA ANIMADA DE IMAGEN (LIGHTBOX)
// ----------------------------------------------------
window.abrirVistaPreviaImagen = function(licorId) {
    const licor = licoresGlobales.find(l => l.id === licorId);
    if (!licor || !modalImagePreview) return;

    const modalPreviewCard = document.getElementById('modal-preview-card');
    const imgElement = document.getElementById('preview-modal-img');
    const titleElement = document.getElementById('preview-modal-title');
    const categoryElement = document.getElementById('preview-modal-category');
    const priceElement = document.getElementById('preview-modal-price');

    if (imgElement) imgElement.src = licor.imagen_url || 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?q=80&w=400';
    if (titleElement) titleElement.textContent = licor.nombre;
    if (categoryElement) categoryElement.textContent = licor.categoria || 'Destilado';
    if (priceElement) priceElement.textContent = `$${parseFloat(licor.precio).toFixed(2)}`;

    modalImagePreview.classList.remove('hidden');

    requestAnimationFrame(() => {
        modalImagePreview.classList.remove('opacity-0');
        modalImagePreview.classList.add('opacity-100');
        
        if (modalPreviewCard) {
            modalPreviewCard.classList.remove('scale-90', 'opacity-0');
            modalPreviewCard.classList.add('scale-100', 'opacity-100');
        }
    });
};

function cerrarVistaPreviaImagen() {
    if (!modalImagePreview) return;
    const modalPreviewCard = document.getElementById('modal-preview-card');

    modalImagePreview.classList.remove('opacity-100');
    modalImagePreview.classList.add('opacity-0');
    
    if (modalPreviewCard) {
        modalPreviewCard.classList.remove('scale-100', 'opacity-100');
        modalPreviewCard.classList.add('scale-90', 'opacity-0');
    }

    setTimeout(() => {
        modalImagePreview.classList.add('hidden');
    }, 300);
}

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
        const imagenUrl = licor.imagen_url || 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?q=80&w=400';
        
        return `
            <div class="bg-barrel-card/80 backdrop-blur-sm border border-barrel-border rounded-sm overflow-hidden flex flex-col justify-between hover:border-caterpillar-gold/50 transition-all duration-300 group shadow-xl">
                <div>
                    <div onclick="abrirVistaPreviaImagen(${licor.id})" class="relative h-56 bg-stone-900/20 backdrop-blur-xs p-4 flex items-center justify-center overflow-hidden border-b border-stone-700/40 cursor-pointer group-hover:bg-stone-900/40 transition-all" title="Haz clic para ampliar la imagen">
                        <img src="${imagenUrl}" alt="${licor.nombre}" class="h-48 object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)]">
                        <span class="absolute top-2 left-2 bg-stone-900/80 backdrop-blur-md border border-barrel-border text-caterpillar-gold text-[10px] font-heavy uppercase px-2 py-0.5 rounded-sm">
                            ${licor.categoria || 'Destilado'}
                        </span>
                        <span class="absolute bottom-2 right-2 bg-stone-950/80 text-stone-400 group-hover:text-caterpillar-gold text-[10px] px-1.5 py-0.5 rounded border border-stone-800 transition-colors">
                            🔍 Ampliar
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

                    <button onclick="agregarAlCarrito(${licor.id})" ${licor.stock <= 0 ? 'disabled' : ''} class="w-full bg-stone-800/80 hover:bg-caterpillar-gold hover:text-black text-caterpillar-gold border border-caterpillar-gold/30 hover:border-caterpillar-gold font-heavy text-xs uppercase py-2.5 rounded-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <span>${licor.stock > 0 ? 'Añadir a Carretilla' : 'Agotado'}</span>
                    </button>

                    ${(userRole === 'admin' || userRole === 'supervisor') ? `
                        <div class="flex gap-2 pt-1 border-t border-stone-800">
                            <button class="w-1/2 bg-stone-900/80 hover:bg-stone-800 text-stone-300 text-[10px] font-heavy uppercase py-1 border border-stone-700 rounded-sm">✏️ Editar</button>
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

// Búsqueda en vivo con contador dinámico
inputSearch?.addEventListener('input', (e) => {
    const termino = e.target.value.trim().toLowerCase();
    
    if (termino === '') {
        if (totalItemsText) totalItemsText.textContent = '';
        renderizarLicores(licoresGlobales);
        return;
    }

    const filtrados = licoresGlobales.filter(l => 
        l.nombre.toLowerCase().includes(termino) || 
        (l.categoria && l.categoria.toLowerCase().includes(termino))
    );

    if (totalItemsText) {
        const total = filtrados.length;
        totalItemsText.textContent = total === 1 ? `1 producto encontrado` : `${total} productos encontrados`;
    }

    renderizarLicores(filtrados);
});

// ----------------------------------------------------
// LÓGICA DE LA CARRETILLA DE COMPRAS
// ----------------------------------------------------
function agregarAlCarrito(licorId) {
    const producto = licoresGlobales.find(l => l.id === licorId);
    if (!producto) return;

    const itemEnCarrito = carrito.find(item => item.id === licorId);

    if (itemEnCarrito) {
        if (itemEnCarrito.cantidad < producto.stock) {
            itemEnCarrito.cantidad++;
        } else {
            alert(`Límite alcanzado: solo hay ${producto.stock} unidades en stock.`);
            return;
        }
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: parseFloat(producto.precio),
            imagen_url: producto.imagen_url,
            stock: producto.stock,
            cantidad: 1
        });
    }

    guardarYActualizarCarrito();
}

function cambiarCantidad(licorId, delta) {
    const item = carrito.find(i => i.id === licorId);
    if (!item) return;

    const nuevaCantidad = item.cantidad + delta;

    if (nuevaCantidad > item.stock) {
        alert(`Solo hay ${item.stock} disponibles en existencia.`);
        return;
    }

    if (nuevaCantidad <= 0) {
        eliminarDelCarrito(licorId);
        return;
    }

    item.cantidad = nuevaCantidad;
    guardarYActualizarCarrito();
    renderizarCarrito();
}

function eliminarDelCarrito(licorId) {
    carrito = carrito.filter(item => item.id !== licorId);
    guardarYActualizarCarrito();
    renderizarCarrito();
}

function guardarYActualizarCarrito() {
    localStorage.setItem('carritoLicores', JSON.stringify(carrito));
    actualizarContadorCarrito();
}

function actualizarContadorCarrito() {
    const cartCount = document.getElementById('cart-count');
    const totalUnidades = carrito.reduce((acc, item) => acc + item.cantidad, 0);

    if (cartCount) {
        cartCount.textContent = totalUnidades;
    }
}

function calcularTotalCarrito() {
    return carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
}

function renderizarCarrito() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');

    if (!cartItemsContainer) return;

    if (carrito.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="text-center py-8 text-raw-steel">
                <p class="font-heavy uppercase text-sm">Tu carretilla está vacía.</p>
            </div>
        `;
        if (cartTotalElement) cartTotalElement.textContent = '$0.00';
        return;
    }

    cartItemsContainer.innerHTML = carrito.map(item => `
        <div class="flex items-center justify-between bg-stone-950 p-3 rounded border border-stone-800">
            <div class="flex items-center space-x-3">
                <img src="${item.imagen_url || 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?q=80&w=400'}" class="w-12 h-12 object-contain bg-stone-900 rounded">
                <div>
                    <h4 class="font-heavy text-white text-sm uppercase">${item.nombre}</h4>
                    <p class="text-caterpillar-gold text-xs font-heavy">$${item.precio.toFixed(2)}</p>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <button onclick="cambiarCantidad(${item.id}, -1)" class="px-2 py-0.5 bg-stone-800 text-white rounded text-xs font-bold hover:bg-stone-700">-</button>
                <span class="text-xs text-white font-heavy px-1">${item.cantidad}</span>
                <button onclick="cambiarCantidad(${item.id}, 1)" class="px-2 py-0.5 bg-stone-800 text-white rounded text-xs font-bold hover:bg-stone-700">+</button>
                <button onclick="eliminarDelCarrito(${item.id})" class="text-red-400 hover:text-red-300 text-xs ml-2 font-bold">✕</button>
            </div>
        </div>
    `).join('');

    if (cartTotalElement) {
        cartTotalElement.textContent = `$${calcularTotalCarrito().toFixed(2)}`;
    }
}

// ----------------------------------------------------
// INTEGRACIÓN DE CHECKOUT CON STRIPE
// ----------------------------------------------------
document.getElementById('btn-checkout')?.addEventListener('click', () => {
    if (carrito.length === 0) {
        alert("Agrega al menos un producto a la carretilla.");
        return;
    }

    modalCart?.classList.add('hidden');
    modalCheckout?.classList.remove('hidden');

    const total = calcularTotalCarrito();
    document.getElementById('checkout-total-display').textContent = `$${total.toFixed(2)}`;

    inicializarStripeCardElement();
});

function inicializarStripeCardElement() {
    if (!stripe) {
        console.error("Stripe.js no está cargado.");
        return;
    }

    const elements = stripe.elements();
    
    if (cardElement) {
        cardElement.destroy();
    }

    const style = {
        base: {
            color: "#ffffff",
            fontFamily: "Inter, sans-serif",
            fontSmoothing: "antialiased",
            fontSize: "14px",
            "::placeholder": {
                color: "#a1a1aa"
            }
        },
        invalid: {
            color: "#f87171",
            iconColor: "#f87171"
        }
    };

    cardElement = elements.create("card", { style: style, hidePostalCode: true });
    cardElement.mount("#card-element");

    cardElement.on('change', (event) => {
        const displayError = document.getElementById('card-errors');
        if (event.error) {
            displayError.textContent = event.error.message;
            displayError.classList.remove('hidden');
        } else {
            displayError.textContent = '';
            displayError.classList.add('hidden');
        }
    });
}

// Envío del Pago al Backend
document.getElementById('payment-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btnSubmit = document.getElementById('btn-pay-submit');
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Procesando...";

    const montoTotal = calcularTotalCarrito();

    try {
        // 1. Petición al endpoint en Render para crear el Payment Intent
        const res = await fetch(`${API_URL}/api/checkout/create-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monto: montoTotal })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error creando el intento de pago");

        // 2. Confirmación con Stripe JS SDK
        const result = await stripe.confirmCardPayment(data.clientSecret, {
            payment_method: {
                card: cardElement
            }
        });

        if (result.error) {
            const displayError = document.getElementById('card-errors');
            displayError.textContent = result.error.message;
            displayError.classList.remove('hidden');
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Pagar con Tarjeta";
        } else {
            if (result.paymentIntent.status === 'succeeded') {

                // 3. Registrar el pedido en Supabase a través del backend
                try {
                    await fetch(`${API_URL}/api/checkout/guardar-pedido`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            payment_intent_id: result.paymentIntent.id,
                            monto: montoTotal
                        })
                    });
                    console.log("Pedido guardado exitosamente en Supabase.");
                } catch (dbError) {
                    console.error("Error guardando el pedido en Supabase:", dbError);
                }

                // Ocultar modal de checkout
                modalCheckout?.classList.add('hidden');

                // Inyectar valores dinámicos en el Comprobante Estético
                const receiptTotal = document.getElementById('receipt-total');
                const receiptId = document.getElementById('receipt-id');

                if (receiptTotal) receiptTotal.textContent = `$${montoTotal.toFixed(2)}`;
                if (receiptId) receiptId.textContent = result.paymentIntent.id;

                // Vaciar carrito
                carrito = [];
                guardarYActualizarCarrito();

                // Mostrar modal de comprobante de éxito
                modalSuccess?.classList.remove('hidden');
            }
        }
    } catch (err) {
        alert(`Error al procesar la transacción: ${err.message}`);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Pagar con Tarjeta";
    }
});

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    cargarCatalogo();
    actualizarContadorCarrito();
});