import {
    app, auth, db
} from './js/firebase-shared.js';

var currentUser = null;
var productData = null;
var opts = { size: 'Regular', sizePrice: 0, spice: 'Mild', extras: [] };
var qty = 1;

onAuthStateChanged(auth, function(user) {
    currentUser = user;
    initProductPage();
});

function initProductPage() {
    var saved = sessionStorage.getItem('yussif_product');
    if (!saved) {
        window.location.href = 'index.html';
        return;
    }
    productData = JSON.parse(saved);
    renderProduct();

    document.getElementById('pMinus').addEventListener('click', function() {
        if (qty > 1) { qty--; document.getElementById('pQty').textContent = qty; }
    });
    document.getElementById('pPlus').addEventListener('click', function() {
        qty++; document.getElementById('pQty').textContent = qty;
    });

    document.querySelectorAll('#pSize .opt-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#pSize .opt-btn').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            opts.size = this.getAttribute('data-v');
            opts.sizePrice = parseFloat(this.getAttribute('data-p')) || 0;
        });
    });

    document.querySelectorAll('#pSpice .opt-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#pSpice .opt-btn').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            opts.spice = this.getAttribute('data-v');
        });
    });

    document.querySelectorAll('#pExtras .opt-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            this.classList.toggle('active');
            var val = this.getAttribute('data-v');
            var price = parseFloat(this.getAttribute('data-p')) || 0;
            if (this.classList.contains('active')) {
                if (!opts.extras.find(function(x) { return x.val === val; })) {
                    opts.extras.push({ val: val, price: price });
                }
            } else {
                opts.extras = opts.extras.filter(function(x) { return x.val !== val; });
            }
        });
    });

    document.getElementById('pAddCart').addEventListener('click', addToCart);
}

function renderProduct() {
    if (!productData) return;
    document.getElementById('pImg').src = productData.img || 'img/menu/1.jpg';
    document.getElementById('pCat').textContent = productData.cat || '';
    document.getElementById('pTitle').textContent = productData.title || '';

    var rating = parseFloat(productData.rating) || 0;
    var full = Math.round(rating);
    var empty = 5 - full;
    document.getElementById('pStars').innerHTML = '<i class="fas fa-star"></i>'.repeat(full) + '\u2606'.repeat(empty) + ' <span style="color:#bbb;font-size:.85rem;">' + rating + ' (' + (productData.reviews || 0) + ' reviews)</span>';

    document.getElementById('pDesc').textContent = productData.desc || '';
    var old = productData.old ? '<small style="color:#ccc;text-decoration:line-through;margin-left:8px;font-size:1.2rem;">$' + productData.old + '</small>' : '';
    document.getElementById('pPrice').innerHTML = '$' + productData.price + old;

    document.getElementById('pMeta').innerHTML =
        '<div class="pmeta-item"><i class="fas fa-fire"></i><span>' + (productData.cal || '0') + ' kcal</span></div>' +
        '<div class="pmeta-item"><i class="fas fa-clock"></i><span>' + (productData.time || '0') + ' min</span></div>' +
        '<div class="pmeta-item"><i class="fas fa-star"></i><span>' + rating + '/5</span></div>';

    var tags = (productData.tags || '').split(',').filter(Boolean);
    document.getElementById('pTags').innerHTML = tags.map(function(t) {
        var cls = t.trim().toLowerCase();
        if (cls === 'spicy' || cls === 'bestseller') cls = 'hot';
        else cls = '';
        return '<span class="tag ' + cls + '">' + t.trim() + '</span>';
    }).join('');
}

function addToCart() {
    if (!currentUser) {
        showToast('Please login to add items to cart', 'warn');
        window.location.href = 'index.html';
        return;
    }

    var basePrice = parseFloat((productData.price || '0').toString().replace('$',''));
    var extrasTotal = opts.extras.reduce(function(a, b) { return a + b.price; }, 0);
    var finalPrice = basePrice + opts.sizePrice + extrasTotal;
    var extrasList = opts.extras.map(function(e) { return e.val; });

    var cartItems = JSON.parse(localStorage.getItem('yussif_cart') || '[]');
    var existing = cartItems.find(function(it) {
        return it.title === productData.title &&
               it.size === opts.size &&
               it.spice === opts.spice &&
               JSON.stringify(it.extras) === JSON.stringify(extrasList);
    });

    if (existing) {
        existing.qty += qty;
    } else {
        cartItems.push({
            img: productData.img || 'img/menu/1.jpg',
            title: productData.title,
            price: finalPrice,
            qty: qty,
            size: opts.size,
            spice: opts.spice,
            extras: extrasList
        });
    }

    localStorage.setItem('yussif_cart', JSON.stringify(cartItems));
    showToast('Item added to cart!', 'success');
    window.location.href = 'index.html#menu';
}

function showToast(message, type) {
    type = type || 'success';
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'admin-toast ' + type;
    toast.innerHTML = '<i class="fas ' + (type === 'success' ? 'fa-check-circle' : 'fa-times-circle') + '"></i>' + message;
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:14px 20px;border-radius:12px;color:#fff;font-size:.85rem;font-weight:500;z-index:3000;animation:slideIn .3s;display:flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(0,0,0,.2);font-family:Poppins,sans-serif;';
    if (type === 'success') toast.style.background = 'var(--green)';
    else toast.style.background = '#e74c3c';
    container.appendChild(toast);
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 3000);
}
