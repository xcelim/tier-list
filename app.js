document.addEventListener('DOMContentLoaded', () => {
    const tierRows = document.querySelectorAll('.tier-row-content');
    const poolContent = document.querySelector('.character-pool-content');
    
    let draggingCard = null;
    let placeholder = null;

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
            card.setAttribute('draggable', 'true');
            
            card.addEventListener('dragstart', (e) => {
                draggingCard = card;
                createPlaceholder(card);
                
                // Añadir clase para estilos visuales de arrastre
                setTimeout(() => {
                    card.classList.add('dragging');
                    // Insertar el placeholder justo donde estaba la carta inicialmente
                    card.parentNode.insertBefore(placeholder, card);
                }, 0);
            });

            card.addEventListener('dragend', () => {
                if (draggingCard) {
                    draggingCard.classList.remove('dragging');
                }
                if (placeholder && placeholder.parentNode) {
                    placeholder.parentNode.insertBefore(draggingCard, placeholder);
                    placeholder.remove();
                }
                draggingCard = null;
                saveTierListState();
            });
        });

        // Configurar los contenedores (filas de tiers y el pool)
        const containers = [...tierRows, poolContent];
        containers.forEach(container => {
            if (!container) return;

            container.addEventListener('dragover', (e) => {
                e.preventDefault(); // Permitir el drop
                if (!draggingCard) return;

                // Encontrar el elemento bajo el cursor excluyendo la carta arrastrada y el propio placeholder
                const afterElement = getDragAfterElement(container, e.clientX, e.clientY);
                
                if (afterElement == null) {
                    // Si vamos al final de la fila
                    container.appendChild(placeholder);
                } else {
                    // Si vamos hacia atrás o entre medias, se inserta justo antes del elemento detectado
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

    // Función matemática ultra precisa para detectar la carta exacta bajo el cursor
    // tanto moviéndose hacia adelante como hacia atrás en una cuadrícula fluida (wrap)
// Función matemática ultra precisa para saber exactamente dónde meter el placeholder
function getDragAfterElement(container, x, y) {
    const draggableElements = [...container.querySelectorAll('.character-card:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        
        // 1. Calculamos el centro horizontal exacto de la carta actual que estamos evaluando
        const cardCenterX = box.left + box.width / 2;
        
        // 2. Calculamos la distancia horizontal desde el ratón hasta el centro de la carta
        const offset = x - cardCenterX;
        
        // 3. Comprobamos si el cursor está dentro de los límites verticales de esta fila (por si hay wrap/multilínea)
        const isSameLine = y >= box.top && y <= box.bottom;

        // Si estamos en la misma línea visual
        if (isSameLine || draggableElements.length < 10) {
            // Si el ratón está a la izquierda del centro de esta carta (offset < 0)
            // y es la distancia más cercana que hemos registrado hasta ahora (offset > closest.offset)
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            }
        }
        
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

    // Inicializar al cargar
    initDragAndDrop();

    // Guardar estado (Stubs por si los necesitas para localStorage)
    function saveTierListState() {
        console.log("Estado guardado con éxito.");
    }
});