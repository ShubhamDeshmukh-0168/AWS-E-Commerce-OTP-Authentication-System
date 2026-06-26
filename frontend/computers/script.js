
/* Advanced interactions — script.js (shared across categories) */
/* Sample product catalog (replaceable) */
const catalog = {
  electronics: [
    {id:'e1',name:'Pixel Home Hub',price:6999,img:'https://via.placeholder.com/600x400?text=Hub',rating:4.5,desc:'Smart home hub and speaker.'},
    {id:'e2',name:'Google Nest Cam',price:9999,img:'https://via.placeholder.com/600x400?text=Cam',rating:4.6,desc:'1080p security camera.'},
    {id:'e3',name:'Chromecast Ultra',price:3499,img:'https://via.placeholder.com/600x400?text=Cast',rating:4.4,desc:'Stream in 4K HDR.'},
    {id:'e4',name:'Pixel Buds Max',price:12999,img:'https://via.placeholder.com/600x400?text=Bud',rating:4.3,desc:'Premium audio earphones.'},
    {id:'e5',name:'Google Router',price:5499,img:'https://via.placeholder.com/600x400?text=Router',rating:4.2,desc:'Fast mesh wifi.'}
  ],
  phones: [
    {id:'p1',name:'Pixel 9',price:59999,img:'https://via.placeholder.com/600x400?text=Pixel9',rating:4.7,desc:'Flagship phone with AI camera.'},
    {id:'p2',name:'Pixel Fold',price:129999,img:'https://via.placeholder.com/600x400?text=Fold',rating:4.6,desc:'Foldable display innovation.'},
    {id:'p3',name:'Pixel 9a',price:29999,img:'https://via.placeholder.com/600x400?text=9a',rating:4.2,desc:'Value flagship.'},
    {id:'p4',name:'Pixel Watch',price:19999,img:'https://via.placeholder.com/600x400?text=Watch',rating:4.1,desc:'Smart wearable.'}
  ],
  computers: [
    {id:'c1',name:'Pixelbook Go',price:84999,img:'https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6382/6382914_sd.jpg',rating:4.5,desc:'Ultra-portable Chromebook.'},
    {id:'c2',name:'Chromebox',price:44999,img:'https://www.extremetech.com/wp-content/uploads/2014/02/asus-chromebox-front.jpg',rating:4.0,desc:'Compact desktop.'},
    {id:'c3',name:'Pixel Slate',price:69999,img:'https://overeview.com/wp-content/uploads/2020/11/google-pixel-slate.jpg',rating:4.3,desc:'Tablet + keyboard.'},
    {id:'c4',name:'Google Pixelbook ',price:79999,img:'https://images-cdn.ubuy.co.in/66f98b2336558055e6125f9d-google-pixelbook-i7-16-gb-ram-512-gb.jpg',rating:4.3,desc:'pixelbook'}

  ],
  earphones: [
    {id:'b1',name:'Pixel Buds A',price:3999,img:'https://via.placeholder.com/600x400?text=BudsA',rating:4.2,desc:'Comfortable daily buds.'},
    {id:'b2',name:'Pixel Buds Pro',price:8999,img:'https://via.placeholder.com/600x400?text=Pro',rating:4.5,desc:'Active noise-canceling.'},
    {id:'b3',name:'Pixel Ear Fit',price:2499,img:'https://via.placeholder.com/600x400?text=Fit',rating:4.0,desc:'Budget wireless buds.'}
  ]
};

/* ---------- State ---------- */
const body = document.body;
const category = body.getAttribute('data-category') || 'electronics';
let products = catalog[category] || [];
let cart = {}; // {id: qty}
let lazyEnabled = true;

/* ---------- DOM shortcuts ---------- */
const preloader = document.getElementById('preloader');
const gridView = document.getElementById('gridView');
const carouselView = document.getElementById('carouselView');
const swiperWrapper = document.getElementById('swiperWrapper');
const pageTitle = document.getElementById('page-title');
const heroName = document.getElementById('hero-name');
const heroPrice = document.getElementById('hero-price');
const heroImage = document.getElementById('hero-image');
const cartBtn = document.getElementById('cartBtn');
const cartEl = document.getElementById('cart');
const cartList = document.getElementById('cartList');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalImg = document.getElementById('modalImg');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const modalPrice = document.getElementById('modalPrice');
const modalAdd = document.getElementById('modalAdd');

const searchInput = document.getElementById('search');
const sortEl = document.getElementById('sort');
const gridBtn = document.getElementById('gridBtn');
const carouselBtn = document.getElementById('carouselBtn');
const viewToggle = document.getElementById('viewToggle');
const themeToggle = document.getElementById('themeToggle');
const toggleLazy = document.getElementById('toggleLazy');
const clearSearch = document.getElementById('clearSearch');

pageTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Utility ---------- */
const fmt = n => '₹' + n.toLocaleString('en-IN');
const byId = id => document.getElementById(id);

