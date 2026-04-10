/* ==============================
   OptiTransit V3 — app.js
   Venezuela Transport Público App
   Solo Transporte Público + Perfil + Historial
   ============================== */

// ========== GLOBAL STATE ==========
const AppState = {
    user: null,
    userLocation: null,
    userCity: null,
    selectedCurrency: 'usd',
    exchangeRates: { usd: 1, eur: 0.92, usdt: 1, bs: 36.50 },
    buses: [],
    maps: { main: null, tracking: null, result: null },
    trackingMapInit: false,
    vehicleMarkers: [],
    tarifaPorKm: 0.15,
    tarifaBase: 0.50,
    favorites: JSON.parse(localStorage.getItem('optitransit_favs') || '[]'),
    lang: localStorage.getItem('optitransit_lang') || 'es',
    theme: localStorage.getItem('optitransit_theme') || 'light',
    cityFilter: 'all'
};

// ========== I18N ==========
const I18N = {
    es: {
        rememberMe: 'Recuérdame', forgotPassword: '¿Olvidé mi contraseña?',
        loginBtn: 'Iniciar Sesión', busesNearby: 'Buses Públicos Cercanos',
        live: 'En vivo', shareLocation: 'Compartir Ubicación',
        shareLocationBtn: 'Compartir mi ubicación actual', logout: 'Cerrar Sesión',
        allCities: 'Todas', loginTitle: 'Bienvenido', registerTitle: 'Crear Cuenta',
        headerSub: 'Transporte Público', searchPlaceholder: '¿A dónde quieres ir?',
        routesActive: 'Rutas Activas', busesInService: 'Buses en Servicio',
        stops: 'Paradas', usersToday: 'Usuarios Hoy', realTimeMap: 'Mapa en Tiempo Real',
        searchRoute: 'Buscar Ruta', findTransport: 'Encuentra qué transporte público tomar para llegar a tu destino',
        liveTracking: 'Rastreo en Vivo', myProfile: 'Mi Perfil',
        manageAccount: 'Gestiona tu cuenta y revisa tu historial',
        editProfile: 'Editar Perfil', tripHistory: 'Historial de Viajes',
        home: 'Inicio', routes: 'Rutas', tracking: 'Rastreo', profile: 'Perfil',
        request: 'Solicitar', favorite: 'Favorito', schedule: 'Horarios',
        chatWith: 'Chat con', sendMsg: 'Escribe un mensaje...',
    },
    en: {
        rememberMe: 'Remember me', forgotPassword: 'Forgot password?',
        loginBtn: 'Sign In', busesNearby: 'Nearby Public Buses',
        live: 'Live', shareLocation: 'Share Location',
        shareLocationBtn: 'Share my current location', logout: 'Sign Out',
        allCities: 'All', loginTitle: 'Welcome', registerTitle: 'Create Account',
        headerSub: 'Public Transport', searchPlaceholder: 'Where do you want to go?',
        routesActive: 'Active Routes', busesInService: 'Buses in Service',
        stops: 'Stops', usersToday: 'Users Today', realTimeMap: 'Real-Time Map',
        searchRoute: 'Search Route', findTransport: 'Find what public transport to take to reach your destination',
        liveTracking: 'Live Tracking', myProfile: 'My Profile',
        manageAccount: 'Manage your account and review your history',
        editProfile: 'Edit Profile', tripHistory: 'Trip History',
        home: 'Home', routes: 'Routes', tracking: 'Tracking', profile: 'Profile',
        request: 'Request', favorite: 'Favorite', schedule: 'Schedule',
        chatWith: 'Chat with', sendMsg: 'Write a message...',
    }
};

function t(key) { return I18N[AppState.lang]?.[key] || I18N.es[key] || key; }

function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (I18N[AppState.lang]?.[key]) el.textContent = I18N[AppState.lang][key];
    });
}

// ========== PASSWORD HASHING ==========
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'optitransit_salt_2024');
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ========== VENEZUELA CITIES ==========
const VENEZUELA_CITIES = {
    'Valencia': { coords: [10.1620, -67.9965], state: 'Carabobo' },
    'Caracas': { coords: [10.4806, -66.9036], state: 'Distrito Capital' },
    'Maracaibo': { coords: [10.6417, -71.6328], state: 'Zulia' },
    'Barquisimeto': { coords: [10.0678, -69.3474], state: 'Lara' },
    'Maracay': { coords: [10.2442, -67.5972], state: 'Aragua' },
    'Barcelona': { coords: [10.1364, -64.6864], state: 'Anzoátegui' },
    'Puerto La Cruz': { coords: [10.2176, -64.6303], state: 'Anzoátegui' },
    'Ciudad Bolívar': { coords: [8.1222, -63.5497], state: 'Bolívar' },
    'Mérida': { coords: [8.5897, -71.1561], state: 'Mérida' },
    'San Cristóbal': { coords: [7.7667, -72.2250], state: 'Táchira' },
    'Maturín': { coords: [9.7500, -63.1833], state: 'Monagas' },
    'Puerto Ordaz': { coords: [8.2833, -62.7333], state: 'Bolívar' },
    'Cumaná': { coords: [10.4500, -64.1667], state: 'Sucre' },
    'Los Teques': { coords: [10.3411, -67.0408], state: 'Miranda' },
    'Guanare': { coords: [9.0450, -69.7414], state: 'Portuguesa' },
    'Acarigua': { coords: [9.5500, -69.1833], state: 'Portuguesa' },
    'Cabimas': { coords: [10.3964, -71.4522], state: 'Zulia' },
    'Punto Fijo': { coords: [11.6906, -70.2050], state: 'Falcón' },
    'Coro': { coords: [11.4000, -69.6833], state: 'Falcón' },
    'El Tigre': { coords: [8.8833, -64.2667], state: 'Anzoátegui' },
    'Porlamar': { coords: [11.0000, -63.8500], state: 'Nueva Esparta' },
    'San Fernando': { coords: [7.8833, -67.4667], state: 'Apure' },
    'Valera': { coords: [9.3167, -70.6000], state: 'Trujillo' },
};

const VALENCIA_LOCATIONS = {
    'Centro de Valencia': [10.1620, -67.9965],
    'Naguanagua': [10.1850, -68.0250],
    'San Diego': [10.2300, -67.9580],
    'Los Guayos': [10.1840, -67.9310],
    'Guacara': [10.2260, -67.8870],
    'Tocuyito': [10.0950, -68.0800],
    'La Isabelica': [10.1900, -67.9700],
    'Prebo': [10.1750, -68.0100],
    'Trigal': [10.1850, -68.0050],
    'Carabobo Mall': [10.1950, -68.0150],
    'C.C. Metrópolis': [10.1800, -67.9900],
    'Terminal de Valencia': [10.1550, -67.9900],
    'Aeropuerto Arturo Michelena': [10.1500, -67.9280],
    'Bárbula': [10.1920, -68.0350],
    'La Viña': [10.1710, -68.0120],
    'El Viñedo': [10.1680, -67.9980],
    'Las Acacias': [10.1580, -67.9830],
    'Flor Amarillo': [10.1420, -67.9600],
    'Miguel Peña': [10.1350, -68.0050],
    'Rafael Urdaneta': [10.1480, -68.0200],
};

