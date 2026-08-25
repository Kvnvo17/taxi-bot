// ======================================================
// Taksi Raqami Web App – to‘liq JavaScript
// ======================================================

const tg = window.Telegram.WebApp;
const user = tg.initDataUnsafe?.user || { id: 123456, first_name: "Test" };

let currentTheme = 'light';
let currentTab = 'taxi';      // e'lonlar tab
let currentFilter = 'all';    // buyurtmalar filtri

// -------------------- THEME --------------------
function setTheme(theme) {
    document.body.className = theme === 'dark' ? 'dark' : '';
    currentTheme = theme;
    fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user.id, theme: theme })
    }).catch(() => {});
}
document.getElementById('theme-toggle').addEventListener('click', () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
});

// -------------------- NAVIGATION --------------------
const navBtns = document.querySelectorAll('.nav-btn');
const pages = {
    home: document.getElementById('page-home'),
    ads: document.getElementById('page-ads'),
    orders: document.getElementById('page-orders'),
    profile: document.getElementById('page-profile'),
    form: document.getElementById('page-form')
};

function showPage(name) {
    Object.keys(pages).forEach(key => {
        pages[key].classList.toggle('active', key === name);
    });
    navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === name);
    });
    // Sahifa ochilganda ma'lumotlarni yuklash
    if (name === 'profile') loadProfile();
    if (name === 'orders') loadOrders();
    if (name === 'ads') loadAds();
}
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        showPage(btn.dataset.page);
    });
});

// -------------------- KARTALAR --------------------
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
        const action = card.dataset.action;
        if (action === 'driver') showForm('taxi');
        else if (action === 'passenger') showForm('search');
        else if (action === 'parcel_receive') showForm('parcel_receive');
        else if (action === 'parcel_send') showForm('parcel_send');
    });
});