/* ---------- Render grid ---------- */
function renderGrid(items){
  gridView.innerHTML = '';
  if(!items.length){ gridView.innerHTML = '<div class="muted">No products found.</div>'; return; }
  items.forEach(p=>{
    const card = document.createElement('article');
    card.className = 'card tilt';
    card.innerHTML = `
      <div class="thumb"><img ${lazyEnabled ? 'loading="lazy"' : ''} src="${p.img}" alt="${p.name}"></div>
      <div class="meta"><div class="title">${p.name}</div><div class="price">${fmt(p.price)}</div></div>
      <div class="muted" style="font-size:13px">⭐ ${p.rating} · ${p.desc}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
        <div><button class="btn small quick" data-id="${p.id}">Quick view</button>
             <button class="btn small ghost add" data-id="${p.id}">Add</button></div>
        <button class="btn small ghost fav" data-id="${p.id}">♡</button>
      </div>
    `;
    gridView.appendChild(card);
  });

  // tilt effect
  if(window.VanillaTilt){ VanillaTilt.init(document.querySelectorAll('.tilt'), {max:8,speed:400,glare:true,"max-glare":0.08}); }

  // card listeners
  gridView.querySelectorAll('.quick').forEach(b=> b.onclick = e => openModal(getById(b.dataset.id)));
  gridView.querySelectorAll('.add').forEach(b=> b.onclick = e => addToCart(b.dataset.id,1));
}

/* ---------- Render carousel ---------- */
let swiperInstance = null;
function renderCarousel(items){
  swiperWrapper.innerHTML = '';
  if(!items.length){ swiperWrapper.innerHTML = '<div class="muted">No products</div>'; return; }
  items.forEach(p=>{
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    slide.innerHTML = `<div class="swiper-card card">
        <div class="thumb"><img ${lazyEnabled ? 'loading="lazy"' : ''} src="${p.img}" alt="${p.name}"></div>
        <div class="meta"><div class="title">${p.name}</div><div class="price">${fmt(p.price)}</div></div>
        <div class="muted" style="font-size:13px">⭐ ${p.rating}</div>
        <div style="margin-top:10px;display:flex;gap:8px"><button class="btn small quick" data-id="${p.id}">Quick view</button><button class="btn small ghost add" data-id="${p.id}">Add</button></div>
      </div>`;
    swiperWrapper.appendChild(slide);
  });

  // init/refresh Swiper
  if(typeof Swiper !== 'undefined'){
    if(swiperInstance) swiperInstance.destroy(true,true);
    swiperInstance = new Swiper('.mySwiper', {
      slidesPerView: 1.3, centeredSlides: true, spaceBetween: 18, loop:false,
      breakpoints: { 640:{slidesPerView:1.6}, 980:{slidesPerView:2.2}, 1200:{slidesPerView:3} },
      navigation:{ nextEl:'.swiper-button-next', prevEl:'.swiper-button-prev' },
      pagination:{ el:'.swiper-pagination', clickable:true }
    });
  }

  // bind buttons inside slides
  document.querySelectorAll('.quick').forEach(b => b.onclick = e => openModal(getById(b.dataset.id)));
  document.querySelectorAll('.add').forEach(b => b.onclick = e => addToCart(b.dataset.id,1));
}

/* ---------- Modal ---------- */
function openModal(p){
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden','false');
  modalImg.src = p.img;
  modalTitle.textContent = p.name;
  modalDesc.textContent = p.desc;
  modalPrice.textContent = fmt(p.price);
  modalAdd.onclick = ()=> { addToCart(p.id,1); closeModal(); };
  if(window.gsap) gsap.fromTo('.modal-card',{y:20,opacity:0},{y:0,opacity:1,duration:.4});
}
function closeModal(){ modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); }
modalClose.onclick = closeModal;
modal.onclick = e => { if(e.target === modal) closeModal(); };

