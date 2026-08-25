// ============================================================
// Taksi Raqami Web App – TO‘LIQ JAVASCRIPT
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
document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            setTheme(currentTheme === 'light' ? 'dark' : 'light');
        });
    }
});

// ---------- NAVIGATION ----------
document.addEventListener('DOMContentLoaded', function() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.dataset.page;
            showPage(page);
        });
    });

    const formBack = document.getElementById('form-back');
    if (formBack) formBack.addEventListener('click', () => showPage('home'));
    
    const resultBack = document.getElementById('order-result-back');
    if (resultBack) resultBack.addEventListener('click', () => showPage('home'));
});

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
        if (pages[key]) pages[key].classList.toggle('active', key === name);
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === name);
    });
    if (name === 'profile') loadProfile();
    if (name === 'orders') loadOrders();
    if (name === 'ads') loadAds();
}

// ---------- DROPDOWN FUNKSIYALARI ----------
function updateDistricts(prefix) {
    const regionSelect = document.getElementById(`${prefix}_region`);
    const districtSelect = document.getElementById(`${prefix}_district`);
    if (!regionSelect || !districtSelect) return;
    const region = regionSelect.value;
    if (region === 'Hamma' || !regions[region]) {
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
    if (region === 'Hamma' || district === 'Hamma' || !regions[region]) {
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
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', function() {
            const action = this.dataset.action;
            if (action === 'driver') showForm('taxi');
            else if (action === 'passenger') showForm('search');
            else if (action === 'parcel_send') showForm('parcel_send');
        });
    });
});

// ---------- FORMA ----------
function showForm(type) {
    const formBody = document.getElementById('form-body');
    const formTitle = document.getElementById('form-title');
    if (!formBody || !formTitle) return;
    
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
window.submitTaxiAd = async function() {
    const phoneInput = document.getElementById('phone');
    const phone = phoneInput ? phoneInput.value.trim() : '';
    
    if (!validatePhone(phone)) {
        const err = document.getElementById('phone-error');
        if (err) err.style.display = 'block';
        if (phoneInput) phoneInput.focus();
        return;
    }
    const err = document.getElementById('phone-error');
    if (err) err.style.display = 'none';
    
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
};

// ---------- YO'LOVCHI QIDIRISH ----------
window.searchTaxi = async function() {
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
        if (!container) return;
        if (results.length === 0) {
            container.innerHTML = '<p>🔔 Hozircha mos taksi topilmadi.</p>';
            return;
        }
        container.innerHTML = results.map(ad => `
            <div class="result-item">
                <div class="row"><span>🚗 ${ad.car_name || 'Noma\'lum'}</span><span>⭐ ${ad.rating || 0}</span></div>
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
};

// ---------- BUYURTMA BERISH ----------
window.orderTaxi = async function(adId) {
    try {
        const ad = await apiCall(`/api/taxi/ad/${adId}`);
        showOrderResult({
            driver_name: ad.driver_name || 'Noma\'lum',
            driver_phone: ad.phone || '+998901234567',
            driver_rating: ad.rating || 0,
            from: ad.from || '—',
            to: ad.to || '—',
            wait_time: ad.wait_time || 0,
            price: ad.price || 0,
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
};

// ---------- POCHTA YUBORISH ----------
window.submitParcelSend = async function() {
    const phoneInput = document.getElementById('ps_phone');
    const phone = phoneInput ? phoneInput.value.trim() : '';
    if (!validatePhone(phone)) {
        alert('❌ 9 ta raqam kiriting!');
        if (phoneInput) phoneInput.focus();
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
};

// ---------- POCHTA BUYURTMA ----------
window.orderParcel = async function(adId) {
    try {
        const ad = await apiCall(`/api/taxi/ad/${adId}`);
        showOrderResult({
            driver_name: ad.driver_name || 'Noma\'lum',
            driver_phone: ad.phone || '+998901234567',
            driver_rating: ad.rating || 0,
            from: ad.from || '—',
            to: ad.to || '—',
            wait_time: ad.wait_time || 0,
            price: ad.price || 0,
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
};

// ---------- BUYURTMA NATIJASI ----------
function showOrderResult(data) {
    const container = document.getElementById('order-result-content');
    if (!container) return;
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
window.copyPhone = function(phone) {
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
};

// ---------- E'LONLAR ----------
async function loadAds() {
    const container = document.getElementById('ads-list');
    if (!container) return;
    try {
        const data = await apiCall('/api/taxi/search?from_location={}&to_location={}&people=1');
        if (data.length === 0) {
            container.innerHTML = '<p>📭 Hozircha e’lonlar yo‘q.</p>';
            return;
        }
        container.innerHTML = data.map(ad => `
            <div class="ad-item">
                <div><strong>🚗 ${ad.car_name || 'Noma\'lum'}</strong> ⭐ ${ad.rating || 0}</div>
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
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentTab = this.dataset.tab;
            loadAds();
        });
    });
});

// ---------- BUYURTMALAR ----------
async function loadOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;
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
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.status;
            loadOrders();
        });
    });
});

// ---------- PROFIL ----------
async function loadProfile() {
    const container = document.getElementById('profile-content');
    if (!container) return;
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

window.editField = function(field, currentValue) {
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
        fetch('/api/user/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (!res.ok) throw new Error('Xatolik');
            alert('✅ Yangilandi!');
            loadProfile();
        })
        .catch(err => alert('❌ Xatolik: ' + err.message));
    }
};