// -------------------- FORMA --------------------
function showForm(type) {
    const formBody = document.getElementById('form-body');
    const formTitle = document.getElementById('form-title');
    let html = '';

    if (type === 'taxi') {
        formTitle.textContent = '🚖 Taksi e’lonini joylash';
        html = `
            <div class="form-group">
                <label>⏰ Kutish vaqti (daqiqa)</label>
                <input type="number" id="wait_time" min="30" max="300" value="30">
            </div>
            <div class="form-group">
                <label>💺 Jami joy (1–4)</label>
                <input type="number" id="seats" min="1" max="4" value="1">
            </div>
            <div class="form-group">
                <label>📍 Qayerdan (Viloyat)</label>
                <input type="text" id="from_region" placeholder="Masalan: Toshkent">
            </div>
            <div class="form-group">
                <label>📍 Tuman</label>
                <input type="text" id="from_district" placeholder="Masalan: Yunusobod">
            </div>
            <div class="form-group">
                <label>📍 Mahalla</label>
                <input type="text" id="from_neighborhood" placeholder="ixtiyoriy">
            </div>
            <div class="form-group">
                <label>📍 Qayerga (Viloyat)</label>
                <input type="text" id="to_region" placeholder="Masalan: Samarqand">
            </div>
            <div class="form-group">
                <label>📍 Tuman</label>
                <input type="text" id="to_district" placeholder="Masalan: Markaz">
            </div>
            <div class="form-group">
                <label>💰 Narx (so‘m)</label>
                <input type="number" id="price" placeholder="150000">
            </div>
            <div class="form-group">
                <label>🤝 Kelishiladi</label>
                <select id="negotiable">
                    <option value="true">Ha</option>
                    <option value="false">Yo‘q</option>
                </select>
            </div>
            <div class="form-group">
                <label>📦 Pochta olasizmi?</label>
                <select id="takes_parcel">
                    <option value="true">Ha</option>
                    <option value="false">Yo‘q</option>
                </select>
            </div>
            <div class="form-group" id="parcel_size_group" style="display:none;">
                <label>📦 Hajmi</label>
                <select id="parcel_size">
                    <option value="kichik">Kichik</option>
                    <option value="o'rta">O‘rta</option>
                    <option value="katta">Katta</option>
                </select>
            </div>
            <div class="form-group">
                <label>📞 Telefon</label>
                <input type="text" id="phone" placeholder="+998901234567">
            </div>
            <button type="submit" onclick="submitTaxiAd()">✅ E’lonni joylash</button>
        `;
        // Pochta olasizmi tanlanganda hajmni ko‘rsatish
        setTimeout(() => {
            document.getElementById('takes_parcel')?.addEventListener('change', function() {
                const group = document.getElementById('parcel_size_group');
                group.style.display = this.value === 'true' ? 'block' : 'none';
            });
        }, 100);
    }
    else if (type === 'search') {
        formTitle.textContent = '🧍 Yo‘lovchi sifatida qidirish';
        html = `
            <div class="form-group">
                <label>👥 Necha kishi (1–4)</label>
                <input type="number" id="people" min="1" max="4" value="1">
            </div>
            <div class="form-group">
                <label>📍 Qayerdan (Viloyat)</label>
                <input type="text" id="search_from_region" placeholder="Toshkent">
            </div>
            <div class="form-group">
                <label>📍 Tuman</label>
                <input type="text" id="search_from_district" placeholder="Yunusobod">
            </div>
            <div class="form-group">
                <label>📍 Qayerga (Viloyat)</label>
                <input type="text" id="search_to_region" placeholder="Samarqand">
            </div>
            <div class="form-group">
                <label>📍 Tuman</label>
                <input type="text" id="search_to_district" placeholder="Markaz">
            </div>
            <button type="submit" onclick="searchTaxi()">🔍 Taksi qidirish</button>
            <div id="search-results" style="margin-top:16px;"></div>
        `;
    }
    else if (type === 'parcel_receive') {
        formTitle.textContent = '📦 Pochta olish e’loni';
        html = `
            <div class="form-group">
                <label>📍 Qayerdan (Viloyat)</label>
                <input type="text" id="p_from_region" placeholder="Toshkent">
            </div>
            <div class="form-group">
                <label>📍 Tuman</label>
                <input type="text" id="p_from_district" placeholder="Yunusobod">
            </div>
            <div class="form-group">
                <label>📍 Mahalla</label>
                <input type="text" id="p_from_neighborhood" placeholder="ixtiyoriy">
            </div>
            <div class="form-group">
                <label>📍 Qayerga (Viloyat)</label>
                <input type="text" id="p_to_region" placeholder="Samarqand">
            </div>
            <div class="form-group">
                <label>📍 Tuman</label>
                <input type="text" id="p_to_district" placeholder="Markaz">
            </div>
            <div class="form-group">
                <label>📦 Hajmi</label>
                <select id="p_size">
                    <option value="kichik">Kichik</option>
                    <option value="o'rta">O‘rta</option>
                    <option value="katta">Katta</option>
                </select>
            </div>
            <div class="form-group">
                <label>📞 Telefon</label>
                <input type="text" id="p_phone" placeholder="+998901234567">
            </div>
            <button type="submit" onclick="submitParcelAd('receive')">✅ E’lon joylash</button>
        `;
    }
    else if (type === 'parcel_send') {
        formTitle.textContent = '📦 Pochta yuborish — taksi topish';
        html = `
            <div class="form-group">
                <label>📍 Qayerdan (Viloyat)</label>
                <input type="text" id="ps_from_region" placeholder="Toshkent">
            </div>
            <div class="form-group">
                <label>📍 Tuman</label>
                <input type="text" id="ps_from_district" placeholder="Yunusobod">
            </div>
            <div class="form-group">
                <label>📍 Qayerga (Viloyat)</label>
                <input type="text" id="ps_to_region" placeholder="Samarqand">
            </div>
            <div class="form-group">
                <label>📍 Tuman</label>
                <input type="text" id="ps_to_district" placeholder="Markaz">
            </div>
            <div class="form-group">
                <label>📦 Hajmi</label>
                <select id="ps_size">
                    <option value="kichik">Kichik</option>
                    <option value="o'rta">O‘rta</option>
                    <option value="katta">Katta</option>
                </select>
            </div>
            <div class="form-group">
                <label>📞 Telefon</label>
                <input type="text" id="ps_phone" placeholder="+998901234567">
            </div>
            <button type="submit" onclick="searchParcelCarriers()">🔍 Pochta oluvchi taksilarni topish</button>
            <div id="parcel-search-results" style="margin-top:16px;"></div>
        `;
    }

    formBody.innerHTML = html;
    showPage('form');
}