// ========== BUS DATA — SOLO PÚBLICO ==========
function generateBuses() {
    return [
        {
            id: 'R-001', nombre: 'MetroBus Valencia Centro',
            desde: 'Terminal de Valencia', hasta: 'San Diego',
            paradas: 12, distanciaKm: 14.5, conductor: 'Carlos Méndez', telefono: '0412-555-1234',
            ciudad: 'Valencia', icon: '🚌',
            position: [10.1620, -67.9965], status: 'online', speed: '35 km/h'
        },
        {
            id: 'R-002', nombre: 'Ruta Naguanagua Express',
            desde: 'Centro de Valencia', hasta: 'Naguanagua',
            paradas: 8, distanciaKm: 7.2, conductor: 'Luis Rodríguez', telefono: '0414-333-5678',
            ciudad: 'Valencia', icon: '🚌',
            position: [10.1850, -68.0250], status: 'online', speed: '28 km/h'
        },
        {
            id: 'R-003', nombre: 'CircularSur Guacara',
            desde: 'Los Guayos', hasta: 'Guacara',
            paradas: 10, distanciaKm: 9.8, conductor: 'Maria García', telefono: '0424-111-9012',
            ciudad: 'Valencia', icon: '🚐',
            position: [10.2260, -67.8870], status: 'online', speed: '32 km/h'
        },
        {
            id: 'R-004', nombre: 'TransCarabobo Tocuyito',
            desde: 'Tocuyito', hasta: 'Centro de Valencia',
            paradas: 15, distanciaKm: 12.3, conductor: 'José Hernández', telefono: '0416-222-3456',
            ciudad: 'Valencia', icon: '🚌',
            position: [10.0950, -68.0800], status: 'online', speed: '25 km/h'
        },
        {
            id: 'R-005', nombre: 'Ruta La Isabelica - Trigal',
            desde: 'La Isabelica', hasta: 'Trigal',
            paradas: 9, distanciaKm: 6.1, conductor: 'Pedro Martínez', telefono: '0412-777-8901',
            ciudad: 'Valencia', icon: '🚌',
            position: [10.1900, -67.9700], status: 'online', speed: '30 km/h'
        },
        {
            id: 'R-006', nombre: 'Ruta Prebo - C.C. Metrópolis',
            desde: 'Prebo', hasta: 'C.C. Metrópolis',
            paradas: 6, distanciaKm: 4.5, conductor: 'Ana López', telefono: '0414-888-2345',
            ciudad: 'Valencia', icon: '🚐',
            position: [10.1750, -68.0100], status: 'online', speed: '22 km/h'
        },
        {
            id: 'R-007', nombre: 'Interurbano Valencia - Maracay',
            desde: 'Terminal de Valencia', hasta: 'Maracay',
            paradas: 5, distanciaKm: 52.0, conductor: 'Roberto Díaz', telefono: '0424-555-6789',
            ciudad: 'Valencia', icon: '🚌',
            position: [10.1550, -67.9900], status: 'online', speed: '65 km/h'
        },
        {
            id: 'R-008', nombre: 'Ruta Bárbula - Universidad',
            desde: 'Bárbula', hasta: 'Centro de Valencia',
            paradas: 7, distanciaKm: 5.8, conductor: 'Carmen Ruiz', telefono: '0416-444-0123',
            ciudad: 'Valencia', icon: '🚐',
            position: [10.1920, -68.0350], status: 'online', speed: '20 km/h'
        },
        {
            id: 'R-009', nombre: 'Ruta Flor Amarillo - Centro',
            desde: 'Flor Amarillo', hasta: 'Centro de Valencia',
            paradas: 11, distanciaKm: 8.9, conductor: 'Miguel Torres', telefono: '0412-999-4567',
            ciudad: 'Valencia', icon: '🚌',
            position: [10.1420, -67.9600], status: 'online', speed: '27 km/h'
        },
        {
            id: 'R-010', nombre: 'Ruta Miguel Peña - Naguanagua',
            desde: 'Miguel Peña', hasta: 'Naguanagua',
            paradas: 13, distanciaKm: 11.2, conductor: 'Luisa Méndez', telefono: '0414-222-7890',
            ciudad: 'Valencia', icon: '🚌',
            position: [10.1350, -68.0050], status: 'online', speed: '24 km/h'
        },
        {
            id: 'R-011', nombre: 'Ruta Carabobo Mall Express',
            desde: 'Terminal de Valencia', hasta: 'Carabobo Mall',
            paradas: 4, distanciaKm: 5.0, conductor: 'Fernando Rivas', telefono: '0424-333-1234',
            ciudad: 'Valencia', icon: '🚐',
            position: [10.1950, -68.0150], status: 'online', speed: '30 km/h'
        },
        {
            id: 'R-012', nombre: 'Interurbano Valencia - Caracas',
            desde: 'Terminal de Valencia', hasta: 'Caracas',
            paradas: 4, distanciaKm: 158.0, conductor: 'Andrés Velásquez', telefono: '0412-111-5678',
            ciudad: 'Valencia', icon: '🚌',
            position: [10.1600, -67.9950], status: 'online', speed: '80 km/h'
        },
        {
            id: 'R-013', nombre: 'Ruta Rafael Urdaneta - San Diego',
            desde: 'Rafael Urdaneta', hasta: 'San Diego',
            paradas: 10, distanciaKm: 10.5, conductor: 'Gabriela Suárez', telefono: '0416-555-9012',
            ciudad: 'Valencia', icon: '🚌',
            position: [10.1480, -68.0200], status: 'online', speed: '26 km/h'
        },
        {
            id: 'R-014', nombre: 'Ruta La Viña - Los Guayos',
            desde: 'La Viña', hasta: 'Los Guayos',
            paradas: 14, distanciaKm: 13.7, conductor: 'Ricardo Paredes', telefono: '0414-666-3456',
            ciudad: 'Valencia', icon: '🚌',
            position: [10.1710, -68.0120], status: 'warning', speed: '22 km/h'
        },
        {
            id: 'R-015', nombre: 'Bus en Mantenimiento',
            desde: '--', hasta: '--',
            paradas: 0, distanciaKm: 0, conductor: 'En taller', telefono: '--',
            ciudad: 'Valencia', icon: '🚌',
            position: [10.1620, -67.9965], status: 'offline', speed: '--'
        },
    ];
}

