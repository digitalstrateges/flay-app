const db = require('./db');
const market = require('./market-intelligence');
const crypto = require('crypto');

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a1a;--card:#12121f;--card2:#1a1a2e;--text:#e2e8f0;--muted:#64748b;--primary:#818cf8;--primary2:#6366f1;--success:#10b981;--warning:#f59e0b;--danger:#ef4444;--border:#1e293b;--radius:12px}
body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;display:flex;min-height:100vh}
body.loading::after{content:'Chargement...';position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(10,10,26,.85);z-index:9999;font-size:1.2rem;color:var(--primary)}
.sidebar{width:240px;background:var(--card);border-right:1px solid var(--border);padding:1.5rem 0;display:flex;flex-direction:column;position:sticky;top:0;height:100vh}
.sidebar-brand{padding:0 1.25rem 1.5rem;font-size:1.1rem;font-weight:700;color:var(--primary);border-bottom:1px solid var(--border);margin-bottom:.5rem}
.sidebar-brand span{color:var(--text)}
.sidebar-nav{flex:1;padding:.5rem 0}
.sidebar-link{display:flex;align-items:center;gap:.75rem;padding:.75rem 1.25rem;color:var(--muted);text-decoration:none;transition:all .15s;font-size:.9rem;border-left:3px solid transparent}
.sidebar-link:hover{color:var(--text);background:rgba(255,255,255,.03)}
.sidebar-link.active{color:var(--primary);background:rgba(99,102,241,.1);border-left-color:var(--primary)}
.main{flex:1;padding:1.5rem 2rem;max-width:calc(100vw - 240px)}
.topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem}
.topbar h1{font-size:1.5rem;font-weight:600}
.topbar-right{display:flex;align-items:center;gap:1rem;color:var(--muted);font-size:.85rem}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;margin-bottom:2rem}
.stat-card{background:var(--card);border-radius:var(--radius);padding:1.25rem;border:1px solid var(--border);transition:transform .15s}
.stat-card:hover{transform:translateY(-2px)}
.stat-card .stat-label{color:var(--muted);font-size:.8rem;margin-bottom:.25rem}
.stat-card .stat-value{font-size:1.75rem;font-weight:700;color:var(--text)}
.stat-card .stat-sub{color:var(--muted);font-size:.75rem;margin-top:.25rem}
.stat-card .stat-icon{font-size:1.5rem;margin-bottom:.5rem}
.card{background:var(--card);border-radius:var(--radius);border:1px solid var(--border);padding:1.5rem;margin-bottom:1.5rem}
.card h2{font-size:1.1rem;margin-bottom:1rem;color:var(--text)}
.card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}
.card-header h2{margin-bottom:0}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:.75rem .5rem;color:var(--muted);font-weight:500;font-size:.8rem;border-bottom:1px solid var(--border);white-space:nowrap}
td{padding:.75rem .5rem;border-bottom:1px solid rgba(30,41,59,.5);font-size:.85rem}
tr:hover td{background:rgba(255,255,255,.02)}
.badge{display:inline-block;padding:.15rem .5rem;border-radius:999px;font-size:.75rem;font-weight:500}
.badge-success{background:rgba(16,185,129,.15);color:var(--success)}
.badge-warning{background:rgba(245,158,11,.15);color:var(--warning)}
.badge-danger{background:rgba(239,68,68,.15);color:var(--danger)}
.badge-info{background:rgba(99,102,241,.15);color:var(--primary)}
.btn{display:inline-flex;align-items:center;gap:.4rem;padding:.5rem 1rem;border-radius:8px;border:none;font-size:.85rem;cursor:pointer;transition:all .15s;text-decoration:none;font-family:inherit}
.btn-primary{background:var(--primary2);color:#fff}
.btn-primary:hover{opacity:.9}
.btn-success{background:var(--success);color:#fff}
.btn-warning{background:var(--warning);color:#1a1a2e}
.btn-danger{background:var(--danger);color:#fff}
.btn-sm{padding:.3rem .6rem;font-size:.8rem}
.btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}
.btn-ghost:hover{color:var(--text);border-color:var(--muted)}
.btn-icon{width:32px;height:32px;padding:0;display:inline-flex;align-items:center;justify-content:center;border-radius:8px}
.empty-state{text-align:center;padding:3rem 1rem;color:var(--muted)}
.empty-state svg{width:48px;height:48px;margin-bottom:1rem;opacity:.3}
select,input,textarea{background:var(--card2);border:1px solid var(--border);color:var(--text);padding:.6rem .75rem;border-radius:8px;font-size:.85rem;width:100%;font-family:inherit}
select:focus,input:focus,textarea:focus{outline:none;border-color:var(--primary)}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.form-group{display:flex;flex-direction:column;gap:.3rem}
.form-group label{font-size:.8rem;color:var(--muted)}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;z-index:1000;padding:1rem}
.modal-overlay.active{display:flex}
.modal{background:var(--card);border-radius:var(--radius);padding:2rem;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;border:1px solid var(--border)}
.modal h2{margin-bottom:1.5rem}
.modal-actions{display:flex;gap:.75rem;justify-content:flex-end;margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border)}
.toast{position:fixed;bottom:2rem;right:2rem;padding:.75rem 1.5rem;border-radius:8px;color:#fff;font-size:.85rem;z-index:2000;animation:slideIn .3s;max-width:360px}
.toast-success{background:var(--success)}
.toast-error{background:var(--danger)}
.toast-info{background:var(--primary2)}
@keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
.pagination{display:flex;gap:.3rem;justify-content:center;margin-top:1rem}
.pagination button{padding:.3rem .6rem;border:1px solid var(--border);border-radius:6px;background:transparent;color:var(--muted);cursor:pointer}
.pagination button.active{background:var(--primary2);color:#fff;border-color:var(--primary2)}
.search-bar{display:flex;gap:.5rem;margin-bottom:1rem}
.search-bar input{max-width:300px}
@media(max-width:768px){.sidebar{display:none}.main{max-width:100vw;padding:1rem}.stats-grid{grid-template-columns:1fr 1fr}.form-grid{grid-template-columns:1fr}}
`;

function html(layout) {
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${layout.title} | Flay</title><style>${CSS}</style></head>
<body class="loading">${layout.body || ''}
<script>${layout.script || ''}
const TOKEN=localStorage.getItem('flay_token');if(!TOKEN){window.location='/login.html?redirect=/dashboard'}
async function api(m,p,b){const r=await fetch('/api'+p,{method:m||'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+TOKEN},body:b?JSON.stringify(b):undefined});const d=await r.text();try{return JSON.parse(d)}catch{return{error:d}}}
function toast(m,t){const d=document.createElement('div');d.className='toast toast-'+(t||'success');d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),3000)}
document.body.classList.remove('loading');
</script></body></html>`;
}

class SellerDashboard {
    overview(userId) {
        const stats = market.getSalesAnalytics(userId, '30d');
        const products = market.getProductAnalytics(userId, '30d');
        const customers = market.getCustomerInsights(userId);
        const trends = market.getTrends(userId);
        return {
            title: 'Tableau de bord',
            body: `<div class="sidebar">
                <div class="sidebar-brand">🛍️ <span>Flay</span></div>
                <nav class="sidebar-nav">
                    <a href="/dashboard" class="sidebar-link active">📊 Tableau de bord</a>
                    <a href="/dashboard/products" class="sidebar-link">📦 Produits</a>
                    <a href="/dashboard/orders" class="sidebar-link">📋 Commandes</a>
                    <a href="/dashboard/parcels" class="sidebar-link">🚚 Colis</a>
                    <a href="/dashboard/categories" class="sidebar-link">🏷️ Categories</a>
                    <a href="/dashboard/coupons" class="sidebar-link">🎫 Coupons</a>
                </nav>
            </div>
            <div class="main">
                <div class="topbar"><h1>📊 Tableau de bord</h1>
                    <div class="topbar-right"><span>30 derniers jours</span></div>
                </div>
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-label">Chiffre d'affaires</div><div class="stat-value">${stats.totalRevenue.toLocaleString()} F</div><div class="stat-sub">${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth}% vs periode prec.</div></div>
                    <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-label">Commandes</div><div class="stat-value">${stats.totalOrders}</div><div class="stat-sub">${stats.orderGrowth >= 0 ? '+' : ''}${stats.orderGrowth}% vs periode prec.</div></div>
                    <div class="stat-card"><div class="stat-icon">📦</div><div class="stat-label">Produits actifs</div><div class="stat-value">${products.activeProducts}</div><div class="stat-sub">${products.totalProducts} total</div></div>
                    <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-label">Clients</div><div class="stat-value">${customers.totalCustomers || 0}</div><div class="stat-sub">${customers.averageOrderValue || 0} F / commande</div></div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
                    <div class="card"><h2>🏆 Top produits</h2>
                        ${products.topSellers?.length ? `<table><thead><tr><th>Produit</th><th>Ventes</th><th>Revenu</th></tr></thead><tbody>${products.topSellers.slice(0,5).map(p => `<tr><td>${p.name}</td><td>${p.periodSales} u.</td><td>${p.periodRevenue.toLocaleString()} F</td></tr>`).join('')}</tbody></table>` : '<div class="empty-state"><p>Ajoutez vos premiers produits</p></div>'}
                    </div>
                    <div class="card"><h2>📅 Aujourd'hui</h2>
                        <div class="stats-grid" style="grid-template-columns:1fr 1fr;margin-bottom:0">
                            <div class="stat-card" style="padding:.75rem"><div class="stat-label">Commandes</div><div class="stat-value" style="font-size:1.25rem">${trends.today?.orders || 0}</div></div>
                            <div class="stat-card" style="padding:.75rem"><div class="stat-label">Revenu</div><div class="stat-value" style="font-size:1.25rem">${(trends.today?.revenue || 0).toLocaleString()} F</div></div>
                        </div>
                        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">
                            <div style="display:flex;justify-content:space-between;color:var(--muted);font-size:.85rem;margin-bottom:.5rem"><span>Cette semaine</span><span>${(trends.thisWeek?.revenue || 0).toLocaleString()} F</span></div>
                            <div style="display:flex;justify-content:space-between;color:var(--muted);font-size:.85rem"><span>Ce mois</span><span>${(trends.thisMonth?.revenue || 0).toLocaleString()} F</span></div>
                        </div>
                    </div>
                </div>
            </div>`,
            script: `setInterval(()=>{location.reload()},60000)`
        };
    }

    products(userId) {
        return {
            title: 'Produits',
            body: `<div class="sidebar">
                <div class="sidebar-brand">🛍️ <span>Flay</span></div>
                <nav class="sidebar-nav">
                    <a href="/dashboard" class="sidebar-link">📊 Tableau de bord</a>
                    <a href="/dashboard/products" class="sidebar-link active">📦 Produits</a>
                    <a href="/dashboard/orders" class="sidebar-link">📋 Commandes</a>
                    <a href="/dashboard/parcels" class="sidebar-link">🚚 Colis</a>
                    <a href="/dashboard/categories" class="sidebar-link">🏷️ Categories</a>
                    <a href="/dashboard/coupons" class="sidebar-link">🎫 Coupons</a>
                </nav>
            </div>
            <div class="main">
                <div class="topbar"><h1>📦 Produits</h1><button class="btn btn-primary" onclick="showProductModal()">+ Nouveau produit</button></div>
                <div class="card">
                    <div class="search-bar"><input type="text" id="productSearch" placeholder="Rechercher..." oninput="filterProducts()">
                    <select id="productStatus" onchange="filterProducts()"><option value="">Tous</option><option value="active">Actifs</option><option value="draft">Brouillons</option><option value="archived">Archives</option></select></div>
                    <table><thead><tr><th>Produit</th><th>Prix</th><th>Stock</th><th>Ventes</th><th>Statut</th><th style="width:80px"></th></tr></thead>
                    <tbody id="productList"></tbody></table>
                    <div id="productPagination" class="pagination"></div>
                </div>
            </div>
            <div class="modal-overlay" id="productModal"><div class="modal"><h2 id="productModalTitle">Nouveau produit</h2>
                <form id="productForm" onsubmit="return saveProduct(event)">
                    <input type="hidden" id="productId">
                    <div class="form-grid">
                        <div class="form-group"><label>Nom *</label><input id="pName" required></div>
                        <div class="form-group"><label>Prix (FCFA) *</label><input type="number" id="pPrice" required min="0"></div>
                        <div class="form-group"><label>Stock</label><input type="number" id="pStock" value="0" min="0"></div>
                        <div class="form-group"><label>Categorie</label><select id="pCategory"><option value="">Aucune</option></select></div>
                        <div class="form-group" style="grid-column:1/-1"><label>Description</label><textarea id="pDescription" rows="2"></textarea></div>
                        <div class="form-group"><label>Prix compare (optionnel)</label><input type="number" id="pCompare" min="0"></div>
                        <div class="form-group"><label>Tags (separes par virgules)</label><input id="pTags"></div>
                    </div>
                    <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="closeModal('productModal')">Annuler</button><button type="submit" class="btn btn-primary">Enregistrer</button></div>
                </form></div></div>`,
            script: `let products=[],page=1;
async function loadProducts(){const r=await api('/my-products');products=r.products||[];filterProducts()}
function filterProducts(){const s=document.getElementById('productSearch').value.toLowerCase();const st=document.getElementById('productStatus').value;const f=products.filter(p=>(!s||p.name.toLowerCase().includes(s))&&(!st||p.status===st));const per=10;const total=Math.ceil(f.length/per);const start=(page-1)*per;const paged=f.slice(start,start+per);
document.getElementById('productList').innerHTML=paged.length?paged.map(p=>'<tr><td><strong>'+p.name+'</strong>'+(p.shortDescription?'<br><span style="color:var(--muted);font-size:.75rem">'+p.shortDescription.substring(0,50)+'</span>':'')+'</td><td>'+Number(p.price).toLocaleString()+' F</td><td>'+(p.trackInventory?p.stock:'-')+'</td><td>'+(p.stats?.sales||0)+'</td><td><span class="badge badge-'+(p.status==='active'?'success':'warning')+'">'+(p.status||'draft')+'</span></td><td><button class="btn btn-sm btn-ghost" onclick="editProduct(\\''+p.id+'\\')">Modifier</button></td></tr>').join(''):'<tr><td colspan="6"><div class="empty-state"><p>Aucun produit</p></div></td></tr>';
document.getElementById('productPagination').innerHTML=total>1?Array.from({length:total},(_,i)=>'<button class="'+(i+1===page?'active':'')+'" onclick="page='+(i+1)+';filterProducts()">'+(i+1)+'</button>').join(''):''}
async function showProductModal(id){document.getElementById('productId').value='';document.getElementById('productModalTitle').textContent='Nouveau produit';document.getElementById('pName').value='';document.getElementById('pPrice').value='';document.getElementById('pStock').value='0';document.getElementById('pDescription').value='';document.getElementById('pCompare').value='';document.getElementById('pTags').value='';
const catR=await api('/categories');const sel=document.getElementById('pCategory');sel.innerHTML='<option value="">Aucune</option>'+(catR.categories||[]).map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('');
if(id){const p=products.find(x=>x.id===id);if(p){document.getElementById('productModalTitle').textContent='Modifier le produit';document.getElementById('productId').value=p.id;document.getElementById('pName').value=p.name;document.getElementById('pPrice').value=p.price;document.getElementById('pStock').value=p.stock||0;document.getElementById('pDescription').value=p.description||'';document.getElementById('pCompare').value=p.comparePrice||'';document.getElementById('pTags').value=(p.tags||[]).join(', ');if(p.categoryId)sel.value=p.categoryId}}
document.getElementById('productModal').classList.add('active')}
function editProduct(id){showProductModal(id)}
async function saveProduct(e){e.preventDefault();const id=document.getElementById('productId').value;const data={name:document.getElementById('pName').value,price:parseInt(document.getElementById('pPrice').value),stock:parseInt(document.getElementById('pStock').value),categoryId:document.getElementById('pCategory').value,description:document.getElementById('pDescription').value,comparePrice:parseInt(document.getElementById('pCompare').value)||0,tags:document.getElementById('pTags').value.split(',').map(t=>t.trim()).filter(Boolean)};const r=id?await api('/products/'+id,'PUT',data):await api('/products','POST',data);if(r.error){toast(r.error,'error')}else{toast(id?'Produit modifie':'Produit cree','success');closeModal('productModal');loadProducts()}}
function closeModal(id){document.getElementById(id).classList.remove('active')}
loadProducts();`
        };
    }

    orders(userId) {
        return {
            title: 'Commandes',
            body: `<div class="sidebar">
                <div class="sidebar-brand">🛍️ <span>Flay</span></div>
                <nav class="sidebar-nav">
                    <a href="/dashboard" class="sidebar-link">📊 Tableau de bord</a>
                    <a href="/dashboard/products" class="sidebar-link">📦 Produits</a>
                    <a href="/dashboard/orders" class="sidebar-link active">📋 Commandes</a>
                    <a href="/dashboard/parcels" class="sidebar-link">🚚 Colis</a>
                    <a href="/dashboard/categories" class="sidebar-link">🏷️ Categories</a>
                    <a href="/dashboard/coupons" class="sidebar-link">🎫 Coupons</a>
                </nav>
            </div>
            <div class="main">
                <div class="topbar"><h1>📋 Commandes</h1></div>
                <div class="card">
                    <div class="search-bar"><select id="orderStatus" onchange="loadOrders()"><option value="">Tous les statuts</option><option value="pending">En attente</option><option value="confirmed">Confirmee</option><option value="processing">En preparation</option><option value="shipped">Expediee</option><option value="delivered">Livree</option><option value="cancelled">Annulee</option></select></div>
                    <table><thead><tr><th>Commande</th><th>Client</th><th>Montant</th><th>Paiement</th><th>Statut</th><th>Date</th><th style="width:80px"></th></tr></thead>
                    <tbody id="orderList"></tbody></table>
                </div>
            </div>
            <div class="modal-overlay" id="orderModal"><div class="modal"><h2>Details commande</h2>
                <div id="orderDetails"></div>
                <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">
                    <div class="form-group"><label>Changer le statut</label>
                    <select id="orderStatusSelect"><option value="pending">En attente</option><option value="confirmed">Confirmee</option><option value="processing">En preparation</option><option value="shipped">Expediee</option><option value="delivered">Livree</option><option value="cancelled">Annulee</option></select></div>
                </div>
                <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="closeModal('orderModal')">Fermer</button><button class="btn btn-primary" onclick="updateOrder()">Mettre a jour</button></div>
            </div></div>`,
            script: `let currentOrderId=null;
async function loadOrders(){const st=document.getElementById('orderStatus').value;const r=await api('/orders'+(st?'?status='+st:''));const orders=r.items||r.orders||[];
document.getElementById('orderList').innerHTML=orders.length?orders.map(o=>{
const addr=typeof o.shippingAddress==='string'?JSON.parse(o.shippingAddress):(o.shippingAddress||{});
const pay=typeof o.payment==='string'?JSON.parse(o.payment):(o.payment||{});
const stCls=o.status==='delivered'?'success':o.status==='cancelled'?'danger':o.status==='pending'?'warning':'info';
return '<tr><td>#'+o.id.substring(0,12)+'</td><td>'+(addr.firstName||'')+' '+(addr.lastName||'')+'<br><span style="color:var(--muted);font-size:.75rem">'+(addr.phone||'')+'</span></td><td>'+Number(o.total).toLocaleString()+' F</td><td><span class="badge badge-'+(pay.status==='paid'?'success':'warning')+'">'+(pay.method||'wave')+'</span></td><td><span class="badge badge-'+stCls+'">'+o.status+'</span></td><td style="font-size:.75rem;color:var(--muted)">'+new Date(o.createdAt).toLocaleDateString('fr-FR')+'</td><td><button class="btn btn-sm btn-ghost" onclick="viewOrder(\\''+o.id+'\\')">Voir</button></td></tr>'
}).join(''):'<tr><td colspan="7"><div class="empty-state"><p>Aucune commande</p></div></td></tr>'}
async function viewOrder(id){currentOrderId=id;const r=await api('/orders/'+id);const o=r.order;if(!o)return;const addr=typeof o.shippingAddress==='string'?JSON.parse(o.shippingAddress):(o.shippingAddress||{});const items=typeof o.items==='string'?JSON.parse(o.items):(o.items||[]);const pay=typeof o.payment==='string'?JSON.parse(o.payment):(o.payment||{});
document.getElementById('orderDetails').innerHTML='<div style="display:grid;gap:.5rem;margin-bottom:1rem">'+
'<div><strong>Client:</strong> '+(addr.firstName||'')+' '+(addr.lastName||'')+' - '+(addr.phone||'')+'</div>'+
'<div><strong>Adresse:</strong> '+(addr.address||'')+(addr.city?', '+addr.city:'')+'</div>'+
'<div><strong>Montant:</strong> '+Number(o.total).toLocaleString()+' F (dont '+Number(o.shipping||0).toLocaleString()+' F livraison, '+Number(o.tax||0).toLocaleString()+' F taxes)</div>'+
'<div><strong>Paiement:</strong> '+(pay.method||'wave')+' - '+(pay.status||'en attente')+'</div>'+
'<div><strong>Date:</strong> '+new Date(o.createdAt).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})+'</div></div>'+
'<h3 style="font-size:.9rem;color:var(--muted);margin-bottom:.5rem">Articles</h3>'+
(items.length?'<table><thead><tr><th>Produit</th><th>Qté</th><th>Prix</th></tr></thead><tbody>'+items.map(i=>'<tr><td>'+i.name+'</td><td>'+i.quantity+'</td><td>'+Number(i.price).toLocaleString()+' F</td></tr>').join('')+'</tbody></table>':'<p style="color:var(--muted)">Aucun article</p>');
document.getElementById('orderStatusSelect').value=o.status;
document.getElementById('orderModal').classList.add('active')}
async function updateOrder(){if(!currentOrderId)return;const st=document.getElementById('orderStatusSelect').value;const r=await api('/orders/'+currentOrderId+'/status','PUT',{status:st});if(r.error){toast(r.error,'error')}else{toast('Statut mis a jour','success');closeModal('orderModal');loadOrders()}}
function closeModal(id){document.getElementById(id).classList.remove('active')}
loadOrders();`
        };
    }

    parcels(userId) {
        return {
            title: 'Colis',
            body: `<div class="sidebar">
                <div class="sidebar-brand">🛍️ <span>Flay</span></div>
                <nav class="sidebar-nav">
                    <a href="/dashboard" class="sidebar-link">📊 Tableau de bord</a>
                    <a href="/dashboard/products" class="sidebar-link">📦 Produits</a>
                    <a href="/dashboard/orders" class="sidebar-link">📋 Commandes</a>
                    <a href="/dashboard/parcels" class="sidebar-link active">🚚 Colis</a>
                    <a href="/dashboard/categories" class="sidebar-link">🏷️ Categories</a>
                    <a href="/dashboard/coupons" class="sidebar-link">🎫 Coupons</a>
                </nav>
            </div>
            <div class="main">
                <div class="topbar"><h1>🚚 Colis</h1><button class="btn btn-primary" onclick="createParcel()">+ Nouveau colis</button></div>
                <div class="card">
                    <table><thead><tr><th>Tracking</th><th>Commande</th><th>Statut</th><th>Date</th><th style="width:80px"></th></tr></thead>
                    <tbody id="parcelList"></tbody></table>
                </div>
            </div>
            <div class="modal-overlay" id="parcelModal"><div class="modal"><h2>Colis</h2>
                <div id="parcelDetails"></div>
                <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">
                    <div class="form-group"><label>Mettre a jour le statut</label>
                    <select id="parcelStatusSelect"><option value="preparation">Preparation</option><option value="shipped">Expedie</option><option value="in_transit">En transit</option><option value="delivered">Livree</option><option value="cancelled">Annule</option></select></div>
                    <div class="form-group" style="margin-top:.5rem"><label>Note (optionnelle)</label><input id="parcelNote"></div>
                </div>
                <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="closeModal('parcelModal')">Fermer</button><button class="btn btn-primary" onclick="updateParcel()">Mettre a jour</button></div>
            </div></div>
            <div class="modal-overlay" id="createParcelModal"><div class="modal"><h2>Nouveau colis</h2>
                <div class="form-group"><label>ID de la commande</label>
                <select id="newParcelOrder"><option value="">Choisir une commande...</option></select></div>
                <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="closeModal('createParcelModal')">Annuler</button><button class="btn btn-primary" onclick="doCreateParcel()">Creer</button></div>
            </div></div>`,
            script: `let parcels=[],currentParcelId=null;
async function loadParcels(){const r=await api('/parcels');parcels=r.parcels||[];
document.getElementById('parcelList').innerHTML=parcels.length?parcels.map(p=>{
const cls=p.status==='delivered'?'success':p.status==='cancelled'?'danger':'info';
return '<tr><td><strong>'+p.trackingNumber+'</strong></td><td>#'+p.orderId.substring(0,12)+'</td><td><span class="badge badge-'+cls+'">'+p.status+'</span></td><td style="font-size:.75rem;color:var(--muted)">'+new Date(p.createdAt).toLocaleDateString('fr-FR')+'</td><td><button class="btn btn-sm btn-ghost" onclick="viewParcel(\\''+p.id+'\\')">Voir</button></td></tr>'
}).join(''):'<tr><td colspan="5"><div class="empty-state"><p>Aucun colis</p></div></td></tr>'}
async function viewParcel(id){currentParcelId=id;const r=await api('/parcels/'+id);const p=r.parcel;if(!p)return;const h=typeof p.history==='string'?JSON.parse(p.history):(p.history||[]);
document.getElementById('parcelDetails').innerHTML='<p><strong>Tracking:</strong> '+p.trackingNumber+'</p><p><strong>Commande:</strong> #'+p.orderId.substring(0,12)+'</p><p><strong>Statut:</strong> '+p.status+'</p>'+
(h.length?'<h3 style="font-size:.9rem;color:var(--muted);margin:.75rem 0 .5rem">Historique</h3><div style="font-size:.8rem">'+h.map(hh=>'<div style="display:flex;gap:.5rem;padding:.25rem 0;border-bottom:1px solid var(--border)"><span class="badge badge-info">'+hh.status+'</span><span style="color:var(--muted)">'+new Date(hh.timestamp).toLocaleString('fr-FR')+'</span>'+(hh.note?'<span>'+hh.note+'</span>':'')+'</div>').join('')+'</div>':'');
document.getElementById('parcelStatusSelect').value=p.status;
document.getElementById('parcelModal').classList.add('active')}
async function updateParcel(){if(!currentParcelId)return;const st=document.getElementById('parcelStatusSelect').value;const note=document.getElementById('parcelNote').value;const r=await api('/parcels/'+currentParcelId+'/status','PUT',{status:st,note});if(r.error){toast(r.error,'error')}else{toast('Colis mis a jour','success');closeModal('parcelModal');loadParcels()}}
async function createParcel(){const o=await api('/orders');const orders=o.items||o.orders||[];const sel=document.getElementById('newParcelOrder');sel.innerHTML='<option value="">Choisir une commande...</option>'+orders.filter(o2=>o2.deliveryStatus!=='delivered').map(o2=>'<option value="'+o2.id+'">#'+o2.id.substring(0,12)+' - '+o2.total+' F</option>').join('');document.getElementById('createParcelModal').classList.add('active')}
async function doCreateParcel(){const oid=document.getElementById('newParcelOrder').value;if(!oid){toast('Selectionnez une commande','error');return}const r=await api('/parcels','POST',{orderId:oid});if(r.error){toast(r.error,'error')}else{toast('Colis cree','success');closeModal('createParcelModal');loadParcels()}}
function closeModal(id){document.getElementById(id).classList.remove('active')}
loadParcels();`
        };
    }

    categories(userId) {
        return {
            title: 'Categories',
            body: `<div class="sidebar">
                <div class="sidebar-brand">🛍️ <span>Flay</span></div>
                <nav class="sidebar-nav">
                    <a href="/dashboard" class="sidebar-link">📊 Tableau de bord</a>
                    <a href="/dashboard/products" class="sidebar-link">📦 Produits</a>
                    <a href="/dashboard/orders" class="sidebar-link">📋 Commandes</a>
                    <a href="/dashboard/parcels" class="sidebar-link">🚚 Colis</a>
                    <a href="/dashboard/categories" class="sidebar-link active">🏷️ Categories</a>
                    <a href="/dashboard/coupons" class="sidebar-link">🎫 Coupons</a>
                </nav>
            </div>
            <div class="main">
                <div class="topbar"><h1>🏷️ Categories</h1><button class="btn btn-primary" onclick="showCatModal()">+ Nouvelle categorie</button></div>
                <div class="card">
                    <table><thead><tr><th>Nom</th><th>Slug</th><th>Ordre</th><th>Statut</th><th style="width:80px"></th></tr></thead>
                    <tbody id="categoryList"></tbody></table>
                </div>
            </div>
            <div class="modal-overlay" id="catModal"><div class="modal"><h2 id="catModalTitle">Nouvelle categorie</h2>
                <form onsubmit="return saveCat(event)"><input type="hidden" id="catId">
                <div class="form-grid">
                    <div class="form-group"><label>Nom *</label><input id="catName" required></div>
                    <div class="form-group"><label>Ordre</label><input type="number" id="catOrder" value="0"></div>
                    <div class="form-group" style="grid-column:1/-1"><label>Description</label><input id="catDesc"></div>
                </div>
                <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="closeModal('catModal')">Annuler</button><button type="submit" class="btn btn-primary">Enregistrer</button></div></form></div></div>`,
            script: `let cats=[];
async function loadCats(){const r=await api('/categories');cats=r.categories||[];
document.getElementById('categoryList').innerHTML=cats.length?cats.map(c=>'<tr><td><strong>'+c.name+'</strong>'+(c.description?'<br><span style="color:var(--muted);font-size:.75rem">'+c.description.substring(0,40)+'</span>':'')+'</td><td style="color:var(--muted)">'+c.slug+'</td><td>'+(c.sort_order||0)+'</td><td><span class="badge badge-'+(c.active?'success':'danger')+'">'+(c.active?'Actif':'Inactif')+'</span></td><td><button class="btn btn-sm btn-ghost" onclick="editCat(\\''+c.id+'\\')">Modifier</button></td></tr>').join(''):'<tr><td colspan="5"><div class="empty-state"><p>Aucune categorie</p></div></td></tr>'}
function showCatModal(id){document.getElementById('catId').value='';document.getElementById('catModalTitle').textContent='Nouvelle categorie';document.getElementById('catName').value='';document.getElementById('catOrder').value='0';document.getElementById('catDesc').value='';if(id){const c=cats.find(x=>x.id===id);if(c){document.getElementById('catModalTitle').textContent='Modifier categorie';document.getElementById('catId').value=c.id;document.getElementById('catName').value=c.name;document.getElementById('catOrder').value=c.sort_order||0;document.getElementById('catDesc').value=c.description||''}}document.getElementById('catModal').classList.add('active')}
function editCat(id){showCatModal(id)}
async function saveCat(e){e.preventDefault();const id=document.getElementById('catId').value;const data={name:document.getElementById('catName').value,sort_order:parseInt(document.getElementById('catOrder').value)||0,description:document.getElementById('catDesc').value};const r=id?await api('/categories/'+id,'PUT',data):await api('/categories','POST',data);if(r.error){toast(r.error,'error')}else{toast(id?'Categorie modifiee':'Categorie creee','success');closeModal('catModal');loadCats()}}
function closeModal(id){document.getElementById(id).classList.remove('active')}
loadCats();`
        };
    }

    coupons(userId) {
        return {
            title: 'Coupons',
            body: `<div class="sidebar">
                <div class="sidebar-brand">🛍️ <span>Flay</span></div>
                <nav class="sidebar-nav">
                    <a href="/dashboard" class="sidebar-link">📊 Tableau de bord</a>
                    <a href="/dashboard/products" class="sidebar-link">📦 Produits</a>
                    <a href="/dashboard/orders" class="sidebar-link">📋 Commandes</a>
                    <a href="/dashboard/parcels" class="sidebar-link">🚚 Colis</a>
                    <a href="/dashboard/categories" class="sidebar-link">🏷️ Categories</a>
                    <a href="/dashboard/coupons" class="sidebar-link active">🎫 Coupons</a>
                </nav>
            </div>
            <div class="main">
                <div class="topbar"><h1>🎫 Coupons</h1><button class="btn btn-primary" onclick="showCouponModal()">+ Nouveau coupon</button></div>
                <div class="card">
                    <table><thead><tr><th>Code</th><th>Type</th><th>Valeur</th><th>Min. achat</th><th>Utilisations</th><th>Statut</th><th style="width:80px"></th></tr></thead>
                    <tbody id="couponList"></tbody></table>
                </div>
            </div>
            <div class="modal-overlay" id="couponModal"><div class="modal"><h2>Nouveau coupon</h2>
                <form onsubmit="return saveCoupon(event)"><input type="hidden" id="couponId">
                <div class="form-grid">
                    <div class="form-group"><label>Code *</label><input id="cCode" required></div>
                    <div class="form-group"><label>Type</label><select id="cType"><option value="percentage">Pourcentage</option><option value="fixed">Montant fixe</option></select></div>
                    <div class="form-group"><label>Valeur *</label><input type="number" id="cValue" required min="1"></div>
                    <div class="form-group"><label>Min. achat (FCFA)</label><input type="number" id="cMin" value="0" min="0"></div>
                    <div class="form-group"><label>Utilisations max (-1 = illimite)</label><input type="number" id="cMax" value="-1"></div>
                </div>
                <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="closeModal('couponModal')">Annuler</button><button type="submit" class="btn btn-primary">Enregistrer</button></div></form></div></div>`,
            script: `let coupons=[];
async function loadCoupons(){const r=await api('/coupons');coupons=r.coupons||[];
document.getElementById('couponList').innerHTML=coupons.length?coupons.map(c=>'<tr><td><strong>'+c.code+'</strong></td><td>'+(c.type==='percentage'?'%':'F')+'</td><td>'+c.value+(c.type==='percentage'?'%':' F')+'</td><td>'+(c.minPurchase?c.minPurchase.toLocaleString()+' F':'-')+'</td><td>'+(c.usedCount||0)+(c.maxUses>0?' / '+c.maxUses:'')+'</td><td><span class="badge badge-'+(c.active?'success':'danger')+'">'+(c.active?'Actif':'Inactif')+'</span></td><td><button class="btn btn-sm btn-ghost" onclick="editCoupon(\\''+c.id+'\\')">Modifier</button></td></tr>').join(''):'<tr><td colspan="7"><div class="empty-state"><p>Aucun coupon</p></div></td></tr>'}
function showCouponModal(id){document.getElementById('couponId').value='';document.getElementById('cCode').value='';document.getElementById('cType').value='percentage';document.getElementById('cValue').value='';document.getElementById('cMin').value='0';document.getElementById('cMax').value='-1';if(id){const c=coupons.find(x=>x.id===id);if(c){document.getElementById('couponId').value=c.id;document.getElementById('cCode').value=c.code;document.getElementById('cType').value=c.type;document.getElementById('cValue').value=c.value;document.getElementById('cMin').value=c.minPurchase||0;document.getElementById('cMax').value=c.maxUses||-1}}document.getElementById('couponModal').classList.add('active')}
function editCoupon(id){showCouponModal(id)}
async function saveCoupon(e){e.preventDefault();const id=document.getElementById('couponId').value;const data={code:document.getElementById('cCode').value,type:document.getElementById('cType').value,value:parseInt(document.getElementById('cValue').value),minPurchase:parseInt(document.getElementById('cMin').value),maxUses:parseInt(document.getElementById('cMax').value)};const r=id?await api('/coupons/'+id,'PUT',data):await api('/coupons','POST',data);if(r&&r.error){toast(r.error,'error')}else{toast(id?'Coupon modifie':'Coupon cree','success');closeModal('couponModal');loadCoupons()}}
function closeModal(id){document.getElementById(id).classList.remove('active')}
loadCoupons();`
        };
    }
}

const instance = new SellerDashboard();
instance.CSS = CSS;
module.exports = instance;