// -------------------- FORMA ORQAGA --------------------
document.getElementById('form-back').addEventListener('click', () => {
    showPage('home');
});

// -------------------- API SO'ROVLAR --------------------
async function apiCall(url, method = 'GET', body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Xatolik');
    }
    return res.json();
}

// -------------------- TAKSI E'LON JOYLASH --------------------
async function submitTaxiAd() {
    const data = {
        wait_time: parseInt(document.getElementById('wait_time').value),
        seats: parseInt(document.getElementById('seats').value),
        from_location: {
            region: document.getElementById('from_region').value,
            district: document.getElementById('from_district').value,
            neighborhood: document.getElementById('from_neighborhood').value || ''
        },
        to_location: {
            region: document.getElementById('to_region').value,
            district: document.getElementById('to_district').value
        },
        price: parseFloat(document.getElementById('price').value),
        negotiable: document.getElementById('negotiable').value === 'true',
        takes_parcel: document.getElementById('takes_parcel').value === 'true',
        parcel_size: document.getElementById('parcel_size')?.value || null,
        phone: document.getElementById('phone').value
    };
    try {
        await apiCall(`/api/taxi/ad?telegram_id=${user.id}`, 'POST', data);
        alert('✅ E’lon muvaffaqiyatli joylandi!');
        showPage('home');
    } catch (e) {
        alert('❌ Xatolik: ' + e.message);
    }
}

// -------------------- YO'LOVCHI QIDIRISH --------------------
async function searchTaxi() {
    const from_loc = {
        region: document.getElementById('search_from_region').value,
        district: document.getElementById('search_from_district').value
    };
    const to_loc = {
        region: document.getElementById('search_to_region').value,
        district: document.getElementById('search_to_district').value
    };
    const people = parseInt(document.getElementById('people').value);
    try {
        const results = await apiCall(`/api/taxi/search?from_location=${encodeURIComponent(JSON.stringify(from_loc))}&to_location=${encodeURIComponent(JSON.stringify(to_loc))}&people=${people}`);
        const container = document.getElementById('search-results');
        if (results.length === 0) {
            container.innerHTML = '<p>🔔 Hozircha mos taksi topilmadi.</p>';
            return;
        }
        container.innerHTML = results.map(ad => `
            <div class="result-item">
                <div class="row"><span>🚗 ${ad.driver_name}</span><span>⭐ ${ad.rating || 0}</span></div>
                <div class="row"><span>📍 ${ad.from} → ${ad.to}</span></div>
                <div class="row"><span>⏰ ${ad.wait_time} daqiqa</span><span>💺 ${ad.seats}</span></div>
                <div class="row"><span>💰 ${ad.price} so‘m</span><span>📦 ${ad.takes_parcel ? 'Ha' : 'Yo‘q'}</span></div>
                <div class="actions">
                    <button class="order-btn" onclick="orderTaxi(${ad.id})">🚕 Buyurtma berish</button>
                    ${ad.takes_parcel ? `<button class="parcel-btn" onclick="orderParcel(${ad.id})">📦 Pochta yuborish</button>` : ''}
                </div>
            </div>
        `).join('');
    } catch (e) {
        alert('❌ Xatolik: ' + e.message);
    }
}

// -------------------- BUYURTMA BERISH (TAKSI) --------------------
async function orderTaxi(adId) {
    try {
        const result = await apiCall('/api/order/create', 'POST', {
            taxi_ad_id: adId,
            passenger_telegram_id: user.id,
            type: 'taxi'
        });
        alert('✅ Buyurtma yuborildi! Haydovchi siz bilan bog‘lanadi.');
        showPage('orders');
        loadOrders();
    } catch (e) {
        alert('❌ Xatolik: ' + e.message);
    }
}

