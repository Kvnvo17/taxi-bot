const tg = window.Telegram.WebApp;
const user = tg.initDataUnsafe?.user || { id: 123456, first_name: "Test" };
let currentTheme = 'light';

// Theme
function setTheme(theme) {
    document.body.className = theme === 'dark' ? 'dark' : '';
    currentTheme = theme;
    // Saqlash
    fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user.id, theme: theme })
    });
}
document.getElementById('theme-toggle').addEventListener('click', () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
});

// Navigation
const navBtns = document.querySelectorAll('.nav-btn');
const pages = {
    home: document.getElementById('page-home'),
    ads: document.getElementById('page-ads'),
    orders: document.getElementById('page-orders'),
    profile: document.getElementById('page-profile')
};
function showPage(name) {
    Object.keys(pages).forEach(key => {
        pages[key].classList.toggle('active', key === name);
    });
    navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === name);
    });
}
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        showPage(btn.dataset.page);
        if (btn.dataset.page === 'orders') loadOrders();
        if (btn.dataset.page === 'profile') loadProfile();
        if (btn.dataset.page === 'ads') loadAds();
    });
});

// Karta bosish
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
        const action = card.dataset.action;
        if (action === 'driver') {
            // formani ko‘rsatish (oddiy dialog)
            alert('Taksi e’lonini joylashtirish formasi (Web App da to‘liq)');
        } else if (action === 'passenger') {
            alert('Yo‘lovchi sifatida taksi qidirish');
        } else if (action === 'parcel_receive') {
            alert('Pochta olish e’lonini joylashtirish');
        } else if (action === 'parcel_send') {
            alert('Pochta yuborish');
        }
    });
});

// API chaqiruvlar
async function loadOrders() {
    const res = await fetch(`/api/orders/${user.id}`);
    const orders = await res.json();
    const container = document.getElementById('orders-list');
    if (orders.length === 0) {
        container.innerHTML = '<p>Buyurtmalar yo‘q.</p>';
        return;
    }
    container.innerHTML = orders.map(o => `
        <div class="order-item">
            <div>ID: ${o.id}</div>
            <div>Holat: ${o.status}</div>
            <div>Vaqt: ${new Date(o.created_at).toLocaleString()}</div>
        </div>
    `).join('');
}

async function loadProfile() {
    const res = await fetch(`/api/user/${user.id}`);
    const data = await res.json();
    document.getElementById('profile-content').innerHTML = `
        <p><strong>Ism:</strong> ${data.first_name}</p>
        <p><strong>Telefon:</strong> ${data.phone || '—'}</p>
        <p><strong>Mashina:</strong> ${data.car_name || '—'}</p>
        <p><strong>Reyting:</strong> ${data.rating ? data.rating.toFixed(1) : '0.0'}</p>
        <p><strong>Til:</strong> ${data.language}</p>
        <p><strong>Ko‘rinish:</strong> ${data.theme}</p>
        <button onclick="editProfile()">✏️ Tahrirlash</button>
    `;
}

function editProfile() {
    const phone = prompt('Telefon raqamingizni kiriting:');
    if (phone) {
        fetch('/api/user/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: user.id, phone: phone })
        }).then(() => loadProfile());
    }
}

async function loadAds() {
    // Taksi va pochta e’lonlari
    // Soddalashtirib, faqat taksi e’lonlarini ko‘rsatamiz
    const res = await fetch('/api/taxi/search?from_location={}&to_location={}&people=1');
    const ads = await res.json();
    const container = document.getElementById('ads-list');
    if (ads.length === 0) {
        container.innerHTML = '<p>Hozircha e’lonlar yo‘q.</p>';
        return;
    }
    container.innerHTML = ads.map(ad => `
        <div class="ad-item">
            <div>🚖 ${ad.driver_name}</div>
            <div>⭐ ${ad.rating}</div>
            <div>📍 ${ad.from} → ${ad.to}</div>
            <div>⏰ ${ad.wait_time} daqiqa</div>
            <div>💺 ${ad.seats}</div>
            <div>💰 ${ad.price} so‘m</div>
            <button onclick="orderTaxi(${ad.id})">🚕 Buyurtma berish</button>
        </div>
    `).join('');
}

async function orderTaxi(adId) {
    const res = await fetch('/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            taxi_ad_id: adId,
            passenger_telegram_id: user.id,
            type: 'taxi'
        })
    });
    const data = await res.json();
    if (data.status === 'created') {
        alert('Buyurtma yuborildi! Haydovchi siz bilan bog‘lanadi.');
    } else {
        alert('Xatolik: ' + JSON.stringify(data));
    }
}

// Initial load
showPage('home');
loadProfile();
