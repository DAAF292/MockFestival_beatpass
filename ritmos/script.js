/**
 * Ritmos Del Sur: Hyper-Oasis - Script Principal v8 (Debug Propiedades Ticket)
 *
 * Notas:
 * - Apuntando a los endpoints del simulador:
 * - /public/venta/iniciar-pago (JSON, payload simplificado) - FUNCIONA
 * - /public/venta/confirmar-compra (URLSearchParams, payload completo) - FUNCIONA (Devuelve 200 OK)
 * - CORREGIDO el parseo de la respuesta de confirmar-compra para usar 'entradasGeneradas'.
 * - Se mantienen los logs de depuración.
 * - CORREGIDO: Mostrar 'codigoQr' en lugar de 'codigoEntrada'.
 * - CORREGIDO: Usar 'qrCodeImageDataUrl' si viene del DTO, o generar QR si solo viene 'codigoQr'.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- Configuración ---
    //const API_BASE_URL = 'https://daw2-tfg-beatpass.onrender.com/api';
    const API_BASE_URL = 'http://localhost:8080/Beatpass/api'; // Para desarrollo local
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
    const modalBuyerEmailConfirmInput = document.getElementById('modal-buyer-email-confirm');
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
        return function () {
            const context = this, args = arguments;
            const later = function () {
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
            console.log(`Workspaceing festival details from: ${url}`);
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
        const url = `${API_BASE_URL}/festivales/${festivalId}/tipos-entrada`;
        try {
            console.log(`Workspaceing ticket types from: ${url}`);
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
            console.log('Tipos de Entrada Globales (script.js) después de fetch:', JSON.parse(JSON.stringify(tiposDeEntradaGlobal)));
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
        if (nameElement2) nameElement2.textContent = '';

        const subtitleElement = document.getElementById('festival-subtitle');
        if (subtitleElement) subtitleElement.textContent = festivalData.descripcion || 'Vive la experiencia';

        const datesLocationElement = document.getElementById('festival-dates-location');
        if (datesLocationElement) {
            const formatDate = (dateString) => {
                if (!dateString) return '?';
                try {
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
        grid.innerHTML = '';

        if (!tiposDeEntradaGlobal || tiposDeEntradaGlobal.length === 0) {
            console.log("No ticket types to display or tiposDeEntradaGlobal is empty.");
            grid.innerHTML = '<p class="text-center col-span-full" style="grid-column: 1 / -1;">No hay entradas disponibles en este momento.</p>';
            return;
        }
        console.log("Displaying ticket types:", JSON.parse(JSON.stringify(tiposDeEntradaGlobal)));

        tiposDeEntradaGlobal.forEach((ticket, index) => {
            console.log(`Processing ticket [${index}]:`, JSON.stringify(ticket, null, 2));

            if (!ticket ||
                typeof ticket.idTipoEntrada !== 'number' ||
                typeof ticket.tipo !== 'string' ||
                typeof ticket.precio !== 'number' ||
                typeof ticket.descripcion !== 'string' ||
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
            description.textContent = ticket.descripcion;

            const priceDisplay = document.createElement('div');
            priceDisplay.classList.add('ticket-price');
            priceDisplay.textContent = `€${Number(ticket.precio).toFixed(2)}`;

            const stockDisplay = document.createElement('p');
            stockDisplay.classList.add('ticket-stock');
            stockDisplay.textContent = ticket.stock > 0 ? `Disponibles: ${ticket.stock}` : 'Agotadas';

            contentDiv.appendChild(name);
            contentDiv.appendChild(description);
            contentDiv.appendChild(priceDisplay);
            contentDiv.appendChild(stockDisplay);
            card.appendChild(contentDiv);

            if (ticket.stock > 0) {
                const buyButton = document.createElement('button');
                buyButton.classList.add('cta-button', 'ticket-buy-action-button');
                buyButton.dataset.ticketId = ticket.idTipoEntrada;
                const buttonText = ticket.tipo.split(' ')[0];
                buyButton.innerHTML = `<span>Comprar ${buttonText}</span>`;
                buyButton.addEventListener('click', () => openPurchaseModal(ticket.idTipoEntrada));
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
            AOS.refreshHard();
        }
    }

    // =========================================================================
    // == Lógica de Compra de Entradas (MODIFICADA)
    // =========================================================================
    function openPurchaseModal(ticketIdFromAPI) {
        console.log('[openPurchaseModal] ticketIdFromAPI:', ticketIdFromAPI, '(tipo:', typeof ticketIdFromAPI, ')');
        console.log('[openPurchaseModal] tiposDeEntradaGlobal al abrir modal:', JSON.parse(JSON.stringify(tiposDeEntradaGlobal)));
        currentSelectedTicketType = tiposDeEntradaGlobal.find(t => t.idTipoEntrada === Number(ticketIdFromAPI));
        console.log('[openPurchaseModal] currentSelectedTicketType después de find:', JSON.parse(JSON.stringify(currentSelectedTicketType)));

        if (!currentSelectedTicketType || currentSelectedTicketType.stock <= 0) {
            alert("Este tipo de entrada no está disponible, no se encontró o está agotado.");
            console.warn('[openPurchaseModal] Problema con currentSelectedTicketType o stock:', currentSelectedTicketType);
            return;
        }

        if (!purchaseModal || !modalTicketNameTitle || !modalSelectedTicketName || !modalSelectedTicketPrice || !modalTicketQuantityInput || !modalFormArea || !modalConfirmationArea || !modalPaymentForm) {
            console.error("Faltan elementos de la modal en el DOM.");
            displayError("Error al abrir el formulario de compra. Elementos no encontrados.", true);
            return;
        }

        modalTicketNameTitle.textContent = `Comprar: ${currentSelectedTicketType.tipo}`;
        modalSelectedTicketName.textContent = currentSelectedTicketType.tipo;
        modalSelectedTicketPrice.textContent = currentSelectedTicketType.precio.toFixed(2);
        modalTicketQuantityInput.value = 1;
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
        modalCardElement = elements.create('card', {});
        purchaseModal.style.display = 'flex';

        setTimeout(() => {
            const cardMountElement = document.getElementById('modal-card-element');
            if (cardMountElement) {
                modalCardElement.mount(cardMountElement);
                modalCardElement.on('change', event => {
                    if (modalCardErrors) modalCardErrors.textContent = event.error ? event.error.message : '';
                });
            } else {
                console.error("Contenedor #modal-card-element no encontrado para Stripe.");
                displayError("Error al preparar el formulario de pago (Stripe).", true);
                purchaseModal.style.display = 'none';
            }
        }, 50);

        modalFormArea.style.display = 'block';
        modalConfirmationArea.style.display = 'none';
        modalPaymentForm.reset();
        if (modalCardErrors) modalCardErrors.textContent = '';
    }

    function updateModalTotalPrice() {
        if (!currentSelectedTicketType || !modalTicketQuantityInput || !modalTotalPriceDisplay || !modalPayButton || !modalCardErrors) return;
        const cantidad = parseInt(modalTicketQuantityInput.value) || 0;
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
            if (cantidad <= 0 && currentSelectedTicketType.precio > 0) {
                modalCardErrors.textContent = 'La cantidad debe ser al menos 1.';
            } else if (cantidad > stockDisponible && stockDisponible > 0) {
                modalCardErrors.textContent = `Cantidad máxima disponible: ${stockDisponible}.`;
            } else if (stockDisponible <= 0 && currentSelectedTicketType.precio > 0) {
                modalCardErrors.textContent = 'Entradas agotadas para este tipo.';
            }
        }
    }

    async function handleModalPurchaseSubmit(event) {
        event.preventDefault();
        if (!modalPayButton || !modalCardErrors || !stripe || !modalCardElement || !modalTicketQuantityInput || !modalBuyerNameInput || !modalBuyerEmailInput || !modalBuyerEmailConfirmInput || !currentSelectedTicketType) {
            console.error("Elementos de pago, formulario o tipo de entrada no inicializados.");
            displayError("Error en el sistema de pago. Inténtalo de nuevo.", true);
            return;
        }

        console.log('[handleModalPurchaseSubmit] Iniciando envío. currentSelectedTicketType:', JSON.parse(JSON.stringify(currentSelectedTicketType)));
        if (!currentSelectedTicketType || typeof currentSelectedTicketType.idTipoEntrada === 'undefined') {
            console.error('[handleModalPurchaseSubmit] ERROR FATAL: currentSelectedTicketType o su idTipoEntrada no está definido antes de la compra.');
            modalCardErrors.textContent = 'Error interno: No se ha seleccionado un tipo de entrada válido para la compra.';
            if (modalPayButton.disabled) {
                modalPayButton.disabled = false;
                updateModalTotalPrice();
            }
            return;
        }

        modalPayButton.disabled = true;
        modalPayButton.textContent = 'Procesando...';
        modalCardErrors.textContent = '';

        // Limpiar errores visuales previos
        modalBuyerEmailInput.classList.remove('input-error');
        modalBuyerEmailConfirmInput.classList.remove('input-error');

        const cantidad = parseInt(modalTicketQuantityInput.value);
        const nombreComprador = modalBuyerNameInput.value.trim();
        const emailComprador = modalBuyerEmailInput.value.trim();
        const emailCompradorConfirm = modalBuyerEmailConfirmInput.value.trim();

        if (emailComprador !== emailCompradorConfirm) {
            modalCardErrors.textContent = 'Los correos electrónicos no coinciden. Por favor, verifica.';

            // Añadir feedback visual
            modalBuyerEmailInput.classList.add('input-error');
            modalBuyerEmailConfirmInput.classList.add('input-error');

            modalPayButton.disabled = false;
            updateModalTotalPrice(); // Restaura el texto del botón
            return;
        }


        if (!nombreComprador || !emailComprador || !/^\S+@\S+\.\S+$/.test(emailComprador) || cantidad <= 0) {
            modalCardErrors.textContent = 'Por favor, completa tu Nombre, Email válido y asegura que la Cantidad sea mayor a 0.';
            modalPayButton.disabled = false;
            updateModalTotalPrice();
            return;
        }

        const payloadIniciarPago = {
            idEntrada: currentSelectedTicketType.idTipoEntrada,
            cantidad: cantidad
        };
        console.log("[handleModalPurchaseSubmit] Payload para iniciar-pago (adaptado):", JSON.parse(JSON.stringify(payloadIniciarPago)));

        try {
            console.log("[handleModalPurchaseSubmit] Enviando a iniciar-pago (adaptado)...");
            const initResponse = await fetch(`${API_BASE_URL}/public/venta/iniciar-pago`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadIniciarPago)
            });

            console.log("[handleModalPurchaseSubmit] Respuesta cruda de iniciar-pago:", initResponse); // Línea ~425
            const initData = await initResponse.json();
            console.log("[handleModalPurchaseSubmit] Datos JSON de iniciar-pago:", initData); // Línea ~427

            if (!initResponse.ok) {
                const errorMsg = initData.message || initData.mensaje || `Error al iniciar pago (${initResponse.status})`;
                throw new Error(errorMsg);
            }

            currentClientSecret = initData.clientSecret;
            currentIdCompraTemporal = initData.idCompraTemporal;

            if (!currentClientSecret) {
                throw new Error("No se recibió el clientSecret de Stripe desde el backend (iniciar-pago).");
            }
            console.log("[handleModalPurchaseSubmit] clientSecret (de iniciar-pago):", currentClientSecret, "idCompraTemporal:", currentIdCompraTemporal); // Línea ~436

            const { paymentIntent, error: stripeError } = await stripe.confirmCardPayment(currentClientSecret, {
                payment_method: {
                    card: modalCardElement,
                    billing_details: { name: nombreComprador, email: emailComprador },
                }
            });

            if (stripeError) {
                console.error("[handleModalPurchaseSubmit] Error de Stripe al confirmar pago:", stripeError);
                throw new Error(stripeError.message);
            }
            console.log("[handleModalPurchaseSubmit] PaymentIntent de Stripe:", paymentIntent); // Línea ~449

            if (paymentIntent && paymentIntent.status === 'succeeded') {

                const payloadConfirmar = {
                    paymentIntentId: paymentIntent.id,
                    // idFestival: FESTIVAL_ID, // ¡ELIMINA ESTA LÍNEA! No es esperada por el DTO del backend.
                    idEntrada: currentSelectedTicketType.idTipoEntrada, // Ya es un número, no necesita .toString()
                    cantidad: cantidad, // Ya es un número
                    emailComprador: emailComprador,
                    nombreComprador: nombreComprador,
                    // Si tienes un campo de teléfono en tu HTML (como modalBuyerPhoneInput.value.trim()), añádelo aquí
                    // telefonoComprador: modalBuyerPhoneInput.value.trim() || null
                };

                console.log("[handleModalPurchaseSubmit] Payload (JSON) para confirmar-compra (CORREGIDO):", JSON.stringify(payloadConfirmar, null, 2));

                const confirmResponse = await fetch(`${API_BASE_URL}/public/venta/confirmar-compra`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json', // <--- ¡CLAVE! CAMBIAR A application/json
                    },
                    body: JSON.stringify(payloadConfirmar) // <--- ¡CLAVE! Convertir el objeto a JSON
                });

                console.log("[handleModalPurchaseSubmit] Respuesta cruda de confirmar-compra:", confirmResponse);


                console.log("[handleModalPurchaseSubmit] Respuesta cruda de confirmar-compra:", confirmResponse); // Línea ~485 (antes 462)

                if (!confirmResponse.ok) { // Esto será true para el 400
                    const errorText = await confirmResponse.text(); // Leer el cuerpo del error
                    console.error("[handleModalPurchaseSubmit] Error en confirmar-compra. Status:", confirmResponse.status, "Texto:", errorText); // Línea ~466 (antes)
                    // Intentar parsear el JSON del error si el backend lo envía
                    let backendErrorMsg = `Error al confirmar compra en servidor (${confirmResponse.status})`;
                    try {
                        const jsonError = JSON.parse(errorText);
                        if (jsonError && (jsonError.error || jsonError.mensaje)) {
                            backendErrorMsg = jsonError.error || jsonError.mensaje; // Usar el mensaje de error del backend
                        } else {
                            backendErrorMsg += ` - ${errorText.substring(0, 200)}...`; // Fallback
                        }
                    } catch (e) {
                        // Si no es JSON, usar el texto directamente
                        backendErrorMsg += ` - ${errorText.substring(0, 200)}...`;
                    }
                    throw new Error(backendErrorMsg); // Línea ~467 (antes)
                }

                // Si llegamos aquí, confirmResponse.ok es true (ej. 200 OK)
                const compraConfirmadaDTO = await confirmResponse.json(); // Línea ~496
                console.log("[handleModalPurchaseSubmit] Datos JSON de confirmar-compra (CompraDTO):", compraConfirmadaDTO);

                // *** CORREGIDO para usar 'entradasGeneradas' y el campo 'codigoQr' ***
                if (compraConfirmadaDTO && Array.isArray(compraConfirmadaDTO.entradasGeneradas)) {
                    const entradasParaDisplay = compraConfirmadaDTO.entradasGeneradas.map(entradaGenerada => {
                        return {
                            nombreTipoEntrada: entradaGenerada.tipoEntradaOriginal || currentSelectedTicketType.tipo, // Usar 'tipoEntradaOriginal' del DTO
                            nombreComprador: compraConfirmadaDTO.nombreComprador,
                            emailComprador: compraConfirmadaDTO.emailComprador,
                            codigoQr: entradaGenerada.codigoQr, // Usar 'codigoQr'
                            qrCodeImageDataUrl: entradaGenerada.qrCodeImageDataUrl // Usar la imagen QR generada por el backend
                        };
                    });
                    displayPurchaseConfirmation(entradasParaDisplay);
                } else {
                    console.error("Formato de respuesta JSON inesperado de confirmar-compra (falta 'entradasGeneradas' o no es array):", compraConfirmadaDTO);
                    throw new Error("Formato de respuesta inesperado del servidor después de confirmar la compra.");
                }
                loadFestivalData();
            } else {
                console.warn("[handleModalPurchaseSubmit] El estado del PaymentIntent de Stripe no fue 'succeeded':", paymentIntent ? paymentIntent.status : 'PaymentIntent nulo');
                throw new Error("El pago con Stripe no pudo completarse o fue cancelado.");
            }

        } catch (error) {
            console.error("Error en el proceso de compra (script.js adaptado):", error);
            modalCardErrors.textContent = error.message || "Ocurrió un error desconocido durante la compra.";
            modalPayButton.disabled = false;
            updateModalTotalPrice();
        }
    }

    function displayPurchaseConfirmation(entradasCompradas) {
        if (!modalFormArea || !modalConfirmationArea || !modalPurchasedTicketDetails || !modalPurchasedTicketQr || !modalPaymentForm) return;
        modalFormArea.style.display = 'none';
        modalConfirmationArea.style.display = 'block';

        if (entradasCompradas && entradasCompradas.length > 0) {
            const primeraEntrada = entradasCompradas[0];
            modalPurchasedTicketDetails.innerHTML = `
                <p><strong>Tipo:</strong> ${primeraEntrada.nombreTipoEntrada || 'N/A'}</p>
                <p><strong>Comprador:</strong> ${primeraEntrada.nombreComprador || 'N/A'}</p>
                <p><strong>Email:</strong> ${primeraEntrada.emailComprador || 'N/A'}</p>
                <p><strong>Código:</strong> ${primeraEntrada.codigoQr || 'N/A'}</p> 
                ${entradasCompradas.length > 1 ? `<p><em>(y ${entradasCompradas.length - 1} entrada(s) más)</em></p>` : ''}`;

            // Mostrar la imagen QR si la URL de datos está disponible
            if (primeraEntrada.qrCodeImageDataUrl) {
                modalPurchasedTicketQr.src = primeraEntrada.qrCodeImageDataUrl;
                modalPurchasedTicketQr.style.display = 'block';
            } else if (primeraEntrada.codigoQr) { // Si no hay URL de imagen pero sí código, intentar generarla
                generateAndDisplayModalQR(primeraEntrada.codigoQr);
            } else {
                modalPurchasedTicketQr.style.display = 'none';
            }
        } else {
            modalPurchasedTicketDetails.innerHTML = "<p>No se pudieron obtener los detalles de la compra. Por favor, revisa tu email para la confirmación.</p>";
            modalPurchasedTicketQr.style.display = 'none';
        }
        if (modalCardElement) modalCardElement.clear();
        modalPaymentForm.reset();
        updateModalTotalPrice();
    }

    function generateAndDisplayModalQR(qrText) {
        if (typeof qrcode === 'undefined') {
            console.error("Librería QRCode (qrcode.min.js) no cargada.");
            if (modalPurchasedTicketQr) modalPurchasedTicketQr.style.display = 'none';
            return;
        }
        if (!modalPurchasedTicketQr) return;
        try {
            const qr = qrcode(0, 'L');
            qr.addData(qrText);
            qr.make();
            modalPurchasedTicketQr.src = qr.createDataURL(6, 0);
            modalPurchasedTicketQr.style.display = 'block';
        } catch (e) {
            console.error("Error generando QR:", e);
            modalPurchasedTicketQr.style.display = 'none';
        }
    }

    function closePurchaseModal() {
        if (purchaseModal) purchaseModal.style.display = 'none';
        if (modalCardElement) modalCardElement.clear();
        if (modalPaymentForm) modalPaymentForm.reset();
        currentSelectedTicketType = null;
        if (modalFormArea) modalFormArea.style.display = 'block';
        if (modalConfirmationArea) modalConfirmationArea.style.display = 'none';
    }

    function initAOS() {
        if (typeof AOS !== 'undefined' && !prefersReducedMotion) {
            AOS.init({ duration: 900, easing: 'ease-out-cubic', once: true, offset: 100 });
        } else if (typeof AOS !== 'undefined' && prefersReducedMotion) {
            console.log('AOS animations disabled (prefers-reduced-motion). Applying static styles.');
            document.querySelectorAll('[data-aos]').forEach(el => {
                el.style.opacity = 1;
                el.style.transform = 'none';
                el.classList.add('aos-animate');
            });
        } else { console.warn('AOS library not found.'); }
    }

    function hideLoader() {
        if (body.classList.contains('loading')) {
            body.classList.remove('loading');
            if (loader) {
                loader.classList.add('hidden');
                loader.addEventListener('transitionend', () => loader?.remove(), { once: true });
            }
            if (!document.querySelector('.aos-animate')) {
                initAOS();
            }
        }
    }

    if (loader) {
        window.addEventListener('load', hideLoader);
        setTimeout(hideLoader, 3500);
    } else {
        initAOS();
    }

    if (cursorDot && cursorRing && window.matchMedia("(pointer: fine)").matches && !prefersReducedMotion) {
        let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
        let ringX = mouseX, ringY = mouseY, dotX = mouseX, dotY = mouseY;
        const ringSpeed = 0.12;
        let isCursorVisible = false;
        const updateCursor = () => {
            dotX = mouseX;
            dotY = mouseY;
            ringX += (mouseX - ringX) * ringSpeed;
            ringY += (mouseY - ringY) * ringSpeed;
            if (!isNaN(dotX) && !isNaN(dotY)) cursorDot.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%, -50%)`;
            if (!isNaN(ringX) && !isNaN(ringY)) cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
            rafIdCursor = requestAnimationFrame(updateCursor);
        };
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (!isCursorVisible) {
                cursorDot.style.opacity = 1; cursorRing.style.opacity = 1; isCursorVisible = true;
            }
        }, { passive: true });
        document.addEventListener('mouseleave', () => { if (cursorDot) cursorDot.style.opacity = 0; if (cursorRing) cursorRing.style.opacity = 0; isCursorVisible = false; });
        document.addEventListener('mouseenter', () => { if (cursorDot) cursorDot.style.opacity = 1; if (cursorRing) cursorRing.style.opacity = 1; isCursorVisible = true; });
        updateCursor();
    } else if (cursorDot || cursorRing) {
        if (cursorDot) cursorDot.style.display = 'none';
        if (cursorRing) cursorRing.style.display = 'none';
        body.style.cursor = 'default';
    }

    if (header) {
        const handleHeaderScroll = () => header.classList.toggle('scrolled', window.scrollY > 80);
        window.addEventListener('scroll', debounce(handleHeaderScroll, 10), { passive: true });
        handleHeaderScroll();
    }

    if (menuToggle && navMenu) {
        const navLinks = navMenu.querySelectorAll('.nav-link');
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

    if (sections.length > 0 && navLiAnchors.length > 0 && typeof IntersectionObserver !== 'undefined') {
        const observerCallback = (entries) => {
            let topEntry = null;
            entries.forEach(entry => {
                if (entry.isIntersecting && (!topEntry || entry.boundingClientRect.top < topEntry.boundingClientRect.top) && entry.intersectionRatio > 0) {
                    topEntry = entry;
                }
            });
            const currentActiveId = topEntry ? topEntry.target.getAttribute('id') : null;
            navLiAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${currentActiveId}`));
        };
        const sectionObserver = new IntersectionObserver(observerCallback, { root: null, rootMargin: '-40% 0px -59% 0px', threshold: 0 });
        sections.forEach(section => sectionObserver.observe(section));
    }

    if (heroSection && !prefersReducedMotion) {
        const layers = heroSection.querySelectorAll('.hero-bg-layer');
        if (layers.length > 0) {
            let rafParallaxId;
            const handleParallaxScroll = () => {
                const scrollFactor = window.scrollY * 0.3;
                layers.forEach(layer => {
                    const speed = parseFloat(layer.getAttribute('data-speed') || '0');
                    layer.style.transform = `translate3d(0, ${scrollFactor * speed}px, 0)`;
                });
                rafParallaxId = null;
            };
            const debouncedScrollHandler = () => { if (!rafParallaxId) rafParallaxId = requestAnimationFrame(handleParallaxScroll); };
            window.addEventListener('scroll', debouncedScrollHandler, { passive: true });
            handleParallaxScroll();
        }
    }

    if (typeof basicLightbox !== 'undefined') {
        document.body.addEventListener('click', (e) => {
            const galleryLink = e.target.closest('.gallery-item');
            if (galleryLink) {
                e.preventDefault();
                const imageUrl = galleryLink.getAttribute('href');
                if (imageUrl && imageUrl !== '#') {
                    try { basicLightbox.create(`<img src="${imageUrl}" alt="Vista ampliada">`, { className: 'rds-lightbox' }).show(); }
                    catch (error) { console.error("Lightbox error:", error); }
                }
            }
        });
    } else { console.warn('basicLightbox library not found.'); }

    if (themeToggleButton) {
        const applyTheme = (theme) => {
            body.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        };
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);
        themeToggleButton.addEventListener('click', () => applyTheme(body.getAttribute('data-theme') === 'light' ? 'dark' : 'light'));
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || !targetId.startsWith('#')) return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const headerOffset = (header ? header.offsetHeight : 0) + 20;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = window.pageYOffset + elementPosition - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: prefersReducedMotion ? 'auto' : 'smooth'
                });

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

    const checkScrollable = () => {
        if (carousel && carouselWrapper) {
            const isScrollable = carousel.scrollWidth > carousel.clientWidth + 5;
            carouselWrapper.classList.toggle('is-scrollable', isScrollable);
        }
    };

    if (carousel && carouselWrapper) {
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(debounce(checkScrollable, 50));
            resizeObserver.observe(carouselWrapper);
            resizeObserver.observe(carousel);
        } else {
            window.addEventListener('resize', debounce(checkScrollable, 250));
        }
    }

    const newsletterLink = document.querySelector('.newsletter-link');
    if (newsletterLink) {
        newsletterLink.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Funcionalidad de suscripción no implementada en este prototipo.');
        });
    }

    if (modalCloseButton) modalCloseButton.addEventListener('click', closePurchaseModal);
    if (modalCloseConfirmationButton) modalCloseConfirmationButton.addEventListener('click', closePurchaseModal);
    if (modalTicketQuantityInput) modalTicketQuantityInput.addEventListener('input', updateModalTotalPrice);
    if (modalPaymentForm) modalPaymentForm.addEventListener('submit', handleModalPurchaseSubmit);
    if (purchaseModal) purchaseModal.addEventListener('click', (event) => { if (event.target === purchaseModal) closePurchaseModal(); });

    async function loadFestivalData() {
        console.log("Loading festival data (script.js)...");
        if (errorContainer) errorContainer.style.display = 'none';
        const ticketGridElement = document.getElementById('ticket-grid');
        const loadingTicketsP = document.getElementById('tickets-loading');

        if (ticketGridElement && !loadingTicketsP) {
            const p = document.createElement('p');
            p.id = 'tickets-loading';
            p.className = 'text-center col-span-full';
            p.style.gridColumn = '1 / -1';
            p.textContent = 'Cargando tipos de entrada...';
            ticketGridElement.innerHTML = '';
            ticketGridElement.appendChild(p);
        } else if (loadingTicketsP) {
            loadingTicketsP.textContent = 'Cargando tipos de entrada...';
            if (ticketGridElement) { ticketGridElement.innerHTML = ''; ticketGridElement.appendChild(loadingTicketsP); }
        }

        const [festivalData, ticketDataResultIgnored] = await Promise.all([
            fetchFestivalDetails(FESTIVAL_ID),
            fetchTicketTypes(FESTIVAL_ID)
        ]);

        displayFestivalDetails(festivalData);
        displayTicketTypes();

        console.log("Festival data loading complete (script.js).");
        checkScrollable();
    }

    loadFestivalData();

}); // Fin del DOMContentLoaded