// -------------------- POCHTA E'LON JOYLASH (olish) --------------------
async function submitParcelAd(type) {
    const data = {
        from_location: {
            region: document.getElementById('p_from_region').value,
            district: document.getElementById('p_from_district').value,
            neighborhood: document.getElementById('p_from_neighborhood').value || ''
        },
        to_location: {
            region: document.getElementById('p_to_region').value,
            district: document.getElementById('p_to_district').value
        },
        size: document.getElementById('p_size').value,
        phone: document.getElementById('p_phone').value
    };
    try {
        await apiCall(`/api/parcel/ad?telegram_id=${user.id}`, 'POST', data);
        alert('✅ Pochta e’loni joylandi!');
        showPage('home');
    } catch (e) {
        alert('❌ Xatolik: ' + e.message);
    }
}

// -------------------- POCHTA YUBORISH (taksi topish) --------------------
async function searchParcelCarriers() {
    // Hozircha oddiy qidiruv – taksi e’lonlaridan pochta oladiganlarni topamiz
    const from_loc = {
        region: document.getElementById('ps_from_region').value,
        district: document.getElementById('ps_from_district').value
    };
    const to_loc = {
        region: document.getElementById('ps_to_region').value,
        district: document.getElementById('ps_to_district').value
    };
    try {
        const results = await apiCall(`/api/taxi/search?from_location=${encodeURIComponent(JSON.stringify(from_loc))}&to_location=${encodeURIComponent(JSON.stringify(to_loc))}&people=1`);
        const container = document.getElementById('parcel-search-results');
        const filtered = results.filter(ad => ad.takes_parcel === true);
        if (filtered.length === 0) {
            container.innerHTML = '<p>🔔 Pochta oladigan taksi topilmadi.</p>';
            return;
        }
        container.innerHTML = filtered.map(ad => `
            <div class="result-item">
                <div class="row"><span>🚗 ${ad.driver_name}</span><span>⭐ ${ad.rating || 0}</span></div>
                <div class="row"><span>📍 ${ad.from} → ${ad.to}</span></div>
                <div class="row"><span>📦 Hajmi: ${ad.parcel_size || 'aniqlanmagan'}</span></div>
                <div class="actions">
                    <button class="order-btn" onclick="orderParcel(${ad.id})">📦 Pochta yuborish</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        alert('❌ Xatolik: ' + e.message);
    }
}

// -------------------- POCHTA BUYURTMA --------------------
async function orderParcel(adId) {
    // Hozircha oddiy buyurtma – taksi buyurtmasi sifatida
    try {
        const result = await apiCall('/api/order/create', 'POST', {
            taxi_ad_id: adId,
            passenger_telegram_id: user.id,
            type: 'parcel'
        });
        alert('✅ Pochta buyurtmasi yuborildi! Haydovchi siz bilan bog‘lanadi.');
        showPage('orders');
        loadOrders();
    } catch (e) {
        alert('❌ Xatolik: ' + e.message);
    }
}

// -------------------- E'LONLARNI YUKLASH --------------------
async function loadAds() {
    const container = document.getElementById('ads-list');
    const tab = currentTab;
    try {
        let url = '';
        if (tab === 'taxi') {
            url = '/api/taxi/search?from_location={}&to_location={}&people=1';
        } else {
            // Pochta e’lonlari uchun maxsus endpoint yo‘q, hozircha bo‘sh
            container.innerHTML = '<p>📭 Pochta e’lonlari hali qo‘llab-quvvatlanmaydi.</p>';
            return;
        }
        const data = await apiCall(url);
        if (data.length === 0) {
            container.innerHTML = '<p>📭 Hozircha e’lonlar yo‘q.</p>';
            return;
        }
        container.innerHTML = data.map(ad => `
            <div class="ad-item">
                <div><strong>🚖 ${ad.driver_name}</strong> ⭐ ${ad.rating || 0}</div>
                <div>📍 ${ad.from} → ${ad.to}</div>
                <div>⏰ ${ad.wait_time} daqiqa | 💺 ${ad.seats} | 💰 ${ad.price} so‘m</div>
                <div>📦 ${ad.takes_parcel ? 'Pochta oladi' : 'Pochta olmaydi'}</div>
                <button onclick="orderTaxi(${ad.id})">🚕 Buyurtma berish</button>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<p>❌ E’lonlarni yuklashda xatolik.</p>';
    }
}

// E'lonlar tablari
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentTab = this.dataset.tab;
        loadAds();
    });
});

