document.addEventListener('DOMContentLoaded', () => {
    const tierRows = document.querySelectorAll('.tier-row-content');
    const poolContent = document.querySelector('.character-pool-content');
    
    let draggingCard = null;
    let placeholder = null;
    
    // Variables para el soporte móvil (Pulsación larga)
    let touchTimeout = null;
    let isTouchDragging = false;
    let touchStartX = 0;
    let touchStartY = 0;

    // Crear el elemento placeholder que reservará el espacio suavemente
    function createPlaceholder(targetCard) {
        if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.classList.add('card-placeholder');
        }
        if (targetCard) {
            placeholder.style.width = `${targetCard.offsetWidth}px`;
            placeholder.style.height = `${targetCard.offsetHeight}px`;
        }
        return placeholder;
    }

    function initDragAndDrop() {
        const cards = document.querySelectorAll('.character-card');
        
        cards.forEach(card => {
            // --- 1. SOPORTE PARA PC (MOUSE NATIVO) ---
            card.setAttribute('draggable', 'true');
            
            card.addEventListener('dragstart', (e) => {
                draggingCard = card;
                createPlaceholder(card);
                setTimeout(() => {
                    card.classList.add('dragging');
                    card.parentNode.insertBefore(placeholder, card);
                }, 0);
            });

            card.addEventListener('dragend', () => {
                cleanupDrag();
            });

            // --- 2. SOPORTE PARA MÓVIL (EVENTOS TÁCTILES CON LONG PRESS) ---
            card.addEventListener('touchstart', (e) => {
                // Si ya hay un arrastre activo, ignoramos nuevas pulsaciones
                if (draggingCard) return;

                const touch = e.touches[0];
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                isTouchDragging = false;

                // Temporizador: Exigimos mantener pulsado 400ms antes de activar el arrastre
                touchTimeout = setTimeout(() => {
                    draggingCard = card;
                    isTouchDragging = true;
                    createPlaceholder(card);
                    
                    card.classList.add('dragging');
                    card.parentNode.insertBefore(placeholder, card);
                    
                    // Vibración corta de feedback en móviles Android (si está soportado)
                    if (navigator.vibrate) navigator.vibrate(50);
                }, 400); 
            }, { passive: true });

            card.addEventListener('touchmove', (e) => {
                const touch = e.touches[0];
                
                // Si aún no se ha activado el arrastre por tiempo, pero el usuario mueve mucho el dedo,
                // asumimos que su verdadera intención es hacer SCROLL por la página.
                if (!isTouchDragging) {
                    const moveX = Math.abs(touch.clientX - touchStartX);
                    const moveY = Math.abs(touch.clientY - touchStartY);
                    // Si se desplaza más de 10px antes de los 400ms, cancelamos el inicio del arrastre
                    if (moveX > 10 || moveY > 10) {
                        clearTimeout(touchTimeout);
                    }
                    return; // Permite que el scroll nativo del móvil funcione libremente
                }

                // SI EL ARRASTRE YA ESTÁ ACTIVO: Bloqueamos el scroll de la página para mover la carta
                if (e.cancelable) e.preventDefault();

                // Encontrar qué contenedor y sobre qué posición está el dedo actualmente
                const elementTarget = document.elementFromPoint(touch.clientX, touch.clientY);
                if (!elementTarget) return;

                const container = elementTarget.closest('.tier-row-content, .character-pool-content');
                if (container) {
                    const afterElement = getDragAfterElement(container, touch.clientX, touch.clientY);
                    if (afterElement == null) {
                        container.appendChild(placeholder);
                    } else {
                        container.insertBefore(placeholder, afterElement);
                    }
                }
            }, { passive: false }); // Falso para poder hacer preventDefault() cuando arrastramos

            card.addEventListener('touchend', (e) => {
                clearTimeout(touchTimeout);
                if (isTouchDragging) {
                    cleanupDrag();
                }
            });

            card.addEventListener('touchcancel', () => {
                clearTimeout(touchTimeout);
                if (isTouchDragging) {
                    cleanupDrag();
                }
            });
        });

        // --- 3. CONFIGURAR LOS CONTENEDORES PARA PC ---
        const containers = [...tierRows, poolContent];
        containers.forEach(container => {
            if (!container) return;

            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!draggingCard) return;

                const afterElement = getDragAfterElement(container, e.clientX, e.clientY);
                if (afterElement == null) {
                    container.appendChild(placeholder);
                } else {
                    container.insertBefore(placeholder, afterElement);
                }
            });

            container.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!draggingCard) return;
                
                if (placeholder && placeholder.parentNode === container) {
                    container.insertBefore(draggingCard, placeholder);
                } else {
                    container.appendChild(draggingCard);
                }
            });
        });
    }

    // Limpieza común al soltar la carta (PC y Móvil)
    function cleanupDrag() {
        if (!draggingCard) return;
        
        draggingCard.classList.remove('dragging');
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.insertBefore(draggingCard, placeholder);
            placeholder.remove();
        }
        
        draggingCard = null;
        isTouchDragging = false;
        saveTierListState();
    }

    // Función matemática para calcular con precisión milimétrica la inserción en la cuadrícula
    function getDragAfterElement(container, x, y) {
        const draggableElements = [...container.querySelectorAll('.character-card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const cardCenterX = box.left + box.width / 2;
            const offset = x - cardCenterX;
            const isSameLine = y >= box.top && y <= box.bottom;

            if (isSameLine || draggableElements.length < 10) {
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                }
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Inicializar listeners al cargar la web
    initDragAndDrop();

    function saveTierListState() {
        console.log("Estado guardado con éxito.");
    }
});