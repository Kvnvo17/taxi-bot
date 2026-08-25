// ============================================================
// Taksi Raqami Web App – Asosiy JavaScript
// ============================================================

const tg = window.Telegram.WebApp;
const user = tg.initDataUnsafe?.user || { id: 123456, first_name: "Test" };

let currentTheme = 'light';
let currentTab = 'taxi';
let currentFilter = 'all';
let selectedTheme = 'light';

// ---------- API CALL ----------
async function apiCall(url, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Xatolik ${res.status}`);
    }
    return res.json();
}

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
    order_result: document.getElementById('page-order-result')
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
}
navBtns.forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
});

document.getElementById('form-back').addEventListener('click', () => showPage('home'));
document.getElementById('order-result-back').addEventListener('click', () => showPage('home'));

// ---------- DROPDOWN FUNKSIYALARI ----------
function updateDistricts(prefix) {
    const regionSelect = document.getElementById(`${prefix}_region`);
    const districtSelect = document.getElementById(`${prefix}_district`);
    if (!regionSelect || !districtSelect) return;
    const region = regionSelect.value;
    if (region === 'Hamma') {
        districtSelect.innerHTML = '<option value="Hamma">Hamma</option>';
        updateMahallas(prefix);
        return;
    }
    const districtData = regions[region]?.districts || {};
    const districtNames = Object.keys(districtData);
    let options = '<option value="Hamma">Hamma</option>';
    districtNames.forEach(d => { options += `<option value="${d}">${d}</option>`; });
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
        mahallaSelect.innerHTML = '<option value="Hamma">Hamma</option>';
        return;
    }
    const mahallas = regions[region]?.districts?.[district] || ["Hamma"];
    let options = '<option value="Hamma">Hamma</option>';
    mahallas.forEach(m => {
        if (m !== 'Hamma') options += `<option value="${m}">${m}</option>`;
    });
    mahallaSelect.innerHTML = options;
}

function toggleParcelSize() {
    const val = document.getElementById('takes_parcel')?.value;
    const group = document.getElementById('parcel_size_group');
    if (group) group.style.display = val === 'true' ? 'block' : 'none';
}

// ---------- TELEFON VALIDATSIYA ----------
function validatePhone(phone) {
    const clean = phone.replace(/\D/g, '');
    return clean.length === 9;
}

function formatPhone(phone) {
    const clean = phone.replace(/\D/g, '');
    return '+998' + clean;
}

// ---------- KARTALAR ----------
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
        const action = card.dataset.action;
        if (action === 'driver') showForm('taxi');
        else if (action === 'passenger') showForm('search');
        else if (action === 'parcel_send') showForm('parcel_send');
    });
});

// ---------- FORMA ----------
function showForm(type) {
    const formBody = document.getElementById('form-body');
    const formTitle = document.getElementById('form-title');
    const regionOptions = regionNames.map(r => `<option value="${r}">${r}</option>`).join('');
    let html = '';

    if (type === 'taxi') {
        formTitle.textContent = '🚖 Taksi e’lonini joylash';
        html = `
            <div class="form-group">
                <label>⏰ Kutish vaqti</label>
                <select id="wait_time">
                    <option value="30">30 daqiqa</option>
                    <option value="60">1 soat</option>
                    <option value="120">2 soat</option>
                    <option value="180">3 soat</option>
                    <option value="240">4 soat</option>
                    <option value="300">5 soat</option>
                </select>
            </div>
            <div class="form-group">
                <label>💺 Jami joy</label>
                <select id="seats">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                </select>
            </div>
            <div style="border-left:4px solid #4f46e5; padding-left:16px; margin:16px 0;">
                <h4 style="margin-bottom:12px;">📍 Qayerdan</h4>
                <div class="form-group">
                    <label>Viloyat</label>
                    <select id="from_region" onchange="updateDistricts('from')">${regionOptions}</select>
                </div>
                <div class="form-group">
                    <label>Tuman</label>
                    <select id="from_district" onchange="updateMahallas('from')"><option value="Hamma">Hamma</option></select>
                </div>
                <div class="form-group">
                    <label>Mahalla</label>
                    <select id="from_neighborhood"><option value="Hamma">Hamma</option></select>
                </div>
            </div>
            <div style="border-left:4px solid #10b981; padding-left:16px; margin:16px 0;">
                <h4 style="margin-bottom:12px;">📍 Qayerga</h4>
                <div class="form-group">
                    <label>Viloyat</label>
                    <select id="to_region" onchange="updateDistricts('to')">${regionOptions}</select>
                </div>
                <div class="form-group">
                    <label>Tuman</label>
                    <select id="to_district"><option value="Hamma">Hamma</option></select>
                </div>
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
                <div class="phone-input">
                    <span class="phone-prefix">+998</span>
                    <input type="tel" id="phone" maxlength="9" placeholder="90 123 45 67">
                </div>
                <small style="color:#ef4444; display:none;" id="phone-error">❌ 9 ta raqam kiriting!</small>
            </div>
            <button class="primary-btn" onclick="submitTaxiAd()">✅ E’lonni joylash</button>
        `;
        setTimeout(() => {
            updateDistricts('from');
            updateDistricts('to');
        }, 100);
    } else if (type === 'search') {
        formTitle.textContent = '🧍 Yo‘lovchi sifatida qidirish';
        html = `
            <div class="form-group">
                <label>👥 Necha kishi</label>
                <select id="people">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                </select>
            </div>
            <div style="border-left:4px solid #4f46e5; padding-left:16px; margin:16px 0;">
                <h4 style="margin-bottom:12px;">📍 Qayerdan</h4>
                <div class="form-group">
                    <label>Viloyat</label>
                    <select id="search_from_region" onchange="updateDistricts('search_from')">${regionOptions}</select>
                </div>
                <div class="form-group">
                    <label>Tuman</label>
                    <select id="search_from_district"><option value="Hamma">Hamma</option></select>
                </div>
            </div>
            <div style="border-left:4px solid #10b981; padding-left:16px; margin:16px 0;">
                <h4 style="margin-bottom:12px;">📍 Qayerga</h4>
                <div class="form-group">
                    <label>Viloyat</label>
                    <select id="search_to_region" onchange="updateDistricts('search_to')">${regionOptions}</select>
                </div>
                <div class="form-group">
                    <label>Tuman</label>
                    <select id="search_to_district"><option value="Hamma">Hamma</option></select>
                </div>
            </div>
            <button class="primary-btn" onclick="searchTaxi()">🔍 Taksi qidirish</button>
            <div id="search-results" style="margin-top:16px;"></div>
        `;
        setTimeout(() => {
            updateDistricts('search_from');
            updateDistricts('search_to');
        }, 100);
    } else if (type === 'parcel_send') {
        formTitle.textContent = '📦 Pochta yuborish';
        html = `
            <div style="border-left:4px solid #4f46e5; padding-left:16px; margin:16px 0;">
                <h4 style="margin-bottom:12px;">📍 Qayerdan</h4>
                <div class="form-group">
                    <label>Viloyat</label>
                    <select id="ps_from_region" onchange="updateDistricts('ps_from')">${regionOptions}</select>
                </div>
                <div class="form-group">
                    <label>Tuman</label>
                    <select id="ps_from_district"><option value="Hamma">Hamma</option></select>
                </div>
            </div>
            <div style="border-left:4px solid #10b981; padding-left:16px; margin:16px 0;">
                <h4 style="margin-bottom:12px;">📍 Qayerga</h4>
                <div class="form-group">
                    <label>Viloyat</label>
                    <select id="ps_to_region" onchange="updateDistricts('ps_to')">${regionOptions}</select>
                </div>
                <div class="form-group">
                    <label>Tuman</label>
                    <select id="ps_to_district"><option value="Hamma">Hamma</option></select>
                </div>
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
                <div class="phone-input">
                    <span class="phone-prefix">+998</span>
                    <input type="tel" id="ps_phone" maxlength="9" placeholder="90 123 45 67">
                </div>
            </div>
            <button class="primary-btn" onclick="submitParcelSend()">✅ Yuborish</button>
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

// ---------- TAKSI E'LON JOYLASH ----------
async function submitTaxiAd() {
    const phoneInput = document.getElementById('phone');
    const phone = phoneInput.value.trim();
    
    if (!validatePhone(phone)) {
        document.getElementById('phone-error').style.display = 'block';
        phoneInput.focus();
        return;
    }
    document.getElementById('phone-error').style.display = 'none';
    
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
        price: parseFloat(document.getElementById('price').value) || 0,
        negotiable: document.getElementById('negotiable').value === 'true',
        takes_parcel: document.getElementById('takes_parcel').value === 'true',
        parcel_size: document.getElementById('parcel_size')?.value || null,
        phone: formatPhone(phone)
    };

    try {
        await apiCall(`/api/taxi/ad?telegram_id=${user.id}`, 'POST', data);
        alert('✅ E’lon muvaffaqiyatli joylandi!');
        showPage('home');
        loadAds();
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
                <div class="row"><span>🚗 ${ad.car_name}</span><span>⭐ ${ad.rating || 0}</span></div>
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
        const ad = await apiCall(`/api/taxi/ad/${adId}`);
        showOrderResult({
            driver_name: ad.driver_name,
            driver_phone: ad.phone,
            driver_rating: ad.rating,
            from: ad.from,
            to: ad.to,
            wait_time: ad.wait_time,
            price: ad.price,
            type: 'taksi'
        });
        apiCall('/api/order/create', 'POST', {
            taxi_ad_id: adId,
            passenger_telegram_id: user.id,
            type: 'taxi'
        }).catch(() => {});
    } catch (e) {
        alert('❌ Xatolik: ' + e.message);
    }
}