// -------------------- BUYURTMALARNI YUKLASH --------------------
async function loadOrders() {
    const container = document.getElementById('orders-list');
    try {
        const data = await apiCall(`/api/orders/${user.id}`);
        let filtered = data;
        if (currentFilter !== 'all') {
            filtered = data.filter(o => o.status === currentFilter);
        }
        if (filtered.length === 0) {
            container.innerHTML = '<p>📭 Buyurtmalar yo‘q.</p>';
            return;
        }
        container.innerHTML = filtered.map(o => `
            <div class="order-item">
                <div><strong>#${o.id}</strong> ${o.type === 'taxi' ? '🚖 Taksi' : '📦 Pochta'}</div>
                <div>Holat: ${o.status === 'waiting' ? '🟡 Kutilmoqda' : o.status === 'completed' ? '✅ Yakunlangan' : '❌ Bekor qilingan'}</div>
                <div>Vaqt: ${new Date(o.created_at).toLocaleString()}</div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<p>❌ Buyurtmalarni yuklashda xatolik.</p>';
    }
}

// Buyurtma filterlari
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.status;
        loadOrders();
    });
});

// -------------------- PROFILNI YUKLASH --------------------
async function loadProfile() {
    const container = document.getElementById('profile-content');
    try {
        const data = await apiCall(`/api/user/${user.id}`);
        container.innerHTML = `
            <p><strong>👤 Ism:</strong> ${data.first_name}</p>
            <p><strong>📞 Telefon:</strong> ${data.phone || '—'}</p>
            <p><strong>🚗 Mashina:</strong> ${data.car_name || '—'}</p>
            <p><strong>⭐ Reyting:</strong> ${data.rating ? data.rating.toFixed(1) : '0.0'}</p>
            <p><strong>🌐 Til:</strong> ${data.language || 'uz'}</p>
            <p><strong>🎨 Ko‘rinish:</strong> ${data.theme || 'light'}</p>
            <button onclick="editProfile()">✏️ Tahrirlash</button>
        `;
        // Temani moslang
        if (data.theme) setTheme(data.theme);
    } catch (e) {
        container.innerHTML = '<p>❌ Profilni yuklashda xatolik.</p>';
    }
}

// -------------------- PROFIL TAHRIRLASH --------------------
function editProfile() {
    const phone = prompt('📞 Telefon raqamingizni kiriting:');
    if (phone !== null) {
        fetch('/api/user/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: user.id, phone: phone })
        }).then(() => {
            alert('✅ Telefon saqlandi!');
            loadProfile();
        }).catch(() => alert('❌ Xatolik'));
    }
    const car = prompt('🚗 Mashina nomini kiriting:');
    if (car !== null) {
        fetch('/api/user/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: user.id, car_name: car })
        }).then(() => {
            alert('✅ Mashina saqlandi!');
            loadProfile();
        }).catch(() => alert('❌ Xatolik'));
    }
    const lang = prompt('🌐 Tilni tanlang (uz, ru, en):', 'uz');
    if (lang !== null) {
        fetch('/api/user/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: user.id, language: lang })
        }).then(() => {
            alert('✅ Til saqlandi!');
            loadProfile();
        }).catch(() => alert('❌ Xatolik'));
    }
}

// -------------------- BOSHLANG'ICH YUKLASH --------------------
showPage('home');
loadProfile();

// -------------------- SHIKOYAT YUBORISH (ixtiyoriy) --------------------
window.sendComplaint = async function(orderId, text) {
    try {
        await apiCall(`/api/complaint?telegram_id=${user.id}`, 'POST', {
            order_id: orderId,
            text: text
        });
        alert('✅ Shikoyatingiz yuborildi!');
    } catch (e) {
        alert('❌ Xatolik: ' + e.message);
    }
};
