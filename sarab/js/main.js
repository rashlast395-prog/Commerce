AOS.init({
    duration: 680,
    once: true,
    offset: 55
});

/* NAVBAR SCROLL & ACTIVE LINK  */
window.addEventListener('scroll', function() {
    document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 60);
    document.getElementById('btt').classList.toggle('show', window.scrollY > 300);
    document.querySelectorAll('section[id]').forEach(function(sec) {
        var top = sec.offsetTop - 110,
            bot = top + sec.offsetHeight;
        if (window.scrollY >= top && window.scrollY < bot) {
            document.querySelectorAll('.nav-link').forEach(function(l) {
                l.classList.remove('active');
            });
            var lnk = document.querySelector('.nav-link[href="#' + sec.id + '"]');
            if (lnk) lnk.classList.add('active');
        }
    });
});

/*  SMOOTH SCROLL + MOBILE NAV CLOSE  */
document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
        var href = this.getAttribute('href');
        if (href === '#') return;
        var t = document.querySelector(href);
        if (t) {
            e.preventDefault();
            var navCollapse = document.getElementById('navmenu');
            if (navCollapse && navCollapse.classList.contains('show')) {
                var bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
                if (bsCollapse) {
                    bsCollapse.hide();
                } else {
                    navCollapse.classList.remove('show');
                }
            }
            setTimeout(function() {
                window.scrollTo({
                    top: t.offsetTop - 78,
                    behavior: 'smooth'
                });
            }, 50);
        }
    });
});


var searchOv = document.getElementById('searchOv');

document.getElementById('navSearchBtn').addEventListener('click', function() {
    searchOv.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function() {
        document.getElementById('searchInput').focus();
    }, 220);
});

document.getElementById('searchClose').addEventListener('click', closeSearch);

searchOv.addEventListener('click', function(e) {
    if (e.target === searchOv) closeSearch();
});

function closeSearch() {
    searchOv.classList.remove('open');
    document.body.style.overflow = '';
}

document.querySelectorAll('.sovcat').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.sovcat').forEach(function(b) {
            b.classList.remove('active');
        });
        this.classList.add('active');
        var f = this.getAttribute('data-cat');
        closeSearch();
        setTimeout(function() {
            filterMenu(f);
            document.getElementById('menu').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 300);
    });
});

document.querySelectorAll('.sovtrend .ttag').forEach(function(t) {
    t.addEventListener('click', function() {
        document.getElementById('searchInput').value = this.textContent.trim();
        document.getElementById('searchInput').focus();
    });
});

$(document).ready(function() {
	$('.magnific_popup').magnificPopup({
	  disableOn: 700,
	  type: 'iframe',
	  mainClass: 'mfp-fade',
	  removalDelay: 160,
	  preloader: false,
	  fixedContentPos: false,
	  disableOn: 300
	});	
});


function filterMenu(cat) {
    document.querySelectorAll('.filtbtn').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-f') === cat);
    });
    document.querySelectorAll('.catcard').forEach(function(c) {
        c.classList.toggle('active', c.getAttribute('data-filter') === cat);
    });
    document.querySelectorAll('.mwrap').forEach(function(w) {
        var c = w.getAttribute('data-c');
        if (cat === 'all' || c === cat) {
            w.classList.remove('gone');
            w.style.opacity = '0';
            w.style.transform = 'translateY(16px)';
            setTimeout(function() {
                w.style.transition = 'opacity .38s,transform .38s';
                w.style.opacity = '1';
                w.style.transform = 'translateY(0)';
            }, 60);
        } else {
            w.classList.add('gone');
        }
    });
}

document.querySelectorAll('.filtbtn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        filterMenu(this.getAttribute('data-f'));
    });
});

document.querySelectorAll('.catcard').forEach(function(card) {
    card.addEventListener('click', function() {
        var f = this.getAttribute('data-filter');
        window.scrollTo({
            top: document.getElementById('menu').offsetTop - 80,
            behavior: 'smooth'
        });
        setTimeout(function() {
            filterMenu(f);
        }, 480);
    });
});


/* ============================================================
   TOAST NOTIFICATION SYSTEM
   ============================================================ */
function showToast(message, type) {
    type = type || 'success';
    var container = document.getElementById('toastContainer');
    var old = container.querySelector('.toast');
    if (old) old.remove();

    var toast = document.createElement('div');
    toast.className = 'toast ' + type;

    var icon = 'fa-check-circle';
    if (type === 'warn') icon = 'fa-exclamation-circle';
    if (type === 'err') icon = 'fa-times-circle';

    toast.innerHTML = '<i class="fas ' + icon + '"></i><span>' + message + '</span>';
    container.appendChild(toast);

    setTimeout(function() {
        if (toast.parentNode) toast.remove();
    }, 3200);
}

/* ============================================================
   CART, CHECKOUT & PAYMENT SYSTEM
   ============================================================ */
var FREE_DELIVERY_THRESHOLD = 30;
var PROMO_CODES = {
    'SAVE10': { type: 'percent', value: 10, desc: '10% Off' },
    'BURGER20': { type: 'percent', value: 20, desc: '20% Off Burgers' },
    'YUSSIF15': { type: 'fixed', value: 15, desc: '$15 Off $75+' },
    'WELCOME': { type: 'fixed', value: 5, desc: '$5 Off First Order' }
};

var cartOpen = false;
var cartItems = [];
var appliedPromo = null;
var cartCountEl = document.getElementById('cartCount');
var cartBtn = document.getElementById('cartBtn');
var cartSide = document.getElementById('cartSide');
var csClose = document.getElementById('csClose');
var csCvr = document.getElementById('csCvr');
var csList = document.getElementById('cartList');
var csEmpty = document.getElementById('csEmpty');
var csFoot = document.getElementById('csFoot');
var csSub = document.getElementById('csSub');
var csTotal = document.getElementById('csTotal');
var csCheck = document.getElementById('csCheck');
var csPromo = document.getElementById('csPromo');
var promoInput = document.getElementById('promoInput');
var promoBtn = document.getElementById('promoBtn');
var promoMsg = document.getElementById('promoMsg');
var promoDiscount = document.getElementById('promoDiscount');
var promoCodeLabel = document.getElementById('promoCodeLabel');
var promoSave = document.getElementById('promoSave');
var csFreeDel = document.getElementById('csFreeDel');
var csfdProg = document.getElementById('csfdProg');
var csfdTxt = document.getElementById('csfdTxt');
var csDiscRow = document.getElementById('csDiscRow');
var csDisc = document.getElementById('csDisc');

function saveCart() {
    localStorage.setItem('yussif_cart', JSON.stringify(cartItems));
    localStorage.setItem('yussif_promo', JSON.stringify(appliedPromo));
}

function loadCart() {
    try {
        var saved = localStorage.getItem('yussif_cart');
        if (saved) {
            cartItems = JSON.parse(saved);
            if (!Array.isArray(cartItems)) cartItems = [];
        }
        var promo = localStorage.getItem('yussif_promo');
        if (promo) {
            appliedPromo = JSON.parse(promo);
        }
    } catch (e) {
        cartItems = [];
        appliedPromo = null;
    }
}