/* ---------- Cart ---------- */
function addToCart(id, qty=1){
  cart[id] = (cart[id]||0) + qty;
  renderCart();
  if(window.gsap) gsap.fromTo('#cartCount',{scale:0.9,opacity:0.6},{scale:1,opacity:1,duration:.28});
}
function removeFromCart(id){ delete cart[id]; renderCart(); }
function changeQty(id, q){ if(q<=0) removeFromCart(id); else cart[id]=q; renderCart(); }
function renderCart(){
  cartList.innerHTML = '';
  const ids = Object.keys(cart);
  let total = 0;
  if(ids.length===0){ cartList.innerHTML = '<div class="muted">Cart empty</div>'; }
  ids.forEach(id=>{
    const p = getById(id); if(!p) return;
    const qty = cart[id];
    const item = document.createElement('div');
    item.className = 'cart-item';
    item.innerHTML = `<img src="${p.img}" alt="${p.name}"><div style="flex:1">
      <div style="display:flex;justify-content:space-between"><strong>${p.name}</strong><div class="price">${fmt(p.price*qty)}</div></div>
      <div style="display:flex;gap:8px;margin-top:6px;align-items:center"><button class="btn small" data-dec="${id}">-</button><div>${qty}</div><button class="btn small" data-inc="${id}">+</button><button class="btn small ghost" data-rem="${id}">Remove</button></div>
      </div>`;
    cartList.appendChild(item);
    total += p.price * qty;
  });

  cartTotal.textContent = fmt(total);
  cartCount.textContent = Object.values(cart).reduce((s,n)=>s+n,0);
  cartList.querySelectorAll('[data-inc]').forEach(b=> b.onclick = ()=> changeQty(b.dataset.inc, cart[b.dataset.inc]+1));
  cartList.querySelectorAll('[data-dec]').forEach(b=> b.onclick = ()=> changeQty(b.dataset.dec, cart[b.dataset.dec]-1));
  cartList.querySelectorAll('[data-rem]').forEach(b=> b.onclick = ()=> removeFromCart(b.dataset.rem));
}

/* ---------- Helpers ---------- */
function getById(id){ return Object.values(catalog).flat().find(x=>x.id===id); }

/* ---------- Filters / Search / Sort ---------- */
function applyFilters(){
  let items = (catalog[category]||[]).slice();
  const q = searchInput.value.trim().toLowerCase();
  if(q) items = items.filter(i => (i.name+i.desc).toLowerCase().includes(q));
  const sort = sortEl.value;
  if(sort==='price-asc') items.sort((a,b)=>a.price-b.price);
  if(sort==='price-desc') items.sort((a,b)=>b.price-a.price);
  if(sort==='rating') items.sort((a,b)=>b.rating-b.rating);
  renderGrid(items);
  renderCarousel(items);
}
searchInput.addEventListener('input', debounce(applyFilters,200));
clearSearch.onclick = ()=>{ searchInput.value=''; applyFilters(); };

/* ---------- View toggles ---------- */
gridBtn.onclick = ()=> { gridView.style.display='grid'; carouselView.style.display='none'; gridBtn.classList.add('active'); carouselBtn.classList.remove('active'); gridView.focus(); }
carouselBtn.onclick = ()=> { gridView.style.display='none'; carouselView.style.display='block'; carouselBtn.classList.add('active'); gridBtn.classList.remove('active'); carouselView.setAttribute('aria-hidden','false'); }
viewToggle.onclick = ()=> { if(carouselView.style.display==='block'){ gridBtn.click(); } else { carouselBtn.click(); } };

/* theme toggle */
themeToggle.onclick = ()=> {
  const cur = body.getAttribute('data-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  body.setAttribute('data-theme', next);
  themeToggle.setAttribute('aria-pressed', next==='dark');
};

/* lazy toggle */
toggleLazy.onchange = e => { lazyEnabled = e.target.checked; applyFilters(); };

/* reveal on scroll */
function revealOnScroll(){
  const items = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.style.opacity = 1;
        entry.target.style.transform = 'translateY(0)';
        io.unobserve(entry.target);
      }
    });
  },{threshold:0.08});
  items.forEach(i=> io.observe(i));
}

/* init hero */
function initHero(){
  const p = products[0] || {};
  heroImage.src = p.img || 'https://via.placeholder.com/420x280';
  heroName.textContent = p.name || 'Featured';
  heroPrice.textContent = p.price ? fmt(p.price) : '';
  if(window.gsap) gsap.from('.hero-left .reveal',{y:18,opacity:0,duration:.8,stagger:.08});
  if(window.gsap) gsap.to('.p-layer',{y:-30,duration:20,repeat:-1,yoyo:true,ease:'sine.inOut'});
}

/* preloader & initial render */
window.addEventListener('load', () => {
  if(window.gsap) gsap.to(preloader,{opacity:0,duration:.6,onComplete:()=>preloader.style.display='none'});
  products = catalog[category] || [];
  renderGrid(products); renderCarousel(products); initHero(); renderCart(); revealOnScroll();
});

/* cart open/close */
cartBtn.onclick = ()=> { cartEl.classList.add('open'); cartEl.setAttribute('aria-hidden','false'); cartEl.focus(); }
document.getElementById('cartClose').onclick = ()=> { cartEl.classList.remove('open'); cartEl.setAttribute('aria-hidden','true'); }
document.getElementById('emptyCart').onclick = ()=> { cart = {}; renderCart(); }

/* modal keyboard accessibility */
document.addEventListener('keydown', (e)=> { if(e.key === 'Escape'){ closeModal(); cartEl.classList.remove('open'); } });

/* service worker registration (optional) */
if('serviceWorker' in navigator){
  try{ navigator.serviceWorker.register('/sw.js'); }catch(e){}
}

/* helpers */
function debounce(fn,ms){ let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), ms); }; }
