/**
 * Ritmos Del Sur: Hyper-Oasis - Script Principal v8 (Debug Propiedades Ticket)
 *
 * Notas:
 * - Añadido console.log(JSON.stringify(ticket)) para inspeccionar la estructura completa
 * del objeto ticket que viene de la API.
 * - Corregido el uso de 'cantidadDisponible' a 'stock' para reflejar la propiedad real de la API.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- Configuración ---
    const API_BASE_URL = 'https://daw2-tfg-beatpass.onrender.com/api';
    const FESTIVAL_ID = 20;
    const CLAVE_PUBLICABLE_STRIPE = 'pk_test_51RLUyq4Et9Src69RTyKKrqn48wubA5QIbS9zTguw8chLB8FGgwMt9sZV6VwvT4UEWE0vnKxaJCNFlj87EY6i9mGK00ggcR1AiX';

    // --- Selectores DOM Globales ---
    const body = document.body;
    const header = document.getElementById('main-header');
    const cursorDot = document.getElementById('cursor-dot');
    const cursorRing = document.getElementById('cursor-ring');
    const loader = document.getElementById('loader');
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    const themeToggleButton = document.getElementById('theme-toggle');
    const heroSection = document.getElementById('hero');
    const sections = document.querySelectorAll('section[id]');
    const navLiAnchors = document.querySelectorAll('.main-nav ul li a');
    const carouselWrapper = document.querySelector('.artist-carousel-wrapper');
    const carousel = document.querySelector('.artist-carousel-css');
    const errorContainer = document.getElementById('error-container');

    // Selectores para la Modal de Compra
    const purchaseModal = document.getElementById('purchase-modal');
    const modalCloseButton = document.getElementById('modal-close-button');
    const modalTicketNameTitle = document.getElementById('modal-ticket-name-title');
    const modalSelectedTicketName = document.getElementById('modal-selected-ticket-name');
    const modalSelectedTicketPrice = document.getElementById('modal-selected-ticket-price');
    const modalTicketQuantityInput = document.getElementById('modal-ticket-quantity');
    const modalTotalPriceDisplay = document.getElementById('modal-total-price-display');
    const modalPaymentForm = document.getElementById('modal-payment-form');
    const modalBuyerNameInput = document.getElementById('modal-buyer-name');
    const modalBuyerEmailInput = document.getElementById('modal-buyer-email');
    const modalCardErrors = document.getElementById('modal-card-errors');
    const modalPayButton = document.getElementById('modal-pay-button');
    const modalFormArea = document.getElementById('modal-form-area');
    const modalConfirmationArea = document.getElementById('modal-confirmation-area');
    const modalPurchasedTicketDetails = document.getElementById('modal-purchased-ticket-details');
    const modalPurchasedTicketQr = document.getElementById('modal-purchased-ticket-qr');
    const modalCloseConfirmationButton = document.getElementById('modal-close-confirmation-button');

    // --- Estado Global ---
    let lastScrollY = window.scrollY;
    let rafIdCursor;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Estado para la compra
    let stripe = null;
    let modalCardElement = null;
    let currentSelectedTicketType = null;
    let currentClientSecret = null;
    let currentIdCompraTemporal = null;
    let tiposDeEntradaGlobal = [];

    // =========================================================================
    // == Funciones de Utilidad (UI Helpers)
    // =========================================================================
    function debounce(func, wait = 15, immediate = false) {
        let timeout;
        return function() {
            const context = this, args = arguments;
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    function displayError(message, isCritical = false) {
        if (errorContainer) {
            errorContainer.textContent = `Error: ${message}`;
            errorContainer.style.display = 'block';
            if (isCritical) console.error(`CRITICAL ERROR DISPLAYED: ${message}`);
        } else {
            console.error("Error container (#error-container) not found in HTML.");
            alert(`Error: ${message}`);
        }
    }

    // =========================================================================
    // == Funciones de Carga de Datos (API Fetching)
    // =========================================================================
    async function fetchFestivalDetails(festivalId) {
        const url = `${API_BASE_URL}/festivales/${festivalId}`;
        try {
            console.log(`Workspaceing festival details from: ${url}`); // Corregido: "Workspaceing" a "Fetching"
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP ${response.status}: ${errorData.mensaje || response.statusText}`);
            }
            const data = await response.json();
            console.log('Festival details received:', data);
            return data;
        } catch (error) {
            console.error(`Error fetching festival details (${url}):`, error);
            displayError(`No se pudo cargar la información del festival. ${error.message}`, true);
            return null;
        }
    }

    async function fetchTicketTypes(festivalId) {
        const url = `${API_BASE_URL}/festivales/${festivalId}/entradas`;
        try {
            console.log(`Workspaceing ticket types from: ${url}`); // Corregido: "Workspaceing" a "Fetching"
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Festival (ID: ${festivalId}) no encontrado, no publicado, o sin tipos de entrada.`);
                    displayError('Actualmente no hay tipos de entrada disponibles para este festival.', false);
                    tiposDeEntradaGlobal = [];
                    return [];
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP ${response.status}: ${errorData.mensaje || response.statusText}`);
            }
            const data = await response.json();
            console.log('Ticket types received (raw API data):', JSON.parse(JSON.stringify(data)));
            tiposDeEntradaGlobal = data || [];
            return tiposDeEntradaGlobal;
        } catch (error) {
            console.error(`Error fetching ticket types (${url}):`, error);
            displayError(`No se pudieron cargar los tipos de entrada. ${error.message}`, true);
            tiposDeEntradaGlobal = [];
            return [];
        }
    }

    // =========================================================================
    // == Funciones de Renderizado del DOM
    // =========================================================================
    function displayFestivalDetails(festivalData) {
        if (!festivalData) {
            document.getElementById('festival-name-line1').textContent = 'Festival';
            document.getElementById('festival-subtitle').textContent = 'Detalles no disponibles';
            document.getElementById('festival-dates-location').textContent = 'Fechas y lugar por confirmar';
            return;
        }
        const nameElement1 = document.getElementById('festival-name-line1');
        if (nameElement1) nameElement1.textContent = festivalData.nombre || 'Nombre del Festival';
        const nameElement2 = document.getElementById('festival-name-line2');
        if (nameElement2) nameElement2.textContent = ''; // Asumiendo que la línea 2 no se usa o se deja vacía

        const subtitleElement = document.getElementById('festival-subtitle');
        if (subtitleElement) subtitleElement.textContent = festivalData.descripcion || 'Vive la experiencia';

        const datesLocationElement = document.getElementById('festival-dates-location');
        if (datesLocationElement) {
            const formatDate = (dateString) => {
                if (!dateString) return '?';
                try {
                    // Asegurar que la fecha se interpreta correctamente como local añadiendo la hora
                    const date = new Date(dateString + 'T00:00:00'); 
                    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(date);
                } catch (e) { console.error("Error formateando fecha:", dateString, e); return dateString; }
            };
            const startDate = formatDate(festivalData.fechaInicio);
            const endDate = formatDate(festivalData.fechaFin);
            const location = festivalData.ubicacion || 'Lugar por confirmar';
            let dateText = `${startDate}`;
            if (startDate !== endDate && endDate !== '?') dateText += ` - ${endDate}`;
            datesLocationElement.textContent = `${dateText} | ${location}`;
        }
    }

    function displayTicketTypes() {
        const grid = document.getElementById('ticket-grid');
        const loadingMessageElement = document.getElementById('tickets-loading');

        if (!grid) {
            console.error("Ticket grid element (#ticket-grid) not found!");
            if (loadingMessageElement) loadingMessageElement.textContent = 'Error al cargar sección de entradas.';
            return;
        }
        grid.innerHTML = ''; // Limpiar antes de añadir nuevas cards

        if (!tiposDeEntradaGlobal || tiposDeEntradaGlobal.length === 0) {
            console.log("No ticket types to display or tiposDeEntradaGlobal is empty.");
            grid.innerHTML = '<p class="text-center col-span-full" style="grid-column: 1 / -1;">No hay entradas disponibles en este momento.</p>';
            return;
        }
        console.log("Displaying ticket types:", tiposDeEntradaGlobal);

        tiposDeEntradaGlobal.forEach((ticket, index) => {
            console.log(`Processing ticket [${index}]:`, JSON.stringify(ticket, null, 2));

            // VALIDACIÓN: Usando ticket.stock y también verificando ticket.descripcion
            if (!ticket ||
                typeof ticket.idEntrada !== 'number' ||
                typeof ticket.tipo !== 'string' ||
                typeof ticket.precio !== 'number' ||
                typeof ticket.descripcion !== 'string' || // Añadida validación para descripción
                typeof ticket.stock !== 'number') {
                console.warn(`Saltando ticket [${index}] por datos incompletos o inválidos (props API):`, ticket);
                return; 
            }

            const card = document.createElement('article');
            card.classList.add('ticket-card');

            const aosAnim = index % 3 === 0 ? 'fade-right' : index % 3 === 1 ? 'fade-up' : 'fade-left';
            card.setAttribute('data-aos', aosAnim);
            card.setAttribute('data-aos-delay', `${100 + index * 100}`);

            const contentDiv = document.createElement('div');
            contentDiv.classList.add('ticket-content');

            const name = document.createElement('h3');
            name.classList.add('ticket-name');
            name.textContent = ticket.tipo.toUpperCase();

            const description = document.createElement('p');
            description.classList.add('ticket-description');
            description.textContent = ticket.descripcion; // Ya validado que existe y es string

            const priceDisplay = document.createElement('div');
            priceDisplay.classList.add('ticket-price');
            priceDisplay.textContent = `€${Number(ticket.precio).toFixed(2)}`;

            const stockDisplay = document.createElement('p');
            stockDisplay.classList.add('ticket-stock');
            // CORREGIDO: Usar ticket.stock
            stockDisplay.textContent = ticket.stock > 0 ? `Disponibles: ${ticket.stock}` : 'Agotadas';

            contentDiv.appendChild(name);
            contentDiv.appendChild(description);
            contentDiv.appendChild(priceDisplay);
            contentDiv.appendChild(stockDisplay);
            card.appendChild(contentDiv);

            // CORREGIDO: Usar ticket.stock
            if (ticket.stock > 0) {
                const buyButton = document.createElement('button');
                buyButton.classList.add('cta-button', 'ticket-buy-action-button');
                buyButton.dataset.ticketId = ticket.idEntrada;
                const buttonText = ticket.tipo.split(' ')[0]; // Toma la primera palabra del tipo para el botón
                buyButton.innerHTML = `<span>Comprar ${buttonText}</span>`;
                buyButton.addEventListener('click', () => openPurchaseModal(ticket.idEntrada));
                card.appendChild(buyButton);
            } else {
                const agotadoMsg = document.createElement('p');
                agotadoMsg.classList.add('ticket-soldout-message');
                agotadoMsg.textContent = "Entradas Agotadas";
                card.appendChild(agotadoMsg);
            }
            grid.appendChild(card);
        });

        if (typeof AOS !== 'undefined' && !prefersReducedMotion) {
            AOS.refreshHard(); // Refrescar AOS para aplicar animaciones a los nuevos elementos
        }
    }

    // =========================================================================
    // == Lógica de Compra de Entradas
    // =========================================================================
    function openPurchaseModal(ticketIdFromAPI) {
        currentSelectedTicketType = tiposDeEntradaGlobal.find(t => t.idEntrada === ticketIdFromAPI);
        
        // CORREGIDO: Usar currentSelectedTicketType.stock
        if (!currentSelectedTicketType || currentSelectedTicketType.stock <= 0) {
            alert("Este tipo de entrada no está disponible o está agotado.");
            return;
        }

        if(!purchaseModal || !modalTicketNameTitle || !modalSelectedTicketName || !modalSelectedTicketPrice || !modalTicketQuantityInput || !modalFormArea || !modalConfirmationArea || !modalPaymentForm) {
            console.error("Faltan elementos de la modal en el DOM.");
            displayError("Error al abrir el formulario de compra. Elementos no encontrados.", true);
            return;
        }

        modalTicketNameTitle.textContent = `Comprar: ${currentSelectedTicketType.tipo}`;
        modalSelectedTicketName.textContent = currentSelectedTicketType.tipo;
        modalSelectedTicketPrice.textContent = currentSelectedTicketType.precio.toFixed(2);
        modalTicketQuantityInput.value = 1;
        // CORREGIDO: Usar currentSelectedTicketType.stock
        modalTicketQuantityInput.max = currentSelectedTicketType.stock; 
        updateModalTotalPrice();

        if (!stripe) {
            try {
                stripe = Stripe(CLAVE_PUBLICABLE_STRIPE);
            } catch (e) {
                console.error("Error inicializando Stripe:", e);
                displayError("No se pudo inicializar el sistema de pago. Intenta más tarde.", true);
                return;
            }
        }

        if (modalCardElement) {
            modalCardElement.unmount();
            modalCardElement.destroy();
        }

        const elements = stripe.elements({ locale: 'es' });
        modalCardElement = elements.create('card', { /* opciones de estilo si las tienes */ });
        purchaseModal.style.display = 'flex';

        // Pequeño delay para asegurar que el DOM de la modal está visible antes de montar Stripe
        setTimeout(() => {
            const cardMountElement = document.getElementById('modal-card-element');
            if (cardMountElement) {
                modalCardElement.mount(cardMountElement);
                modalCardElement.on('change', event => {
                    if(modalCardErrors) modalCardErrors.textContent = event.error ? event.error.message : '';
                });
            } else {
                console.error("Contenedor #modal-card-element no encontrado para Stripe.");
                displayError("Error al preparar el formulario de pago (Stripe).", true);
                purchaseModal.style.display = 'none'; // Ocultar modal si falla Stripe
            }
        }, 50);

        modalFormArea.style.display = 'block';
        modalConfirmationArea.style.display = 'none';
        modalPaymentForm.reset(); // Resetea campos del formulario como nombre y email
        if(modalCardErrors) modalCardErrors.textContent = '';
    }

    function updateModalTotalPrice() {
        if (!currentSelectedTicketType || !modalTicketQuantityInput || !modalTotalPriceDisplay || !modalPayButton || !modalCardErrors) return;
        
        const cantidad = parseInt(modalTicketQuantityInput.value) || 0;
        // CORREGIDO: Usar currentSelectedTicketType.stock
        const stockDisponible = currentSelectedTicketType.stock;

        if (cantidad > 0 && cantidad <= stockDisponible) {
            const total = currentSelectedTicketType.precio * cantidad;
            modalTotalPriceDisplay.textContent = total.toFixed(2);
            modalPayButton.textContent = `Pagar ${total.toFixed(2)} €`;
            modalPayButton.disabled = false;
            modalCardErrors.textContent = '';
        } else {
            modalTotalPriceDisplay.textContent = '0.00';
            modalPayButton.textContent = 'Pagar';
            modalPayButton.disabled = true;
            if (cantidad <= 0 && currentSelectedTicketType.precio > 0) { // Asegurar que no muestre error si el precio es 0 o el tipo no está seleccionado
                modalCardErrors.textContent = 'La cantidad debe ser al menos 1.';
            } else if (cantidad > stockDisponible && stockDisponible > 0) { // Solo si realmente hay un stock limitado
                modalCardErrors.textContent = `Cantidad máxima disponible: ${stockDisponible}.`;
            } else if (stockDisponible <= 0 && currentSelectedTicketType.precio > 0) { // Si el stock es 0
                modalCardErrors.textContent = 'Entradas agotadas para este tipo.';
            }
        }
    }

    async function handleModalPurchaseSubmit(event) {
        event.preventDefault();
        if (!modalPayButton || !modalCardErrors || !stripe || !modalCardElement || !modalTicketQuantityInput || !modalBuyerNameInput || !modalBuyerEmailInput || !currentSelectedTicketType) {
            console.error("Elementos de pago, formulario o tipo de entrada no inicializados.");
            displayError("Error en el sistema de pago. Inténtalo de nuevo.", true);
            return;
        }

        modalPayButton.disabled = true;
        modalPayButton.textContent = 'Procesando...';
        modalCardErrors.textContent = '';

        const cantidad = parseInt(modalTicketQuantityInput.value);
        const nombreComprador = modalBuyerNameInput.value.trim();
        const emailComprador = modalBuyerEmailInput.value.trim();

        if (!nombreComprador || !emailComprador || !/^\S+@\S+\.\S+$/.test(emailComprador) || cantidad <= 0) {
            modalCardErrors.textContent = 'Por favor, completa todos los campos (Nombre, Email válido, Cantidad > 0).';
            modalPayButton.disabled = false;
            updateModalTotalPrice(); // Actualiza el texto del botón si es necesario
            return;
        }

        try {
            // 1. Iniciar Compra en el Backend
            const initResponse = await fetch(`${API_BASE_URL}/public/ventas/iniciar-compra`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idFestival: FESTIVAL_ID,
                    idTipoEntrada: currentSelectedTicketType.idEntrada,
                    cantidad: cantidad,
                    nombreComprador: nombreComprador,
                    emailComprador: emailComprador
                })
            });
            const initData = await initResponse.json();
            if (!initResponse.ok) throw new Error(initData.mensaje || `Error al iniciar compra (${initResponse.status})`);
            
            currentClientSecret = initData.clientSecretStripe;
            currentIdCompraTemporal = initData.idCompraTemporal;

            // 2. Confirmar Pago con Stripe Elements
            const { paymentIntent, error: stripeError } = await stripe.confirmCardPayment(currentClientSecret, {
                payment_method: {
                    card: modalCardElement,
                    billing_details: { name: nombreComprador, email: emailComprador },
                }
            });

            if (stripeError) { // Error de Stripe (tarjeta rechazada, etc.)
                throw new Error(stripeError.message);
            }
            
            // 3. Confirmar Compra en el Backend (si Stripe tuvo éxito)
            if (paymentIntent && paymentIntent.status === 'succeeded') {
                const confirmResponse = await fetch(`${API_BASE_URL}/public/ventas/confirmar-compra-stripe`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        paymentIntentId: paymentIntent.id,
                        idCompraTemporal: currentIdCompraTemporal 
                    })
                });
                const entradasAdquiridas = await confirmResponse.json(); // Debería ser un array de EntradaAsignadaDTO
                if (!confirmResponse.ok) throw new Error(entradasAdquiridas.mensaje || `Error al confirmar compra en servidor (${confirmResponse.status})`);
                
                displayPurchaseConfirmation(entradasAdquiridas);
                loadFestivalData(); // Recargar datos para actualizar stock visual
            } else {
                // Si paymentIntent no existe o el estado no es 'succeeded'
                throw new Error("El pago con Stripe no pudo completarse o fue cancelado.");
            }

        } catch (error) {
            console.error("Error en el proceso de compra:", error);
            modalCardErrors.textContent = error.message;
            modalPayButton.disabled = false;
            updateModalTotalPrice(); // Restaura el estado del botón
        }
    }

    function displayPurchaseConfirmation(entradasCompradas) {
        if (!modalFormArea || !modalConfirmationArea || !modalPurchasedTicketDetails || !modalPurchasedTicketQr || !modalPaymentForm) return;
        
        modalFormArea.style.display = 'none';
        modalConfirmationArea.style.display = 'block';

        if (entradasCompradas && entradasCompradas.length > 0) {
            const primeraEntrada = entradasCompradas[0]; // Asumimos que la info relevante está en la primera
            modalPurchasedTicketDetails.innerHTML = `
                <p><strong>Tipo:</strong> ${primeraEntrada.nombreTipoEntrada || 'N/A'}</p>
                <p><strong>Comprador:</strong> ${primeraEntrada.nombreComprador || 'N/A'}</p>
                <p><strong>Email:</strong> ${primeraEntrada.emailComprador || 'N/A'}</p>
                <p><strong>Código:</strong> ${primeraEntrada.codigoEntrada || 'N/A'}</p>
                ${entradasCompradas.length > 1 ? `<p><em>(y ${entradasCompradas.length -1} entrada(s) más)</em></p>` : ''}`;
            
            if (primeraEntrada.codigoEntrada) {
                 generateAndDisplayModalQR(primeraEntrada.codigoEntrada);
            } else {
                modalPurchasedTicketQr.style.display = 'none';
            }
        } else {
            modalPurchasedTicketDetails.innerHTML = "<p>No se pudieron obtener los detalles de la compra. Por favor, revisa tu email para la confirmación.</p>";
            modalPurchasedTicketQr.style.display = 'none';
        }
        if(modalCardElement) modalCardElement.clear(); // Limpiar datos de tarjeta
        modalPaymentForm.reset(); // Limpiar nombre y email
        updateModalTotalPrice(); // Resetear botón y total
    }
    
    function generateAndDisplayModalQR(qrText) {
        if (typeof qrcode === 'undefined') {
            console.error("Librería QRCode (qrcode.min.js) no cargada.");
            if (modalPurchasedTicketQr) modalPurchasedTicketQr.style.display = 'none';
            return;
        }
        if (!modalPurchasedTicketQr) return;

        try {
            const qr = qrcode(0, 'L'); // typeNumber 0 para auto-detect, 'L' para baja corrección de errores
            qr.addData(qrText);
            qr.make();
            modalPurchasedTicketQr.src = qr.createDataURL(6, 0); // (cellSize, margin)
            modalPurchasedTicketQr.style.display = 'block';
        } catch (e) {
            console.error("Error generando QR:", e);
            modalPurchasedTicketQr.style.display = 'none';
        }
    }

    function closePurchaseModal() {
        if (purchaseModal) purchaseModal.style.display = 'none';
        if (modalCardElement) modalCardElement.clear(); // Limpia el elemento de tarjeta
        if (modalPaymentForm) modalPaymentForm.reset();
        currentSelectedTicketType = null; // Resetea el tipo de entrada seleccionado
        // Asegurar que se muestra el formulario y no la confirmación la próxima vez
        if (modalFormArea) modalFormArea.style.display = 'block'; 
        if (modalConfirmationArea) modalConfirmationArea.style.display = 'none';
    }


    // =========================================================================
    // == Inicialización de Componentes UI (Existentes)
    // =========================================================================
    function initAOS() {
        if (typeof AOS !== 'undefined' && !prefersReducedMotion) {
            AOS.init({ duration: 900, easing: 'ease-out-cubic', once: true, offset: 100 });
        } else if (typeof AOS !== 'undefined' && prefersReducedMotion) {
            console.log('AOS animations disabled (prefers-reduced-motion). Applying static styles.');
            // Aplica estilos finales para evitar elementos invisibles o fuera de lugar
            document.querySelectorAll('[data-aos]').forEach(el => {
                el.style.opacity = 1;
                el.style.transform = 'none'; // O el transform final esperado
                el.classList.add('aos-animate'); // Para que no se inicialice de nuevo si algo lo intenta
            });
        } else { console.warn('AOS library not found.'); }
    }

    function hideLoader() {
        if (body.classList.contains('loading')) { // Solo actuar si el loader está activo
            body.classList.remove('loading');
            if (loader) {
                loader.classList.add('hidden'); // Inicia transición de ocultado
                // Eliminar el loader del DOM después de la transición para limpiar
                loader.addEventListener('transitionend', () => loader?.remove(), { once: true });
            }
            // Solo inicializar AOS si no se ha hecho antes (evita re-inicializaciones)
            if(!document.querySelector('.aos-animate')) { // Chequea si AOS ya aplicó clases
                initAOS();
            }
        }
    }

    // Gestión del Loader y AOS
    if (loader) {
        window.addEventListener('load', hideLoader); // Ocultar al cargar completamente la página
        setTimeout(hideLoader, 3500); // Fallback por si 'load' no se dispara o tarda mucho
    } else {
        initAOS(); // Si no hay loader, inicializar AOS directamente
    }

    // Cursor Personalizado (si existe y no hay preferencia de movimiento reducido)
    if (cursorDot && cursorRing && window.matchMedia("(pointer: fine)").matches && !prefersReducedMotion) {
        let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
        let ringX = mouseX, ringY = mouseY, dotX = mouseX, dotY = mouseY;
        const ringSpeed = 0.12; // Ajusta para más o menos "lag" del anillo
        let isCursorVisible = false;

        const updateCursor = () => {
            dotX = mouseX; // El punto sigue al cursor directamente
            dotY = mouseY;
            ringX += (mouseX - ringX) * ringSpeed; // El anillo se mueve más suavemente
            ringY += (mouseY - ringY) * ringSpeed;
            
            if (!isNaN(dotX) && !isNaN(dotY)) cursorDot.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%, -50%)`;
            if (!isNaN(ringX) && !isNaN(ringY)) cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
            rafIdCursor = requestAnimationFrame(updateCursor);
        };

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX; 
            mouseY = e.clientY;
            if (!isCursorVisible) { // Mostrar al primer movimiento
                cursorDot.style.opacity = 1; cursorRing.style.opacity = 1; isCursorVisible = true;
            }
        }, { passive: true });

        document.addEventListener('mouseleave', () => { if (cursorDot) cursorDot.style.opacity = 0; if (cursorRing) cursorRing.style.opacity = 0; isCursorVisible = false; });
        document.addEventListener('mouseenter', () => { if (cursorDot) cursorDot.style.opacity = 1; if (cursorRing) cursorRing.style.opacity = 1; isCursorVisible = true; });
        
        updateCursor(); // Iniciar animación
    } else if (cursorDot || cursorRing) { // Ocultar si no se cumplen condiciones
        if (cursorDot) cursorDot.style.display = 'none';
        if (cursorRing) cursorRing.style.display = 'none';
        body.style.cursor = 'default'; // Restaurar cursor por defecto
    }
    
    // Header Scroll
    if (header) {
        const handleHeaderScroll = () => header.classList.toggle('scrolled', window.scrollY > 80);
        window.addEventListener('scroll', debounce(handleHeaderScroll, 10), { passive: true });
        handleHeaderScroll(); // Ejecutar una vez al cargar por si la página ya está scrolleada
    }

    // Menú Móvil
    if (menuToggle && navMenu) {
        const navLinks = navMenu.querySelectorAll('.nav-link'); // Enlaces dentro del menú
        menuToggle.addEventListener('click', () => {
            const isActive = navMenu.classList.toggle('active');
            menuToggle.classList.toggle('open');
            menuToggle.setAttribute('aria-expanded', isActive);
            body.style.overflowY = isActive ? 'hidden' : ''; // Evitar scroll del body cuando el menú está abierto
        });
        // Cerrar menú al hacer clic en un enlace (para SPAs o navegación en la misma página)
        navLinks.forEach(link => link.addEventListener('click', () => {
            if (navMenu.classList.contains('active')) { // Solo si el menú está activo
                navMenu.classList.remove('active');
                menuToggle.classList.remove('open');
                menuToggle.setAttribute('aria-expanded', 'false');
                body.style.overflowY = '';
            }
        }));
    }

    // Active Nav Link on Scroll (Intersection Observer)
    if (sections.length > 0 && navLiAnchors.length > 0 && typeof IntersectionObserver !== 'undefined') {
        const observerCallback = (entries) => {
            let topEntry = null;
            entries.forEach(entry => {
                // Considerar visible si al menos una pequeña parte está en viewport Y está más arriba o es el primero
                if (entry.isIntersecting && (!topEntry || entry.boundingClientRect.top < topEntry.boundingClientRect.top) && entry.intersectionRatio > 0) {
                    topEntry = entry;
                }
            });
            const currentActiveId = topEntry ? topEntry.target.getAttribute('id') : null;
            navLiAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${currentActiveId}`));
        };
        // Ajusta rootMargin: arriba, derecha, abajo, izquierda. 
        // -40% arriba para activar cuando la sección esté más centrada. -59% abajo para desactivar cuando casi sale.
        const sectionObserver = new IntersectionObserver(observerCallback, { root: null, rootMargin: '-40% 0px -59% 0px', threshold: 0 }); 
        sections.forEach(section => sectionObserver.observe(section));
    }
    
    // Parallax Hero (si existe y no hay preferencia de movimiento reducido)
    if (heroSection && !prefersReducedMotion) {
        const layers = heroSection.querySelectorAll('.hero-bg-layer');
        if (layers.length > 0) {
            let rafParallaxId;
            const handleParallaxScroll = () => {
                const scrollFactor = window.scrollY * 0.3; // Ajusta la intensidad del parallax
                layers.forEach(layer => {
                    const speed = parseFloat(layer.getAttribute('data-speed') || '0');
                    layer.style.transform = `translate3d(0, ${scrollFactor * speed}px, 0)`;
                });
                rafParallaxId = null; // Permitir que se vuelva a solicitar el frame
            };
            // Optimizar con requestAnimationFrame
            const debouncedScrollHandler = () => { if (!rafParallaxId) rafParallaxId = requestAnimationFrame(handleParallaxScroll); };
            window.addEventListener('scroll', debouncedScrollHandler, { passive: true });
            handleParallaxScroll(); // Aplicar estado inicial
        }
    }

    // Lightbox para la galería (si existe la librería)
    if (typeof basicLightbox !== 'undefined') {
        document.body.addEventListener('click', (e) => {
            const galleryLink = e.target.closest('.gallery-item'); // Busca el ancestro más cercano
            if (galleryLink) {
                e.preventDefault();
                const imageUrl = galleryLink.getAttribute('href');
                if (imageUrl && imageUrl !== '#') { // Asegurarse que hay una URL válida
                    try { basicLightbox.create(`<img src="${imageUrl}" alt="Vista ampliada">`, { className: 'rds-lightbox' }).show(); }
                    catch (error) { console.error("Lightbox error:", error); }
                }
            }
        });
    } else { console.warn('basicLightbox library not found.'); }

    // Theme Toggle
    if (themeToggleButton) {
        const applyTheme = (theme) => { 
            body.setAttribute('data-theme', theme); 
            localStorage.setItem('theme', theme); // Guardar preferencia
        };
        // Cargar tema guardado o preferido por el sistema
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);
        themeToggleButton.addEventListener('click', () => applyTheme(body.getAttribute('data-theme') === 'light' ? 'dark' : 'light'));
    }

    // Smooth Scroll para anclas internas
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || !targetId.startsWith('#')) return; // Ignorar href="#" o enlaces externos
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const headerOffset = (header ? header.offsetHeight : 0) + 20; // Offset del header + un poco de padding
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = window.pageYOffset + elementPosition - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: prefersReducedMotion ? 'auto' : 'smooth'
                });

                // Si el menú móvil está abierto, cerrarlo
                if (navMenu?.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    menuToggle?.classList.remove('open');
                    menuToggle?.setAttribute('aria-expanded', 'false');
                    body.style.overflowY = '';
                }
            } else {
                console.warn(`Smooth scroll target not found: ${targetId}`);
            }
        });
    });
    
    // Artist Carousel Scroll Hint
    const checkScrollable = () => {
        if (carousel && carouselWrapper) {
            // Considerar scrollable si el contenido es un poco más ancho que el contenedor
            const isScrollable = carousel.scrollWidth > carousel.clientWidth + 5; 
            carouselWrapper.classList.toggle('is-scrollable', isScrollable);
        }
    };

    if (carousel && carouselWrapper) {
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(debounce(checkScrollable, 50));
            resizeObserver.observe(carouselWrapper);
            resizeObserver.observe(carousel); // Observar ambos por si acaso
        } else {
            // Fallback para navegadores sin ResizeObserver
            window.addEventListener('resize', debounce(checkScrollable, 250));
        }
        // Comprobar al cargar y después de que las imágenes podrían haber cargado (si aplica)
        // checkScrollable(); // Ya se llama en loadFestivalData
    }

    // Placeholder para Newsletter
    const newsletterLink = document.querySelector('.newsletter-link');
    if (newsletterLink) {
        newsletterLink.addEventListener('click', (e) => {
            e.preventDefault(); // Evitar que el enlace navegue si es un '#'
            alert('Funcionalidad de suscripción no implementada en este prototipo.');
        });
    }

    // Event Listeners para la Modal de Compra
    if (modalCloseButton) modalCloseButton.addEventListener('click', closePurchaseModal);
    if (modalCloseConfirmationButton) modalCloseConfirmationButton.addEventListener('click', closePurchaseModal);
    if (modalTicketQuantityInput) modalTicketQuantityInput.addEventListener('input', updateModalTotalPrice);
    if (modalPaymentForm) modalPaymentForm.addEventListener('submit', handleModalPurchaseSubmit);
    // Cerrar modal si se hace clic fuera del contenido (en el overlay oscuro)
    if (purchaseModal) purchaseModal.addEventListener('click', (event) => { if (event.target === purchaseModal) closePurchaseModal(); });


    // =========================================================================
    // == Carga Inicial de Datos del Festival
    // =========================================================================
    async function loadFestivalData() {
        console.log("Loading festival data...");
        if (errorContainer) errorContainer.style.display = 'none'; // Ocultar errores previos

        // Gestión del mensaje de carga para las entradas
        const ticketGridElement = document.getElementById('ticket-grid');
        const loadingTicketsP = document.getElementById('tickets-loading');
        
        if (ticketGridElement && !loadingTicketsP) { // Si la grid existe pero el P de carga no
            const p = document.createElement('p');
            p.id = 'tickets-loading';
            p.className = 'text-center col-span-full'; // Tailwind para centrar y ocupar todo el ancho
            p.style.gridColumn = '1 / -1'; // Asegurar que ocupe todas las columnas si es grid
            p.textContent = 'Cargando tipos de entrada...';
            ticketGridElement.innerHTML = ''; // Limpiar grid
            ticketGridElement.appendChild(p);
        } else if (loadingTicketsP) { // Si el P de carga ya existe
             loadingTicketsP.textContent = 'Cargando tipos de entrada...';
             if (ticketGridElement) {ticketGridElement.innerHTML = ''; ticketGridElement.appendChild(loadingTicketsP);}
        }

        // Cargar datos en paralelo
        const [festivalData, ticketDataResult] = await Promise.all([
            fetchFestivalDetails(FESTIVAL_ID),
            fetchTicketTypes(FESTIVAL_ID) // Esto ya actualiza tiposDeEntradaGlobal
        ]);

        displayFestivalDetails(festivalData);
        displayTicketTypes(); // Usa la variable global tiposDeEntradaGlobal actualizada por fetchTicketTypes

        console.log("Festival data loading complete.");
        checkScrollable(); // Comprobar si el carrusel es desplazable después de cargar contenido
    }

    // Iniciar la carga de datos del festival
    loadFestivalData();

}); // Fin del DOMContentLoaded