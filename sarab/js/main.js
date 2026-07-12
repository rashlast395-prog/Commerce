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
            // Close Bootstrap mobile navbar if open
            var navCollapse = document.getElementById('navmenu');
            if (navCollapse && navCollapse.classList.contains('show')) {
                var bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
                if (bsCollapse) {
                    bsCollapse.hide();
                } else {
                    navCollapse.classList.remove('show');
                }
            }
            // Scroll after slight delay to let navbar close
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

// Close when clicking backdrop
searchOv.addEventListener('click', function(e) {
    if (e.target === searchOv) closeSearch();
});

function closeSearch() {
    searchOv.classList.remove('open');
    document.body.style.overflow = '';
}

// Category buttons inside search box
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

// Trending tags fill the search input
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
    // sync filter buttons
    document.querySelectorAll('.filtbtn').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-f') === cat);
    });
    // sync category cards
    document.querySelectorAll('.catcard').forEach(function(c) {
        c.classList.toggle('active', c.getAttribute('data-filter') === cat);
    });
    // show/hide menu cards
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

// Filter buttons
document.querySelectorAll('.filtbtn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        filterMenu(this.getAttribute('data-f'));
    });
});

// Category section cards â†’ scroll + filter
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


var menuPop = document.getElementById('menuPop');
var mpQty = 1;

function openMenuPop(card) {
    var img = card.getAttribute('data-img');
    var title = card.getAttribute('data-title');
    var cat = card.getAttribute('data-cat');
    var price = card.getAttribute('data-price');
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
        '<i class="fas fa-star"></i>'.repeat(full) + 'â˜†'.repeat(empty) +
        ' <span style="color:#bbb;font-size:.78rem;">' + rating + ' (' + reviews + ' reviews)</span>';

    document.getElementById('mpDesc').textContent = desc;

    document.getElementById('mpPrice').innerHTML =
        price + (old ? '<small style="color:#ccc;text-decoration:line-through;margin-left:8px;font-size:1rem;">' + old + '</small>' : '');

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

    menuPop.classList.add('open');
    document.body.style.overflow = 'hidden';
}

// Card click open popup
document.querySelectorAll('.mcard').forEach(function(card) {
    card.addEventListener('click', function() {
        openMenuPop(this);
    });
});

// + button  open popup (stop propagation to avoid double firing)
document.querySelectorAll('.madd').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        openMenuPop(this.closest('.mcard'));
    });
});

// Heart toggle (no popup)
document.querySelectorAll('.mhrt').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var ico = this.querySelector('i');
        ico.classList.toggle('far');
        ico.classList.toggle('fas');
        this.style.color = ico.classList.contains('fas') ? 'var(--primary)' : '#ccc';
    });
});

// Close popup
document.getElementById('mpClose').addEventListener('click', closeMenuPop);
menuPop.addEventListener('click', function(e) {
    if (e.target === this) closeMenuPop();
});

function closeMenuPop() {
    menuPop.classList.remove('open');
    document.body.style.overflow = '';
}

// Qty +/-
document.getElementById('mpPlus').addEventListener('click', function() {
    document.getElementById('mpQnum').textContent = ++mpQty;
});
document.getElementById('mpMinus').addEventListener('click', function() {
    if (mpQty > 1) document.getElementById('mpQnum').textContent = --mpQty;
});

// Add to cart button
document.getElementById('mpAddCart').addEventListener('click', function() {
    var cnt = parseInt(document.getElementById('cartCount').textContent) + mpQty;
    document.getElementById('cartCount').textContent = cnt;
    this.innerHTML = '<i class="fas fa-check"></i> Added to Cart!';
    this.style.background = 'linear-gradient(135deg,var(--green),#1a4a35)';
    var self = this;
    setTimeout(function() {
        closeMenuPop();
        self.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
        self.style.background = '';
    }, 1000);
});


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

/*  ESC key closes everything */
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
        btn.textContent = 'âœ“ Subscribed!';
        btn.style.background = '#4ade80';
        btn.style.color = '#222';
        document.getElementById('nlEmail').value = '';
        setTimeout(function() {
            btn.textContent = 'Subscribe';
            btn.style.background = '';
            btn.style.color = '';
        }, 3000);
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
   CART, CHECKOUT & PAYMENT SYSTEM
   ============================================================ */