// ---------- POCHTA YUBORISH ----------
async function submitParcelSend() {
    const phoneInput = document.getElementById('ps_phone');
    const phone = phoneInput.value.trim();
    if (!validatePhone(phone)) {
        alert('❌ 9 ta raqam kiriting!');
        phoneInput.focus();
        return;
    }

    const from_region = document.getElementById('ps_from_region').value;
    const to_region = document.getElementById('ps_to_region').value;
    if (from_region === to_region && from_region !== 'Hamma') {
        alert('❌ Qayerdan va qayerga bir xil bo‘lishi mumkin emas!');
        return;
    }

    const data = {
        from_location: {
            region: from_region,
            district: document.getElementById('ps_from_district').value
        },
        to_location: {
            region: to_region,
            district: document.getElementById('ps_to_district').value
        },
        size: document.getElementById('ps_size').value,
        phone: formatPhone(phone)
    };

    try {
        await apiCall(`/api/parcel/order?telegram_id=${user.id}`, 'POST', data);
        alert('✅ Pochta yuborildi!');
        showPage('home');
    } catch (e) {
        alert('❌ Xatolik: ' + e.message);
    }
}

// ---------- POCHTA BUYURTMA ----------
async function orderParcel(adId) {
    try {
        const ad = await apiCall(`/api/taxi/ad/${adId}`);
        showOrderResult({
            driver_name: ad.driver_name,
            driver_phone: ad.phone,
            driver_rating: ad.rating,
            from: ad.from,
            to: ad.to,
            wait_time: ad.wait_time,
            price: ad.price,
            type: 'pochta'
        });
        apiCall('/api/order/create', 'POST', {
            taxi_ad_id: adId,
            passenger_telegram_id: user.id,
            type: 'parcel'
        }).catch(() => {});
    } catch (e) {
        alert('❌ Xatolik: ' + e.message);
    }
}

