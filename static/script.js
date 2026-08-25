// ============================================================
// Taksi Raqami Web App – to‘liq JavaScript
// ============================================================

const tg = window.Telegram.WebApp;
const user = tg.initDataUnsafe?.user || { id: 123456, first_name: "Test" };

let currentTheme = 'light';
let currentTab = 'taxi';
let currentFilter = 'all';
let isAdmin = false;

// ---------- THEME ----------
function setTheme(theme) {
    document.body.className = theme === 'dark' ? 'dark' : '';
    currentTheme = theme;
    fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user.id, theme })
    }).catch(() => {});
}
document.getElementById('theme-toggle').addEventListener('click', () => {
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
});

// ---------- NAVIGATION ----------
const navBtns = document.querySelectorAll('.nav-btn');
const pages = {
    home: document.getElementById('page-home'),
    ads: document.getElementById('page-ads'),
    orders: document.getElementById('page-orders'),
    profile: document.getElementById('page-profile'),
    form: document.getElementById('page-form'),
    admin: document.getElementById('page-admin')
};

function showPage(name) {
    Object.keys(pages).forEach(key => {
        pages[key].classList.toggle('active', key === name);
    });
    navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === name);
    });
    if (name === 'profile') loadProfile();
    if (name === 'orders') loadOrders();
    if (name === 'ads') loadAds();
    if (name === 'admin') loadAdminDashboard();
}
navBtns.forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
});

// ---------- ADMIN TUGMASI ----------
async function checkAdmin() {
    try {
        const res = await fetch(`/api/admin/check?telegram_id=${user.id}`);
        const data = await res.json();
        isAdmin = data.is_admin || false;
        if (isAdmin) {
            const nav = document.getElementById('bottom-nav');
            const btn = document.createElement('button');
            btn.className = 'nav-btn';
            btn.dataset.page = 'admin';
            btn.textContent = '👑 Admin';
            btn.addEventListener('click', () => showPage('admin'));
            nav.appendChild(btn);
        }
    } catch (e) {
        console.error('Admin check failed', e);
    }
}

// ---------- KARTALAR ----------
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
        const action = card.dataset.action;
        if (action === 'driver') showForm('taxi');
        else if (action === 'passenger') showForm('search');
        else if (action === 'parcel_receive') showForm('parcel_receive');
        else if (action === 'parcel_send') showForm('parcel_send');
    });
});

// ---------- DROPDOWN YORDAMCHI FUNKSIYALARI ----------
// Bu funksiyalar regions obyekti yuklangan deb hisoblaydi (regions.js)
function updateDistricts(prefix) {
    const regionSelect = document.getElementById(`${prefix}_region`);
    const districtSelect = document.getElementById(`${prefix}_district`);
    if (!regionSelect || !districtSelect) return;
    const region = regionSelect.value;
    if (region === 'Hamma') {
        districtSelect.innerHTML = `<option value="Hamma">Hamma</option>`;
        updateMahallas(prefix);
        return;
    }
    const districtData = regions[region]?.districts || {};
    const districtNames = Object.keys(districtData);
    // "Hamma" ni birinchi qo'shamiz
    let options = '<option value="Hamma">Hamma</option>';
    districtNames.forEach(d => {
        options += `<option value="${d}">${d}</option>`;
    });
    districtSelect.innerHTML = options;
    updateMahallas(prefix);
}

function updateMahallas(prefix) {
    const regionSelect = document.getElementById(`${prefix}_region`);
    const districtSelect = document.getElementById(`${prefix}_district`);
    const mahallaSelect = document.getElementById(`${prefix}_neighborhood`);
    if (!regionSelect || !districtSelect || !mahallaSelect) return;
    const region = regionSelect.value;
    const district = districtSelect.value;
    if (region === 'Hamma' || district === 'Hamma') {
        mahallaSelect.innerHTML = `<option value="Hamma">Hamma</option>`;
        return;
    }
    const mahallas = regions[region]?.districts?.[district] || ["Hamma"];
    let options = '<option value="Hamma">Hamma</option>';
    mahallas.forEach(m => {
        if (m !== 'Hamma') options += `<option value="${m}">${m}</option>`;
    });
    mahallaSelect.innerHTML = options;
}