var cartOpen = false;
var cartItems = [];
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

function formatMoney(n) {
    return '$' + n.toFixed(2);
}

function updateCartUI() {
    var total = cartItems.reduce(function(a, b) { return a + (b.price * b.qty); }, 0);
    var count = cartItems.reduce(function(a, b) { return a + b.qty; }, 0);
    cartCountEl.textContent = count;

    if (cartItems.length === 0) {
        csEmpty.style.display = 'block';
        csFoot.style.display = 'none';
        var ex = csList.querySelectorAll('.csitem');
        ex.forEach(function(e) { e.remove(); });
    } else {
        csEmpty.style.display = 'none';
        csFoot.style.display = 'block';
    }

    var ex = csList.querySelectorAll('.csitem');
    ex.forEach(function(e) { e.remove(); });
    cartItems.forEach(function(item, idx) {
        var div = document.createElement('div');
        div.className = 'csitem';
        div.innerHTML =
            '<img class="csitemimg" src="' + item.img + '" alt=""/>' +
            '<div class="csitembody">' +
            '  <div class="csitemname">' + item.title + '</div>' +
            '  <div class="csitemprice">' + formatMoney(item.price) + ' x ' + item.qty + '</div>' +
            '</div>' +
            '<div class="csqty">' +
            '  <button class="csminus" data-i="' + idx + '">-</button>' +
            '  <span>' + item.qty + '</span>' +
            '  <button class="csplus" data-i="' + idx + '">+</button>' +
            '</div>' +
            '<button class="csremove" data-i="' + idx + '"><i class="fas fa-trash-alt"></i></button>';
        csList.appendChild(div);
    });

    csSub.textContent = formatMoney(total);
    csTotal.textContent = formatMoney(total);
    document.getElementById('ckAmount').textContent = formatMoney(total);
    document.getElementById('mobAmount').value = formatMoney(total);
}

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
    }
});

/* Override add-to-cart to use cartItems */
document.getElementById('mpAddCart').addEventListener('click', function() {
    var card = document.querySelector('.mcard[data-title="' + document.getElementById('mpTitle').textContent + '"]') ||
               document.querySelector('.mcard');
    var img = card ? (card.getAttribute('data-img') || 'img/menu/1.jpg') : 'img/menu/1.jpg';
    var title = document.getElementById('mpTitle').textContent;
    var price = parseFloat((card ? card.getAttribute('data-price') : '$14.99').replace('$',''));
    var qty = parseInt(document.getElementById('mpQnum').textContent);
    var existing = cartItems.find(function(it) { return it.title === title; });
    if (existing) {
        existing.qty += qty;
    } else {
        cartItems.push({ img: img, title: title, price: price, qty: qty });
    }
    updateCartUI();
    closeMenuPop();
    /* cart button bounce */
    cartBtn.classList.remove('bounce');
    void cartBtn.offsetWidth;
    cartBtn.classList.add('bounce');
    showMicroPopup('Item added to cart!');
});

/* Checkout modal */
var checkoutOpen = false;
var checkoutModal = document.getElementById('checkoutModal');
var ckClose = document.getElementById('ckClose');
var ckCvr = document.getElementById('ckCvr');
var ckPay = document.getElementById('ckPay');

csCheck.addEventListener('click', function() {
    if (cartItems.length === 0) return;
    checkoutOpen = true;
    checkoutModal.classList.add('open');
    ckCvr.classList.add('show');
    document.body.style.overflow = 'hidden';
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
        panel.classList.add('active');
    });
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
        openTracking(method);
        cartItems = [];
        updateCartUI();
        cartOpen = false;
        cartSide.classList.remove('open');
        document.body.style.overflow = '';
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
    showMicroPopup('Live tracking launched!');
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
            cartItems.push({ img: img, title: title, price: price, qty: 1 });
        }
        updateCartUI();
        cartBtn.classList.remove('bounce');
        void cartBtn.offsetWidth;
        cartBtn.classList.add('bounce');
        showMicroPopup('Item added to cart!');
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
            cartItems.push({ img: img, title: title, price: price, qty: 1 });
        }
        updateCartUI();
        cartBtn.classList.remove('bounce');
        void cartBtn.offsetWidth;
        cartBtn.classList.add('bounce');
        showMicroPopup('Combo added to cart!');
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

/* ESC closes all */
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
    }
});