// ---------- BUYURTMA NATIJASI ----------
function showOrderResult(data) {
    const container = document.getElementById('order-result-content');
    container.innerHTML = `
        <div class="order-success">
            <h3>✅ Buyurtma yuborildi!</h3>
            <div class="driver-info">
                <p>🚗 Haydovchi: ${data.driver_name}</p>
                <p>⭐ Reyting: ${data.driver_rating || 0}</p>
                <p>📞 Telefon: ${data.driver_phone}</p>
                <div class="actions">
                    <a href="tel:${data.driver_phone}" style="flex:1;">
                        <button class="call-btn" style="width:100%;">📞 Qo‘ng‘iroq</button>
                    </a>
                    <button class="copy-btn" style="flex:1;" onclick="copyPhone('${data.driver_phone}')">📋 Nusxalash</button>
                </div>
            </div>
            <div class="order-details">
                <p>📍 ${data.from} → ${data.to}</p>
                <p>⏰ ${data.wait_time} daqiqa</p>
                <p>💰 ${data.price} so‘m</p>
                <p>📦 ${data.type === 'pochta' ? 'Pochta yuborish' : 'Taksi buyurtma'}</p>
            </div>
        </div>
    `;
    showPage('order_result');
}

// ---------- NUSXALASH ----------
function copyPhone(phone) {
    navigator.clipboard.writeText(phone).then(() => {
        alert('✅ Telefon raqam nusxalandi!');
    }).catch(() => {
        const input = document.createElement('input');
        input.value = phone;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        alert('✅ Telefon raqam nusxalandi!');
    });
}