// Pochta olasizmi toggle
function toggleParcelSize() {
    const val = document.getElementById('takes_parcel').value;
    document.getElementById('parcel_size_group').style.display = val === 'true' ? 'block' : 'none';
}

// ---------- FORMA ----------
function showForm(type) {
    const formBody = document.getElementById('form-body');
    const formTitle = document.getElementById('form-title');
    let html = '';

    // Viloyatlar ro'yxatini yaratish
    const regionOptions = regionNames.map(r => `<option value="${r}">${r}</option>`).join('');

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
                <select id="from_region" onchange="updateDistricts('from')">${regionOptions}</select>
            </div>
            <div class="form-group">
                <label>📍 Tuman</label>
                <select id="from_district" onchange="updateMahallas('from')"><option value="Hamma">Hamma</option></select>
            </div>
            <div class="form-group">
                <label>📍 Mahalla</label>
                <select id="from_neighborhood"><option value="Hamma">Hamma</option></select>
            </div>
            <div class="form-group">
                <label>📍 Qayerga (Viloyat)</label>
                <select id="to_region" onchange="updateDistricts('to')">${regionOptions}</select>
            </div>
            <div class="form-group">
                <label>📍 Tuman</label>
                <select id="to_district" onchange="updateMahallas('to')"><option value="Hamma">Hamma</option></select>
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
                <select id="takes_parcel" onchange="toggleParcelSize()">
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
        setTimeout(() => {
            updateDistricts('from');
            updateDistricts('to');
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
                <select id="search_from_region" onchange="updateDistricts('search_from')">${regionOptions}</select>
            </div>
            <div class="form-group">
                <label>📍 Tuman</label>
                <select id="search_from_district" onchange="updateMahallas('search_from')"><option value="Hamma">Hamma</option></select>
            </div>
            <div class="form-group">
                <label>📍 Qayerga (Viloyat)</label>
                <select id="search_to_region" onchange="updateDistricts('search_to')">${regionOptions}</select>
            </div>
            <div class="form-group">
                <label>📍 Tuman</label>
                <select id="search_to_district" onchange="updateMahallas('search_to')"><option value="Hamma">Hamma</option></select>
            </div>
            <button type="submit" onclick="searchTaxi()">🔍 Taksi qidirish</button>
            <div id="search-results" style="margin-top:16px;"></div>
        `;
        setTimeout(() => {
            updateDistricts('search_from');
            updateDistricts('search_to');
        }, 100);
    }
    else if (type === 'parcel_receive') {
        formTitle.textContent = '📦 Pochta olish e’loni';
        html = `
            <div class="form-group">
                <label>📍 Qayerdan (Viloyat)</label>
                <select id="p_from_region" onchange="updateDistricts('p_from')">${regionOptions}</select>
            </div>
            <div class="form-group">
                <label>📍 Tuman</label>
                <select id="p_from_district" onchange="updateMahallas('p_from')"><option value="Hamma">Hamma</option></select>
            </div>
            <div class="form-group">
                <label>📍 Mahalla</label>
                <select id="p_from_neighborhood"><option value="Hamma">Hamma</option></select>
            </div>
            <div class="form-group">
                <label>📍 Qayerga (Viloyat)</label>
                <select id="p_to_region" onchange="updateDistricts('p_to')">${regionOptions}</select>
            </div>
            <div class="form-group">
                <label>📍 Tuman</label>
                <select id="p_to_district" onchange="updateMahallas('p_to')"><option value="Hamma">Hamma</option></select>
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
        setTimeout(() => {
            updateDistricts('p_from');
            updateDistricts('p_to');
        }, 100);
    }
    else if (type === 'parcel_send') {
        formTitle.textContent = '📦 Pochta yuborish — taksi topish';
        html = `
            <div class="form-group">
                <label>📍 Qayerdan (Viloyat)</label>
                <select id="ps_from_region" onchange="updateDistricts('ps_from')">${regionOptions}</select>
            </div>
            <div class="form-group">
                <label>📍 Tuman</label>
                <select id="ps_from_district" onchange="updateMahallas('ps_from')"><option value="Hamma">Hamma</option></select>
            </div>
            <div class="form-group">
                <label>📍 Qayerga (Viloyat)</label>
                <select id="ps_to_region" onchange="updateDistricts('ps_to')">${regionOptions}</select>
            </div>
            <div class="form-group">
                <label>📍 Tuman</label>
                <select id="ps_to_district" onchange="updateMahallas('ps_to')"><option value="Hamma">Hamma</option></select>
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
        setTimeout(() => {
            updateDistricts('ps_from');
            updateDistricts('ps_to');
        }, 100);
    }

    formBody.innerHTML = html;
    showPage('form');
}

// ---------- ORQAGA ----------
document.getElementById('form-back').addEventListener('click', () => showPage('home'));
document.getElementById('admin-back')?.addEventListener('click', () => showPage('home'));

// ---------- API CALL ----------
async function apiCall(url, method = 'GET', body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Xatolik ${res.status}`);
    }
    return res.json();
}

