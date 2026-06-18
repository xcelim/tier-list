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
                
                e.dataTransfer.setData('text/plain', card.dataset.id || '');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            card.addEventListener('dragend', () => {
                if (draggingCard) {
                    draggingCard.classList.remove('dragging');
                }
                // Si el placeholder sigue en el DOM, colocar la carta ahí y quitar el placeholder
                if (placeholder && placeholder.parentNode) {
                    placeholder.parentNode.insertBefore(draggingCard, placeholder);
                    placeholder.remove();
                }
                draggingCard = null;
                placeholder = null;
                saveTierListState();
            });
        });

        // Configurar los contenedores (filas y pool)
        const containers = [...tierRows, poolContent];
        
        containers.forEach(container => {
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                if (!draggingCard) return;

                // Encontrar el elemento sobre el que estamos flotando
                const afterElement = getDragAfterElement(container, e.clientX, e.clientY);
                
                // Asegurar que el placeholder tenga el tamaño correcto de la fila actual
                createPlaceholder(draggingCard);

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

    // Función matemática para saber exactamente en qué hueco meter el placeholder
    function getDragAfterElement(container, x, y) {
        const draggableElements = [...container.querySelectorAll('.character-card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            // Evaluamos la posición horizontal principalmente ya que es una cuadrícula/fila inline-flex
            const offset = x - box.left - box.width / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Inicializar al cargar
    initDragAndDrop();

    // Guardar estado (Stubs por si los necesitas para localStorage)
    function saveTierListState() {
        console.log("Estado guardado con éxito.");
    }
});