// ---------- E'LONLAR ----------
async function loadAds() {
    const container = document.getElementById('ads-list');
    const tab = currentTab;
    try {
        let url = '/api/taxi/search?from_location={}&to_location={}&people=1';
        const data = await apiCall(url);
        if (data.length === 0) {
            container.innerHTML = '<p>📭 Hozircha e’lonlar yo‘q.</p>';
            return;
        }
        container.innerHTML = data.map(ad => `
            <div class="ad-item">
                <div><strong>🚗 ${ad.car_name}</strong> ⭐ ${ad.rating || 0}</div>
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

// ---------- TABLAR ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentTab = this.dataset.tab;
        loadAds();
    });
});

// ---------- BUYURTMALAR ----------
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
                <div>📅 ${new Date(o.created_at).toLocaleString()}</div>
                <div>📍 ${o.from || '—'} → ${o.to || '—'}</div>
                <div>🚗 Haydovchi: ${o.driver_name || '—'}</div>
                <div>📞 ${o.driver_phone || '—'}</div>
                <div class="actions">
                    ${o.driver_phone ? `
                        <a href="tel:${o.driver_phone}" style="flex:1;">
                            <button class="call-btn" style="width:100%;">📞 Qo‘ng‘iroq</button>
                        </a>
                        <button class="copy-btn" style="flex:1;" onclick="copyPhone('${o.driver_phone}')">📋 Nusxalash</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<p>❌ Xatolik.</p>';
    }
}

// ---------- FILTERLAR ----------
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.status;
        loadOrders();
    });
});

// ---------- PROFIL ----------
async function loadProfile() {
    const container = document.getElementById('profile-content');
    try {
        const data = await apiCall(`/api/user/${user.id}`);
        container.innerHTML = `
            <div class="profile-item">
                <span>👤 Ism: ${data.first_name}</span>
            </div>
            <div class="profile-item">
                <span>📞 Telefon: ${data.phone || '—'}</span>
                <button onclick="editField('phone', '${data.phone || ''}')">✏️</button>
            </div>
            <div class="profile-item">
                <span>🚗 Mashina: ${data.car_name || '—'}</span>
                <button onclick="editField('car_name', '${data.car_name || ''}')">✏️</button>
            </div>
            <div class="profile-item">
                <span>⭐ Reyting: ${data.rating ? data.rating.toFixed(1) : '0.0'}</span>
                <span style="font-size:0.8em; opacity:0.6;">(avtomatik)</span>
            </div>
            <div class="profile-item">
                <span>🌐 Til: ${data.language || 'uz'}</span>
                <button onclick="editLanguage()">✏️</button>
            </div>
            <div class="profile-item">
                <span>🎨 Ko‘rinish: ${data.theme || 'light'}</span>
                <button onclick="editTheme()">✏️</button>
            </div>
            <div class="profile-actions">
                <button onclick="loadMyAds('taxi')">📋 Taksi e’lonlarim</button>
                <button onclick="loadMyAds('parcel')">📦 Pochta e’lonlarim</button>
            </div>
            <div id="my-ads-list"></div>
        `;
        if (data.theme) setTheme(data.theme);
    } catch (e) {
        container.innerHTML = '<p>❌ Profilni yuklashda xatolik.</p>';
    }
}

function editField(field, currentValue) {
    const labels = {
        phone: '📞 Telefon raqam',
        car_name: '🚗 Mashina nomi'
    };
    const newValue = prompt(`${labels[field]} ni yangilang:`, currentValue);
    if (newValue !== null && newValue !== currentValue) {
        const payload = { telegram_id: user.id };
        if (field === 'phone') {
            if (!validatePhone(newValue)) {
                alert('❌ 9 ta raqam kiriting!');
                return;
            }
            payload[field] = formatPhone(newValue);
        } else {
            payload[field] = newValue;
        }
        fetch('/
