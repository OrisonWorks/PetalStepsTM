const FB_URL = 'https://www.facebook.com/p/Petal-Steps-by-TM-61586015481553/';
const FREE_DELIVERY = 800, DELIVERY_FEE = 80;
const money = n => 'R ' + n.toLocaleString('en-ZA');

const PRODUCTS = [
  {id:1,name:'Bloom Runner Sneakers',cat:'women',price:899,was:1199,badge:'sale',img:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&q=80&auto=format&fit=crop',desc:'Lightweight knit runners with cushioned petal-soft soles. Your everyday go-to.',sizes:[3,4,5,6,7,8]},
  {id:2,name:'Petal Point Heels',cat:'women',price:749,was:null,badge:'new',img:'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=700&q=80&auto=format&fit=crop',desc:'Elegant pointed heels with padded insole — glamour without the ache.',sizes:[3,4,5,6,7,8]},
  {id:3,name:'Rose Strappy Sandals',cat:'women',price:499,was:649,badge:'sale',img:'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=700&q=80&auto=format&fit=crop',desc:'Breezy strappy sandals that go with everything from dresses to denim.',sizes:[3,4,5,6,7,8]},
  {id:4,name:'Blush Ballet Flats',cat:'women',price:549,was:null,badge:null,img:'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=700&q=80&auto=format&fit=crop',desc:'Soft ballet flats with flexible sole and bow detail. Pretty and practical.',sizes:[3,4,5,6,7,8]},
  {id:5,name:'Classic White Sneakers',cat:'women',price:799,was:null,badge:null,img:'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=700&q=80&auto=format&fit=crop',desc:'Clean, minimal sneakers that finish any outfit. A wardrobe essential.',sizes:[3,4,5,6,7,8,9]},
  {id:6,name:'Urban Street Sneakers',cat:'men',price:999,was:1299,badge:'sale',img:'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=700&q=80&auto=format&fit=crop',desc:'Bold street-style sneakers with superior grip and all-day cushioning.',sizes:[6,7,8,9,10,11,12]},
  {id:7,name:'Suede Chelsea Boots',cat:'men',price:1299,was:null,badge:'new',img:'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=700&q=80&auto=format&fit=crop',desc:'Smart suede Chelsea boots — dress them up or down, they always deliver.',sizes:[6,7,8,9,10,11]},
  {id:8,name:'Everyday Loafers',cat:'men',price:849,was:null,badge:null,img:'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=700&q=80&auto=format&fit=crop',desc:'Slip-on loafers in soft finish. Office-ready comfort, zero effort.',sizes:[6,7,8,9,10,11,12]},
  {id:9,name:'Trail Adventure Shoes',cat:'men',price:1099,was:1399,badge:'sale',img:'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=700&q=80&auto=format&fit=crop',desc:'Rugged trail shoes with reinforced toe and breathable mesh upper.',sizes:[6,7,8,9,10,11,12]},
  {id:10,name:'Kids Sparkle Sneakers',cat:'kids',price:449,was:null,badge:'new',img:'https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=700&q=80&auto=format&fit=crop',desc:'Light-up sparkle sneakers kids love, with easy velcro straps for parents.',sizes:[8,9,10,11,12,13,1,2]},
  {id:11,name:'Kids Everyday Runners',cat:'kids',price:399,was:499,badge:'sale',img:'https://images.unsplash.com/photo-1565271371485-5f8e5a8e5c8f?w=700&q=80&auto=format&fit=crop',desc:'Tough, comfy runners built for playgrounds, school and everything between.',sizes:[8,9,10,11,12,13,1,2]},
  {id:12,name:'Kids Summer Sandals',cat:'kids',price:299,was:null,badge:null,img:'https://images.unsplash.com/photo-1607453998774-d533f65dac99?w=700&q=80&auto=format&fit=crop',desc:'Quick-dry summer sandals with adjustable straps and non-slip soles.',sizes:[8,9,10,11,12,13,1]},
];

let cart = JSON.parse(localStorage.getItem('petalCart') || '[]');
let activeFilter = 'all', searchTerm = '', sortBy = 'featured';
let modalProduct = null, modalSize = null;

const $ = s => document.querySelector(s);
const grid = $('#productGrid');

function saveCart(){ localStorage.setItem('petalCart', JSON.stringify(cart)); }
function cartQty(){ return cart.reduce((a,i)=>a+i.qty,0); }
function cartSubtotal(){ return cart.reduce((a,i)=>a+i.price*i.qty,0); }

function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(t._h); t._h = setTimeout(()=>t.hidden = true, 3200);
}