// ---------- TAKSI E'LON JOYLASH ----------
async function submitTaxiAd() {
    const from_region = document.getElementById('from_region').value;
    const to_region = document.getElementById('to_region').value;
    if (from_region === to_region && from_region !== 'Hamma') {
        alert('❌ Qayerdan va qayerga bir xil bo‘lishi mumkin emas!');
        return;
    }
    const data = {
        wait_time: parseInt(document.getElementById('wait_time').value),
        seats: parseInt(document.getElementById('seats').value),
        from_location: {
            region: from_region,
            district: document.getElementById('from_district').value,
            neighborhood: document.getElementById('from_neighborhood').value
        },
        to_location: {
            region: to_region,
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

// ---------- YO'LOVCHI QIDIRISH ----------
async function searchTaxi() {
    const from_region = document.getElementById('search_from_region').value;
    const to_region = document.getElementById('search_to_region').value;
    if (from_region === to_region && from_region !== 'Hamma') {
        alert('❌ Qayerdan va qayerga bir xil bo‘lishi mumkin emas!');
        return;
    }
    const from_loc = {
        region: from_region,
        district: document.getElementById('search_from_district').value
    };
    const to_loc = {
        region: to_region,
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

// ---------- BUYURTMA BERISH (TAKSI) ----------
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

// ---------- POCHTA E'LON JOYLASH ----------
async function submitParcelAd(type) {
    const from_region = document.getElementById('p_from_region').value;
    const to_region = document.getElementById('p_to_region').value;
    if (from_region === to_region && from_region !== 'Hamma') {
        alert('❌ Qayerdan va qayerga bir xil bo‘lishi mumkin emas!');
        return;
    }
    const data = {
        from_location: {
            region: from_region,
            district: document.getElementById('p_from_district').value,
            neighborhood: document.getElementById('p_from_neighborhood').value
        },
        to_location: {
            region: to_region,
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

// ---------- POCHTA YUBORISH (taksi topish) ----------
async function searchParcelCarriers() {
    const from_region = document.getElementById('ps_from_region').value;
    const to_region = document.getElementById('ps_to_region').value;
    if (from_region === to_region && from_region !== 'Hamma') {
        alert('❌ Qayerdan va qayerga bir xil bo‘lishi mumkin emas!');
        return;
    }
    const from_loc = {
        region: from_region,
        district: document.getElementById('ps_from_district').value
    };
    const to_loc = {
        region: to_region,
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

// ---------- POCHTA BUYURTMA ----------
async function orderParcel(adId) {
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

// ---------- E'LONLARNI YUKLASH ----------
async function loadAds() {
    const container = document.getElementById('ads-list');
    const tab = currentTab;
    try {
        let url = '';
        if (tab === 'taxi') {
            url = '/api/taxi/search?from_location={}&to_location={}&people=1';
        } else {
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
                <div class="actions">
                    <button class="order-btn" onclick="orderTaxi(${ad.id})">🚕 Buyurtma berish</button>
                    ${ad.takes_parcel ? `<button class="parcel-btn" onclick="orderParcel(${ad.id})">📦 Pochta yuborish</button>` : ''}
                </div>
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

// ---------- BUYURTMALARNI YUKLASH ----------
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

// ---------- PROFIL (alohida tahrirlash) ----------
async function loadProfile() {
    const container = document.getElementById('profile-content');
    try {
        const data = await apiCall(`/api/user/${user.id}`);
        container.innerHTML = `
            <div class="profile-edit-item">
                <span><strong>👤 Ism:</strong> ${data.first_name}</span>
                <button onclick="editField('first_name', 'Ism', '${data.first_name}')">✏️</button>
            </div>
            <div class="profile-edit-item">
                <span><strong>📞 Telefon:</strong> ${data.phone || '—'}</span>
                <button onclick="editField('phone', 'Telefon', '${data.phone || ''}')">✏️</button>
            </div>
            <div class="profile-edit-item">
                <span><strong>🚗 Mashina:</strong> ${data.car_name || '—'}</span>
                <button onclick="editField('car_name', 'Mashina nomi', '${data.car_name || ''}')">✏️</button>
            </div>
            <div class="profile-edit-item">
                <span><strong>⭐ Reyting:</strong> ${data.rating ? data.rating.toFixed(1) : '0.0'}</span>
                <span style="font-size:0.9em; opacity:0.6;">(o‘qish uchun)</span>
            </div>
            <div class="profile-edit-item">
                <span><strong>🌐 Til:</strong> ${data.language || 'uz'}</span>
                <button onclick="editField('language', 'Til (uz, ru, en)', '${data.language || 'uz'}')">✏️</button>
            </div>
            <div class="profile-edit-item">
                <span><strong>🎨 Ko‘rinish:</strong> ${data.theme || 'light'}</span>
                <button onclick="editField('theme', 'Ko‘rinish (light/dark)', '${data.theme || 'light'}')">✏️</button>
            </div>
        `;
        if (data.theme) setTheme(data.theme);
    } catch (e) {
        container.innerHTML = '<p>❌ Profilni yuklashda xatolik.</p>';
    }
}

// Profil maydonini tahrirlash
function editField(field, label, currentValue) {
    const newValue = prompt(`${label} ni yangilang:`, currentValue);
    if (newValue !== null && newValue !== currentValue) {
        const payload = { telegram_id: user.id };
        payload[field] = newValue;
        fetch('/api/user/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (!res.ok) throw new Error('Server xatosi');
            alert('✅ Yangilandi!');
            loadProfile();
        })
        .catch(err => alert('❌ Xatolik: ' + err.message));
    }
}

// ---------- ADMIN PANEL ----------
async function loadAdminDashboard() {
    try {
        const res = await apiCall(`/api/admin/dashboard?telegram_id=${user.id}`);
        document.getElementById('stat-users').textContent = res.users || 0;
        document.getElementById('stat-taxi').textContent = res.taxi_ads || 0;
        document.getElementById('stat-orders').textContent = res.orders || 0;
    } catch (e) {
        alert('Admin maʼlumotlarni yuklashda xatolik');
    }
}

async function loadAdminUsers() {
    try {
        const data = await apiCall(`/api/admin/users?telegram_id=${user.id}`);
        const container = document.getElementById('admin-data');
        container.innerHTML = data.map(u => `
            <div class="user-item">${u.name} | ${u.phone || '—'} | ⭐ ${u.rating}</div>
        `).join('');
    } catch (e) {
        alert('Foydalanuvchilarni yuklashda xatolik');
    }
}

async function loadAdminComplaints() {
    try {
        const data = await apiCall(`/api/admin/complaints?telegram_id=${user.id}`);
        const container = document.getElementById('admin-data');
        container.innerHTML = data.map(c => `
            <div class="complaint-item">
                <strong>User ${c.user_id}:</strong> ${c.text}<br>
                <small>${new Date(c.created).toLocaleString()}</small>
            </div>
        `).join('');
    } catch (e) {
        alert('Shikoyatlarni yuklashda xatolik');
    }
}

async function sendBroadcast() {
    const text = prompt('📣 Reklama matnini kiriting:');
    if (!text) return;
    try {
        const res = await apiCall('/api/admin/broadcast', 'POST', {
            telegram_id: user.id,
            text,
            media_type: null
        });
        alert(`✅ Reklama ${res.sent || 0} ta foydalanuvchiga yuborildi!`);
    } catch (e) {
        alert('Reklama yuborishda xatolik: ' + e.message);
    }
}

// ---------- ISHGA TUSHIRISH ----------
showPage('home');
loadProfile();
checkAdmin();
