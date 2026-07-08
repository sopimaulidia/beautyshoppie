/* ==========================================================
   Shoppie-Beauty — app.js
   Semua logika interaktif website (vanilla JavaScript)
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {

    /* ────────────────────────────────────────────
       0. GOOGLE ANALYTICS (dummy) — event helper
       Lihat README.md bagian "Rencana Data Analytics"
       untuk daftar metrik yang dipantau.
       ──────────────────────────────────────────── */
    function trackEvent(eventName, params = {}) {
        // Dummy call — di production, gtag sudah di-load di <head>
        if (typeof gtag === 'function') {
            gtag('event', eventName, params);
        } else {
            console.log('[Analytics dummy]', eventName, params);
        }
    }

    /* ────────────────────────────────────────────
       1. HAMBURGER / MOBILE MENU
       ──────────────────────────────────────────── */
    const menuButton = document.getElementById('menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    menuButton.addEventListener('click', () => {
        mobileMenu.style.display = mobileMenu.style.display === 'block' ? 'none' : 'block';
    });
    document.querySelectorAll('#mobile-menu a').forEach(a => {
        a.addEventListener('click', () => { mobileMenu.style.display = 'none'; });
    });

    /* ────────────────────────────────────────────
       2. CART STATE (+ localStorage)
       ──────────────────────────────────────────── */
    let cart = [];

    function formatRp(n) {
        return 'Rp ' + n.toLocaleString('id-ID');
    }

    function saveCart() {
        localStorage.setItem('shoppay_cart', JSON.stringify(cart));
    }

    function loadCart() {
        try {
            const saved = localStorage.getItem('shoppay_cart');
            if (saved) cart = JSON.parse(saved);
        } catch (e) {
            cart = [];
        }
    }

    function updateBadge() {
        document.getElementById('cart-badge').textContent = cart.reduce((s, i) => s + i.qty, 0);
        saveCart();
    }

    function updateTotal() {
        const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
        document.getElementById('cart-total').textContent = formatRp(total);
    }

    function changeQty(idx, delta) {
        cart[idx].qty += delta;
        if (cart[idx].qty <= 0) cart.splice(idx, 1);
        renderCart();
        updateTotal();
        updateBadge();
    }
    // Dipanggil lewat inline onclick di template renderCart()
    window.changeQty = changeQty;

    function renderCart() {
        const el = document.getElementById('cart-items');
        if (!cart.length) {
            el.innerHTML = '<p>Keranjang Anda kosong.</p>';
            return;
        }
        el.innerHTML = cart.map((item, idx) => `
            <div class="cart-item">
                <div style="flex:1">
                    <div class="cart-item-name">${item.name}</div>
                    <div style="font-size:.8rem;color:var(--gray);margin-top:2px">${formatRp(item.price)} / item</div>
                    <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
                        <button onclick="changeQty(${idx},-1)" style="width:28px;height:28px;border:1px solid var(--sand);background:var(--cream);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;border-radius:2px">−</button>
                        <span style="font-weight:600;min-width:20px;text-align:center">${item.qty}</span>
                        <button onclick="changeQty(${idx},1)" style="width:28px;height:28px;border:1px solid var(--sand);background:var(--cream);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;border-radius:2px">+</button>
                    </div>
                </div>
                <div class="cart-item-detail">
                    <span class="cart-item-price">${formatRp(item.price * item.qty)}</span>
                    <button class="cart-item-remove" data-idx="${idx}">×</button>
                </div>
            </div>
        `).join('');

        el.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const removed = cart[+btn.dataset.idx];
                cart.splice(+btn.dataset.idx, 1);
                renderCart();
                updateTotal();
                updateBadge();
                if (removed) trackEvent('remove_from_cart', { item_name: removed.name });
            });
        });
    }

    function addToCart(name, price, qty = 1) {
        const existing = cart.find(i => i.name === name);
        if (existing) existing.qty += qty;
        else cart.push({ name, price, qty });
        updateBadge();
        trackEvent('add_to_cart', { item_name: name, price, qty });
        showMessage('✓ Ditambahkan!', `${name} berhasil ditambahkan ke keranjang.`);
    }

    /* Tombol "+ Keranjang" pada setiap kartu produk */
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // jangan buka modal detail
            addToCart(btn.dataset.name, +btn.dataset.price);
        });
    });

    /* Ikon keranjang di navbar */
    document.getElementById('cart-icon').addEventListener('click', () => {
        renderCart();
        updateTotal();
        openModal('cart-modal');
    });

    /* Kosongkan keranjang */
    document.getElementById('clear-cart-btn').addEventListener('click', () => {
        cart = [];
        renderCart();
        updateTotal();
        updateBadge();
    });

    /* Lanjut ke checkout */
    document.getElementById('checkout-btn').addEventListener('click', () => {
        if (!cart.length) { showMessage('Keranjang Kosong', 'Tambahkan produk terlebih dahulu.'); return; }
        closeModal('cart-modal');
        openModal('checkout-modal');
        trackEvent('begin_checkout', { total_items: cart.reduce((s, i) => s + i.qty, 0) });
    });

    /* Muat keranjang tersimpan saat halaman dibuka */
    loadCart();
    updateBadge();

    /* ────────────────────────────────────────────
       3. MODAL DETAIL PRODUK
       Klik kartu produk (selain tombol) -> tampilkan detail
       ──────────────────────────────────────────── */
    let detailQty = 1;

    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
            const img = card.querySelector('img').src;
            const alt = card.querySelector('img').alt;
            const category = card.querySelector('.product-category').textContent;
            const name = card.querySelector('.product-name').textContent;
            const desc = card.querySelector('.product-desc').textContent;
            const price = +card.querySelector('.add-to-cart-btn').dataset.price;

            detailQty = 1;
            document.getElementById('detail-img').src = img;
            document.getElementById('detail-img').alt = alt;
            document.getElementById('detail-category').textContent = category;
            document.getElementById('detail-name').textContent = name;
            document.getElementById('detail-desc').textContent = desc;
            document.getElementById('detail-price').textContent = formatRp(price);
            document.getElementById('detail-qty-value').textContent = detailQty;

            const addBtn = document.getElementById('detail-add-btn');
            addBtn.dataset.name = name;
            addBtn.dataset.price = price;

            trackEvent('view_item', { item_name: name, price });
            openModal('product-detail-modal');
        });
    });

    document.getElementById('detail-qty-minus').addEventListener('click', () => {
        if (detailQty > 1) detailQty--;
        document.getElementById('detail-qty-value').textContent = detailQty;
    });
    document.getElementById('detail-qty-plus').addEventListener('click', () => {
        detailQty++;
        document.getElementById('detail-qty-value').textContent = detailQty;
    });
    document.getElementById('detail-add-btn').addEventListener('click', (e) => {
        addToCart(e.target.dataset.name, +e.target.dataset.price, detailQty);
        closeModal('product-detail-modal');
    });

    /* ────────────────────────────────────────────
       4. FILTER & SEARCH PRODUK
       (kategori, rentang harga, nama)
       ──────────────────────────────────────────── */
    const searchInput = document.getElementById('product-search');
    const categorySelect = document.getElementById('filter-category');
    const priceSelect = document.getElementById('filter-price');
    const resetBtn = document.getElementById('filter-reset');
    const productsGrid = document.querySelector('.products-grid');
    const allCards = Array.from(document.querySelectorAll('.product-card'));

    // Buat elemen "tidak ditemukan" sekali saja
    const emptyState = document.createElement('div');
    emptyState.className = 'filter-empty';
    emptyState.style.display = 'none';
    emptyState.innerHTML = '<p>🔍</p><p>Produk tidak ditemukan. Coba kata kunci atau filter lain.</p>';
    productsGrid.appendChild(emptyState);

    function applyFilters() {
        const query = searchInput.value.trim().toLowerCase();
        const category = categorySelect.value;
        const priceRange = priceSelect.value;
        let visibleCount = 0;

        allCards.forEach(card => {
            const name = card.querySelector('.product-name').textContent.toLowerCase();
            const cardCategory = card.dataset.category;
            const price = +card.querySelector('.add-to-cart-btn').dataset.price;

            let matchesQuery = !query || name.includes(query);
            let matchesCategory = category === 'all' || cardCategory === category;
            let matchesPrice = true;
            if (priceRange === 'under50') matchesPrice = price < 50000;
            else if (priceRange === '50to100') matchesPrice = price >= 50000 && price <= 100000;
            else if (priceRange === 'above100') matchesPrice = price > 100000;

            const visible = matchesQuery && matchesCategory && matchesPrice;
            card.style.display = visible ? '' : 'none';
            if (visible) visibleCount++;
        });

        emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
        trackEvent('search_filter', { query, category, priceRange, results: visibleCount });
    }

    searchInput.addEventListener('input', applyFilters);
    categorySelect.addEventListener('change', applyFilters);
    priceSelect.addEventListener('change', applyFilters);
    resetBtn.addEventListener('click', () => {
        searchInput.value = '';
        categorySelect.value = 'all';
        priceSelect.value = 'all';
        applyFilters();
    });

    /* ────────────────────────────────────────────
       5. CHECKOUT — validasi form + simulasi pembayaran
       ──────────────────────────────────────────── */
    document.querySelectorAll('.payment-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            document.getElementById('payment-method').value = opt.dataset.method;
        });
    });

    const checkoutForm = document.getElementById('checkout-form');
    checkoutForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const nameField = document.getElementById('shipping-name');
        const addressField = document.getElementById('shipping-address');
        const phoneField = document.getElementById('shipping-phone');

        const name = nameField.value.trim();
        const address = addressField.value.trim();
        const phone = phoneField.value.trim();
        const method = document.getElementById('payment-method').value;

        // Highlight field kosong
        [
            { el: nameField, val: name },
            { el: addressField, val: address },
            { el: phoneField, val: phone },
        ].forEach(({ el, val }) => {
            el.style.borderColor = val ? 'var(--sand)' : '#e53e3e';
        });

        if (!name)    { showMessage('⚠️ Form Tidak Lengkap', 'Nama lengkap wajib diisi.'); return; }
        if (!address) { showMessage('⚠️ Form Tidak Lengkap', 'Alamat pengiriman wajib diisi.'); return; }
        if (!phone)   { showMessage('⚠️ Form Tidak Lengkap', 'Nomor telepon wajib diisi.'); return; }
        if (phone.replace(/\D/g, '').length < 9) {
            showMessage('⚠️ Nomor Tidak Valid', 'Masukkan nomor telepon yang valid (minimal 9 angka).');
            return;
        }
        if (!method) { showMessage('⚠️ Pilih Pembayaran', 'Silakan pilih metode pembayaran terlebih dahulu.'); return; }

        // ── Simulasi payment gateway (dummy) ──
        // Di production, di sinilah request dikirim ke Midtrans/Xendit Snap API
        // untuk membuat transaksi dan menerima redirect_url pembayaran.
        const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
        const orderId = 'SB-' + Date.now().toString().slice(-6);

        trackEvent('purchase', { transaction_id: orderId, value: total, currency: 'IDR', method });

        closeModal('checkout-modal');
        cart = [];
        updateBadge();
        checkoutForm.reset();
        document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));

        showMessage('🎉 Pesanan Dikonfirmasi!',
            `Halo ${name},\n\nTerima kasih atas pesanan Anda!\n\nNo. Order : ${orderId}\nTotal     : ${formatRp(total)}\nMetode    : ${method}\n\n(Simulasi) Pembayaran sedang diproses melalui payment gateway.\nKami akan segera memproses dan menghubungi Anda melalui nomor ${phone}.`);
    });

    /* ────────────────────────────────────────────
       6. CONTACT FORM
       ──────────────────────────────────────────── */
    document.getElementById('contact-form').addEventListener('submit', (e) => {
        e.preventDefault();
        showMessage('Pesan Terkirim!', 'Terima kasih! Kami akan menghubungi Anda segera.');
        trackEvent('generate_lead', { form: 'contact' });
        e.target.reset();
    });

    /* ────────────────────────────────────────────
       7. MODAL HELPERS
       ──────────────────────────────────────────── */
    function openModal(id) { document.getElementById(id).classList.add('active'); }
    function closeModal(id) { document.getElementById(id).classList.remove('active'); }

    function showMessage(title, body) {
        document.getElementById('message-modal-title').textContent = title;
        document.getElementById('message-modal-body').textContent = body;
        openModal('message-modal');
    }

    document.querySelectorAll('.modal-close, #message-modal-close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        });
    });
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', (e) => {
            if (e.target === m) m.classList.remove('active');
        });
    });

    /* ────────────────────────────────────────────
       8. SMOOTH SCROLL untuk semua link anchor
       ──────────────────────────────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId.length < 2) return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                mobileMenu.style.display = 'none';
            }
        });
    });

    /* ────────────────────────────────────────────
       9. SCROLL REVEAL — animasi produk & kartu
       ──────────────────────────────────────────── */
    document.querySelectorAll('.product-card, .service-card, .testimonial-card').forEach((el, i) => {
        el.classList.add('reveal-item');
        el.style.transitionDelay = (i % 3) * 0.1 + 's';
    });

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal-item').forEach(el => revealObserver.observe(el));

    /* ────────────────────────────────────────────
       10. NAVBAR AKTIF SAAT SCROLL
       ──────────────────────────────────────────── */
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(sec => {
            if (window.scrollY >= sec.offsetTop - 100) current = sec.getAttribute('id');
        });
        navLinks.forEach(a => {
            a.style.color = a.getAttribute('href') === '#' + current ? 'var(--caramel)' : '';
        });
    });

});