function visibleProducts(){
  let list = PRODUCTS.filter(p =>
    (activeFilter==='all' || p.cat===activeFilter || (activeFilter==='sale' && p.badge==='sale')) &&
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  if(sortBy==='low') list.sort((a,b)=>a.price-b.price);
  if(sortBy==='high') list.sort((a,b)=>b.price-a.price);
  if(sortBy==='name') list.sort((a,b)=>a.name.localeCompare(b.name));
  return list;
}

function renderProducts(){
  const list = visibleProducts();
  $('#emptyState').hidden = list.length > 0;
  grid.innerHTML = list.map(p => `
    <article class="product">
      <div class="product-img" data-quick="${p.id}">
        <img src="${p.img}" alt="${p.name}" loading="lazy">
        ${p.badge ? `<span class="badge ${p.badge==='new'?'new':''}">${p.badge==='sale' ? 'SALE −' + Math.round((1-p.price/p.was)*100) + '%' : 'NEW'}</span>` : ''}
      </div>
      <div class="product-body">
        <span class="cat-label">${p.cat}</span>
        <h3 data-quick="${p.id}">${p.name}</h3>
        <div class="price-row"><strong>${money(p.price)}</strong>${p.was ? `<s>${money(p.was)}</s>` : ''}</div>
        <div class="product-actions">
          <button class="btn btn-primary" data-add="${p.id}">Add to bag</button>
          <button class="quick-btn" data-quick="${p.id}">View</button>
        </div>
      </div>
    </article>`).join('');
}

function setFilter(f){
  activeFilter = f;
  document.querySelectorAll('#filters .pill').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
  renderProducts();
}

function addToCart(id, size){
  const p = PRODUCTS.find(x => x.id === id);
  size = size || p.sizes[Math.floor(p.sizes.length/2)];
  const key = id + '-' + size;
  const found = cart.find(i => i.key === key);
  if(found) found.qty++;
  else cart.push({key, id, name:p.name, price:p.price, img:p.img, size, qty:1});
  saveCart(); renderCart();
  toast(`Added ${p.name} (UK ${size}) to your bag 🌸`);
}

function renderCart(){
  $('#cartCount').textContent = cartQty();
  const box = $('#cartItems');
  if(!cart.length){
    box.innerHTML = '<p class="cart-empty">Your bag is empty.<br>Add something beautiful 🌸</p>';
  } else {
    box.innerHTML = cart.map(i => `
      <div class="cart-item">
        <img src="${i.img}" alt="${i.name}">
        <div><h4>${i.name}</h4><p>UK size ${i.size} · ${money(i.price)}</p>
          <div class="qty"><button data-dec="${i.key}">−</button><span>${i.qty}</span><button data-inc="${i.key}">+</button></div>
        </div>
        <div><strong>${money(i.price*i.qty)}</strong><br><button class="remove" data-remove="${i.key}">Remove</button></div>
      </div>`).join('');
  }
  const sub = cartSubtotal();
  const delivery = sub === 0 ? 0 : (sub >= FREE_DELIVERY ? 0 : DELIVERY_FEE);
  $('#cartSubtotal').textContent = money(sub);
  $('#cartDelivery').textContent = sub === 0 ? '—' : (delivery === 0 ? 'FREE' : money(delivery));
  $('#cartTotal').textContent = money(sub + delivery);
  $('#deliveryHint').textContent = sub > 0 && delivery > 0 ? `Add ${money(FREE_DELIVERY - sub)} more for free delivery.` : (sub >= FREE_DELIVERY ? 'You unlocked free delivery 🎉' : '');
}

function openDrawer(){
  $('#cartDrawer').classList.add('open');
  $('#cartDrawer').setAttribute('aria-hidden','false');
  $('#drawerBackdrop').hidden = false;
}
function closeDrawer(){
  $('#cartDrawer').classList.remove('open');
  $('#cartDrawer').setAttribute('aria-hidden','true');
  $('#drawerBackdrop').hidden = true;
}

function openModal(p){
  modalProduct = p; modalSize = null;
  $('#modalImg').src = p.img; $('#modalImg').alt = p.name;
  $('#modalTag').textContent = p.cat + (p.badge ? ' · ' + p.badge : '');
  $('#modalName').textContent = p.name;
  $('#modalDesc').textContent = p.desc;
  $('#modalPrice').textContent = money(p.price);
  $('#modalWas').textContent = p.was ? money(p.was) : '';
  $('#modalSizes').innerHTML = p.sizes.map(s => `<button class="size-btn" data-size="${s}">UK ${s}</button>`).join('');
  $('#modalBackdrop').hidden = false;
}
function closeModal(){ $('#modalBackdrop').hidden = true; }

/* Events */
document.addEventListener('click', e => {
  const add = e.target.closest('[data-add]');
  if(add){ addToCart(+add.dataset.add); return; }
  const quick = e.target.closest('[data-quick]');
  if(quick){ openModal(PRODUCTS.find(p => p.id === +quick.dataset.quick)); return; }
  const pill = e.target.closest('#filters .pill');
  if(pill){ setFilter(pill.dataset.filter); return; }
  const cat = e.target.closest('.cat-card');
  if(cat){ setFilter(cat.dataset.filter); document.getElementById('shop').scrollIntoView({behavior:'smooth'}); return; }
  const fl = e.target.closest('[data-filter-link]');
  if(fl){ setFilter(fl.dataset.filterLink); document.getElementById('shop').scrollIntoView({behavior:'smooth'}); return; }
  const size = e.target.closest('[data-size]');
  if(size){ modalSize = size.dataset.size; document.querySelectorAll('.size-btn').forEach(b=>b.classList.toggle('selected', b===size)); return; }
  const inc = e.target.closest('[data-inc]'); if(inc){ cart.find(i=>i.key===inc.dataset.inc).qty++; saveCart(); renderCart(); return; }
  const dec = e.target.closest('[data-dec]'); if(dec){ const it = cart.find(i=>i.key===dec.dataset.dec); it.qty--; if(it.qty<1) cart = cart.filter(i=>i!==it); saveCart(); renderCart(); return; }
  const rem = e.target.closest('[data-remove]'); if(rem){ cart = cart.filter(i=>i.key!==rem.dataset.remove); saveCart(); renderCart(); return; }
});

$('#sortSelect').addEventListener('change', e => { sortBy = e.target.value; renderProducts(); });
$('#searchBtn').addEventListener('click', () => { const b = $('#searchBar'); b.hidden = !b.hidden; if(!b.hidden) $('#searchInput').focus(); });
$('#searchInput').addEventListener('input', e => { searchTerm = e.target.value; renderProducts(); document.getElementById('shop').scrollIntoView({behavior:'smooth'}); });
$('#cartBtn').addEventListener('click', openDrawer);
$('#drawerClose').addEventListener('click', closeDrawer);
$('#drawerBackdrop').addEventListener('click', closeDrawer);
$('#modalClose').addEventListener('click', closeModal);
$('#modalBackdrop').addEventListener('click', e => { if(e.target.id === 'modalBackdrop') closeModal(); });
$('#modalAdd').addEventListener('click', () => {
  if(!modalSize){ toast('Please select a size first 👟'); return; }
  addToCart(modalProduct.id, modalSize); closeModal(); openDrawer();
});
$('#navToggle').addEventListener('click', () => $('#navLinks').classList.toggle('open'));
document.querySelectorAll('#navLinks a').forEach(a => a.addEventListener('click', () => $('#navLinks').classList.remove('open')));
document.addEventListener('keydown', e => { if(e.key === 'Escape'){ closeModal(); closeDrawer(); } });

$('#checkoutForm').addEventListener('submit', e => {
  e.preventDefault();
  if(!cart.length){ toast('Your bag is empty — add a pair first 🌸'); return; }
  const fd = new FormData(e.target);
  const sub = cartSubtotal(), delivery = sub >= FREE_DELIVERY ? 0 : DELIVERY_FEE;
  const lines = cart.map(i => `• ${i.name} — UK ${i.size} × ${i.qty} — ${money(i.price*i.qty)}`).join('\n');
  const msg = `Hi Petal Steps by TM! 🌸 I'd like to order:\n\n${lines}\n\nSubtotal: ${money(sub)}\nDelivery: ${delivery === 0 ? 'FREE' : money(delivery)}\nTotal: ${money(sub+delivery)}\n\nName: ${fd.get('name')}\nPhone: ${fd.get('phone')}\nAddress: ${fd.get('address') || '—'}`;
  toast('Order ready! Opening Facebook to confirm it with us…');
  setTimeout(() => window.open(FB_URL, '_blank'), 900);
  console.log(msg);
  cart = []; saveCart(); renderCart(); e.target.reset(); closeDrawer();
});

$('#contactForm').addEventListener('submit', e => {
  e.preventDefault();
  toast('Thanks! Opening Facebook — paste your message there for the fastest reply 🌸');
  setTimeout(() => window.open(FB_URL, '_blank'), 900);
  e.target.reset();
});

$('#newsletterForm').addEventListener('submit', e => {
  e.preventDefault();
  toast('Welcome to the Petal List 🌸 You\'re subscribed!');
  e.target.reset();
});

$('#floatFb').addEventListener('click', () => window.open(FB_URL, '_blank'));

$('#year').textContent = new Date().getFullYear();
renderProducts();
renderCart();