function getCartSubtotal() {
    return cartItems.reduce(function(a, b) { return a + (b.price * b.qty); }, 0);
}

function getCartCount() {
    return cartItems.reduce(function(a, b) { return a + b.qty; }, 0);
}

function getDiscountAmount(subtotal) {
    if (!appliedPromo) return 0;
    var code = PROMO_CODES[appliedPromo];
    if (!code) return 0;
    if (code.type === 'percent') {
        return Math.round(subtotal * code.value / 100 * 100) / 100;
    } else if (code.type === 'fixed') {
        if (appliedPromo === 'YUSSIF15' && subtotal < 75) return 0;
        return Math.min(code.value, subtotal);
    }
    return 0;
}

function formatMoney(n) {
    return '$' + n.toFixed(2);
}

function updateCartUI() {
    var subtotal = getCartSubtotal();
    var count = getCartCount();
    var discount = getDiscountAmount(subtotal);
    var total = subtotal - discount;
    var remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);

    cartCountEl.textContent = count;

    if (cartItems.length === 0) {
        csEmpty.style.display = 'block';
        csFoot.style.display = 'none';
        csPromo.style.display = 'none';
        csFreeDel.style.display = 'none';
        csDiscRow.style.display = 'none';
        var ex = csList.querySelectorAll('.csitem');
        ex.forEach(function(e) { e.remove(); });
    } else {
        csEmpty.style.display = 'none';
        csFoot.style.display = 'block';
        csPromo.style.display = 'block';
        csFreeDel.style.display = 'block';
        if (discount > 0) {
            csDiscRow.style.display = 'flex';
            csDisc.textContent = '-' + formatMoney(discount);
        } else {
            csDiscRow.style.display = 'none';
        }
    }

    var ex = csList.querySelectorAll('.csitem');
    ex.forEach(function(e) { e.remove(); });

    cartItems.forEach(function(item, idx) {
        var div = document.createElement('div');
        div.className = 'csitem';
        var itemTotal = item.price * item.qty;
        var itemOpts = '';
        if (item.size && item.size !== 'Regular') {
            itemOpts += '<span style="font-size:.7rem;color:#888;">(' + item.size;
            if (item.spice && item.spice !== 'Mild') itemOpts += ', ' + item.spice;
            itemOpts += ')</span> ';
        } else if (item.spice && item.spice !== 'Mild') {
            itemOpts += '<span style="font-size:.7rem;color:#888;">(' + item.spice + ')</span> ';
        }
        if (item.extras && item.extras.length > 0) {
            itemOpts += '<span style="font-size:.7rem;color:#aaa;">+ ' + item.extras.join(', ') + '</span>';
        }
        div.innerHTML =
            '<img class="csitemimg" src="' + item.img + '" alt=""/>' +
            '<div class="csitembody">' +
            '  <div class="csitemname">' + item.title + '</div>' +
            '  <div class="csitemopts">' + itemOpts + '</div>' +
            '  <div class="csitemprice">' + formatMoney(itemTotal) + ' x ' + item.qty + '</div>' +
            '</div>' +
            '<div class="csqty">' +
            '  <button class="csminus" data-i="' + idx + '">-</button>' +
            '  <span>' + item.qty + '</span>' +
            '  <button class="csplus" data-i="' + idx + '">+</button>' +
            '</div>' +
            '<button class="csremove" data-i="' + idx + '"><i class="fas fa-trash-alt"></i></button>';
        csList.appendChild(div);
    });

    csSub.textContent = formatMoney(subtotal);
    csTotal.textContent = formatMoney(total);
    document.getElementById('ckAmount').textContent = formatMoney(total);
    document.getElementById('mobAmount').value = formatMoney(total);
    document.getElementById('ckSub').textContent = formatMoney(subtotal);
    document.getElementById('ckTotal').textContent = formatMoney(total);

    if (discount > 0) {
        document.getElementById('ckSumDisc').style.display = 'flex';
        document.getElementById('ckDiscAmt').textContent = '-' + formatMoney(discount);
        document.getElementById('ckSave').style.display = 'inline';
        document.getElementById('ckSaveAmt').textContent = formatMoney(discount);
    } else {
        document.getElementById('ckSumDisc').style.display = 'none';
        document.getElementById('ckSave').style.display = 'none';
    }

    /* Free delivery progress */
    if (subtotal >= FREE_DELIVERY_THRESHOLD) {
        csfdTxt.innerHTML = '<i class="fas fa-check-circle me-1" style="color:#4ade80;"></i>You\'ve unlocked <strong>free delivery!</strong>';
        csfdProg.style.width = '100%';
        csfdProg.style.background = 'linear-gradient(90deg, var(--green), #4ade80)';
        var delivEl = document.getElementById('csDeliv');
        if (delivEl) { delivEl.textContent = 'Free'; delivEl.style.color = '#4ade80'; delivEl.style.fontWeight = '600'; }
    } else {
        csfdTxt.innerHTML = 'Add <strong>' + formatMoney(remaining) + '</strong> more for free delivery!';
        var pct = Math.min(100, Math.max(0, (subtotal / FREE_DELIVERY_THRESHOLD) * 100));
        csfdProg.style.width = pct + '%';
        csfdProg.style.background = 'linear-gradient(90deg, var(--secondary), #fbbf24)';
        var delivEl = document.getElementById('csDeliv');
        if (delivEl) { delivEl.textContent = '$4.99'; delivEl.style.color = '#888'; delivEl.style.fontWeight = '400'; }
    }

    if (appliedPromo) {
        promoDiscount.style.display = 'flex';
        promoCodeLabel.textContent = appliedPromo + ' (' + (PROMO_CODES[appliedPromo] ? PROMO_CODES[appliedPromo].desc : '') + ')';
        promoSave.textContent = '-' + formatMoney(discount);
    } else {
        promoDiscount.style.display = 'none';
    }

    updateCheckoutSummary();
    saveCart();
}

function updateCheckoutSummary() {
    var list = document.getElementById('ckSumList');
    if (!list) return;
    list.innerHTML = '';
    cartItems.forEach(function(item) {
        var itemTotal = item.price * item.qty;
        var opts = [];
        if (item.size && item.size !== 'Regular') opts.push(item.size);
        if (item.spice && item.spice !== 'Mild') opts.push(item.spice);
        if (item.extras && item.extras.length > 0) opts = opts.concat(item.extras);
        var optStr = opts.length > 0 ? ' (' + opts.join(', ') + ')' : '';
        var row = document.createElement('div');
        row.className = 'cksumitem';
        row.innerHTML = '<span>' + item.qty + 'x ' + item.title + optStr + '</span><span>' + formatMoney(itemTotal) + '</span>';
        list.appendChild(row);
    });
}

loadCart();
updateCartUI();

