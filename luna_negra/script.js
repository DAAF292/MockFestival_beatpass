/**
 * Luna Negra Fest: Forja de Leyendas - Script Principal
 * Basado en script.js de Ritmos Del Sur, adaptado para LNF.
 *
 * Funcionalidad Principal:
 * - Carga dinámica de detalles del festival y tipos de entrada desde la API.
 * - Integración con Stripe para el proceso de compra de entradas.
 * - Efectos visuales y animaciones (AOS, cursor personalizado, etc.).
 * - Gestión del tema (aunque para LNF podría ser un tema oscuro fijo).
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- Configuración LNF ---
    const API_BASE_URL = 'https://daw2-tfg-beatpass.onrender.com/api'; // Mantener o ajustar si es necesario
    //const API_BASE_URL = 'http://localhost:8080/BeatpassTFG/api'; // Para desarrollo local
    const FESTIVAL_ID = 19; // <<< CAMBIO PRINCIPAL: ID para Luna Negra Fest
    const CLAVE_PUBLICABLE_STRIPE = 'pk_test_51RLUyq4Et9Src69RTyKKrqn48wubA5QIbS9zTguw8chLB8FGgwMt9sZV6VwvT4UEWE0vnKxaJCNFlj87EY6i9mGK00ggcR1AiX'; // Mantener tu clave de Stripe

    // --- Selectores DOM Globales LNF (adaptados con -lnf) ---
    const body = document.body;
    const header = document.getElementById('main-header-lnf');
    const cursorDot = document.getElementById('cursor-dot'); // Se puede mantener si el efecto es global
    const cursorRing = document.getElementById('cursor-ring'); // o crear unos -lnf si son muy diferentes
    const loader = document.getElementById('lnf-loader'); // Loader específico LNF
    const menuToggle = document.getElementById('menu-toggle-lnf');
    const navMenu = document.getElementById('nav-menu-lnf');
    // const themeToggleButton = document.getElementById('theme-toggle-lnf'); // Si LNF tiene su propio toggle
    const heroSection = document.getElementById('hero-lnf');
    const sections = document.querySelectorAll('section[id$="-lnf"]'); // Seleccionar secciones con sufijo -lnf
    const navLiAnchors = document.querySelectorAll('.main-nav-lnf ul li a');

    const errorContainer = document.getElementById('error-container-lnf');

    // Modal de Compra LNF
    const purchaseModal = document.getElementById('purchase-modal'); // ID base del modal (estructura)
    const modalContent = document.querySelector('.purchase-modal-content-lnf'); // Clase para estilo
    const modalCloseButton = document.querySelector('.modal-close-button-lnf');
    const modalTicketNameTitle = document.getElementById('modal-ticket-name-title'); // Reutilizar ID si el contenido se actualiza
    const modalSelectedTicketName = document.getElementById('modal-selected-ticket-name');
    const modalSelectedTicketPrice = document.getElementById('modal-selected-ticket-price');
    const modalTicketQuantityInput = document.getElementById('modal-ticket-quantity');
    const modalTotalPriceDisplay = document.getElementById('modal-total-price-display');
    const modalPaymentForm = document.getElementById('modal-payment-form'); // El form puede tener ID genérico
    const modalBuyerNameInput = document.getElementById('modal-buyer-name');
    const modalBuyerEmailInput = document.getElementById('modal-buyer-email');
    const modalBuyerEmailConfirmInput = document.getElementById('modal-buyer-email-confirm');
    const modalCardElementContainer = document.getElementById('modal-card-element'); // Contenedor para el input de Stripe
    const modalCardErrors = document.getElementById('modal-card-errors'); // Para errores de Stripe
    const modalPayButton = document.getElementById('modal-pay-button'); // El botón de pagar
    const modalFormArea = document.getElementById('modal-form-area');
    const modalConfirmationArea = document.getElementById('modal-confirmation-area');
    const modalPurchasedTicketDetails = document.getElementById('modal-purchased-ticket-details');
    const modalPurchasedTicketQr = document.getElementById('modal-purchased-ticket-qr');
    const modalCloseConfirmationButton = document.querySelector('#modal-confirmation-area .cta-button-lnf.secondary');


    // --- Estado Global ---
    let rafIdCursor;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stripe = null;
    let modalCardElement = null; // Elemento de tarjeta de Stripe
    let currentSelectedTicketType = null; // Para el modal de compra
    let tiposDeEntradaGlobalLNF = []; // Almacenará los tipos de entrada para LNF

    // =========================================================================
    // == Funciones de Utilidad (UI Helpers) - Adaptadas o Reutilizadas
    // =========================================================================
    function debounce(func, wait = 15, immediate = false) {
        let timeout;
        return function () {
            const context = this, args = arguments;
            const later = function () { timeout = null; if (!immediate) func.apply(context, args); };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    function displayLNFError(message, isCritical = false) {
        if (errorContainer) {
            errorContainer.textContent = `ERROR LNF: ${message}`;
            errorContainer.style.display = 'block';
            if (isCritical) console.error(`CRITICAL LNF ERROR: ${message}`);
        } else {
            console.error("Contenedor de error LNF no encontrado.");
            alert(`Error LNF: ${message}`);
        }
    }

    // =========================================================================
    // == Funciones de Carga de Datos (API Fetching) - Reutilizables
    // =========================================================================
    async function fetchLNFData(urlPath) {
        const url = `${API_BASE_URL}${urlPath}`;
        try {
            console.log(`LNF: Fetching data from: ${url}`);
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP ${response.status}: ${errorData.mensaje || errorData.error || response.statusText}`);
            }
            const data = await response.json();
            console.log(`LNF: Data received for ${urlPath}:`, data);
            return data;
        } catch (error) {
            console.error(`LNF: Error fetching ${urlPath}:`, error);
            displayLNFError(`No se pudo cargar datos para ${urlPath.split('/').pop()}. ${error.message}`, true);
            return null;
        }
    }

    // =========================================================================
    // == Funciones de Renderizado del DOM para LNF
    // =========================================================================
    function displayLNFDetails(festivalData) {
        const nameElement1 = document.getElementById('festival-name-line1'); // Asume que el ID se mantiene o adapta
        const subtitleElement = document.getElementById('festival-subtitle');
        const datesLocationElement = document.getElementById('festival-dates-location');

        if (!festivalData) {
            if (nameElement1) nameElement1.textContent = 'Luna Negra Fest';
            if (subtitleElement) subtitleElement.textContent = 'Detalles no disponibles';
            if (datesLocationElement) datesLocationElement.textContent = 'Fechas y lugar por confirmar';
            return;
        }

        if (nameElement1) nameElement1.textContent = festivalData.nombre || 'Luna Negra Fest';
        // La estructura de LNF no tiene 'festival-name-line2' como Ritmos del Sur para el título principal.
        // El subtítulo ahora está en su propio elemento.
        if (subtitleElement) subtitleElement.textContent = festivalData.descripcion || 'Forja de Leyendas del Rock y Metal';

        if (datesLocationElement) {
            const formatDate = (dateString) => {
                if (!dateString) return '?';
                try {
                    const date = new Date(dateString + 'T00:00:00Z'); // Asegurar UTC para evitar problemas de zona
                    return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
                } catch (e) { console.error("Error formateando fecha LNF:", dateString, e); return dateString; }
            };
            const startDate = formatDate(festivalData.fechaInicio);
            const endDate = formatDate(festivalData.fechaFin);
            const location = festivalData.ubicacion || 'Recinto por Anunciar';
            let dateText = `${startDate}`;
            if (startDate !== endDate && endDate !== '?') dateText += ` AL ${endDate}`;
            datesLocationElement.textContent = `${dateText} | ${location.toUpperCase()}`;
        }
        // Actualizar también la sección de ubicación estática si los datos están disponibles
        const locationCityEl = document.getElementById('location-city-lnf');
        const locationDescEl = document.getElementById('location-description-lnf');
        if (locationCityEl && festivalData.ubicacion) locationCityEl.innerHTML = `${festivalData.ubicacion.toUpperCase()}:<br>TIERRA DE LEYENDAS`;
        if (locationDescEl && festivalData.ubicacion_detalle) locationDescEl.textContent = festivalData.ubicacion_detalle;
    }

    function displayLNFTicketTypes() {
        const grid = document.getElementById('ticket-grid-lnf');
        const loadingMessageElement = document.getElementById('tickets-loading-lnf');

        if (!grid) {
            console.error("Ticket grid LNF (#ticket-grid-lnf) no encontrado!");
            if (loadingMessageElement) loadingMessageElement.textContent = 'Error al cargar sección de pases.';
            return;
        }
        grid.innerHTML = ''; // Limpiar contenido previo

        if (!tiposDeEntradaGlobalLNF || tiposDeEntradaGlobalLNF.length === 0) {
            grid.innerHTML = '<p class="text-center col-span-full" style="grid-column: 1 / -1;">No hay pases disponibles en este momento.</p>';
            return;
        }

        tiposDeEntradaGlobalLNF.forEach((ticket, index) => {
            if (!ticket || typeof ticket.idEntrada !== 'number' || typeof ticket.tipo !== 'string' || typeof ticket.precio !== 'number' || typeof ticket.stock !== 'number') {
                console.warn(`LNF: Saltando ticket [${index}] por datos incompletos:`, ticket);
                return;
            }

            const card = document.createElement('article');
            card.classList.add('ticket-card-lnf'); // Nueva clase para estilo LNF
            card.setAttribute('data-aos', 'fade-up'); // Animación AOS
            card.setAttribute('data-aos-delay', `${100 + index * 100}`);

            // Icono decorativo (ejemplo, podrías hacerlo SVG o imagen)
            const iconWrapper = document.createElement('div');
            iconWrapper.classList.add('ticket-icon-lnf');
            iconWrapper.innerHTML = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L8 6H4v4l-2 4l2 4v4h4l4 4l4-4h4v-4l2-4l-2-4V6h-4L12 2zm0 3.41L13.41 7H10.59L12 5.41zM7 9.41L9.41 7H14.59L17 9.41V14.59L14.59 17H9.41L7 14.59V9.41zm5 1.59a2 2 0 1 0 0 4a2 2 0 0 0 0-4z"/></svg>`; // Icono placeholder

            const name = document.createElement('h3');
            name.textContent = ticket.tipo.toUpperCase();

            const description = document.createElement('p');
            description.textContent = ticket.descripcion || "Acceso al fragor de la batalla.";

            const priceDisplay = document.createElement('div');
            priceDisplay.classList.add('ticket-price-lnf');
            priceDisplay.textContent = `€${Number(ticket.precio).toFixed(2)}`;

            const stockDisplay = document.createElement('p');
            stockDisplay.classList.add('ticket-stock-lnf');
            stockDisplay.textContent = ticket.stock > 0 ? `Quedan: ${ticket.stock}` : '¡AGOTADOS!';

            card.appendChild(iconWrapper);
            card.appendChild(name);
            card.appendChild(description);
            card.appendChild(priceDisplay);
            card.appendChild(stockDisplay);

            if (ticket.stock > 0) {
                const buyButton = document.createElement('button');
                buyButton.classList.add('cta-button-lnf', 'ticket-buy-action-lnf');
                buyButton.dataset.ticketId = ticket.idEntrada;
                buyButton.innerHTML = `<span>Forjar Pase</span>`;
                buyButton.addEventListener('click', () => openLNFPurchaseModal(ticket.idEntrada));
                card.appendChild(buyButton);
            } else {
                const agotadoMsg = document.createElement('p');
                agotadoMsg.classList.add('ticket-soldout-message-lnf');
                agotadoMsg.textContent = "DESTINO SELLADO";
                card.appendChild(agotadoMsg);
            }
            grid.appendChild(card);
        });
        if (typeof AOS !== 'undefined' && !prefersReducedMotion) AOS.refreshHard();
    }


    // =========================================================================
    // == Lógica de Compra de Entradas LNF (Adaptada)
    // =========================================================================
    function openLNFPurchaseModal(ticketIdFromAPI) {
        currentSelectedTicketType = tiposDeEntradaGlobalLNF.find(t => t.idEntrada === Number(ticketIdFromAPI));

        if (!currentSelectedTicketType || currentSelectedTicketType.stock <= 0) {
            alert("Este tipo de pase no está disponible o está agotado.");
            return;
        }
        if (!purchaseModal || !modalTicketNameTitle || !modalSelectedTicketName || !modalSelectedTicketPrice || !modalTicketQuantityInput || !modalFormArea || !modalConfirmationArea || !modalPaymentForm || !modalCardElementContainer) {
            displayLNFError("Error al abrir el formulario de forja. Elementos no encontrados.", true);
            return;
        }

        modalTicketNameTitle.textContent = `Forjar Pase: ${currentSelectedTicketType.tipo}`;
        modalSelectedTicketName.textContent = currentSelectedTicketType.tipo;
        modalSelectedTicketPrice.textContent = currentSelectedTicketType.precio.toFixed(2);
        modalTicketQuantityInput.value = 1;
        modalTicketQuantityInput.max = currentSelectedTicketType.stock;
        updateLNFModalTotalPrice();

        if (!stripe) {
            try { stripe = Stripe(CLAVE_PUBLICABLE_STRIPE); }
            catch (e) { displayLNFError("No se pudo inicializar el sistema de pago.", true); return; }
        }
        if (modalCardElement) { modalCardElement.unmount(); modalCardElement.destroy(); }

        const elements = stripe.elements({ locale: 'es' });
        modalCardElement = elements.create('card', {
            // Aquí puedes añadir estilos específicos para el input de Stripe si es necesario,
            // aunque gran parte se controlará desde luna-negra-style.css
            style: {
                base: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--lnf-text-light-primary').trim(),
                    fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--lnf-font-ui').trim() || 'Roboto, sans-serif',
                    fontSize: '16px',
                    '::placeholder': {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--lnf-text-light-secondary').trim(),
                    },
                },
                invalid: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--lnf-accent-ember').trim(),
                    iconColor: getComputedStyle(document.documentElement).getPropertyValue('--lnf-accent-ember').trim(),
                },
            }
        });
        purchaseModal.style.display = 'flex'; // Mostrar modal (asumiendo que tiene .purchase-modal-lnf)

        setTimeout(() => {
            if (modalCardElementContainer) {
                modalCardElement.mount(modalCardElementContainer);
                modalCardElement.on('change', event => {
                    if (modalCardErrors) modalCardErrors.textContent = event.error ? event.error.message : '';
                });
            } else {
                displayLNFError("Error al preparar el formulario de pago (Stripe).", true);
                purchaseModal.style.display = 'none';
            }
        }, 50); // Pequeño delay para asegurar que el modal es visible antes de montar Stripe

        modalFormArea.style.display = 'block';
        modalConfirmationArea.style.display = 'none';
        modalPaymentForm.reset();
        if (modalCardErrors) modalCardErrors.textContent = '';
    }

    function updateLNFModalTotalPrice() {
        // Similar a updateModalTotalPrice pero usa selectores LNF si son diferentes
        if (!currentSelectedTicketType || !modalTicketQuantityInput || !modalTotalPriceDisplay || !modalPayButton || !modalCardErrors) return;
        const cantidad = parseInt(modalTicketQuantityInput.value) || 0;
        const stockDisponible = currentSelectedTicketType.stock;

        if (cantidad > 0 && cantidad <= stockDisponible) {
            const total = currentSelectedTicketType.precio * cantidad;
            modalTotalPriceDisplay.textContent = total.toFixed(2);
            modalPayButton.innerHTML = `<span>Forjar por ${total.toFixed(2)} €</span>`; // Adaptar texto
            modalPayButton.disabled = false;
            if (modalCardErrors) modalCardErrors.textContent = '';
        } else {
            modalTotalPriceDisplay.textContent = '0.00';
            modalPayButton.innerHTML = '<span>Forjar Pase</span>';
            modalPayButton.disabled = true;
            if (modalCardErrors) {
                if (cantidad <= 0 && currentSelectedTicketType.precio > 0) modalCardErrors.textContent = 'La cantidad debe ser al menos 1.';
                else if (cantidad > stockDisponible && stockDisponible > 0) modalCardErrors.textContent = `Cantidad máxima disponible: ${stockDisponible}.`;
                else if (stockDisponible <= 0 && currentSelectedTicketType.precio > 0) modalCardErrors.textContent = 'Pases agotados para este tipo.';
            }
        }
    }

    async function handleLNFModalPurchaseSubmit(event) {
        event.preventDefault();
        if (!modalPayButton || !modalCardErrors || !stripe || !modalCardElement || !modalTicketQuantityInput || !modalBuyerNameInput || !modalBuyerEmailInput || !modalBuyerEmailConfirmInput || !currentSelectedTicketType) {
            displayLNFError("Error en el sistema de forja. Inténtalo de nuevo.", true);
            return;
        }
        if (!currentSelectedTicketType || typeof currentSelectedTicketType.idEntrada === 'undefined') {
            if (modalCardErrors) modalCardErrors.textContent = 'Error interno: No se ha seleccionado un tipo de pase válido.';
            if (modalPayButton) { modalPayButton.disabled = false; updateLNFModalTotalPrice(); }
            return;
        }

        modalPayButton.disabled = true;
        modalPayButton.innerHTML = '<span>Forjando...</span>';
        if (modalCardErrors) modalCardErrors.textContent = '';

        // Limpiar errores visuales previos
        modalBuyerEmailInput.classList.remove('input-error');
        modalBuyerEmailConfirmInput.classList.remove('input-error');


        const cantidad = parseInt(modalTicketQuantityInput.value);
        const nombreComprador = modalBuyerNameInput.value.trim();
        const emailComprador = modalBuyerEmailInput.value.trim();
        const emailCompradorConfirm = modalBuyerEmailConfirmInput.value.trim();

        if (emailComprador !== emailCompradorConfirm) {
            if (modalCardErrors) modalCardErrors.textContent = 'Los correos electrónicos no coinciden. Por favor, verifica.';

            // Añadir feedback visual a los campos
            modalBuyerEmailInput.classList.add('input-error');
            modalBuyerEmailConfirmInput.classList.add('input-error');

            modalPayButton.disabled = false;
            // Restaurar texto del botón sin llamar a la función que borra el error
            const stock = currentSelectedTicketType.stock;
            if (cantidad > 0 && cantidad <= stock) {
                const total = currentSelectedTicketType.precio * cantidad;
                modalPayButton.innerHTML = `<span>Forjar por ${total.toFixed(2)} €</span>`;
            } else {
                modalPayButton.innerHTML = '<span>Forjar Pase</span>';
            }
            return;
        }

        if (!nombreComprador || !emailComprador || !/^\S+@\S+\.\S+$/.test(emailComprador) || cantidad <= 0) {
            if (modalCardErrors) modalCardErrors.textContent = 'Completa tu Nombre de Guerrero, Email y Cantidad (mín. 1).';
            modalPayButton.disabled = false; updateLNFModalTotalPrice(); return;
        }

        const payloadIniciarPago = { idEntrada: currentSelectedTicketType.idEntrada, cantidad: cantidad };
        try {
            const initResponse = await fetch(`${API_BASE_URL}/public/venta/iniciar-pago`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadIniciarPago)
            });
            const initData = await initResponse.json();
            if (!initResponse.ok) throw new Error(initData.message || initData.mensaje || `Error al iniciar forja (${initResponse.status})`);
            currentClientSecret = initData.clientSecret;
            if (!currentClientSecret) throw new Error("No se recibió el clientSecret de Stripe (iniciar-pago).");

            const { paymentIntent, error: stripeError } = await stripe.confirmCardPayment(currentClientSecret, {
                payment_method: { card: modalCardElement, billing_details: { name: nombreComprador, email: emailComprador } }
            });
            if (stripeError) throw new Error(stripeError.message);

            if (paymentIntent && paymentIntent.status === 'succeeded') {
                const formDataConfirmar = new URLSearchParams();
                formDataConfirmar.append('paymentIntentId', paymentIntent.id);
                formDataConfirmar.append('idFestival', FESTIVAL_ID.toString());
                formDataConfirmar.append('idEntrada', currentSelectedTicketType.idEntrada.toString());
                formDataConfirmar.append('cantidad', cantidad.toString());
                formDataConfirmar.append('emailAsistente', emailComprador);
                formDataConfirmar.append('nombreAsistente', nombreComprador);
                // idCompraTemporal no se usa aquí

                const confirmResponse = await fetch(`${API_BASE_URL}/public/venta/confirmar-compra`, {
                    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formDataConfirmar
                });
                if (!confirmResponse.ok) {
                    const errorText = await confirmResponse.text();
                    let backendErrorMsg = `Error al confirmar forja en servidor (${confirmResponse.status})`;
                    try { const jsonError = JSON.parse(errorText); backendErrorMsg = jsonError.error || jsonError.mensaje || backendErrorMsg; }
                    catch (e) { backendErrorMsg += ` - ${errorText.substring(0, 100)}...`; }
                    throw new Error(backendErrorMsg);
                }
                const compraConfirmadaDTO = await confirmResponse.json();
                if (compraConfirmadaDTO && Array.isArray(compraConfirmadaDTO.entradasGeneradas)) {
                    const entradasParaDisplay = compraConfirmadaDTO.entradasGeneradas.map(eg => ({
                        nombreTipoEntrada: eg.tipoEntradaOriginal || currentSelectedTicketType.tipo,
                        nombreComprador: compraConfirmadaDTO.nombreAsistente,
                        emailComprador: compraConfirmadaDTO.emailAsistente,
                        codigoQr: eg.codigoQr,
                        qrCodeImageDataUrl: eg.qrCodeImageDataUrl
                    }));
                    displayLNFPurchaseConfirmation(entradasParaDisplay);
                } else {
                    throw new Error("Respuesta inesperada del servidor tras confirmar la forja.");
                }
                await loadLNFData(); // Recargar datos del festival y entradas
            } else {
                throw new Error("El pago con Stripe no pudo completarse.");
            }
        } catch (error) {
            console.error("Error en proceso de forja LNF:", error);
            if (modalCardErrors) modalCardErrors.textContent = error.message || "Ocurrió un error desconocido durante la forja.";
            modalPayButton.disabled = false; updateLNFModalTotalPrice();
        }
    }

    function displayLNFPurchaseConfirmation(entradasCompradas) {
        if (!modalFormArea || !modalConfirmationArea || !modalPurchasedTicketDetails || !modalPurchasedTicketQr || !modalPaymentForm) return;
        modalFormArea.style.display = 'none';
        modalConfirmationArea.style.display = 'block';

        if (entradasCompradas && entradasCompradas.length > 0) {
            const primeraEntrada = entradasCompradas[0];
            modalPurchasedTicketDetails.innerHTML = `
                <p><strong>Tipo de Pase:</strong> ${primeraEntrada.nombreTipoEntrada || 'N/A'}</p>
                <p><strong>Guerrero:</strong> ${primeraEntrada.nombreComprador || 'N/A'}</p>
                <p><strong>Email:</strong> ${primeraEntrada.emailComprador || 'N/A'}</p>
                <p><strong>Sello Rúnico (QR):</strong> ${primeraEntrada.codigoQr || 'N/A'}</p>
                ${entradasCompradas.length > 1 ? `<p><em>(y ${entradasCompradas.length - 1} pase(s) más en tu arsenal)</em></p>` : ''}`;

            if (primeraEntrada.qrCodeImageDataUrl) {
                modalPurchasedTicketQr.src = primeraEntrada.qrCodeImageDataUrl;
                modalPurchasedTicketQr.style.display = 'block';
            } else if (primeraEntrada.codigoQr) {
                generateAndDisplayLNFModalQR(primeraEntrada.codigoQr);
            } else {
                modalPurchasedTicketQr.style.display = 'none';
            }
        } else {
            modalPurchasedTicketDetails.innerHTML = "<p>No se pudieron obtener los detalles del pase. Revisa tu cuervo mensajero (email).</p>";
            modalPurchasedTicketQr.style.display = 'none';
        }
        if (modalCardElement) modalCardElement.clear();
        modalPaymentForm.reset();
        updateLNFModalTotalPrice();
    }

    function generateAndDisplayLNFModalQR(qrText) {
        if (typeof qrcode === 'undefined' || !modalPurchasedTicketQr) return;
        try {
            const qr = qrcode(0, 'L'); qr.addData(qrText); qr.make();
            modalPurchasedTicketQr.src = qr.createDataURL(5, 1); // QR un poco más grande y con margen
            modalPurchasedTicketQr.style.display = 'block';
        } catch (e) { console.error("Error generando QR LNF:", e); modalPurchasedTicketQr.style.display = 'none'; }
    }

    function closeLNFPurchaseModal() {
        if (purchaseModal) purchaseModal.style.display = 'none';
        if (modalCardElement) modalCardElement.clear();
        if (modalPaymentForm) modalPaymentForm.reset();
        currentSelectedTicketType = null;
        if (modalFormArea) modalFormArea.style.display = 'block';
        if (modalConfirmationArea) modalConfirmationArea.style.display = 'none';
    }


    // --- Funciones de Inicialización y Efectos Visuales (Reutilizadas/Adaptadas) ---
    function initAOS_LNF() {
        if (typeof AOS !== 'undefined' && !prefersReducedMotion) {
            AOS.init({ duration: 700, easing: 'ease-in-out-sine', once: true, offset: 80 });
        } else if (typeof AOS !== 'undefined' && prefersReducedMotion) {
            document.querySelectorAll('[data-aos]').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; el.classList.add('aos-animate'); });
        }
    }

    function hideLoader_LNF() {
        if (body.classList.contains('loading')) {
            body.classList.remove('loading');
            if (loader) {
                loader.classList.add('hidden');
                loader.addEventListener('transitionend', () => loader?.remove(), { once: true });
            }
            if (!document.querySelector('.aos-animate')) { initAOS_LNF(); }
        }
    }

    if (loader) { window.addEventListener('load', hideLoader_LNF); setTimeout(hideLoader_LNF, 2800); /* Delay un poco más largo para LNF loader */ }
    else { initAOS_LNF(); }

    if (cursorDot && cursorRing && window.matchMedia("(pointer: fine)").matches && !prefersReducedMotion) {
        // Lógica del cursor (puede ser la misma que script.js o adaptada si el CSS es diferente)
        // Esta parte es mayormente visual y puede reutilizarse.
        // ... (código del cursor de script.js)
        let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
        let ringX = mouseX, ringY = mouseY, dotX = mouseX, dotY = mouseY;
        const ringSpeed = 0.15; // Un poco más "nervioso"
        let isCursorVisible = false;
        const updateCursor = () => {
            dotX = mouseX; dotY = mouseY;
            ringX += (mouseX - ringX) * ringSpeed; ringY += (mouseY - ringY) * ringSpeed;
            if (!isNaN(dotX) && !isNaN(dotY)) cursorDot.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%, -50%)`;
            if (!isNaN(ringX) && !isNaN(ringY)) cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
            rafIdCursor = requestAnimationFrame(updateCursor);
        };
        document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; if (!isCursorVisible) { cursorDot.style.opacity = 1; cursorRing.style.opacity = 1; isCursorVisible = true; } }, { passive: true });
        document.addEventListener('mouseleave', () => { if (cursorDot) cursorDot.style.opacity = 0; if (cursorRing) cursorRing.style.opacity = 0; isCursorVisible = false; });
        document.addEventListener('mouseenter', () => { if (cursorDot) cursorDot.style.opacity = 1; if (cursorRing) cursorRing.style.opacity = 1; isCursorVisible = true; });
        updateCursor();
    } else if (cursorDot || cursorRing) {
        if (cursorDot) cursorDot.style.display = 'none'; if (cursorRing) cursorRing.style.display = 'none'; body.style.cursor = 'default';
    }


    if (header) {
        const handleHeaderScroll = () => header.classList.toggle('scrolled', window.scrollY > 60);
        window.addEventListener('scroll', debounce(handleHeaderScroll, 10), { passive: true });
        handleHeaderScroll();
    }

    if (menuToggle && navMenu) {
        // Lógica del menú hamburguesa (puede ser la misma)
        // ... (código del menú de script.js)
        const navLinks = navMenu.querySelectorAll('.nav-link-lnf');
        menuToggle.addEventListener('click', () => {
            const isActive = navMenu.classList.toggle('active');
            menuToggle.classList.toggle('open');
            menuToggle.setAttribute('aria-expanded', isActive);
            body.style.overflowY = isActive ? 'hidden' : '';
        });
        navLinks.forEach(link => link.addEventListener('click', () => {
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                menuToggle.classList.remove('open');
                menuToggle.setAttribute('aria-expanded', 'false');
                body.style.overflowY = '';
            }
        }));
    }

    // Active nav link on scroll - Adaptar selectores
    if (sections.length > 0 && navLiAnchors.length > 0 && typeof IntersectionObserver !== 'undefined') {
        // Lógica del IntersectionObserver (puede ser la misma, pero con selectores -lnf)
        // ... (código del IntersectionObserver de script.js adaptado)
        const observerCallback = (entries) => {
            let topEntry = null;
            entries.forEach(entry => {
                if (entry.isIntersecting && (!topEntry || entry.boundingClientRect.top < topEntry.boundingClientRect.top) && entry.intersectionRatio > 0.1) { // umbral mayor
                    topEntry = entry;
                }
            });
            const currentActiveId = topEntry ? topEntry.target.getAttribute('id') : null;
            navLiAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${currentActiveId}`));
        };
        const sectionObserver = new IntersectionObserver(observerCallback, { root: null, rootMargin: '-35% 0px -64% 0px', threshold: [0.1, 0.5] }); // Ajustar márgenes
        sections.forEach(section => sectionObserver.observe(section));
    }


    // Smooth scroll - Adaptar si los IDs de header son diferentes
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || !targetId.startsWith('#')) return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const headerOffset = (header ? header.offsetHeight : 0) + 10; // Ajustar offset
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = window.pageYOffset + elementPosition - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
                if (navMenu?.classList.contains('active')) { /* Lógica cierre menú móvil */ }
            }
        });
    });

    // Event listeners para el modal de compra LNF
    if (modalCloseButton) modalCloseButton.addEventListener('click', closeLNFPurchaseModal);
    if (modalCloseConfirmationButton) modalCloseConfirmationButton.addEventListener('click', closeLNFPurchaseModal);
    if (modalTicketQuantityInput) modalTicketQuantityInput.addEventListener('input', updateLNFModalTotalPrice);
    if (modalPaymentForm) modalPaymentForm.addEventListener('submit', handleLNFModalPurchaseSubmit);
    if (purchaseModal) purchaseModal.addEventListener('click', (event) => {
        // Solo cerrar si se hace clic en el fondo del modal, no en el contenido
        if (event.target === purchaseModal) closeLNFPurchaseModal();
    });


    // --- Carga de Datos Inicial para LNF ---
    async function loadLNFData() {
        console.log("LNF: Loading festival data...");
        if (errorContainer) errorContainer.style.display = 'none';

        const ticketGridElement = document.getElementById('ticket-grid-lnf');
        const loadingTicketsP = document.getElementById('tickets-loading-lnf');
        if (ticketGridElement && !loadingTicketsP) { /* Crear P si no existe */ }
        else if (loadingTicketsP) { loadingTicketsP.textContent = 'Forjando lista de pases...'; }


        // Cargar datos del festival y luego los tipos de entrada
        const festivalData = await fetchLNFData(`/festivales/${FESTIVAL_ID}`);
        displayLNFDetails(festivalData); // Muestra detalles del festival

        // Solo cargar tipos de entrada si el festival está publicado
        if (festivalData && festivalData.estado === 'PUBLICADO') {
            tiposDeEntradaGlobalLNF = await fetchLNFData(`/festivales/${FESTIVAL_ID}/entradas`);
        } else {
            tiposDeEntradaGlobalLNF = []; // Vaciar si no está publicado
            if (ticketGridElement) ticketGridElement.innerHTML = '<p class="text-center col-span-full" style="grid-column: 1 / -1;">Los pases para esta edición aún no han sido liberados.</p>';
            console.warn(`LNF: El festival ID ${FESTIVAL_ID} no está PUBLICADO (estado: ${festivalData ? festivalData.estado : 'desconocido'}). No se cargarán tipos de entrada.`);
        }
        displayLNFTicketTypes(); // Muestra los tipos de entrada (o mensaje si está vacío)

        console.log("LNF: Festival data loading complete.");
        // Cualquier otra función que dependa de estos datos
    }

    // Carga inicial de datos para LNF
    loadLNFData();

}); // Fin del DOMContentLoaded