// ========== PRICING FUNCTIONS ==========
function calcularPrecioUSD(distanciaKm) {
    return AppState.tarifaBase + (distanciaKm * AppState.tarifaPorKm);
}

function calcularPrecios(distanciaKm) {
    const usd = calcularPrecioUSD(distanciaKm);
    return {
        usd: +usd.toFixed(2),
        eur: +(usd * AppState.exchangeRates.eur).toFixed(2),
        usdt: +usd.toFixed(2),
        bs: +(usd * AppState.exchangeRates.bs).toFixed(2)
    };
}

function formatPrice(precios) {
    const currency = AppState.selectedCurrency;
    const val = precios[currency];
    const symbols = { usd: '$', eur: '€', usdt: 'USDT ', bs: 'Bs. ' };
    const formatted = currency === 'bs' ? val.toFixed(0) : val.toFixed(2);
    return `${symbols[currency]}${formatted}`;
}

// ========== APP INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    AppState.buses = generateBuses();
    initSplashScreen();
});

function initSplashScreen() {
    const splash = document.getElementById('splash-screen');
    setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => {
            splash.style.display = 'none';
            lucide.createIcons();
            showLocationScreen();
        }, 600);
    }, 2200);
}

// ========== LOCATION PERMISSION ==========
function showLocationScreen() {
    const screen = document.getElementById('location-screen');
    screen.classList.remove('hidden');
    lucide.createIcons();

    document.getElementById('btn-allow-location').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    AppState.userLocation = [pos.coords.latitude, pos.coords.longitude];
                    AppState.userCity = detectCity(pos.coords.latitude, pos.coords.longitude);
                    const detected = document.getElementById('location-detected');
                    document.getElementById('detected-city').textContent = `📍 ${AppState.userCity}`;
                    detected.classList.add('show');
                    setTimeout(() => {
                        screen.classList.add('hidden');
                        checkAuth();
                    }, 1200);
                },
                () => {
                    AppState.userCity = 'Valencia';
                    AppState.userLocation = VENEZUELA_CITIES['Valencia'].coords;
                    screen.classList.add('hidden');
                    checkAuth();
                }
            );
        } else {
            AppState.userCity = 'Valencia';
            AppState.userLocation = VENEZUELA_CITIES['Valencia'].coords;
            screen.classList.add('hidden');
            checkAuth();
        }
    });

    document.getElementById('btn-skip-location').addEventListener('click', () => {
        AppState.userCity = 'Valencia';
        AppState.userLocation = VENEZUELA_CITIES['Valencia'].coords;
        screen.classList.add('hidden');
        checkAuth();
    });
}

function detectCity(lat, lng) {
    let closest = 'Valencia';
    let minDist = Infinity;
    for (const [city, data] of Object.entries(VENEZUELA_CITIES)) {
        const d = Math.sqrt(Math.pow(lat - data.coords[0], 2) +
            Math.pow(lng - data.coords[1], 2));
        if (d < minDist) { minDist = d; closest = city; }
    }
    return closest;
}

// ========== AUTH SYSTEM ==========
function checkAuth() {
    const savedUser = localStorage.getItem('optitransit_user');
    if (savedUser) {
        AppState.user = JSON.parse(savedUser);
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('auth-login').classList.remove('hidden');
    document.getElementById('auth-register').classList.add('hidden');
    lucide.createIcons();

    // Auto-fill remembered email
    const remembered = localStorage.getItem('optitransit_remembered');
    if (remembered) {
        document.getElementById('login-email').value = remembered;
        document.getElementById('remember-me').checked = true;
    }

    document.getElementById('btn-login').onclick = handleLogin;

    document.getElementById('goto-register').onclick = () => {
        document.getElementById('auth-login').classList.add('hidden');
        showRegister();
    };
    document.getElementById('login-password').onkeyup = (e) => {
        if (e.key === 'Enter') handleLogin();
    };

    // Forgot password
    document.getElementById('forgot-password').onclick = () => {
        document.getElementById('forgot-modal').classList.remove('hidden');
        document.getElementById('forgot-success').style.display = 'none';
        document.getElementById('forgot-email').value = document.getElementById('login-email').value || '';
    };
    document.getElementById('btn-forgot-send').onclick = () => {
        const email = document.getElementById('forgot-email').value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
        document.getElementById('forgot-success').style.display = 'block';
        setTimeout(() => document.getElementById('forgot-modal').classList.add('hidden'), 2500);
    };
    document.getElementById('btn-forgot-cancel').onclick = () => {
        document.getElementById('forgot-modal').classList.add('hidden');
    };
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('btn-login');

    if (!email || !password) {
        errorEl.textContent = 'Por favor completa todos los campos.';
        errorEl.style.display = 'block'; return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errorEl.textContent = 'Formato de correo electrónico inválido.';
        errorEl.style.display = 'block'; return;
    }

    // Show spinner
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Verificando...';

    const hashedPw = await hashPassword(password);
    const users = JSON.parse(localStorage.getItem('optitransit_users') || '[]');
    // Support both old (plain) and new (hashed) passwords
    const user = users.find(u => u.email === email && (u.password === hashedPw || u.password === password));

    if (!user) {
        errorEl.textContent = 'Correo o contraseña incorrectos.';
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="log-in"></i> <span data-i18n="loginBtn">Iniciar Sesión</span>';
        lucide.createIcons(); return;
    }

    // Remember me
    if (document.getElementById('remember-me').checked) {
        localStorage.setItem('optitransit_remembered', email);
    } else {
        localStorage.removeItem('optitransit_remembered');
    }

    AppState.user = user;
    localStorage.setItem('optitransit_user', JSON.stringify(user));

    setTimeout(() => {
        btn.disabled = false;
        document.getElementById('auth-login').classList.add('hidden');
        showApp();
    }, 800);
}

function showRegister() {
    document.getElementById('auth-register').classList.remove('hidden');
    document.getElementById('auth-login').classList.add('hidden');
    lucide.createIcons();

    document.getElementById('btn-register').onclick = handleRegister;

    document.getElementById('goto-login').onclick = () => {
        document.getElementById('auth-register').classList.add('hidden');
        showLogin();
    };
    document.getElementById('reg-password').onkeyup = (e) => {
        if (e.key === 'Enter') handleRegister();
    };

    // Terms modal
    document.getElementById('show-terms').onclick = () => {
        document.getElementById('terms-modal').classList.remove('hidden');
    };
    document.getElementById('close-terms').onclick = () => {
        document.getElementById('terms-modal').classList.add('hidden');
    };
}

async function handleRegister() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const acceptTerms = document.getElementById('accept-terms').checked;
    const errorEl = document.getElementById('reg-error');
    const btn = document.getElementById('btn-register');

    if (!name || !email || !phone || !password) {
        errorEl.textContent = 'Por favor completa todos los campos.';
        errorEl.style.display = 'block'; return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errorEl.textContent = 'Formato de correo electrónico inválido.';
        errorEl.style.display = 'block'; return;
    }
    if (password.length < 6) {
        errorEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        errorEl.style.display = 'block'; return;
    }
    if (!acceptTerms) {
        errorEl.textContent = 'Debes aceptar los Términos y Condiciones.';
        errorEl.style.display = 'block'; return;
    }

    const users = JSON.parse(localStorage.getItem('optitransit_users') || '[]');
    if (users.find(u => u.email === email)) {
        errorEl.textContent = 'Ya existe una cuenta con este correo.';
        errorEl.style.display = 'block'; return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Creando cuenta...';

    const hashedPw = await hashPassword(password);
    const newUser = { name, email, phone, password: hashedPw, createdAt: new Date().toISOString() };
    users.push(newUser);
    localStorage.setItem('optitransit_users', JSON.stringify(users));
    localStorage.setItem('optitransit_user', JSON.stringify(newUser));
    AppState.user = newUser;

    setTimeout(() => {
        btn.disabled = false;
        document.getElementById('auth-register').classList.add('hidden');
        showApp();
    }, 800);
}

// ========== SHOW MAIN APP ==========
function showApp() {
    document.getElementById('app').classList.remove('hidden');
    // Apply saved theme
    if (AppState.theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('btn-theme').textContent = '☀️';
    }
    lucide.createIcons();
    initNavigation();
    initMaps();
    updateLocationBar();
    animateStats();
    initCityFilter();
    populateBuses();
    initCurrencySelector();
    initRouteOptimizer();
    initNotifications();
    initProfile();
    initDarkMode();
    initShareLocation();
    initPhotoUpload();
    initHelp();
    fetchExchangeRates();
    applyLanguage();
}

function updateLocationBar() {
    const cityEl = document.getElementById('current-city');
    const city = AppState.userCity || 'Valencia';
    const state = VENEZUELA_CITIES[city]?.state || 'Carabobo';
    cityEl.textContent = `${city}, ${state}`;
}

// ========== NAVIGATION ==========
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.dataset.page;
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(`page-${targetPage}`).classList.add('active');

            if (targetPage === 'tracking' && !AppState.trackingMapInit) {
                setTimeout(() => initTrackingMap(), 150);
            }
            if (targetPage === 'profile') {
                loadProfileData();
                loadTripHistory();
            }
            if (navigator.vibrate) navigator.vibrate(10);
        });
    });

    // Header profile button → go to profile tab
    document.getElementById('btn-profile-header').addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        document.getElementById('nav-profile').classList.add('active');
        pages.forEach(p => p.classList.remove('active'));
        document.getElementById('page-profile').classList.add('active');
        loadProfileData();
        loadTripHistory();
    });
}