cartBtn.addEventListener('click', function() {
    cartOpen = !cartOpen;
    cartSide.classList.toggle('open', cartOpen);
    csCvr.classList.toggle('show', cartOpen);
    document.body.style.overflow = cartOpen ? 'hidden' : '';
});
csClose.addEventListener('click', function() {
    cartOpen = false;
    cartSide.classList.remove('open');
    csCvr.classList.remove('show');
    document.body.style.overflow = '';
});
csCvr.addEventListener('click', function() {
    cartOpen = false;
    cartSide.classList.remove('open');
    csCvr.classList.remove('show');
    document.body.style.overflow = '';
});

csList.addEventListener('click', function(e) {
    var t = e.target;
    if (t.closest('.csplus')) {
        var i = parseInt(t.closest('.csplus').getAttribute('data-i'));
        cartItems[i].qty++;
        updateCartUI();
    } else if (t.closest('.csminus')) {
        var i = parseInt(t.closest('.csminus').getAttribute('data-i'));
        if (cartItems[i].qty > 1) {
            cartItems[i].qty--;
        } else {
            cartItems.splice(i, 1);
        }
        updateCartUI();
    } else if (t.closest('.csremove')) {
        var i = parseInt(t.closest('.csremove').getAttribute('data-i'));
        cartItems.splice(i, 1);
        updateCartUI();
        showToast('Item removed from cart', 'warn');
    }
});

/* ============================================================
   PRODUCT CUSTOMIZATION STATE
   ============================================================ */
var mpOpts = {
    size: 'Regular',
    sizePrice: 0,
    spice: 'Mild',
    extras: []
};

function resetMpOpts() {
    mpOpts = { size: 'Regular', sizePrice: 0, spice: 'Mild', extras: [] };
    document.querySelectorAll('#mpSize .mpopt').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-v') === 'Regular');
    });
    document.querySelectorAll('#mpSpice .mpopt').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-v') === 'Mild');
    });
    document.querySelectorAll('#mpExtras .mpopt').forEach(function(b) {
        b.classList.remove('active');
    });
}

document.querySelectorAll('#mpSize .mpopt').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        document.querySelectorAll('#mpSize .mpopt').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        mpOpts.size = this.getAttribute('data-v');
        mpOpts.sizePrice = parseFloat(this.getAttribute('data-p')) || 0;
    });
});

document.querySelectorAll('#mpSpice .mpopt').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        document.querySelectorAll('#mpSpice .mpopt').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        mpOpts.spice = this.getAttribute('data-v');
    });
});

document.querySelectorAll('#mpExtras .mpopt').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        this.classList.toggle('active');
        var val = this.getAttribute('data-v');
        var price = parseFloat(this.getAttribute('data-p')) || 0;
        if (this.classList.contains('active')) {
            if (!mpOpts.extras.find(function(x) { return x.val === val; })) {
                mpOpts.extras.push({ val: val, price: price });
            }
        } else {
            mpOpts.extras = mpOpts.extras.filter(function(x) { return x.val !== val; });
        }
    });
});

/* ============================================================
   MENU DETAIL POPUP
   ============================================================ */
var menuPop = document.getElementById('menuPop');
var mpQty = 1;

function openMenuPop(card) {
    var img = card.getAttribute('data-img');
    var title = card.getAttribute('data-title');
    var cat = card.getAttribute('data-cat');
    var price = parseFloat(card.getAttribute('data-price'));
    var old = card.getAttribute('data-old');
    var rating = parseFloat(card.getAttribute('data-rating'));
    var reviews = card.getAttribute('data-reviews');
    var cal = card.getAttribute('data-cal');
    var time = card.getAttribute('data-time');
    var desc = card.getAttribute('data-desc');
    var tags = card.getAttribute('data-tags') || '';

    document.getElementById('mpImg').setAttribute('src', img);
    document.getElementById('mpCat').textContent = cat;
    document.getElementById('mpTitle').textContent = title;

    var full = Math.round(rating),
        empty = 5 - full;
    document.getElementById('mpStars').innerHTML =
        '<i class="fas fa-star"></i>'.repeat(full) + '\u2606'.repeat(empty) +
        ' <span style="color:#bbb;font-size:.78rem;">' + rating + ' (' + reviews + ' reviews)</span>';

    document.getElementById('mpDesc').textContent = desc;

    document.getElementById('mpPrice').innerHTML =
        formatMoney(price) + (old ? '<small style="color:#ccc;text-decoration:line-through;margin-left:8px;font-size:1rem;">' + old + '</small>' : '');

    document.getElementById('mpMeta').innerHTML =
        '<div class="mpm"><div class="mpmv">' + cal + ' kcal</div><div class="mpml">Calories</div></div>' +
        '<div class="mpm"><div class="mpmv">' + time + ' min</div><div class="mpml">Prep Time</div></div>' +
        '<div class="mpm"><div class="mpmv">' + rating + '/5</div><div class="mpml">Rating</div></div>';

    document.getElementById('mpTags').innerHTML =
        tags.split(',').filter(Boolean).map(function(t) {
            return '<span class="mptag">' + t.trim() + '</span>';
        }).join('');

    mpQty = 1;
    document.getElementById('mpQnum').textContent = 1;
    document.getElementById('mpAddCart').innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
    document.getElementById('mpAddCart').style.background = '';
    resetMpOpts();

    menuPop.classList.add('open');
    document.body.style.overflow = 'hidden';
}

document.querySelectorAll('.mcard').forEach(function(card) {
    card.addEventListener('click', function() {
        openMenuPop(this);
    });
});

document.querySelectorAll('.madd').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        openMenuPop(this.closest('.mcard'));
    });
});

document.querySelectorAll('.mhrt').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var ico = this.querySelector('i');
        ico.classList.toggle('far');
        ico.classList.toggle('fas');
        this.style.color = ico.classList.contains('fas') ? 'var(--primary)' : '#ccc';
        if (ico.classList.contains('fas')) {
            this.classList.add('heart-wish');
            showToast('Added to wishlist!', 'success');
        } else {
            showToast('Removed from wishlist', 'warn');
        }
        setTimeout(function() {
            btn.classList.remove('heart-wish');
        }, 500);
    });
});

document.getElementById('mpClose').addEventListener('click', closeMenuPop);
menuPop.addEventListener('click', function(e) {
    if (e.target === this) closeMenuPop();
});

function closeMenuPop() {
    menuPop.classList.remove('open');
    document.body.style.overflow = '';
}

document.getElementById('mpPlus').addEventListener('click', function() {
    document.getElementById('mpQnum').textContent = ++mpQty;
});
document.getElementById('mpMinus').addEventListener('click', function() {
    if (mpQty > 1) document.getElementById('mpQnum').textContent = --mpQty;
});

