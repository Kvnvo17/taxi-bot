// ============================================================
// Admin Panel JavaScript
// ============================================================

const tg = window.Telegram.WebApp;
const user = tg.initDataUnsafe?.user || { id: 123456 };

// ---------- API ----------
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

// ---------- MENU ----------
document.querySelectorAll('.admin-menu-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.admin-menu-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.admin-section').forEach(el => el.classList.remove('active'));
        const section = document.getElementById(`section-${this.dataset.section}`);
        if (section) section.classList.add('active');
        if (this.dataset.section === 'dashboard') loadDashboard();
        if (this.dataset.section === 'users') loadUsers();
        if (this.dataset.section === 'taxi_ads') loadTaxiAds();
        if (this.dataset.section === 'parcel_ads') loadParcelAds();
        if (this.dataset.section === 'orders') loadAdminOrders();
        if (this.dataset.section === 'ratings') loadRatings();
        if (this.dataset.section === 'complaints') loadComplaints();
        if (this.dataset.section === 'channels') loadChannels();
    });
});

// ---------- THEME ----------
document.getElementById('theme-toggle').addEventListener('click', function() {
    document.body.classList.toggle('dark');
});

// ---------- DASHBOARD ----------
async function loadDashboard() {
    try {
        const data = await apiCall(`/api/admin/dashboard?telegram_id=${user.id}`);
        document.getElementById('stat-users').textContent = data.users || 0;
        document.getElementById('stat-taxi').textContent = data.taxi_ads || 0;
        document.getElementById('stat-parcel').textContent = data.parcel_ads || 0;
        document.getElementById('stat-orders').textContent = data.orders || 0;
        document.getElementById('stat-rating').textContent = data.avg_rating || 0;
        document.getElementById('stat-complaints').textContent = data.complaints || 0;
    } catch (e) { console.error(e); }
}

// ---------- USERS ----------
async function loadUsers() {
    try {
        const data = await apiCall(`/api/admin/users?telegram_id=${user.id}`);
        document.getElementById('users-list').innerHTML = data.map(u => `
            <div style="padding:10px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;">
                <span><strong>${u.name}</strong> ${u.phone || '—'}</span>
                <span>⭐ ${u.rating || 0}</span>
                <span>${u.is_active ? '🟢 Faol' : '🔴 Blok'}</span>
            </div>
        `).join('') || '<p>📭 Foydalanuvchilar yo‘q.</p>';
    } catch (e) { document.getElementById('users-list').innerHTML = '<p>❌ Xatolik</p>'; }
}

// ---------- TAXI ADS ----------
async function loadTaxiAds() {
    try {
        const data = await apiCall(`/api/admin/taxi-ads?telegram_id=${user.id}`);
        document.getElementById('taxi-ads-list').innerHTML = data.map(ad => `
            <div style="padding:10px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;">
                <span><strong>${ad.driver_name}</strong> ${ad.from} → ${ad.to}</span>
                <span>${ad.is_active ? '🟢' : '🔴'}</span>
                ${ad.is_active ? `<button onclick="deleteAd(${ad.id},'taxi')" class="btn-red">❌</button>` : ''}
            </div>
        `).join('') || '<p>📭 Taksi e’lonlari yo‘q.</p>';
    } catch (e) { document.getElementById('taxi-ads-list').innerHTML = '<p>❌ Xatolik</p>'; }
}

// ---------- PARCEL ADS ----------
async function loadParcelAds() {
    try {
        const data = await apiCall(`/api/admin/parcel-ads?telegram_id=${user.id}`);
        document.getElementById('parcel-ads-list').innerHTML = data.map(ad => `
            <div style="padding:10px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;">
                <span><strong>${ad.user_name}</strong> ${ad.from} → ${ad.to}</span>
                <span>${ad.is_active ? '🟢' : '🔴'}</span>
                ${ad.is_active ? `<button onclick="deleteAd(${ad.id},'parcel')" class="btn-red">❌</button>` : ''}
            </div>
        `).join('') || '<p>📭 Pochta e’lonlari yo‘q.</p>';
    } catch (e) { document.getElementById('parcel-ads-list').innerHTML = '<p>❌ Xatolik</p>'; }
}

