/**
 * Punto de entrada principal de la aplicación (Inicialización y Enrutamiento)
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Manejo del historial del navegador (Botón Atrás/Adelante)
    window.addEventListener('popstate', e => {
        if (S.hasUnsaved && !confirm('¿Descartar cambios sin guardar?')) {
            // Si el usuario cancela, lo forzamos a quedarse en el editor
            window.history.pushState({ page: 'editor', id: S.cid }, '', '?p=editor&id=' + S.cid);
            return;
        }
        
        S.hasUnsaved = false;
        if (e.state && e.state.page) {
            S.page = e.state.page;
            if (e.state.page === 'editor' && e.state.id) {
                openEditor(e.state.id);
            }
        } else {
            S.page = 'home';
        }
        render();
    });

    // 2. Registro del Service Worker para PWA (App instalable)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => {
            console.warn('Service Worker no registrado:', err);
        });
    }

    // 3. Verificación de Sesión Activa con Supabase
    try {
        const { data: { session } } = await sbClient.auth.getSession();
        userSession = session;
        
        if (userSession) {
            // Cargar el perfil del usuario logueado
            const { data: profile } = await sbClient.from('profiles').select('*').eq('id', userSession.user.id).single();
            if (profile) {
                currentUserProfile = profile;
            }
            
            // Inicializar estructura local si es un usuario nuevo
            if (!S.activeProfile && S.profiles.length === 0) {
                S.profiles.push({ 
                    id: userSession.user.id, 
                    name: profile ? profile.name : 'Usuario', 
                    is_admin: profile ? profile.is_admin : false, 
                    tls: [] 
                });
                S.activeProfile = userSession.user.id;
            }
            
            // Cargar datos en segundo plano
            fetchChats();
            fetchNotifications();
        }
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
    }

    // 4. Leer parámetros de la URL para accesos directos (ej: ?p=editor&id=xyz)
    const urlParams = new URLSearchParams(window.location.search);
    const initPage = urlParams.get('p');
    if (initPage) {
        S.page = initPage;
        if (initPage === 'editor') {
            const tlId = urlParams.get('id');
            if (tlId) {
                // Esperamos un poco para asegurar que las plantillas se cargaron
                setTimeout(() => openEditor(tlId), 500); 
            }
        }
    }

    // 5. Renderizado inicial de la interfaz
    render();
});