/* Add to cart with customization */
document.getElementById('mpAddCart').addEventListener('click', function() {
    var card = document.querySelector('.mcard[data-title="' + document.getElementById('mpTitle').textContent + '"]') ||
               document.querySelector('.mcard');
    var img = card ? (card.getAttribute('data-img') || 'img/menu/1.jpg') : 'img/menu/1.jpg';
    var title = document.getElementById('mpTitle').textContent;
    var basePrice = parseFloat((card ? card.getAttribute('data-price') : '$14.99').replace('$',''));
    var qty = parseInt(document.getElementById('mpQnum').textContent);
    var extrasTotal = mpOpts.extras.reduce(function(a, b) { return a + b.price; }, 0);
    var finalPrice = basePrice + mpOpts.sizePrice + extrasTotal;
    var extrasList = mpOpts.extras.map(function(e) { return e.val; });

    var existing = cartItems.find(function(it) {
        return it.title === title &&
               it.size === mpOpts.size &&
               it.spice === mpOpts.spice &&
               JSON.stringify(it.extras) === JSON.stringify(extrasList);
    });

    if (existing) {
        existing.qty += qty;
    } else {
        cartItems.push({
            img: img,
            title: title,
            price: finalPrice,
            qty: qty,
            size: mpOpts.size,
            spice: mpOpts.spice,
            extras: extrasList
        });
    }
    updateCartUI();
    closeMenuPop();
    cartBtn.classList.remove('bounce');
    void cartBtn.offsetWidth;
    cartBtn.classList.add('bounce');
    showToast('Item added to cart!', 'success');
});


/* ============================================================
   RESERVATION & CONTACT
   ============================================================ */
document.getElementById('resBtn').addEventListener('click', function() {
    var btn = this;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Booking...';
    btn.disabled = true;
    setTimeout(function() {
        btn.innerHTML = '<i class="fas fa-calendar-check"></i> Confirm Reservation';
        btn.disabled = false;
        var ok = document.getElementById('resOk');
        ok.style.display = 'block';
        ok.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }, 1500);
});

document.getElementById('ctcBtn').addEventListener('click', function() {
    var btn = this;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;
    setTimeout(function() {
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
        btn.disabled = false;
        var ok = document.getElementById('ctcOk');
        ok.style.display = 'block';
        ok.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }, 1500);
});


/* ============================================================
   GALLERY
   ============================================================ */
var galPop = document.getElementById('galPop');
var galData = [];
var galIdx = 0;

document.querySelectorAll('.gitem').forEach(function(item) {
    galData.push({
        img: item.getAttribute('data-gimg'),
        title: item.getAttribute('data-gtitle'),
        desc: item.getAttribute('data-gdesc')
    });
    item.addEventListener('click', function() {
        openGal(parseInt(this.getAttribute('data-gi')));
    });
});

function openGal(i) {
    galIdx = i;
    var g = galData[i];
    document.getElementById('gpImg').setAttribute('src', g.img);
    document.getElementById('gpTitle').textContent = g.title;
    document.getElementById('gpDesc').innerHTML = g.desc;
    galPop.classList.add('open');
    document.body.style.overflow = 'hidden';
}

document.getElementById('gpClose').addEventListener('click', closeGal);
galPop.addEventListener('click', function(e) {
    if (e.target === this) closeGal();
});

function closeGal() {
    galPop.classList.remove('open');
    document.body.style.overflow = '';
}

document.getElementById('gpPrev').addEventListener('click', function() {
    openGal((galIdx - 1 + galData.length) % galData.length);
});
document.getElementById('gpNext').addEventListener('click', function() {
    openGal((galIdx + 1) % galData.length);
});

/*  ESC key closes everything  */
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeSearch();
        closeMenuPop();
        closeGal();
        if (typeof $.magnificPopup !== 'undefined') $.magnificPopup.close();
    }
});


new Swiper('.tesSwiper', {
    slidesPerView: 1,
    spaceBetween: 22,
    loop: true,
    autoplay: {
        delay: 4000,
        disableOnInteraction: false
    },
    pagination: {
        el: '.swiper-pagination',
        clickable: true
    },
    breakpoints: {
        640: {
            slidesPerView: 2
        },
        1024: {
            slidesPerView: 3
        }
    }
});

/* ============================================================
   RECENTLY VIEWED ITEMS
   ============================================================ */
var RECENT_KEY = 'yussif_recent';
var MAX_RECENT = 8;

function addToRecent(card) {
    var item = {
        img: card.getAttribute('data-img') || 'img/menu/1.jpg',
        title: card.getAttribute('data-title') || 'Item',
        price: parseFloat(card.getAttribute('data-price')) || 0,
        old: card.getAttribute('data-old') || ''
    };
    var recent = getRecent();
    recent = recent.filter(function(r) { return r.title !== item.title; });
    recent.unshift(item);
    if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    renderRecent();
}

function getRecent() {
    try {
        var saved = localStorage.getItem(RECENT_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
}

function renderRecent() {
    var recent = getRecent();
    var sec = document.getElementById('recently');
    var track = document.getElementById('rTrack');
    if (!sec || !track) return;

    if (recent.length === 0) {
        sec.style.display = 'none';
        return;
    }
    sec.style.display = 'block';
    track.innerHTML = '';
    recent.forEach(function(item) {
        var card = document.createElement('div');
        card.className = 'rcard';
        var oldP = item.old ? '<small style="color:#ccc;text-decoration:line-through;margin-left:6px;font-size:.8rem;">' + item.old + '</small>' : '';
        card.innerHTML =
            '<div class="rimg"><img src="' + item.img + '" alt=""/></div>' +
            '<div class="rbody">' +
            '  <div class="rtitle">' + item.title + '</div>' +
            '  <div class="rprice">' + formatMoney(item.price) + oldP + '</div>' +
            '  <button class="radd" data-title="' + item.title + '" data-price="' + item.price + '" data-img="' + item.img + '"><i class="fas fa-plus me-1"></i>Add</button>' +
            '</div>';
        track.appendChild(card);
    });

    document.querySelectorAll('.rcard .radd').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var title = this.getAttribute('data-title');
            var price = parseFloat(this.getAttribute('data-price'));
            var img = this.getAttribute('data-img');
            var existing = cartItems.find(function(it) { return it.title === title; });
            if (existing) {
                existing.qty++;
            } else {
                cartItems.push({ img: img, title: title, price: price, qty: 1, size: 'Regular', spice: 'Mild', extras: [] });
            }
            updateCartUI();
            cartBtn.classList.remove('bounce');
            void cartBtn.offsetWidth;
            cartBtn.classList.add('bounce');
            showToast('Item added to cart!', 'success');
        });
    });

    document.querySelectorAll('.rcard').forEach(function(card) {
        card.addEventListener('click', function(e) {
            if (e.target.closest('.radd')) return;
            var mcard = document.querySelector('.mcard[data-title="' + this.querySelector('.rtitle').textContent + '"]');
            if (mcard) openMenuPop(mcard);
        });
    });
}

document.querySelectorAll('.mcard').forEach(function(card) {
    card.addEventListener('click', function() {
        addToRecent(this);
    });
});

// Initial render
renderRecent();


/* ============================================================
   VALIDATION & FORMATTING
   ============================================================ */
document.getElementById('mobPhone') && document.getElementById('mobPhone').addEventListener('input', function() {
    this.value = this.value.replace(/[^0-9+\- ]/g, '').slice(0, 20);
});

document.getElementById('cardNum') && document.getElementById('cardNum').addEventListener('input', function() {
    var v = this.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
    var formatted = v.match(/.{1,4}/g);
    this.value = formatted ? formatted.join(' ') : v;
});