// ---------- ORDERS ----------
async function loadAdminOrders() {
    try {
        const data = await apiCall(`/api/admin/orders?telegram_id=${user.id}`);
        document.getElementById('admin-orders-list').innerHTML = data.map(o => `
            <div style="padding:10px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;">
                <span>#${o.id} ${o.passenger_name} → ${o.driver_name}</span>
                <span>${o.status === 'waiting' ? '🟡' : o.status === 'completed' ? '✅' : '❌'}</span>
                ${o.status === 'waiting' ? `
                    <span>
                        <button onclick="updateOrder(${o.id},'completed')" class="btn-green">✅</button>
                        <button onclick="updateOrder(${o.id},'cancelled')" class="btn-red">❌</button>
                    </span>
                ` : ''}
            </div>
        `).join('') || '<p>📭 Buyurtmalar yo‘q.</p>';
    } catch (e) { document.getElementById('admin-orders-list').innerHTML = '<p>❌ Xatolik</p>'; }
}

// ---------- RATINGS ----------
async function loadRatings() {
    try {
        const data = await apiCall(`/api/admin/ratings?telegram_id=${user.id}`);
        document.getElementById('ratings-list').innerHTML = data.map(r => `
            <div style="padding:10px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;">
                <span>${r.driver_name}</span>
                <span>⭐ ${r.avg_rating || 0}</span>
                <span>${r.count || 0} ta baho</span>
            </div>
        `).join('') || '<p>⭐ Reytinglar yo‘q.</p>';
    } catch (e) { document.getElementById('ratings-list').innerHTML = '<p>❌ Xatolik</p>'; }
}

// ---------- COMPLAINTS ----------
async function loadComplaints() {
    try {
        const data = await apiCall(`/api/admin/complaints?telegram_id=${user.id}`);
        document.getElementById('complaints-list').innerHTML = data.map(c => `
            <div style="padding:10px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;">
                <span><strong>${c.user_name}</strong> ${c.text}</span>
                <span>${c.status === 'pending' ? '🟡' : '✅'}</span>
                ${c.status === 'pending' ? `<button onclick="resolveComplaint(${c.id})" class="btn-green">✅ Hal qilindi</button>` : ''}
            </div>
        `).join('') || '<p>📢 Shikoyatlar yo‘q.</p>';
    } catch (e) { document.getElementById('complaints-list').innerHTML = '<p>❌ Xatolik</p>'; }
}

// ---------- CHANNELS ----------
async function loadChannels() {
    try {
        const data = await apiCall(`/api/admin/channels?telegram_id=${user.id}`);
        document.getElementById('channels-list').innerHTML = data.map((ch, i) => `
            <div style="padding:10px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;">
                <span>${i+1}. @${ch.username}</span>
                <button onclick="removeChannel('${ch.username}')" class="btn-red">❌</button>
            </div>
        `).join('') || '<p>🔗 Kanallar yo‘q.</p>';
    } catch (e) { document.getElementById('channels-list').innerHTML = '<p>❌ Xatolik</p>'; }
}

// ---------- ACTIONS ----------
window.deleteAd = async function(id, type) {
    if (!confirm('O‘chirmoqchimisiz?')) return;
    try {
        await apiCall(`/api/admin/${type}-ad/${id}`, 'DELETE', { telegram_id: user.id });
        alert('✅ O‘chirildi!');
        if (type === 'taxi') loadTaxiAds();
        else loadParcelAds();
    } catch (e) { alert('❌ Xatolik: ' + e.message); }
};

