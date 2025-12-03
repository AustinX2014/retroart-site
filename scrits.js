// Detecta el idioma predeterminado del navegador y redirige a la versión correspondiente del sitio web
document.addEventListener('DOMContentLoaded', function() {
    const userLang = navigator.language || navigator.userLanguage;
    const currentPage = window.location.pathname.split('/').pop();
    
    if (userLang.startsWith('en') && !currentPage.includes('_en')) {
        window.location.href = currentPage.replace('.html', '_en.html');
    } else if (userLang.startsWith('es') && currentPage.includes('_en')) {
        window.location.href = currentPage.replace('_en.html', '.html');
    }
});

// Manejador para cambiar el idioma al hacer clic en las banderas
document.querySelectorAll('.language-switcher a').forEach(link => {
    link.addEventListener('click', function(event) {
        event.preventDefault();
        const targetLang = this.querySelector('img').alt.toLowerCase();
        const currentPage = window.location.pathname.split('/').pop();
        
        if (targetLang === 'es' && currentPage.includes('_en')) {
            window.location.href = currentPage.replace('_en.html', '.html');
        } else if (targetLang === 'english' && !currentPage.includes('_en')) {
            window.location.href = currentPage.replace('.html', '_en.html');
        }
    });
});


// Función para obtener y mostrar la hora actual
function displayTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    document.getElementById('current-time').textContent = `${hours}:${minutes}:${seconds}`;
}

// Mostrar la hora inicial al cargar la página
displayTime();

// Actualizar la hora cada segundo
setInterval(displayTime, 1000);