document.getElementById('cardExp') && document.getElementById('cardExp').addEventListener('input', function() {
    var v = this.value.replace(/[^0-9]/g, '').slice(0, 4);
    if (v.length >= 3) {
        v = v.slice(0, 2) + '/' + v.slice(2);
    }
    this.value = v;
});


var cH = 8,
    cM = 45,
    cS = 30;
setInterval(function() {
    cS--;
    if (cS < 0) {
        cS = 59;
        cM--;
    }
    if (cM < 0) {
        cM = 59;
        cH--;
    }
    if (cH < 0) {
        cH = 8;
        cM = 45;
        cS = 30;
    }
    document.getElementById('cdH').textContent = String(cH).padStart(2, '0');
    document.getElementById('cdM').textContent = String(cM).padStart(2, '0');
    document.getElementById('cdS').textContent = String(cS).padStart(2, '0');
}, 1000);

/* â”€â”€ NEWSLETTER â”€â”€ */
document.getElementById('nlBtn').addEventListener('click', function() {
    var email = document.getElementById('nlEmail').value;
    if (email && email.includes('@')) {
        var btn = this;
        btn.textContent = '\u2713 Subscribed!';
        btn.style.background = '#4ade80';
        btn.style.color = '#222';
        document.getElementById('nlEmail').value = '';
        setTimeout(function() {
            btn.textContent = 'Subscribe';
            btn.style.background = '';
            btn.style.color = '';
        }, 3000);
        showToast('Successfully subscribed!', 'success');
    } else {
        showToast('Please enter a valid email', 'err');
    }
});

/*  NUMBER COUNTER ANIMATION*/
var numAnimated = false;
window.addEventListener('scroll', function() {
    var hero = document.getElementById('hero');
    if (!numAnimated && hero && window.scrollY > hero.offsetHeight - 300) {
        numAnimated = true;
        document.querySelectorAll('.snum').forEach(function(el) {
            var txt = el.textContent;
            var num = parseInt(txt);
            var suf = txt.replace(/[0-9]/g, '');
            if (isNaN(num)) return;
            var start = 0;
            var step = Math.ceil(num / 55);
            var iv = setInterval(function() {
                start += step;
                if (start >= num) {
                    start = num;
                    clearInterval(iv);
                }
                el.textContent = start + suf;
            }, 1400 / 55);
        });
    }
});

/* ============================================================
   POPULAR NOW – QUICK ADD TO CART
   ============================================================ */
document.querySelectorAll('.psadd').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var card = this.closest('.pscard');
        var title = card.getAttribute('data-title');
        var price = parseFloat(card.getAttribute('data-price'));
        var img = card.getAttribute('data-img');
        var existing = cartItems.find(function(it) { return it.title === title; });
        if (existing) {
            existing.qty++;
        } else {
            cartItems.push({ img: img, title: title, price: price, qty: 1, size: 'Regular', spice: 'Mild', extras: [] });
        }
        updateCartUI();
        cartBtn.classList.remove('bounce');
        void cartBtn.offsetWidth;
        cartBtn.classList.add('bounce');
        showToast('Item added to cart!', 'success');
    });
});

/* ============================================================
   DEALS & BUNDLES – QUICK ADD TO CART
   ============================================================ */
document.querySelectorAll('.dealadd').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var title = this.getAttribute('data-title');
        var price = parseFloat(this.getAttribute('data-price'));
        var img = this.getAttribute('data-img');
        var existing = cartItems.find(function(it) { return it.title === title; });
        if (existing) {
            existing.qty++;
        } else {
            cartItems.push({ img: img, title: title, price: price, qty: 1, size: 'Regular', spice: 'Mild', extras: [] });
        }
        updateCartUI();
        cartBtn.classList.remove('bounce');
        void cartBtn.offsetWidth;
        cartBtn.classList.add('bounce');
        showToast('Combo added to cart!', 'success');
    });
});

/* ============================================================
   POPULAR NOW HORIZONTAL SCROLL BUTTONS
   ============================================================ */
(function() {
    var scrollWrap = document.querySelector('.pscroll');
    if (!scrollWrap) return;
    var nav = document.createElement('div');
    nav.className = 'psnav';
    nav.innerHTML = '<button class="psnavbtn" id="psPrev"><i class="fas fa-chevron-left"></i></button>' +
                    '<button class="psnavbtn" id="psNext"><i class="fas fa-chevron-right"></i></button>';
    scrollWrap.parentNode.insertBefore(nav, scrollWrap.nextSibling);

    document.getElementById('psPrev').addEventListener('click', function() {
        scrollWrap.scrollBy({ left: -260, behavior: 'smooth' });
    });
    document.getElementById('psNext').addEventListener('click', function() {
        scrollWrap.scrollBy({ left: 260, behavior: 'smooth' });
    });
})();

/* ============================================================
   MICRO POPUP
   ============================================================ */
function showMicroPopup(msg) {
    var old = document.querySelector('.mpop');
    if (old) old.remove();
    var el = document.createElement('div');
    el.className = 'mpop';
    el.innerHTML = '<i class="fas fa-check-circle me-2"></i>' + msg;
    document.body.appendChild(el);
    setTimeout(function() { el.remove(); }, 3200);
}

/* ============================================================
   PROMO CODE SYSTEM
   ============================================================ */
promoBtn.addEventListener('click', applyPromo);
promoInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') applyPromo();
});

function applyPromo() {
    var code = promoInput.value.trim().toUpperCase();
    if (!code) {
        promoMsg.textContent = 'Please enter a promo code';
        promoMsg.className = 'cspmsg err';
        return;
    }
    if (appliedPromo) {
        promoMsg.textContent = 'A promo code is already applied. Remove it first.';
        promoMsg.className = 'cspmsg err';
        return;
    }
    if (!PROMO_CODES[code]) {
        promoMsg.textContent = 'Invalid promo code';
        promoMsg.className = 'cspmsg err';
        showToast('Invalid promo code', 'err');
        return;
    }
    var promo = PROMO_CODES[code];
    if (code === 'YUSSIF15') {
        var subtotal = getCartSubtotal();
        if (subtotal < 75) {
            promoMsg.textContent = 'Minimum order of $75 required for this code';
            promoMsg.className = 'cspmsg err';
            showToast('Minimum order $75 required', 'warn');
            return;
        }
    }
    appliedPromo = code;
    promoInput.value = '';
    promoMsg.textContent = 'Promo code applied: ' + promo.desc;
    promoMsg.className = 'cspmsg ok';
    updateCartUI();
    showToast('Promo code applied! ' + promo.desc, 'success');
}

function removePromo() {
    appliedPromo = null;
    promoMsg.textContent = '';
    promoMsg.className = 'cspmsg';
    updateCartUI();
    showToast('Promo code removed', 'warn');
}

/* Add remove promo button dynamically */
function addRemovePromoBtn() {
    if (document.getElementById('removePromoBtn')) return;
    var btn = document.createElement('button');
    btn.id = 'removePromoBtn';
    btn.className = 'csprobtn';
    btn.style.background = '#ef4444';
    btn.textContent = 'Remove';
    btn.addEventListener('click', removePromo);
    promoDiscount.appendChild(btn);
}