window.updateOrder = async function(id, status) {
    try {
        await apiCall(`/api/admin/order/${id}`, 'PUT', { telegram_id: user.id, status });
        alert('✅ Yangilandi!');
        loadAdminOrders();
    } catch (e) { alert('❌ Xatolik: ' + e.message); }
};

window.resolveComplaint = async function(id) {
    try {
        await apiCall(`/api/admin/complaint/${id}`, 'PUT', { telegram_id: user.id, status: 'resolved' });
        alert('✅ Hal qilindi!');
        loadComplaints();
    } catch (e) { alert('❌ Xatolik: ' + e.message); }
};

window.addChannel = async function() {
    const input = document.getElementById('channel-input');
    const username = input.value.trim().replace('@', '');
    if (!username) return alert('Kanal username kiriting!');
    try {
        await apiCall('/api/admin/channels', 'POST', { telegram_id: user.id, username });
        alert('✅ Qo‘shildi!');
        input.value = '';
        loadChannels();
    } catch (e) { alert('❌ Xatolik: ' + e.message); }
};

window.removeChannel = async function(username) {
    if (!confirm(`@${username} o‘chirmoqchimisiz?`)) return;
    try {
        await apiCall(`/api/admin/channels/${username}`, 'DELETE', { telegram_id: user.id });
        alert('✅ O‘chirildi!');
        loadChannels();
    } catch (e) { alert('❌ Xatolik: ' + e.message); }
};

window.sendBroadcast = async function() {
    const text = document.getElementById('broadcast-text').value.trim();
    if (!text) return alert('Matn kiriting!');
    try {
        const res = await apiCall('/api/admin/broadcast', 'POST', {
            telegram_id: user.id,
            text,
            target: document.getElementById('broadcast-target').value
        });
        document.getElementById('broadcast-result').innerHTML = `<p style="color:#10b981;">✅ ${res.sent || 0} ta yuborildi!</p>`;
        document.getElementById('broadcast-text').value = '';
    } catch (e) {
        document.getElementById('broadcast-result').innerHTML = `<p style="color:#ef4444;">❌ ${e.message}</p>`;
    }
};

window.saveSettings = async function() {
    try {
        await apiCall('/api/admin/settings', 'POST', {
            telegram_id: user.id,
            expire_hours: parseInt(document.getElementById('setting-expire-hours').value),
            rating_hours: parseInt(document.getElementById('setting-rating-hours').value)
        });
        alert('✅ Saqlandi!');
    } catch (e) { alert('❌ Xatolik: ' + e.message); }
};

// ---------- BANNER ----------
window.uploadBanner = async function() {
    const file = document.getElementById('banner-file').files[0];
    if (!file) return alert('❌ Rasm tanlang!');
    
    // 3:4 nisbat tekshirish
    const img = new Image();
    img.onload = async function() {
        if (Math.abs((img.width / img.height) - (3/4)) > 0.01) {
            alert('❌ Rasm 3:4 nisbatda bo‘lishi kerak! (masalan: 300x400)');
            return;
        }
        const formData = new FormData();
        formData.append('banner', file);
        formData.append('telegram_id', user.id);
        
        try {
            const res = await fetch('/api/admin/banner', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.url) {
                document.getElementById('banner-preview').innerHTML = `<img src="${data.url}?t=${Date.now()}" style="width:200px; border-radius:12px;">`;
                alert('✅ Banner yuklandi!');
            }
        } catch (e) {
            alert('❌ Xatolik: ' + e.message);
        }
    };
    img.src = URL.createObjectURL(file);
};

window.deleteBanner = async function() {
    if (!confirm('❌ Bannerni o‘chirmoqchimisiz?')) return;
    try {
        await apiCall('/api/admin/banner', 'DELETE', { telegram_id: user.id });
        document.getElementById('banner-preview').innerHTML = '';
        document.getElementById('banner-image').style.display = 'none';
        alert('✅ Banner o‘chirildi!');
    } catch (e) {
        alert('❌ Xatolik: ' + e.message);
    }
};

// ---------- START ----------
loadDashboard();