// ========== MAPS ==========
function initMaps() {
    const center = AppState.userLocation || VENEZUELA_CITIES['Valencia'].coords;

    AppState.maps.main = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView(center, 13);

    L.control.zoom({ position: 'topright' }).addTo(AppState.maps.main);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
    }).addTo(AppState.maps.main);

    if (AppState.userLocation) {
        L.circleMarker(AppState.userLocation, {
            radius: 9, color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.9, weight: 3
        }).addTo(AppState.maps.main).bindPopup('<strong>📍 Tu ubicación</strong>');

        L.circle(AppState.userLocation, {
            radius: 500, color: '#3B82F6', fillColor: '#3B82F6',
            fillOpacity: 0.06, weight: 1
        }).addTo(AppState.maps.main);
    }

    addBusMarkers(AppState.maps.main);

    document.getElementById('btn-locate').addEventListener('click', () => {
        if (AppState.userLocation) {
            AppState.maps.main.setView(AppState.userLocation, 15);
        }
    });

    setTimeout(() => AppState.maps.main.invalidateSize(), 300);
}

function addBusMarkers(map) {
    AppState.buses.forEach(bus => {
        if (bus.status === 'offline') return;

        const color = '#10B981';
        const icon = L.divIcon({
            html: `<div style="
                width: 32px; height: 32px;
                background: ${color};
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 2px 8px ${color}60;
                border: 2.5px solid white;
                font-size: 14px;
                cursor: pointer;
            ">${bus.icon}</div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const precios = calcularPrecios(bus.distanciaKm);
        const marker = L.marker(bus.position, { icon })
            .addTo(map)
            .bindPopup(`
                <strong>${bus.id}: ${bus.nombre}</strong><br>
                <span style="color:#10B981;font-weight:700;">🚌 Transporte Público</span><br>
                ${bus.desde} → ${bus.hasta}<br>
                <span style="font-weight:700;">💰 $${precios.usd} USD (${bus.distanciaKm} km)</span><br>
                <em style="font-size:11px;">Conductor: ${bus.conductor}</em>
            `);

        animateBusMarker(marker, bus.position);
    });
}

function animateBusMarker(marker, basePos) {
    let angle = Math.random() * Math.PI * 2;
    const speed = 0.012 + Math.random() * 0.008;
    const radiusLat = 0.008 + Math.random() * 0.010;
    const radiusLng = 0.010 + Math.random() * 0.012;

    setInterval(() => {
        angle += speed;
        const newLat = basePos[0] + Math.sin(angle) * radiusLat;
        const newLng = basePos[1] + Math.cos(angle * 0.6) * radiusLng;
        marker.setLatLng([newLat, newLng]);
    }, 600);
}

function initTrackingMap() {
    if (AppState.trackingMapInit) return;

    const center = AppState.userLocation || VENEZUELA_CITIES['Valencia'].coords;

    AppState.maps.tracking = L.map('tracking-map', {
        zoomControl: false,
        attributionControl: false
    }).setView(center, 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(AppState.maps.tracking);

    if (AppState.userLocation) {
        L.circleMarker(AppState.userLocation, {
            radius: 8, color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.9, weight: 2
        }).addTo(AppState.maps.tracking).bindPopup('<strong>📍 Tu ubicación</strong>');
    }

    addBusMarkers(AppState.maps.tracking);
    populateVehicles();

    setTimeout(() => AppState.maps.tracking.invalidateSize(), 100);
    AppState.trackingMapInit = true;
}

// ========== STATS ==========
function animateStats() {
    const totalActive = AppState.buses.filter(b => b.status !== 'offline').length;
    const totalStops = AppState.buses.reduce((acc, b) => acc + b.paradas, 0);
    const totalUsers = JSON.parse(localStorage.getItem('optitransit_users') || '[]').length;

    animateCounter('stat-routes', AppState.buses.length);
    animateCounter('stat-vehicles', totalActive);
    animateCounter('stat-stops', totalStops);
    animateCounter('stat-users', Math.max(totalUsers, 1));
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const step = Math.max(target / 40, 0.5);
    const interval = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(interval); }
        el.textContent = Math.round(current);
    }, 40);
}

// ========== CURRENCY ==========
function initCurrencySelector() {
    const buttons = document.querySelectorAll('.currency-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.selectedCurrency = btn.dataset.currency;
            populateBuses();
        });
    });
}

async function fetchExchangeRates() {
    try {
        const resp = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await resp.json();
        if (data.rates) {
            AppState.exchangeRates.eur = data.rates.EUR || 0.92;
            AppState.exchangeRates.bs = data.rates.VES || 36.50;
            populateBuses();
        }
    } catch (e) {
        console.log('Sin conexión a API de tasas, usando tasas predeterminadas.');
    }
}

// ========== BUS LIST ==========
function populateBuses() {
    const container = document.getElementById('buses-list');
    let activeBuses = AppState.buses.filter(b => b.status !== 'offline');

    // City filter
    if (AppState.cityFilter && AppState.cityFilter !== 'all') {
        activeBuses = activeBuses.filter(b => b.ciudad === AppState.cityFilter);
    }

    container.innerHTML = activeBuses.map(bus => {
        const precios = calcularPrecios(bus.distanciaKm);
        const priceText = formatPrice(precios);
        const isFav = AppState.favorites.includes(bus.id);

        return `
        <div class="bus-card" onclick="openBusModal('${bus.id}')">
            <div class="bus-card-top">
                <div class="bus-type-icon public">${bus.icon}</div>
                <div class="bus-info">
                    <div class="bus-name">${bus.id}: ${bus.nombre}</div>
                    <div class="bus-route">${bus.desde} → ${bus.hasta} · ${bus.paradas} paradas · ${bus.distanciaKm} km</div>
                </div>
                <button class="btn-fav ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${bus.id}')" title="${t('favorite')}">
                    ${isFav ? '★' : '☆'}
                </button>
                <span class="badge badge-public">🚌 Público</span>
            </div>
            <div class="bus-card-bottom">
                <span class="bus-price paid">${priceText}</span>
                <button class="btn-request public">
                    <i data-lucide="send"></i>
                    ${t('request')}
                </button>
            </div>
        </div>`;
    }).join('');

    lucide.createIcons();
}

// ========== BUS MODAL ==========
function openBusModal(busId) {
    const bus = AppState.buses.find(b => b.id === busId);
    if (!bus) return;

    const modal = document.getElementById('modal-bus');
    const content = document.getElementById('modal-bus-content');
    const precios = calcularPrecios(bus.distanciaKm);

    const pricesAll = {
        usd: `$${precios.usd.toFixed(2)} USD`,
        eur: `€${precios.eur.toFixed(2)} EUR`,
        usdt: `${precios.usdt.toFixed(2)} USDT`,
        bs: `Bs. ${precios.bs.toFixed(0)}`
    };

    // Generate schedule
    const scheduleHours = [];
    for (let h = 5; h <= 21; h += 2) {
        const min = Math.floor(Math.random() * 50) + 5;
        scheduleHours.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }

    content.innerHTML = `
        <h2 class="modal-title">🚌 Transporte Público</h2>
        <p class="modal-subtitle">Tarifa calculada por distancia (${bus.distanciaKm} km)</p>

        <div style="background:var(--bg-input); border-radius:var(--radius-md); padding:16px; margin-bottom:16px;">
            <div style="font-weight:700; font-size:1rem; margin-bottom:6px;">${bus.id}: ${bus.nombre}</div>
            <div style="font-size:0.8rem; color:var(--text-secondary);">${bus.desde} → ${bus.hasta} · ${bus.paradas} paradas</div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:6px;">🧑‍✈️ Conductor: ${bus.conductor}</div>
            <div style="font-size:0.78rem; color:var(--text-muted);">📞 ${bus.telefono}</div>
            <div style="font-size:0.78rem; color:var(--text-muted);">🚀 Velocidad: ${bus.speed}</div>
        </div>

        <div style="text-align:center; padding:14px; background:rgba(59,130,246,0.06); border-radius:var(--radius-md); margin-bottom:16px;">
            <div style="font-size:0.68rem; color:var(--text-muted); margin-bottom:4px;">Tarifa del viaje (${bus.distanciaKm} km)</div>
            <div style="font-size:1.5rem; font-weight:800; color:var(--blue-600);">${formatPrice(precios)}</div>
            <div style="font-size:0.65rem; color:var(--text-muted); margin-top:6px;">
                ${pricesAll.usd} · ${pricesAll.eur} · ${pricesAll.usdt} · ${pricesAll.bs}
            </div>
        </div>

        <div style="font-size:0.78rem; font-weight:600; color:var(--text-secondary); margin-bottom:8px;">🕐 Horarios (toca para activar aviso):</div>
        <div class="schedule-list">
            ${scheduleHours.map(h => `<div class="schedule-item" style="cursor:pointer;" onclick="event.stopPropagation(); scheduleAlert('${h}', '${bus.id}', '${bus.nombre}')">
                <span class="schedule-time">${h}</span>
                <span class="schedule-label">🔔 Tocar para aviso</span>
            </div>`).join('')}
        </div>

        <div style="font-size:0.78rem; font-weight:600; color:var(--text-secondary); margin:14px 0 10px;">Método de pago:</div>

        <div class="payment-option selected" onclick="selectPayment(this, 'efectivo')">
            <div class="payment-option-icon" style="background:rgba(16,185,129,0.1);">💵</div>
            <div class="payment-option-info">
                <div class="payment-option-name">Efectivo</div>
                <div class="payment-option-desc">Pagar al conductor directamente</div>
            </div>
        </div>

        <div class="payment-option" onclick="selectPayment(this, 'pagomovil')">
            <div class="payment-option-icon" style="background:rgba(59,130,246,0.1);">📱</div>
            <div class="payment-option-info">
                <div class="payment-option-name">Pago Móvil</div>
                <div class="payment-option-desc">Transferir al conductor: ${bus.telefono}</div>
            </div>
        </div>

        <button class="btn-primary" onclick="requestBus('${bus.id}')" style="margin-top:16px;">
            <i data-lucide="credit-card"></i> Confirmar y Pagar
        </button>
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
    `;

    modal.classList.remove('hidden');
    lucide.createIcons();

    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
}

function selectPayment(el, method) {
    document.querySelectorAll('.payment-option').forEach(p => p.classList.remove('selected'));
    el.classList.add('selected');
}

function closeModal() {
    document.getElementById('modal-bus').classList.add('hidden');
}

function requestBus(busId) {
    const bus = AppState.buses.find(b => b.id === busId);
    const content = document.getElementById('modal-bus-content');
    const precios = calcularPrecios(bus.distanciaKm);

    saveTripToHistory(bus, precios);

    const eta = Math.floor(Math.random() * 12) + 3;

    content.innerHTML = `
        <div style="text-align:center; padding:40px 20px;">
            <div style="width:64px; height:64px; border-radius:50%; background:rgba(16,185,129,0.1); margin:0 auto 16px; display:flex; align-items:center; justify-content:center; font-size:2rem;">
                ✅
            </div>
            <h2 style="font-size:1.3rem; font-weight:800; margin-bottom:8px;">¡Bus Solicitado!</h2>
            <p style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:6px;">
                <strong>${bus.nombre}</strong> está en camino
            </p>
            <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:20px;">
                Conductor: ${bus.conductor}<br>
                Teléfono: ${bus.telefono}<br>
                Tiempo estimado: ${eta} minutos
            </p>
            <div style="padding:12px; background:var(--bg-input); border-radius:var(--radius-sm); font-size:0.75rem; color:var(--text-secondary);">
                💰 Costo del viaje: <strong>${formatPrice(precios)}</strong> (${bus.distanciaKm} km)
            </div>
            <div style="margin-top:20px;">
                <p style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:8px;">¿Cómo calificarías este servicio?</p>
                <div class="star-rating" id="trip-rating">
                    <button class="star" data-val="1" onclick="rateStar(1)">★</button>
                    <button class="star" data-val="2" onclick="rateStar(2)">★</button>
                    <button class="star" data-val="3" onclick="rateStar(3)">★</button>
                    <button class="star" data-val="4" onclick="rateStar(4)">★</button>
                    <button class="star" data-val="5" onclick="rateStar(5)">★</button>
                </div>
                <p id="rating-thanks" style="display:none; font-size:0.75rem; color:var(--green-500); font-weight:600;">¡Gracias por tu calificación!</p>
            </div>
            <button class="btn-primary" onclick="closeModal()" style="margin-top:20px;">
                <i data-lucide="check"></i> Entendido
            </button>
        </div>
    `;
    lucide.createIcons();
}

function rateStar(val) {
    document.querySelectorAll('#trip-rating .star').forEach((s, i) => {
        s.classList.toggle('active', i < val);
    });
    document.getElementById('rating-thanks').style.display = 'block';
    // Save rating to last trip
    const key = `optitransit_trips_${AppState.user?.email || 'guest'}`;
    const trips = JSON.parse(localStorage.getItem(key) || '[]');
    if (trips.length > 0) {
        trips[0].rating = val;
        localStorage.setItem(key, JSON.stringify(trips));
    }
}

// ========== TRIP HISTORY ==========
function getTripKey() {
    return `optitransit_trips_${AppState.user?.email || 'guest'}`;
}

function saveTripToHistory(bus, precios) {
    const trips = JSON.parse(localStorage.getItem(getTripKey()) || '[]');
    trips.unshift({
        busId: bus.id,
        busName: bus.nombre,
        desde: bus.desde,
        hasta: bus.hasta,
        distanciaKm: bus.distanciaKm,
        costoUSD: precios.usd,
        fecha: new Date().toISOString(),
        conductor: bus.conductor
    });
    localStorage.setItem(getTripKey(), JSON.stringify(trips));
}

function loadTripHistory() {
    const container = document.getElementById('trips-list');
    const badge = document.getElementById('trip-count-badge');
    const trips = JSON.parse(localStorage.getItem(getTripKey()) || '[]');

    badge.textContent = `${trips.length} viaje${trips.length !== 1 ? 's' : ''}`;

    if (trips.length === 0) {
        container.innerHTML = `
            <div class="empty-trips">
                <i data-lucide="map"></i>
                <p>Aún no tienes viajes registrados</p>
                <span>Solicita un bus para comenzar tu historial</span>
            </div>`;
        lucide.createIcons();
        return;
    }

    container.innerHTML = trips.map((trip, i) => {
        const fecha = new Date(trip.fecha);
        const fechaStr = fecha.toLocaleDateString('es-VE', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
        const horaStr = fecha.toLocaleTimeString('es-VE', {
            hour: '2-digit', minute: '2-digit'
        });

        return `
        <div class="trip-item">
            <div class="trip-icon">🚌</div>
            <div class="trip-info">
                <div class="trip-name">${trip.busName}</div>
                <div class="trip-detail">${trip.desde} → ${trip.hasta} · ${trip.distanciaKm} km</div>
                <div class="trip-date">${fechaStr} a las ${horaStr}</div>
            </div>
            <div class="trip-cost">$${trip.costoUSD.toFixed(2)}</div>
        </div>`;
    }).join('');

    lucide.createIcons();
}

// ========== ROUTE OPTIMIZER ==========
function initRouteOptimizer() {
    const btnOptimize = document.getElementById('btn-optimize');
    const btnSwap = document.getElementById('btn-swap');
    const inputOrigin = document.getElementById('input-origin');
    const inputDest = document.getElementById('input-destination');

    if (AppState.userCity) {
        inputOrigin.value = AppState.userCity;
    }

    btnSwap.addEventListener('click', () => {
        const temp = inputOrigin.value;
        inputOrigin.value = inputDest.value;
        inputDest.value = temp;
    });

    btnOptimize.addEventListener('click', () => {
        const origin = inputOrigin.value.trim() || 'Valencia';
        const dest = inputDest.value.trim() || 'Caracas';
        inputOrigin.value = origin;
        inputDest.value = dest;

        btnOptimize.classList.add('loading');
        btnOptimize.innerHTML = '<span>Buscando la mejor ruta...</span>';

        setTimeout(() => {
            btnOptimize.classList.remove('loading');
            btnOptimize.innerHTML = '<i data-lucide="sparkles"></i> Buscar Rutas';
            lucide.createIcons();
            showRouteResult(origin, dest);
        }, 2000);
    });

    // Search bar → go to routes
    document.getElementById('search-bar-home').addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.getElementById('nav-routes').classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-routes').classList.add('active');
        document.getElementById('input-destination').focus();
    });
}

function showRouteResult(origin, dest) {
    const resultSection = document.getElementById('route-result');
    resultSection.classList.remove('hidden');

    const distance = (Math.random() * 300 + 10).toFixed(1);
    const time = Math.floor(Math.random() * 120) + 30;
    const costUSD = calcularPrecioUSD(parseFloat(distance));
    const co2 = (Math.random() * 5 + 0.5).toFixed(1);

    document.getElementById('result-time').textContent = time < 60 ? `${time} min` : `${Math.floor(time / 60)}h ${time % 60}m`;
    document.getElementById('result-distance').textContent = `${distance} km`;

    const selectedCurrency = document.getElementById('select-currency-route')?.value || 'usd';
    const precios = calcularPrecios(parseFloat(distance));
    const symbols = { usd: '$', eur: '€', usdt: 'USDT ', bs: 'Bs. ' };
    const val = precios[selectedCurrency];
    const formatted = selectedCurrency === 'bs' ? val.toFixed(0) : val.toFixed(2);
    document.getElementById('result-cost').textContent = `${symbols[selectedCurrency]}${formatted}`;
    document.getElementById('result-co2').textContent = `${co2} kg`;

    const stepsContainer = document.getElementById('route-steps');
    const middleCities = Object.keys(VENEZUELA_CITIES)
        .filter(c => c !== origin && c !== dest)
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 2) + 1);

    const waypoints = [
        { name: origin, detail: 'Punto de partida', type: 'origin' },
        ...middleCities.map(c => ({
            name: `Parada ${c}`,
            detail: `${Math.floor(Math.random() * 40) + 10} min · transbordo público`,
            type: 'waypoint'
        })),
        { name: dest, detail: 'Destino final', type: 'destination' }
    ];

    stepsContainer.innerHTML = waypoints.map(wp => {
        const icons = { origin: 'circle-dot', waypoint: 'navigation', destination: 'map-pin' };
        return `
        <div class="route-step">
            <div class="step-dot ${wp.type}"><i data-lucide="${icons[wp.type]}"></i></div>
            <div class="step-info">
                <div class="step-name">${wp.name}</div>
                <div class="step-detail">${wp.detail}</div>
            </div>
        </div>`;
    }).join('');

    lucide.createIcons();
    initResultMap(origin, dest);
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function initResultMap(origin, dest) {
    const container = document.getElementById('result-map');
    if (container._leaflet_id) { container._leaflet_id = null; container.innerHTML = ''; }

    const originCoord = VENEZUELA_CITIES[origin]?.coords || VALENCIA_LOCATIONS[origin] || AppState.userLocation;
    const destCoord = VENEZUELA_CITIES[dest]?.coords || VALENCIA_LOCATIONS[dest] || [10.4806, -66.9036];

    AppState.maps.result = L.map(container, {
        zoomControl: false, attributionControl: false
    }).setView([(originCoord[0] + destCoord[0]) / 2, (originCoord[1] + destCoord[1]) / 2], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(AppState.maps.result);

    L.polyline([originCoord, destCoord], {
        color: '#3B82F6', weight: 4, opacity: 0.8, dashArray: '10, 8'
    }).addTo(AppState.maps.result);

    L.circleMarker(originCoord, { radius: 8, color: '#10B981', fillColor: '#10B981', fillOpacity: 0.9, weight: 2 })
        .addTo(AppState.maps.result).bindPopup(`<strong>Origen:</strong> ${origin}`);
    L.circleMarker(destCoord, { radius: 8, color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.9, weight: 2 })
        .addTo(AppState.maps.result).bindPopup(`<strong>Destino:</strong> ${dest}`);

    AppState.maps.result.fitBounds([originCoord, destCoord], { padding: [30, 30] });
    setTimeout(() => AppState.maps.result.invalidateSize(), 200);
}

// ========== VEHICLES LIST ==========
function populateVehicles() {
    const container = document.getElementById('vehicles-list');
    const onlineCount = AppState.buses.filter(b => b.status === 'online').length;
    document.getElementById('vehicles-online').textContent = `${onlineCount} en línea`;

    container.innerHTML = AppState.buses.map(bus => {
        let iconBg, statusText, statusClass;
        switch (bus.status) {
            case 'online': iconBg = 'rgba(16,185,129,0.1)'; statusText = 'En servicio'; statusClass = 'online'; break;
            case 'warning': iconBg = 'rgba(249,115,22,0.1)'; statusText = 'Con retraso'; statusClass = 'warning'; break;
            default: iconBg = 'rgba(148,163,184,0.1)'; statusText = 'Fuera de servicio'; statusClass = 'offline';
        }

        const precios = calcularPrecios(bus.distanciaKm);

        return `
        <div class="vehicle-item">
            <div class="vehicle-icon" style="background:${iconBg}; font-size:1.2rem;">${bus.icon}</div>
            <div class="vehicle-info">
                <div class="vehicle-name">${bus.id} · ${bus.nombre}</div>
                <div class="vehicle-detail">${bus.desde} → ${bus.hasta} · ${bus.speed} · $${precios.usd} USD</div>
            </div>
            <div class="vehicle-status ${statusClass}">
                <span class="dot"></span>
                ${statusText}
            </div>
        </div>`;
    }).join('');
}

// ========== PROFILE ==========
function initProfile() {
    loadProfileData();

    // Save profile
    document.getElementById('btn-save-profile').addEventListener('click', () => {
        const newName = document.getElementById('edit-name').value.trim();
        const newPhone = document.getElementById('edit-phone').value.trim();
        const newPassword = document.getElementById('edit-password').value;

        if (!newName) return;

        // Update user
        if (newName) AppState.user.name = newName;
        if (newPhone) AppState.user.phone = newPhone;
        if (newPassword && newPassword.length >= 6) AppState.user.password = newPassword;

        // Update in localStorage
        localStorage.setItem('optitransit_user', JSON.stringify(AppState.user));

        const users = JSON.parse(localStorage.getItem('optitransit_users') || '[]');
        const idx = users.findIndex(u => u.email === AppState.user.email);
        if (idx >= 0) {
            users[idx] = AppState.user;
            localStorage.setItem('optitransit_users', JSON.stringify(users));
        }

        // Show success
        const successEl = document.getElementById('edit-success');
        successEl.classList.remove('hidden');
        setTimeout(() => successEl.classList.add('hidden'), 3000);

        loadProfileData();
        lucide.createIcons();
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        if (confirm('¿Deseas cerrar sesión?')) {
            localStorage.removeItem('optitransit_user');
            location.reload();
        }
    });
}

function loadProfileData() {
    if (!AppState.user) return;

    document.getElementById('profile-name').textContent = AppState.user.name || 'Usuario';
    document.getElementById('profile-email').textContent = AppState.user.email || '';
    document.getElementById('profile-phone').textContent = AppState.user.phone || '';

    document.getElementById('edit-name').value = AppState.user.name || '';
    document.getElementById('edit-phone').value = AppState.user.phone || '';

    // Trip stats
    const trips = JSON.parse(localStorage.getItem(getTripKey()) || '[]');
    const totalSpent = trips.reduce((acc, t) => acc + (t.costoUSD || 0), 0);
    const totalKm = trips.reduce((acc, t) => acc + (t.distanciaKm || 0), 0);

    document.getElementById('profile-trips').textContent = trips.length;
    document.getElementById('profile-spent').textContent = `$${totalSpent.toFixed(2)}`;
    document.getElementById('profile-km').textContent = `${totalKm.toFixed(1)} km`;

    // Member since
    if (AppState.user.createdAt) {
        const created = new Date(AppState.user.createdAt);
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        document.getElementById('profile-since').textContent = `${months[created.getMonth()]} ${created.getFullYear()}`;
    }

    loadTripHistory();
}

// ========== DARK MODE ==========
function initDarkMode() {
    const btn = document.getElementById('btn-theme');
    btn.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            AppState.theme = 'light';
            btn.textContent = '🌙';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            AppState.theme = 'dark';
            btn.textContent = '☀️';
        }
        localStorage.setItem('optitransit_theme', AppState.theme);
    });
}

// ========== SCHEDULE ALERT ==========
function scheduleAlert(time, busId, busName) {
    const el = event.target.closest('.schedule-item');
    if (el.classList.contains('alerted')) {
        el.classList.remove('alerted');
        el.querySelector('.schedule-label').textContent = '🔔 Tocar para aviso';
        el.style.background = '';
        return;
    }
    el.classList.add('alerted');
    el.querySelector('.schedule-label').innerHTML = '✅ <strong>Aviso activado</strong>';
    el.style.background = 'rgba(16,185,129,0.12)';
    // Simulated notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`🚌 OptiTransit - ${busName}`, { body: `Tu bus sale a las ${time}. ¡Prepárate!` });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
    alert(`✅ Aviso activado\n\n🚌 ${busName} (${busId})\n🕐 Salida: ${time}\n\nTe avisaremos cuando el bus esté por salir.\nDirígete a la parada más cercana antes de esa hora.`);
}

// ========== CITY FILTER ==========
function initCityFilter() {
    const container = document.getElementById('city-filter');
    const cities = [...new Set(AppState.buses.map(b => b.ciudad))];

    container.innerHTML = `<button class="city-filter-btn active" data-city="all">${t('allCities')}</button>` +
        cities.map(c => `<button class="city-filter-btn" data-city="${c}">${c}</button>`).join('');

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.city-filter-btn');
        if (!btn) return;
        container.querySelectorAll('.city-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        AppState.cityFilter = btn.dataset.city;
        populateBuses();
    });
}

// ========== FAVORITES ==========
function toggleFavorite(busId) {
    const idx = AppState.favorites.indexOf(busId);
    if (idx >= 0) {
        AppState.favorites.splice(idx, 1);
    } else {
        AppState.favorites.push(busId);
    }
    localStorage.setItem('optitransit_favs', JSON.stringify(AppState.favorites));
    populateBuses();
}

// ========== HELP MODAL ==========
function initHelp() {
    document.getElementById('btn-help').addEventListener('click', () => {
        document.getElementById('help-modal').classList.remove('hidden');
    });
    document.getElementById('help-close').addEventListener('click', () => {
        document.getElementById('help-modal').classList.add('hidden');
    });
    document.getElementById('help-close-btn').addEventListener('click', () => {
        document.getElementById('help-modal').classList.add('hidden');
    });
    // Close on backdrop click
    document.getElementById('help-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('help-modal')) {
            document.getElementById('help-modal').classList.add('hidden');
        }
    });
}

// ========== PHOTO UPLOAD ==========
function initPhotoUpload() {
    document.getElementById('photo-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            localStorage.setItem('optitransit_photo', dataUrl);
            displayProfilePhoto(dataUrl);
        };
        reader.readAsDataURL(file);
    });

    // Load saved photo
    const saved = localStorage.getItem('optitransit_photo');
    if (saved) displayProfilePhoto(saved);
}

function displayProfilePhoto(dataUrl) {
    const img = document.getElementById('profile-avatar-img');
    const icon = document.getElementById('profile-avatar-icon');
    if (img && icon) {
        img.src = dataUrl;
        img.style.display = 'block';
        icon.style.display = 'none';
    }
}

// ========== SHARE LOCATION ==========
function initShareLocation() {
    document.getElementById('btn-share-location').addEventListener('click', () => {
        if (!AppState.userLocation) {
            alert('No se ha detectado tu ubicación.');
            return;
        }
        const lat = AppState.userLocation[0];
        const lng = AppState.userLocation[1];
        const url = `https://www.google.com/maps?q=${lat},${lng}`;

        if (navigator.share) {
            navigator.share({
                title: 'Mi ubicación - OptiTransit',
                text: `Estoy en ${AppState.userCity || 'Venezuela'}`,
                url: url
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(url).then(() => {
                alert('📋 Link de ubicación copiado al portapapeles');
            }).catch(() => {
                prompt('Copia este link:', url);
            });
        }
    });
}

// ========== DYNAMIC NOTIFICATIONS ==========
function initNotifications() {
    const btnNotif = document.getElementById('btn-notifications');
    const panel = document.getElementById('notification-panel');
    const overlay = document.getElementById('notification-overlay');

    // Generate dynamic notifications
    generateDynamicNotifications();

    btnNotif.addEventListener('click', () => panel.classList.toggle('hidden'));
    overlay.addEventListener('click', () => panel.classList.add('hidden'));
}

function generateDynamicNotifications() {
    const container = document.querySelector('.notification-list');
    const notifications = [];

    // Recent trip notifications
    const trips = JSON.parse(localStorage.getItem(getTripKey()) || '[]');
    if (trips.length > 0) {
        notifications.push({
            text: `Tu último viaje en <strong>${trips[0].busName}</strong> fue registrado correctamente.`,
            time: 'Reciente', unread: true
        });
    }

    // Random system notifications
    const systemNotifs = [
        { text: `Nueva ruta disponible en <strong>${AppState.userCity || 'Valencia'}</strong>.`, time: 'Hace 5 min', unread: true },
        { text: 'Tasa de cambio actualizada: <strong>USD/VES</strong>.', time: 'Hace 15 min', unread: true },
        { text: `<strong>${AppState.buses.filter(b => b.status === 'online').length}</strong> buses activos en tu zona.`, time: 'Hace 30 min', unread: false },
        { text: 'OptiTransit V4 disponible con nuevas funciones.', time: 'Hace 1 hora', unread: false },
    ];

    notifications.push(...systemNotifs);

    // Update badge
    const unreadCount = notifications.filter(n => n.unread).length;
    document.getElementById('notif-badge').textContent = unreadCount;

    container.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.unread ? 'unread' : ''}">
            <div class="notification-dot"></div>
            <div class="notification-content">
                <p class="notification-text">${n.text}</p>
                <span class="notification-time">${n.time}</span>
            </div>
        </div>
    `).join('');
}

// ========== PWA ==========
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}