var origUpdateCartUI = updateCartUI;
updateCartUI = function() {
    origUpdateCartUI();
    if (appliedPromo) {
        addRemovePromoBtn();
    } else {
        var oldBtn = document.getElementById('removePromoBtn');
        if (oldBtn) oldBtn.remove();
    }
};

/* ============================================================
   CHECKOUT MODAL
   ============================================================ */
var checkoutOpen = false;
var checkoutModal = document.getElementById('checkoutModal');
var ckClose = document.getElementById('ckClose');
var ckCvr = document.getElementById('ckCvr');
var ckPay = document.getElementById('ckPay');

csCheck.addEventListener('click', function() {
    if (cartItems.length === 0) {
        showToast('Your cart is empty!', 'err');
        return;
    }
    checkoutOpen = true;
    checkoutModal.classList.add('open');
    ckCvr.classList.add('show');
    document.body.style.overflow = 'hidden';
    updateCartUI();
});

ckClose.addEventListener('click', closeCheckout);
ckCvr.addEventListener('click', closeCheckout);

function closeCheckout() {
    checkoutOpen = false;
    checkoutModal.classList.remove('open');
    ckCvr.classList.remove('show');
    document.body.style.overflow = '';
}

/* Payment tabs */
document.querySelectorAll('.paytab').forEach(function(tab) {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.paytab').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.paypanel').forEach(function(p) { p.classList.remove('active'); });
        tab.classList.add('active');
        var panel = document.getElementById('panel-' + tab.getAttribute('data-pay'));
        if (panel) panel.classList.add('active');
    });
});

/* Delivery time schedule toggle */
document.getElementById('delTime').addEventListener('change', function() {
    var schedRow = document.getElementById('schedRow');
    if (this.value === 'schedule') {
        schedRow.style.display = 'block';
    } else {
        schedRow.style.display = 'none';
    }
});

/* Pay Now */
ckPay.addEventListener('click', function() {
    var activeTab = document.querySelector('.paytab.active');
    var method = activeTab ? activeTab.getAttribute('data-pay') : 'cash';
    var btn = this;
    var original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    setTimeout(function() {
        btn.disabled = false;
        btn.innerHTML = original;
        closeCheckout();
        saveOrder(cartItems.slice(), getCartSubtotal(), method);
        openTracking(method);
        cartItems = [];
        appliedPromo = null;
        updateCartUI();
        cartOpen = false;
        cartSide.classList.remove('open');
        document.body.style.overflow = '';
        promoMsg.textContent = '';
        promoMsg.className = 'cspmsg';
        promoInput.value = '';
        showToast('Order placed successfully!', 'success');
    }, 2200);
});

/* Tracking modal */
var trackModal = document.getElementById('trackModal');
var tmClose = document.getElementById('tmClose');
var tmCvr = document.getElementById('tmCvr');

function openTracking(method) {
    trackModal.classList.add('open');
    tmCvr.classList.add('show');
    document.body.style.overflow = 'hidden';
    document.getElementById('tmId').textContent = Math.floor(1000 + Math.random() * 9000);
}

tmClose.addEventListener('click', function() {
    trackModal.classList.remove('open');
    tmCvr.classList.remove('show');
    document.body.style.overflow = '';
});
tmCvr.addEventListener('click', function() {
    trackModal.classList.remove('open');
    tmCvr.classList.remove('show');
    document.body.style.overflow = '';
});

document.getElementById('tmTrackBtn').addEventListener('click', function() {
    showToast('Live tracking launched! (Demo)', 'success');
});

/* ESC */
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeSearch();
        closeMenuPop();
        closeGal();
        if (checkoutOpen) closeCheckout();
        if (trackModal.classList.contains('open')) {
            trackModal.classList.remove('open');
            tmCvr.classList.remove('show');
            document.body.style.overflow = '';
        }
        if (ohModal.classList.contains('open')) {
            ohModal.classList.remove('open');
            ohCvr.classList.remove('show');
            document.body.style.overflow = '';
        }
    }
});

/* ============================================================
   PRODUCT IMAGE ZOOM
   ============================================================ */
document.querySelector('.mpimg').addEventListener('click', function() {
    this.classList.toggle('zoomed');
});

/* ============================================================
   IMAGE GALLERY THUMBNAILS
   ============================================================ */
document.querySelectorAll('.mpgalimg').forEach(function(thumb) {
    thumb.addEventListener('click', function(e) {
        e.stopPropagation();
        document.querySelectorAll('.mpgalimg').forEach(function(t) { t.classList.remove('active'); });
        this.classList.add('active');
        var img = this.getAttribute('data-gimg');
        document.getElementById('mpImg').setAttribute('src', img);
    });
});

/* ============================================================
   NUTRITIONAL INFO
   ============================================================ */
