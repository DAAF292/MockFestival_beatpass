document.addEventListener('DOMContentLoaded', () => {
    const festivalNameFromHTML = document.getElementById('festival-name-placeholder')?.textContent || "Festival Increíble";
    const currentYear = new Date().getFullYear();
    let currentFontFamily = "'Inter', sans-serif"; // Font por defecto

    // --- Selectores del DOM Principales ---
    const layoutStructureSelect = document.getElementById('layout-structure');
    const fontFamilySelector = document.getElementById('font-family-selector');
    const paletteSelectors = document.querySelectorAll('.btn-palette');
    const sectionConfigItems = document.querySelectorAll('.section-config-item');
    const previewContainer = document.getElementById('preview-section-container');
    const previewMainContent = document.getElementById('preview-main-content');
    const applyPreviewButton = document.getElementById('apply-preview-button');

    if (!previewContainer || !previewMainContent) {
        console.error("Error CRÍTICO: No se encontraron los contenedores de previsualización 'preview-section-container' o 'preview-main-content'. La previsualización no funcionará.");
        if (document.body) {
            document.body.innerHTML = "<h1 style='color:red; text-align:center; margin-top: 50px;'>Error Crítico: Faltan elementos base para la previsualización. Revisa la consola.</h1>";
        }
        return; 
    }
    if (!layoutStructureSelect) console.warn("Advertencia: No se encontró el selector 'layout-structure'. Algunas funcionalidades podrían no operar correctamente.");
    if (!fontFamilySelector) console.warn("Advertencia: No se encontró el selector 'font-family-selector'. La selección de tipografía no funcionará.");


    // --- Configuración Inicial de Secciones ---
    let festivalSectionsConfig = [
        {
            id: 'header',
            title: 'Encabezado del Festival',
            show: true, order: 0,
            config: {
                showLogo: true,
                title: festivalNameFromHTML,
                subtitle: '¡La mejor música en vivo!',
                backgroundImageUrl: '',
                textAlignment: 'center'
            },
            renderContent: function(config) {
                let logoHtml = '';
                if (config.showLogo) {
                    const logoSrc = "https://www.beatpass.com/logo_beatpass_B_principal.png";
                    let logoStyle = "height: 50px; display: block; margin-bottom: 0.75rem;";
                    if (config.textAlignment === 'center') logoStyle += "margin-left: auto; margin-right: auto;";
                    else if (config.textAlignment === 'right') logoStyle += "margin-left: auto; margin-right: 0;";
                    else logoStyle += "margin-left: 0; margin-right: auto;";
                    logoHtml = `<img src="${logoSrc}" alt="Logo del Festival" style="${logoStyle}">`;
                }

                let headerStyles = `text-align: ${config.textAlignment || 'center'};`;
                if (config.backgroundImageUrl) {
                    try {
                        const safeBgImageUrl = CSS.escape(config.backgroundImageUrl);
                        headerStyles += ` background-image: url('${safeBgImageUrl}'); background-size: cover; background-position: center; padding: 3rem 1rem;`;
                         // Si hay imagen de fondo, el color del texto podría necesitar ser blanco o contrastante
                         // Esto se maneja mejor con clases de paleta o una opción explícita de color de texto del header.
                         // Por ahora, las paletas definirán el color del texto del header.
                    } catch (e) { console.error("Error al escapar URL de imagen de fondo del encabezado:", config.backgroundImageUrl, e); }
                }
                
                return `<div class="preview-header-sim" style="${headerStyles}">
                            ${logoHtml}
                            <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 0.25rem;">${config.title || festivalNameFromHTML}</h1>
                            ${config.subtitle ? `<p style="font-size: 1.125rem; margin-top: 0.25rem;">${config.subtitle}</p>` : ''}
                        </div>`;
            }
        },
        {
            id: 'informacion',
            title: 'Acerca del Festival',
            show: true, order: 1,
            config: {
                title: 'Acerca del Festival',
                text: `¡Bienvenidos a ${festivalNameFromHTML}! Un evento único con la mejor música, ambiente increíble y experiencias inolvidables. Prepárate para vibrar con nosotros.`,
                imageUrl: '',
                imageAlign: 'none' // 'none', 'left', 'right', 'top', 'bottom'
            },
            renderContent: function(config) {
                let imageHtml = '';
                if (config.imageUrl && config.imageAlign !== 'none') {
                    try {
                        const safeImageUrl = CSS.escape(config.imageUrl);
                        imageHtml = `<img src="${safeImageUrl}" alt="Imagen descriptiva" class="preview-section-informacion-image">`;
                    } catch (e) { console.error("Error al escapar URL de imagen de información:", config.imageUrl, e); }
                }

                const textContent = `<div class="preview-section-informacion-content">
                                        <h3>${config.title || 'Información'}</h3>
                                        <p>${(config.text || 'Contenido de la sección de información...').replace(/\n/g, '<br>')}</p>
                                     </div>`;

                if (!imageHtml) return textContent;

                if (config.imageAlign === 'top') return imageHtml + textContent;
                if (config.imageAlign === 'bottom') return textContent + imageHtml;
                if (config.imageAlign === 'left') return imageHtml + textContent; 
                if (config.imageAlign === 'right') return textContent + imageHtml; 
                
                return textContent;
            }
        },
        {
            id: 'artistas',
            title: 'Cartel Principal',
            show: true, order: 2,
            config: {
                title: 'Cartel Principal',
                count: 3,
                displayMode: 'list' // 'list', 'cards'
            },
            renderContent: function(config) {
                let listItems = '';
                const numArtistas = parseInt(config.count, 10) || 0;
                for(let i=1; i <= numArtistas; i++) {
                    if (config.displayMode === 'cards') {
                        listItems += `<li style="border: 1px solid currentColor; opacity:0.7; padding: 0.5rem; margin-bottom: 0.5rem; border-radius: 4px;">Artista Simulado ${i} (Tarjeta)</li>`;
                    } else {
                        listItems += `<li>Artista Simulado ${i}</li>`;
                    }
                }
                const listStyle = config.displayMode === 'cards' ? 'list-style-type: none; padding-left:0;' : '';
                return `<h3>${config.title || 'Artistas'}</h3>
                        <p>Mostrando los ${numArtistas} artistas más destacados (simulación en modo ${config.displayMode}).</p>
                        <ul style="${listStyle}">${listItems}</ul>`;
            }
        },
        {
            id: 'entradas',
            title: '¡Consigue tus Entradas!',
            show: true, order: 3,
            config: {
                title: '¡Consigue tus Entradas!',
                buttonText: 'Comprar Ahora'
            },
            renderContent: function(config) {
                return `<h3>${config.title || 'Entradas'}</h3>
                        <p>Aquí se mostrarían los tipos de entrada disponibles para ${festivalNameFromHTML}.</p>
                        <button class="btn-primary-preview">${config.buttonText || 'Comprar'}</button>`;
            }
        },
        {
            id: 'mapa',
            title: '¿Cómo Llegar?',
            show: true, order: 4,
            config: {
                title: '¿Cómo Llegar?',
                mapUrl: ''
            },
            renderContent: function(config) {
                let mapContent = `<div class="map-iframe-placeholder"><span>Proporciona una URL de Google Maps (embed) válida.</span></div>`;
                if (config.mapUrl) {
                    try {
                        // Validación más flexible pero aún simple
                        if (config.mapUrl.includes('google.com/maps/embed') || config.mapUrl.includes('googleusercontent.com/maps')) {
                           mapContent = `<iframe src="${CSS.escape(config.mapUrl)}" width="100%" height="350" style="border:0; border-radius: 0.25rem;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
                        } else {
                            mapContent = `<div class="map-iframe-placeholder"><span>URL de mapa no parece válida. Asegúrate que sea un enlace "embed" de Google Maps. Ejemplo: "https://www.google.com/maps/embed?pb=..."</span></div>`;
                        }
                    } catch(e) { 
                        console.error("Error al procesar URL del mapa:", config.mapUrl, e);
                        mapContent = `<div class="map-iframe-placeholder"><span>Error al procesar URL del mapa.</span></div>`;
                    }
                }
                return `<h3>${config.title || 'Mapa'}</h3>${mapContent}`;
            }
        },
        {
            id: 'footer',
            title: 'Pie de Página',
            show: true, order: 5,
            config: {
                text: `© ${festivalNameFromHTML} ${currentYear}. Todos los derechos reservados.`,
                showSocialIcons: false
            },
            renderContent: function(config) {
                let socialIconsHtml = '';
                if (config.showSocialIcons) {
                    // Usar SVGs inline o de una fuente fiable en lugar de placeholders si es posible
                    socialIconsHtml = `
                        <div class="preview-social-icons-simulated" style="margin-top: 0.75rem;">
                            <img src="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23777'%3E%3Cpath d='M12 2.04C6.48 2.04 2 6.48 2 12s4.48 9.96 10 9.96c5.52 0 10-4.48 10-9.96S17.52 2.04 12 2.04zm3.01 7.75h-1.99v5.76h-2.24v-5.76H9.27V8.03h1.51V6.7c0-1.21.57-1.98 1.98-1.98h1.53v1.73h-.94c-.47 0-.56.22-.56.55v1.03h1.5l-.21 1.72z'/%3E%3C/svg%3E" alt="Facebook">
                            <img src="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23777'%3E%3Cpath d='M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z'/%3E%3C/svg%3E" alt="Instagram">
                            <img src="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23777'%3E%3Cpath d='M22.46 6c-.77.35-1.6.58-2.46.67.88-.53 1.56-1.37 1.88-2.38-.83.49-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.22-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.94.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.01-.06C3.18 20.29 5.26 21 7.5 21c7.64 0 11.94-6.39 11.81-12.21v-.47c.82-.6 1.54-1.36 2.15-2.22z'/%3E%3C/svg%3E" alt="Twitter/X">
                        </div>`;
                }
                return `<div class="preview-footer-sim">
                            <p>${config.text || `© ${currentYear}`}</p>
                            ${socialIconsHtml}
                        </div>`;
            }
        }
    ];

    let currentPalette = 'palette-beatpass-default';
    let currentStructureTemplate = 'default'; // Definido para la carga inicial

    const configInputs = { // Definido aquí para que esté disponible globalmente en el scope del DOMContentLoaded
        header: {
            title: document.getElementById('content-header-title'),
            subtitle: document.getElementById('content-header-subtitle'),
            showLogo: document.getElementById('config-header-show-logo'),
            backgroundImageUrl: document.getElementById('content-header-bg-image'),
            textAlignment: document.getElementById('content-header-alignment')
        },
        informacion: {
            title: document.getElementById('content-informacion-title'),
            text: document.getElementById('content-informacion-text'),
            imageUrl: document.getElementById('content-informacion-image-url'),
            imageAlign: document.getElementById('content-informacion-image-align')
        },
        artistas: {
            title: document.getElementById('content-artistas-title'),
            count: document.getElementById('count-artistas'),
            displayMode: document.getElementById('content-artistas-display')
        },
        entradas: {
            title: document.getElementById('content-entradas-title'),
            buttonText: document.getElementById('text-entradas-button')
        },
        mapa: {
            title: document.getElementById('content-mapa-title'),
            mapUrl: document.getElementById('content-mapa-url')
        },
        footer: {
            text: document.getElementById('content-footer-text'),
            showSocialIcons: document.getElementById('config-footer-show-social')
        }
    };

    function updateSectionOrders(structure) {
        currentStructureTemplate = structure; // Actualizar la plantilla actual
        festivalSectionsConfig.forEach(s => s.order = 99);
        const getSection = (id) => festivalSectionsConfig.find(s => s.id === id);

        let activeSectionIds = [];
        switch (structure) {
            case 'artist-focused':
                activeSectionIds = ['header', 'artistas', 'informacion', 'entradas', 'mapa', 'footer'];
                break;
            case 'tickets-first':
                activeSectionIds = ['header', 'entradas', 'informacion', 'artistas', 'mapa', 'footer'];
                break;
            case 'minimalist':
                activeSectionIds = ['header', 'informacion', 'entradas', 'footer'];
                break;
            case 'default':
            default:
                activeSectionIds = ['header', 'informacion', 'artistas', 'entradas', 'mapa', 'footer'];
                break;
        }
        
        activeSectionIds.forEach((id, index) => {
            const section = getSection(id);
            if (section) section.order = index;
        });

        festivalSectionsConfig.forEach(s => {
            const toggle = document.getElementById(`toggle-${s.id}`);
            const itemUI = toggle ? toggle.closest('.section-config-item') : null;

            if (activeSectionIds.includes(s.id)) {
                // s.show se actualiza en updateConfigFromUIAndRender basado en el toggle.checked
                // Aquí solo manejamos la apariencia del editor
                if (itemUI) itemUI.classList.remove('config-disabled-by-template');
            } else {
                s.show = false; // Forzar oculto si no está en la plantilla
                if (toggle) toggle.checked = false;
                if (itemUI) itemUI.classList.add('config-disabled-by-template');
            }
        });
    }

    function renderPreview() {
        if (!previewContainer || !previewMainContent) return;

        previewMainContent.className = 'preview-area';
        previewMainContent.classList.add(currentPalette);
        if (currentFontFamily) { // Asegurar que no sea null o undefined
            previewMainContent.style.fontFamily = currentFontFamily;
        }
        previewContainer.innerHTML = '';

        const visibleSections = festivalSectionsConfig
            .filter(section => section.show)
            .sort((a, b) => a.order - b.order);

        visibleSections.forEach(sectionConfig => {
            const sectionDiv = document.createElement('div');
            sectionDiv.id = `preview-${sectionConfig.id}`;
            sectionDiv.className = `preview-section section-type-${sectionConfig.id}`;

            if (typeof sectionConfig.renderContent === 'function') {
                try {
                    const contentHtml = sectionConfig.renderContent(sectionConfig.config);
                    sectionDiv.innerHTML = contentHtml;

                    if (sectionConfig.id === 'informacion' && sectionConfig.config.imageUrl && sectionConfig.config.imageAlign !== 'none') {
                        sectionDiv.classList.add(`image-align-${sectionConfig.config.imageAlign}`);
                    }
                } catch (e) {
                    console.error(`Error al renderizar sección '${sectionConfig.id}':`, e, sectionConfig.config);
                    sectionDiv.innerHTML = `<div style="border:2px dashed red; padding:10px;"><h3>Error en sección: ${sectionConfig.title}</h3><p>Por favor, revisa la consola del navegador para más detalles. Este error puede deberse a una configuración incorrecta o un problema en la función de renderizado de la sección.</p></div>`;
                }
            } else {
                sectionDiv.innerHTML = `<h3>${sectionConfig.title}</h3><p>Función de renderizado no definida.</p>`;
            }
            previewContainer.appendChild(sectionDiv);
        });
    }

    function updateConfigFromUIAndRender() {
        if (layoutStructureSelect) {
            updateSectionOrders(layoutStructureSelect.value);
        } else {
            updateSectionOrders('default'); // Fallback
        }
        if (fontFamilySelector) {
            currentFontFamily = fontFamilySelector.value;
        }

        festivalSectionsConfig.forEach(section => {
            const toggle = document.getElementById(`toggle-${section.id}`);
            // Solo actualizar .show si la sección no está deshabilitada por la plantilla
            const itemUI = toggle ? toggle.closest('.section-config-item') : null;
            if (toggle && (!itemUI || !itemUI.classList.contains('config-disabled-by-template'))) {
                 section.show = toggle.checked;
            }


            const inputsForSection = configInputs[section.id];
            if (inputsForSection) {
                for (const key in inputsForSection) {
                    const inputElement = inputsForSection[key];
                    if (inputElement && section.config.hasOwnProperty(key)) {
                        if (inputElement.type === 'checkbox') {
                            section.config[key] = inputElement.checked;
                        } else if (inputElement.type === 'number') {
                            section.config[key] = parseInt(inputElement.value, 10);
                            if (isNaN(section.config[key])) { // Fallback si no es un número válido
                                section.config[key] = (key === 'count' && section.id === 'artistas') ? 0 : (inputElement.min || 0) ; 
                            }
                        } else {
                            section.config[key] = inputElement.value;
                        }
                    } else if (!inputElement && section.config.hasOwnProperty(key)) {
                         console.warn(`Advertencia en updateConfig: Input no encontrado para config '${section.id}.${key}'.`);
                    }
                }
            }
        });
        renderPreview();
    }

    function initializeEditorUI() {
        if (layoutStructureSelect) layoutStructureSelect.value = currentStructureTemplate; // Usar la variable global
        if (fontFamilySelector) fontFamilySelector.value = currentFontFamily;

        paletteSelectors.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.palette === currentPalette);
        });
        
        updateSectionOrders(currentStructureTemplate); // Aplicar plantilla y actualizar visibilidad de toggles

        festivalSectionsConfig.forEach(section => {
            const toggle = document.getElementById(`toggle-${section.id}`);
            if (toggle) { // Actualizar el estado del checkbox según s.show (que pudo ser modificado por updateSectionOrders)
                 toggle.checked = section.show;
            }


            const inputsForSection = configInputs[section.id];
            if (inputsForSection) {
                for (const key in inputsForSection) {
                    const inputElement = inputsForSection[key];
                    if (inputElement && section.config.hasOwnProperty(key)) {
                        const configValue = section.config[key];
                        if (inputElement.type === 'checkbox') {
                            inputElement.checked = configValue;
                        } else {
                            inputElement.value = configValue;
                        }
                        if (section.id === 'header' && key === 'title' && configValue === festivalNameFromHTML && inputElement.value === festivalNameFromHTML) {
                            inputElement.placeholder = festivalNameFromHTML;
                            // No blanquear el valor si es el default, HTML se encarga del placeholder si value es ""
                        }
                    } else if (!inputElement && section.config.hasOwnProperty(key)) {
                        console.warn(`Advertencia en initUI: Input no encontrado para config '${section.id}.${key}'.`);
                    }
                }
            }
            
            const itemUI = toggle ? toggle.closest('.section-config-item') : null;
            if (itemUI) {
                if (section.order > 0 && !itemUI.classList.contains('config-disabled-by-template')) { 
                    itemUI.classList.add('collapsed');
                } else {
                    itemUI.classList.remove('collapsed');
                }
            }
        });
    }

    // --- Event Listeners ---
    if (layoutStructureSelect) {
        layoutStructureSelect.addEventListener('change', updateConfigFromUIAndRender);
    }
    if (fontFamilySelector) {
        fontFamilySelector.addEventListener('change', updateConfigFromUIAndRender);
    }

    paletteSelectors.forEach(button => {
        button.addEventListener('click', () => {
            currentPalette = button.dataset.palette;
            paletteSelectors.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            renderPreview();
        });
    });

    const allEditorControlElements = document.querySelectorAll(
        '.section-toggle, input.input-field, input.input-sm, textarea.input-sm, select.input-field, select.input-sm, input.form-checkbox-sm'
    );

    allEditorControlElements.forEach(element => {
        if (element === layoutStructureSelect || element === fontFamilySelector) return; // Ya tienen listeners específicos

        const eventType = (element.type === 'checkbox' || element.tagName === 'SELECT') ? 'change' : 'input';
        let debounceTimer;
        element.addEventListener(eventType, () => {
            if (['text', 'url', 'number'].includes(element.type) || element.tagName === 'TEXTAREA') {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(updateConfigFromUIAndRender, 350);
            } else {
                updateConfigFromUIAndRender();
            }
        });
    });

    sectionConfigItems.forEach(item => {
        const header = item.querySelector('.section-config-header');
        if (header) {
            header.addEventListener('click', (event) => {
                if (event.target.closest('.section-header-controls')) {
                    return; 
                }
                item.classList.toggle('collapsed');
            });
        }
    });
    
    if (applyPreviewButton) {
        applyPreviewButton.addEventListener('click', updateConfigFromUIAndRender);
    } else {
        console.warn("Advertencia: Botón 'apply-preview-button' no encontrado.");
    }

    // --- Inicialización ---
    try {
        initializeEditorUI();
        renderPreview(); 
    } catch (e) {
        console.error("Error CRÍTICO durante la inicialización del editor:", e);
        if(previewContainer) { // Solo intentar modificar si previewContainer existe
            previewContainer.innerHTML = "<div style='border:3px dashed red; background-color:white; padding:20px; text-align:center;'><h2 style='color:red;'>Error al Cargar el Editor</h2><p>Ha ocurrido un error crítico que impide la carga del editor. Por favor, revisa la consola del navegador (F12) para ver los detalles técnicos y poder solucionar el problema.</p><p>Algunas causas comunes pueden ser: IDs de HTML incorrectos, errores de sintaxis en JavaScript, o problemas al acceder a elementos que no existen.</p></div>";
        }
        // También mostrar un mensaje de alerta para asegurar que el usuario lo vea
        alert("Error CRÍTICO al inicializar el editor. Revisa la consola del navegador (F12) para más detalles.");
    }
});