// ---------- TIL TANLASH ----------
window.editLanguage = function() {
    const langs = [
        { code: 'uz', name: '🇺🇿 O\'zbekcha (Lotin)' },
        { code: 'uz_cyrl', name: '🇺🇿 Ўзбекча (Kirill)' },
        { code: 'ru', name: '🇷🇺 Русский' },
        { code: 'en', name: '🇬🇧 English' }
    ];
    let html = '<div class="lang-select">';
    langs.forEach(lang => {
        html += `
            <label class="lang-option" style="display:block;padding:10px;margin:4px 0;border-radius:10px;cursor:pointer;">
                <input type="radio" name="language" value="${lang.code}">
                ${lang.name}
            </label>
        `;
    });
    html += `
        <div class="lang-actions" style="margin-top:16px;">
            <button onclick="saveLanguage()" class="primary-btn">✅ Saqlash</button>
            <button onclick="closeModal()" class="back-btn" style="margin-top:8px;">❌ Bekor</button>
        </div>
    </div>`;
    showModal(html);
};

window.saveLanguage = function() {
    const selected = document.querySelector('input[name="language"]:checked');
    if (!selected) return alert('❌ Til tanlang!');
    const lang = selected.value;
    fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user.id, language: lang })
    })
    .then(() => {
        alert('✅ Til yangilandi!');
        closeModal();
        loadProfile();
    })
    .catch(() => alert('❌ Xatolik'));
};

// ---------- KO'RINISH TANLASH ----------
window.editTheme = function() {
    const html = `
        <div class="theme-select">
            <div class="theme-options" style="display:flex;gap:16px;justify-content:center;margin:16px 0;">
                <div class="theme-card" onclick="selectTheme('light')" style="padding:24px;border-radius:16px;border:2px solid #ddd;cursor:pointer;text-align:center;flex:1;">
                    <span style="font-size:48px;display:block;">☀️</span>
                    <span style="font-weight:600;">Light</span>
                </div>
                <div class="theme-card" onclick="selectTheme('dark')" style="padding:24px;border-radius:16px;border:2px solid #ddd;cursor:pointer;text-align:center;flex:1;">
                    <span style="font-size:48px;display:block;">🌙</span>
                    <span style="font-weight:600;">Dark</span>
                </div>
            </div>
            <div class="theme-actions">
                <button onclick="saveTheme()" class="primary-btn">✅ Saqlash</button>
                <button onclick="closeModal()" class="back-btn" style="margin-top:8px;">❌ Bekor</button>
            </div>
        </div>
    `;
    showModal(html);
};

window.selectTheme = function(theme) {
    selectedTheme = theme;
    document.querySelectorAll('.theme-card').forEach(el => {
        el.style.borderColor = el.textContent.trim().toLowerCase() === theme ? '#4f46e5' : '#ddd';
        el.style.background = el.textContent.trim().toLowerCase() === theme ? 'rgba(79,70,229,0.1)' : 'transparent';
    });
};

window.saveTheme = function() {
    fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user.id, theme: selectedTheme })
    })
    .then(() => {
        alert('✅ Ko‘rinish yangilandi!');
        setTheme(selectedTheme);
        closeModal();
        loadProfile();
    })
    .catch(() => alert('❌ Xatolik'));
};

// ---------- MODAL ----------
function showModal(html) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    document.getElementById('modal-body').innerHTML = html;
    overlay.style.display = 'flex';
}
window.closeModal = function() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'none';
};
document.addEventListener('DOMContentLoaded', function() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }
});

// ---------- O'Z E'LONLARIM ----------
window.loadMyAds = async function(type) {
    const container = document.getElementById('my-ads-list');
    if (!container) return;
    try {
        const url = type === 'taxi' 
            ? `/api/user/${user.id}/taxi-ads`
            : `/api/user/${user.id}/parcel-ads`;
        const data = await apiCall(url);
        if (data.length === 0) {
            container.innerHTML = '<p>📭 E’lonlar yo‘q.</p>';
            return;
        }
        container.innerHTML = data.map(ad => `
            <div class="my-ad-item" style="background:rgba(255,255,255,0.3);border-radius:12px;padding:12px;margin-bottom:8px;">
                <div><strong>#${ad.id}</strong> ${ad.is_active ? '🟢 Faol' : '🔴 Faol emas'}</div>
                <div>📍 ${ad.from} → ${ad.to}</div>
                <div>⏰ ${ad.wait_time || '—'} daqiqa | 💺 ${ad.seats || '—'}</div>
                <div>💰 ${ad.price || '—'} so‘m</div>
                <div>📦 ${ad.takes_parcel ? 'Pochta oladi' : 'Pochta olmaydi'}</div>
                ${ad.is_active ? `<button onclick="deleteMyAd(${ad.id}, '${type}')" style="margin-top:8px;padding:6px 16px;border:none;border-radius:8px;background:#ef4444;color:#fff;cursor:pointer;">❌ O‘chirish</button>` : ''}
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<p>❌ Xatolik.</p>';
    }
};

window.deleteMyAd = async function(adId, type) {
    if (!confirm('❌ Bu e’lonni o‘chirmoqchimisiz?')) return;
    try {
        const url = type === 'taxi' 
            ? `/api/taxi/ad/${adId}`
            : `/api/parcel/ad/${adId}`;
        await apiCall(url, 'DELETE', { telegram_id: user.id });
        alert('✅ E’lon o‘chirildi!');
        loadMyAds(type);
    } catch (e) {
        alert('❌ Xatolik: ' + e.message);
    }
};

// ---------- BOSHLANG'ICH ----------
document.addEventListener('DOMContentLoaded', function() {
    showPage('home');
    loadProfile();
    loadAds();
});