var nutData = {
    'Classic Smash Burger': { cal: '620', protein: '38g', carbs: '42g', fat: '32g', fiber: '3g', sugar: '8g' },
    'Margherita Royale': { cal: '480', protein: '20g', carbs: '55g', fat: '18g', fiber: '4g', sugar: '6g' },
    'Nashville Hot Chicken': { cal: '710', protein: '45g', carbs: '52g', fat: '28g', fiber: '3g', sugar: '5g' },
    'Loaded Fajita Wrap': { cal: '520', protein: '32g', carbs: '48g', fat: '22g', fiber: '5g', sugar: '7g' },
    'Nutella Lava Cake': { cal: '390', protein: '6g', carbs: '48g', fat: '18g', fiber: '2g', sugar: '38g' },
    'Truffle Mushroom Pasta': { cal: '560', protein: '18g', carbs: '62g', fat: '22g', fiber: '6g', sugar: '4g' }
};
var nutLabels = { cal: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat', fiber: 'Fiber', sugar: 'Sugar' };
function renderNutrition(title) {
    var nut = nutData[title];
    var el = document.getElementById('mpNutrition');
    if (!nut || !el) return;
    var grid = document.getElementById('mpNutGrid');
    grid.innerHTML = '';
    Object.keys(nut).forEach(function(k) {
        var item = document.createElement('div');
        item.className = 'mpnutitem';
        item.innerHTML = '<div class="mpnutval">' + nut[k] + '</div><div class="mpnutlbl">' + nutLabels[k] + '</div>';
        grid.appendChild(item);
    });
    el.style.display = 'block';
}

/* ============================================================
   REVIEWS SYSTEM
   ============================================================ */
var reviewData = {
    'Classic Smash Burger': [
        { name: 'Sarah M.', stars: 5, text: 'Best burger in town! The smash is perfect.' },
        { name: 'John D.', stars: 4, text: 'Great flavor, juicy patty. Fries were a bit cold.' }
    ],
    'Margherita Royale': [
        { name: 'Mike R.', stars: 5, text: 'Authentic Italian taste. The truffle oil is chef kiss.' }
    ],
    'Nashville Hot Chicken': [
        { name: 'Lisa K.', stars: 5, text: 'Spicy and crispy perfection. I come here every week.' }
    ]
};
function renderReviews(title) {
    var list = document.getElementById('mpRevList');
    var count = document.getElementById('mpRevCount');
    var reviews = reviewData[title] || [];
    count.textContent = '(' + reviews.length + ')';
    list.innerHTML = '';
    if (reviews.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:#bbb;font-size:0.82rem;"><i class="far fa-comment-dots" style="font-size:2rem;display:block;margin-bottom:8px;"></i>No reviews yet. Be the first!</div>';
        return;
    }
    reviews.forEach(function(r) {
        var item = document.createElement('div');
        item.className = 'mprevitem';
        var stars = '\u2605'.repeat(r.stars) + '\u2606'.repeat(5 - r.stars);
        item.innerHTML = '<div class="mprevhead"><span class="mprevname">' + r.name + '</span><span class="mprevstars">' + stars + '</span></div>' +
            '<div class="mprevtext">' + r.text + '</div>';
        list.appendChild(item);
    });
}
document.querySelectorAll('.mprevstar').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.mprevstar').forEach(function(b) {
            b.classList.remove('active');
            b.innerHTML = '<i class="far fa-star"></i>';
        });
        for (var i = 0; i < parseInt(this.getAttribute('data-v')); i++) {
            document.querySelectorAll('.mprevstar')[i].classList.add('active');
            document.querySelectorAll('.mprevstar')[i].innerHTML = '<i class="fas fa-star"></i>';
        }
    });
});
document.getElementById('mpRevBtn').addEventListener('click', function() {
    var title = document.getElementById('mpTitle').textContent;
    var starsEl = document.querySelector('.mprevstar.active');
    var name = document.getElementById('mpRevName').value.trim();
    var body = document.getElementById('mpRevBody').value.trim();
    if (!starsEl) { showToast('Please select a star rating', 'warn'); return; }
    if (!name || !body) { showToast('Please fill in your name and review', 'warn'); return; }
    var stars = document.querySelectorAll('.mprevstar.active').length;
    if (!reviewData[title]) reviewData[title] = [];
    reviewData[title].unshift({ name: name, stars: stars, text: body });
    renderReviews(title);
    document.getElementById('mpRevName').value = '';
    document.getElementById('mpRevBody').value = '';
    document.querySelectorAll('.mprevstar').forEach(function(b) {
        b.classList.remove('active');
        b.innerHTML = '<i class="far fa-star"></i>';
    });
    showToast('Review submitted! Thank you.', 'success');
});

/* ============================================================
   UPDATED MENU POPUP - RENDER NUTRITION + REVIEWS
   ============================================================ */
var origOpenMenuPop = openMenuPop;
openMenuPop = function(card) {
    origOpenMenuPop(card);
    var title = document.getElementById('mpTitle').textContent;
    renderNutrition(title);
    renderReviews(title);
};

/* ============================================================
   LIVE CHAT WIDGET
   ============================================================ */
var lcToggle = document.getElementById('lcToggle');
var lcBox = document.getElementById('lcBox');
var lcClose = document.getElementById('lcClose');
var lcInput = document.getElementById('lcInput');
var lcSend = document.getElementById('lcSend');
var lcMessages = document.getElementById('lcMessages');

function addChatMsg(text, type) {
    var div = document.createElement('div');
    div.className = 'lcmsg ' + type;
    div.innerHTML = text;
    lcMessages.appendChild(div);
    lcMessages.scrollTop = lcMessages.scrollHeight;
}
function botReply(text) {
    setTimeout(function() {
        addChatMsg('<strong>Support:</strong> ' + text, 'bot');
    }, 1200 + Math.random() * 1500);
}
if (lcToggle) {
    lcToggle.addEventListener('click', function() {
        if (lcBox.style.display === 'none') {
            lcBox.style.display = 'block';
            if (lcMessages.children.length === 0) {
                addChatMsg('<strong>Support:</strong> Hi! How can I help you today?', 'bot');
            }
        } else {
            lcBox.style.display = 'none';
        }
    });
}
if (lcClose) {
    lcClose.addEventListener('click', function() {
        lcBox.style.display = 'none';
    });
}
if (lcSend) {
    lcSend.addEventListener('click', function() {
        var txt = lcInput.value.trim();
        if (!txt) return;
        addChatMsg(txt, 'user');
        lcInput.value = '';
        if (txt.toLowerCase().includes('order')) botReply('You can track your order in the tracking modal after checkout.');
        else if (txt.toLowerCase().includes('delivery')) botReply('Delivery takes 25-35 minutes. Free delivery on orders over $30!');
        else if (txt.toLowerCase().includes('menu') || txt.toLowerCase().includes('food')) botReply('We have burgers, pizza, chicken, wraps, pasta and desserts. Check our menu!');
        else botReply('Thanks for reaching out! Our team will assist you shortly. You can also call us at +1 (800) 123-4567.');
    });
}
if (lcInput) {
    lcInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') lcSend.click();
    });
}

/* ============================================================
   ORDER HISTORY
   ============================================================ */
var ohModal = document.getElementById('orderHistoryModal');
var ohClose = document.getElementById('ohClose');
var ohCvr = document.getElementById('ohCvr');
var ohList = document.getElementById('ohList');

function saveOrder(items, total, method) {
    var orders = JSON.parse(localStorage.getItem('yussif_orders') || '[]');
    var orderId = 'SB-' + Math.floor(1000 + Math.random() * 9000);
    var statuses = ['Order Received', 'Preparing', 'Out for Delivery', 'Delivered'];
    var statusIdx = 0;
    var order = {
        id: orderId,
        items: items.map(function(it) { return it.title + (it.size && it.size !== 'Regular' ? ' (' + it.size + ')' : '') + ' x' + it.qty; }),
        total: '$' + total.toFixed(2),
        method: method,
        date: new Date().toLocaleString(),
        status: statuses[statusIdx]
    };
    orders.unshift(order);
    localStorage.setItem('yussif_orders', JSON.stringify(orders.slice(0, 20)));

    var interval = setInterval(function() {
        var stored = JSON.parse(localStorage.getItem('yussif_orders') || '[]');
        var o = stored.find(function(x) { return x.id === orderId; });
        if (o && statusIdx < statuses.length - 1) {
            statusIdx++;
            o.status = statuses[statusIdx];
            localStorage.setItem('yussif_orders', JSON.stringify(stored));
            renderOrders();
        } else {
            clearInterval(interval);
        }
    }, 15000);
}
function renderOrders() {
    var orders = JSON.parse(localStorage.getItem('yussif_orders') || '[]');
    if (!ohList) return;
    if (orders.length === 0) {
        ohList.innerHTML = '<div class="ohempty"><i class="fas fa-box-open"></i><p>No orders yet</p></div>';
        return;
    }
    ohList.innerHTML = '';
    orders.forEach(function(o) {
        var item = document.createElement('div');
        item.className = 'ohitem';
        item.innerHTML = '<div class="ohid">Order #' + o.id + ' <span class="ohstatus">' + o.status + '</span></div>' +
            '<div class="ohitems">' + o.items.join('<br/>') + '</div>' +
            '<div class="ohtotal">' + o.total + ' <span style="color:#888;font-weight:400;font-size:0.75rem;">via ' + o.method + '</span></div>';
        ohList.appendChild(item);
    });
}
if (ohClose) {
    ohClose.addEventListener('click', function() {
        ohModal.classList.remove('open');
        ohCvr.classList.remove('show');
        document.body.style.overflow = '';
    });
}
if (ohCvr) {
    ohCvr.addEventListener('click', function() {
        ohModal.classList.remove('open');
        ohCvr.classList.remove('show');
        document.body.style.overflow = '';
    });
}
document.getElementById('tmTrackBtn') && document.getElementById('tmTrackBtn').addEventListener('click', function() {
    renderOrders();
    ohModal.classList.add('open');
    ohCvr.classList.add('show');
    document.body.style.overflow = 'hidden';
});

/* ============================================================
   ADDRESS BOOK
   ============================================================ */
var addrBook = JSON.parse(localStorage.getItem('yussif_addr') || '[]');
var selAddr = null;
function renderAddr() {
    var list = document.getElementById('ckAddList');
    if (!list) return;
    list.innerHTML = '';
    addrBook.forEach(function(a, idx) {
        var item = document.createElement('div');
        item.className = 'ckadditem' + (selAddr === idx ? ' sel' : '');
        item.innerHTML = '<div><div class="ckaddlabel">' + a.addr + '</div><div class="ckaddsub">' + a.city + ', ' + a.zip + '</div></div>' +
            '<button class="ckadddel" data-i="' + idx + '"><i class="fas fa-trash-alt"></i></button>';
        item.addEventListener('click', function(e) {
            if (e.target.closest('.ckadddel')) return;
            selAddr = idx;
            renderAddr();
            if (document.getElementById('cashAddr')) {
                document.getElementById('cashAddr').value = a.addr + ', ' + a.city + ', ' + a.zip;
            }
        });
        list.appendChild(item);
    });
    var delBtn = list.querySelector('.ckadddel');
    if (delBtn) {
        delBtn.addEventListener('click', function(e) {
            var i = parseInt(this.getAttribute('data-i'));
            addrBook.splice(i, 1);
            localStorage.setItem('yussif_addr', JSON.stringify(addrBook));
            if (selAddr === i) selAddr = null;
            renderAddr();
            showToast('Address removed', 'warn');
        });
    }
}
var addNewBtn = document.getElementById('addNew');
var addForm = document.getElementById('ckAddForm');
var addSave = document.getElementById('addSave');
var addCancel = document.getElementById('addCancel');
if (addNewBtn && addForm) {
    addNewBtn.addEventListener('click', function() {
        addForm.style.display = addForm.style.display === 'none' ? 'flex' : 'none';
    });
}
if (addCancel && addForm) {
    addCancel.addEventListener('click', function() {
        addForm.style.display = 'none';
    });
}
if (addSave && addForm) {
    addSave.addEventListener('click', function() {
        var addr = document.getElementById('addAddr').value.trim();
        var city = document.getElementById('addCity').value.trim();
        var zip = document.getElementById('addZip').value.trim();
        if (!addr || !city || !zip) { showToast('Please fill all address fields', 'warn'); return; }
        addrBook.push({ addr: addr, city: city, zip: zip });
        localStorage.setItem('yussif_addr', JSON.stringify(addrBook));
        document.getElementById('addAddr').value = '';
        document.getElementById('addCity').value = '';
        document.getElementById('addZip').value = '';
        addForm.style.display = 'none';
        renderAddr();
        showToast('Address saved!', 'success');
    });
}
renderAddr();

/* ============================================================
   ORDER HISTORY BUTTON VISIBILITY
   ============================================================ */
function updateOrdersBtn() {
    var orders = JSON.parse(localStorage.getItem('yussif_orders') || '[]');
    var btn = document.getElementById('csOrders');
    if (btn) btn.style.display = orders.length > 0 ? 'block' : 'none';
}
document.getElementById('footerOrders') && document.getElementById('footerOrders').addEventListener('click', function(e) {
    e.preventDefault();
    renderOrders();
    ohModal.classList.add('open');
    ohCvr.classList.add('show');
    document.body.style.overflow = 'hidden';
});

/* ============================================================
   SOCIAL PROOF NOTIFICATIONS
   ============================================================ */
var socialProofMessages = [
    { icon: 'fa-fire', text: '23 people are viewing the Smash Burger right now' },
    { icon: 'fa-shopping-bag', text: 'Burger Lover Combo was ordered 5 minutes ago' },
    { icon: 'fa-star', text: 'Nashville Hot Chicken just got a 5-star review!' },
    { icon: 'fa-truck', text: 'Last delivery to Manhattan took just 22 minutes' },
    { icon: 'fa-clock', text: 'Order now and get it before your movie starts!' },
    { icon: 'fa-bolt', text: 'Limited time: Truffle Mushroom Pasta is 20% off today' },
    { icon: 'fa-heart', text: '1,247 people added items to cart in the last hour' },
    { icon: 'fa-check-circle', text: 'Most popular: Classic Smash Burger - 850+ sold today' }
];
function triggerSocialProof() {
    var msg = socialProofMessages[Math.floor(Math.random() * socialProofMessages.length)];
    showToast(msg.text, 'social');
}
setTimeout(function() {
    triggerSocialProof();
    setInterval(triggerSocialProof, 45000 + Math.random() * 30000);
}, 12000);

/* ============================================================
   ADVANCED SORTING
   ============================================================ */
function sortMenuBy(prop, dir) {
    var wraps = document.querySelectorAll('.mwrap');
    var items = Array.from(wraps).map(function(w) {
        return {
            el: w,
            price: parseFloat((w.querySelector('.mprice') ? w.querySelector('.mprice').textContent : '0').replace(/[^0-9.]/g, '')) || 0,
            rating: parseFloat(w.getAttribute('data-rating')) || 0,
            reviews: parseInt(w.getAttribute('data-reviews')) || 0
        };
    });
    items.sort(function(a, b) {
        var va = a[prop], vb = b[prop];
        return dir === 'asc' ? va - vb : vb - va;
    });
    var grid = document.getElementById('mgrid');
    items.forEach(function(it) { grid.appendChild(it.el); });
}
window.sortMenuBy = sortMenuBy;

/* ============================================================
   BREADCRUMB NAVIGATION
   ============================================================ */
function updateBreadcrumb(label) {
    var bc = document.getElementById('bcCurrent');
    if (bc) bc.textContent = label || 'All Items';
}
document.querySelectorAll('.filtbtn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        updateBreadcrumb(this.textContent);
    });
});
document.querySelectorAll('.catcard').forEach(function(card) {
    card.addEventListener('click', function() {
        updateBreadcrumb(this.querySelector('.catnm').textContent);
    });
});
document.getElementById('bcList') && document.querySelectorAll('#bcList .breadcrumb-item a').forEach(function(a) {
    a.addEventListener('click', function() {
        updateBreadcrumb('All Items');
    });
});

