const crypto = require('crypto');
const db = require('./db');

class ECommerce {
    // === CATEGORIES ===
    createCategory(userId, data) {
        const id = `cat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        return db.insert('categories', {
            id, userId, name: data.name, slug: this.slugify(data.name),
            description: data.description || '', image: data.image || '',
            parentId: data.parentId || null, sort_order: data.sort_order || 0,
            active: true
        });
    }

    getUserCategories(userId) {
        return db.findAll('categories', 'userId', userId);
    }

    getActiveCategories(userId) {
        return db.getAll('categories').filter(c => c.userId === userId && c.active);
    }

    updateCategory(id, userId, data) {
        const cat = db.get('categories', id);
        if (!cat || cat.userId !== userId) return null;
        const updates = {};
        ['name', 'description', 'image', 'parentId', 'sort_order', 'active'].forEach(k => {
            if (data[k] !== undefined) updates[k] = data[k];
        });
        if (data.name) updates.slug = this.slugify(data.name);
        return db.update('categories', id, updates);
    }

    deleteCategory(id, userId) {
        const cat = db.get('categories', id);
        if (!cat || cat.userId !== userId) return false;
        db.delete('categories', id);
        return true;
    }

    // === PRODUCTS ===
    createProduct(userId, data) {
        const config = require('./config');
        const user = db.get('users', userId);
        const plan = config.PLANS[user?.plan || 'free'];
        if (plan.limits.products !== -1) {
            const count = db.findAll('products', 'userId', userId).length;
            if (count >= plan.limits.products) {
                return { error: `Limite de ${plan.limits.products} produits atteinte` };
            }
        }

        const id = `prod_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const product = {
            id, userId,
            name: data.name || '',
            description: data.description || '',
            shortDescription: data.shortDescription || '',
            price: data.price || 0,
            comparePrice: data.comparePrice || 0,
            currency: data.currency || 'XOF',
            category: data.category || '',
            categoryId: data.categoryId || null,
            images: data.images || [],
            thumbnail: data.thumbnail || '',
            sku: data.sku || '',
            stock: data.stock ?? 0,
            trackInventory: data.trackInventory !== false,
            allowBackorder: data.allowBackorder || false,
            weight: data.weight || 0,
            dimensions: data.dimensions ? JSON.stringify(data.dimensions) : '{}',
            tags: data.tags || [],
            status: data.status || 'active',
            featured: data.featured || false,
            variants: data.variants || [],
            options: data.options || [],
            seo: JSON.stringify({
                title: data.seoTitle || data.name,
                description: data.seoDescription || (data.description || '').substring(0, 160),
                slug: this.slugify(data.name)
            }),
            stats: JSON.stringify({ views: 0, sales: 0, revenue: 0, rating: 0, reviewCount: 0 })
        };
        return db.insert('products', product);
    }

    getProduct(productId) {
        return db.get('products', productId);
    }

    getUserProducts(userId, filter = {}) {
        let products = db.findAll('products', 'userId', userId);
        if (filter.status) products = products.filter(p => p.status === filter.status);
        if (filter.category) products = products.filter(p => p.category === filter.category);
        if (filter.categoryId) products = products.filter(p => p.categoryId === filter.categoryId);
        return products;
    }

    getPublicProducts(userId, page = 1, perPage = 20, filters = {}) {
        let products = db.findAll('products', 'userId', userId).filter(p => p.status === 'active');
        if (filters.category) products = products.filter(p => p.categoryId === filters.category);
        if (filters.search) {
            const q = filters.search.toLowerCase();
            products = products.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
        }
        if (filters.minPrice) products = products.filter(p => p.price >= filters.minPrice);
        if (filters.maxPrice) products = products.filter(p => p.price <= filters.maxPrice);
        if (filters.featured) products = products.filter(p => p.featured);
        if (filters.sort === 'price_asc') products.sort((a, b) => a.price - b.price);
        else if (filters.sort === 'price_desc') products.sort((a, b) => b.price - a.price);
        else if (filters.sort === 'popular') products.sort((a, b) => { const sa = typeof a.stats === 'string' ? JSON.parse(a.stats) : (a.stats||{}); const sb = typeof b.stats === 'string' ? JSON.parse(b.stats) : (b.stats||{}); return (sb.sales||0) - (sa.sales||0); });
        else products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = products.length;
        const start = (page - 1) * perPage;
        return {
            items: products.slice(start, start + perPage),
            pagination: { total, page, perPage, totalPages: Math.ceil(total / perPage) }
        };
    }

    updateProduct(productId, userId, data) {
        const product = db.get('products', productId);
        if (!product || product.userId !== userId) return null;
        const allowed = ['name', 'description', 'shortDescription', 'price', 'comparePrice',
            'category', 'categoryId', 'images', 'thumbnail', 'sku', 'stock',
            'trackInventory', 'allowBackorder', 'weight', 'status', 'featured',
            'variants', 'options', 'tags'];
        const updates = {};
        for (const key of allowed) {
            if (data[key] !== undefined) updates[key] = data[key];
        }
        if (data.name) {
            const seo = typeof product.seo === 'string' ? JSON.parse(product.seo) : (product.seo || {});
            seo.slug = this.slugify(data.name);
            updates.seo = JSON.stringify(seo);
        }
        if (data.dimensions) updates.dimensions = JSON.stringify(data.dimensions);
        return db.update('products', productId, updates);
    }

    deleteProduct(productId, userId) {
        const product = db.get('products', productId);
        if (!product || product.userId !== userId) return false;
        db.delete('products', productId);
        db.deleteWhere('reviews', 'productId', productId);
        return true;
    }

    // === CART (still in-memory for simplicity - persists during session) ===
    constructor() {
        this.carts = new Map();
    }

    getCart(userId) {
        return this.carts.get(userId) || { items: [], total: 0, currency: 'XOF', itemCount: 0 };
    }

    addToCart(userId, productId, quantity = 1, variant = null) {
        const product = db.get('products', productId);
        if (!product || product.status !== 'active') return { error: 'Produit non disponible' };
        if (product.trackInventory && product.stock < quantity && !product.allowBackorder) {
            return { error: 'Stock insuffisant' };
        }
        const cart = this.getCart(userId);
        const existingIndex = cart.items.findIndex(i =>
            i.productId === productId && JSON.stringify(i.variant) === JSON.stringify(variant)
        );
        if (existingIndex >= 0) {
            cart.items[existingIndex].quantity += quantity;
        } else {
            cart.items.push({
                productId, name: product.name, price: product.price,
                image: product.thumbnail || (product.images || [])[0] || '',
                quantity, variant, maxQuantity: product.trackInventory ? product.stock : 999
            });
        }
        this._recalcCart(cart);
        this.carts.set(userId, cart);
        return cart;
    }

    updateCartItem(userId, productId, quantity, variant = null) {
        const cart = this.getCart(userId);
        const idx = cart.items.findIndex(i =>
            i.productId === productId && JSON.stringify(i.variant) === JSON.stringify(variant)
        );
        if (idx < 0) return { error: 'Article non trouve' };
        if (quantity <= 0) cart.items.splice(idx, 1);
        else cart.items[idx].quantity = quantity;
        this._recalcCart(cart);
        this.carts.set(userId, cart);
        return cart;
    }

    removeFromCart(userId, productId, variant = null) {
        return this.updateCartItem(userId, productId, 0, variant);
    }

    clearCart(userId) {
        this.carts.delete(userId);
        return { items: [], total: 0, currency: 'XOF', itemCount: 0 };
    }

    _recalcCart(cart) {
        cart.total = cart.items.reduce((s, i) => s + (i.price * i.quantity), 0);
        cart.itemCount = cart.items.reduce((s, i) => s + i.quantity, 0);
        cart.updatedAt = new Date().toISOString();
    }

    // === ORDERS ===
    createOrder(userId, data) {
        const cart = this.getCart(userId);
        if (!cart.items.length) return { error: 'Panier vide' };

        const config = require('./config');
        const taxRate = config.ECOMMERCE.taxRate;
        const subtotal = cart.total;
        const tax = Math.round(subtotal * taxRate);
        const shipping = this._calcShipping(data.shippingZone, subtotal, data.shippingMethod);
        const discount = data.couponCode ? this.applyCoupon(data.couponCode, subtotal) : 0;
        const total = Math.max(0, subtotal + tax + shipping - discount);

        const id = `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const order = db.insert('orders', {
            id, userId,
            items: JSON.stringify(cart.items.map(i => ({ ...i, subtotal: i.price * i.quantity }))),
            subtotal, tax, taxRate, shipping, shippingMethod: data.shippingMethod || 'standard',
            shippingZone: data.shippingZone || '',
            discount, couponCode: data.couponCode || null, total,
            currency: cart.currency,
            status: 'pending',
            payment: JSON.stringify({ method: data.paymentMethod || 'wave', status: 'pending' }),
            shippingAddress: JSON.stringify(data.shippingAddress || {}),
            billingAddress: JSON.stringify(data.billingAddress || {}),
            notes: data.notes || '', customerNote: data.customerNote || '',
            deliveryStatus: 'pending',
            estimatedDelivery: data.estimatedDelivery || null
        });

        for (const item of cart.items) {
            const product = db.get('products', item.productId);
            if (product && product.trackInventory) {
                const newStock = Math.max(0, product.stock - item.quantity);
                const stats = typeof product.stats === 'string' ? JSON.parse(product.stats) : (product.stats || {});
                stats.sales = (stats.sales || 0) + item.quantity;
                stats.revenue = (stats.revenue || 0) + (item.price * item.quantity);
                db.update('products', item.productId, { stock: newStock, stats: JSON.stringify(stats) });
            }
        }
        this.clearCart(userId);
        this.createParcel(userId, id);
        return order;
    }

    _calcShipping(zone, subtotal, method) {
        const config = require('./config');
        if (subtotal >= config.ECOMMERCE.freeShippingThreshold) return 0;
        const zones = { abidjan: 1500, interieur: 3000, national: 2500 };
        const base = zones[zone] || 2000;
        return method === 'express' ? base * 2 : base;
    }

    getOrder(orderId) { return db.get('orders', orderId); }

    getUserOrders(userId, page = 1, perPage = 20) {
        let orders = db.findAll('orders', 'userId', userId);
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const total = orders.length;
        const start = (page - 1) * perPage;
        return {
            items: orders.slice(start, start + perPage),
            pagination: { total, page, perPage, totalPages: Math.ceil(total / perPage) }
        };
    }

    getAllOrders(userId, page = 1, perPage = 20) {
        let orders = db.findAll('orders', 'userId', userId);
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const total = orders.length;
        const start = (page - 1) * perPage;
        return {
            items: orders.slice(start, start + perPage),
            pagination: { total, page, perPage, totalPages: Math.ceil(total / perPage) }
        };
    }

    updateOrderStatus(orderId, userId, status) {
        const order = db.get('orders', orderId);
        if (!order || order.userId !== userId) return null;
        const validStatuses = require('./config').ECOMMERCE.orderStatuses;
        if (!validStatuses.includes(status)) return { error: 'Statut invalide' };
        const updates = { status };
        if (status === 'delivered') updates.deliveredAt = new Date().toISOString();
        if (status === 'confirmed') updates.confirmedAt = new Date().toISOString();
        return db.update('orders', orderId, updates);
    }

    updateDeliveryStatus(orderId, userId, status) {
        const order = db.get('orders', orderId);
        if (!order || order.userId !== userId) return null;
        return db.update('orders', orderId, { deliveryStatus: status });
    }

    // === PARCEL TRACKING ===
    createParcel(userId, orderId) {
        const order = db.get('orders', orderId);
        if (!order || order.userId !== userId) return { error: 'Commande non trouvee' };
        const existing = db.findBy('parcels', 'orderId', orderId);
        if (existing) return { error: 'Colis deja cree', parcel: existing };
        const crypto = require('crypto');
        const id = `parcel_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        const trackingNumber = `FLY-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const history = [{ status: 'preparation', timestamp: new Date().toISOString(), note: 'Colis cree' }];
        const parcel = db.insert('parcels', {
            id, orderId, userId, trackingNumber,
            status: 'preparation',
            destination: typeof order.shippingAddress === 'string' ? order.shippingAddress : JSON.stringify(order.shippingAddress || {}),
            estimatedDelivery: order.estimatedDelivery || null,
            history: JSON.stringify(history)
        });
        db.update('orders', orderId, { deliveryStatus: 'preparation' });
        return parcel;
    }

    getParcel(parcelId) { return db.get('parcels', parcelId); }

    getParcelByTracking(trackingNumber) {
        return db.findBy('parcels', 'trackingNumber', trackingNumber);
    }

    getOrderParcel(orderId) {
        return db.findBy('parcels', 'orderId', orderId);
    }

    getUserParcels(userId) {
        const parcels = db.findAll('parcels', 'userId', userId);
        parcels.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return parcels;
    }

    updateParcelStatus(parcelId, userId, status, note) {
        const parcel = db.get('parcels', parcelId);
        if (!parcel) return null;
        if (parcel.userId !== userId) return { error: 'Non autorise' };
        const validStatuses = ['preparation', 'shipped', 'in_transit', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) return { error: 'Statut invalide' };
        const history = typeof parcel.history === 'string' ? JSON.parse(parcel.history) : (parcel.history || []);
        history.push({ status, timestamp: new Date().toISOString(), note: note || '' });
        const updates = { status, history: JSON.stringify(history), updatedAt: new Date().toISOString() };
        if (status === 'shipped') updates.shippedAt = new Date().toISOString();
        if (status === 'delivered') updates.deliveredAt = new Date().toISOString();
        db.update('parcels', parcelId, updates);
        db.update('orders', parcel.orderId, { deliveryStatus: status });
        return db.get('parcels', parcelId);
    }

    generateTrackingUrl(trackingNumber) {
        const config = require('./config');
        return `${config.SITE_URL || 'http://localhost:3000'}/track/${trackingNumber}`;
    }

    // === COUPONS ===
    createCoupon(userId, data) {
        const id = `coupon_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        return db.insert('coupons', {
            id, userId, code: (data.code || '').toUpperCase(),
            type: data.type || 'percentage', value: data.value || 10,
            minPurchase: data.minPurchase || 0, maxUses: data.maxUses || -1, usedCount: 0,
            validFrom: data.validFrom || new Date().toISOString(),
            validUntil: data.validUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            active: true
        });
    }

    getUserCoupons(userId) { return db.findAll('coupons', 'userId', userId); }

    applyCoupon(code, subtotal) {
        const coupons = db.getAll('coupons');
        for (const coupon of coupons) {
            if (coupon.code === code && coupon.active) {
                if (subtotal < coupon.minPurchase) continue;
                if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) continue;
                db.update('coupons', coupon.id, { usedCount: (coupon.usedCount || 0) + 1 });
                return coupon.type === 'percentage' ? Math.round(subtotal * coupon.value / 100) : coupon.value;
            }
        }
        return 0;
    }

    deleteCoupon(id, userId) {
        const coupon = db.get('coupons', id);
        if (!coupon || coupon.userId !== userId) return false;
        return db.delete('coupons', id);
    }

    // === REVIEWS ===
    addReview(productId, userId, data) {
        const id = `rev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const review = db.insert('reviews', {
            id, productId, userId,
            rating: Math.min(5, Math.max(1, data.rating || 5)),
            title: data.title || '', comment: data.comment || ''
        });
        const product = db.get('products', productId);
        if (product) {
            const allReviews = this.getProductReviews(productId);
            const stats = typeof product.stats === 'string' ? JSON.parse(product.stats) : (product.stats || {});
            stats.reviewCount = allReviews.length;
            stats.rating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
            db.update('products', productId, { stats: JSON.stringify(stats) });
        }
        return review;
    }

    getProductReviews(productId) {
        return db.findAll('reviews', 'productId', productId);
    }

    // === STATS ===
    getStoreStats(userId) {
        const products = db.findAll('products', 'userId', userId);
        const orders = db.findAll('orders', 'userId', userId);
        const totalRevenue = orders.filter(o => ['confirmed', 'processing', 'shipped', 'delivered'].includes(o.status))
            .reduce((sum, o) => sum + o.total, 0);
        const topProducts = [...products].sort((a, b) => {
            const sa = typeof a.stats === 'string' ? JSON.parse(a.stats) : (a.stats || {});
            const sb = typeof b.stats === 'string' ? JSON.parse(b.stats) : (b.stats || {});
            return (sb.sales || 0) - (sa.sales || 0);
        }).slice(0, 5).map(p => {
            const s = typeof p.stats === 'string' ? JSON.parse(p.stats) : (p.stats || {});
            return { id: p.id, name: p.name, sales: s.sales || 0, revenue: s.revenue || 0 };
        });
        return {
            totalProducts: products.length,
            activeProducts: products.filter(p => p.status === 'active').length,
            totalOrders: orders.length,
            pendingOrders: orders.filter(o => o.status === 'pending').length,
            totalRevenue, topProducts,
            averageOrderValue: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0
        };
    }

    // === HELPERS ===
    slugify(text) {
        return (text || '').toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    _esc(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    }

    generateProductPage(product, storeInfo = {}) {
        const currency = product.currency || 'XOF';
        const images = typeof product.images === 'string' ? JSON.parse(product.images) : (product.images || []);
        const tags = typeof product.tags === 'string' ? JSON.parse(product.tags) : (product.tags || []);
        const stats = typeof product.stats === 'string' ? JSON.parse(product.stats) : (product.stats || {});

        return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${this._esc(product.name)} | ${this._esc(storeInfo.storeName || 'Boutique')}</title>
<meta name="description" content="${this._esc((product.description||'').substring(0,160))}">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a1a;--card:#12121f;--text:#e2e8f0;--muted:#64748b;--primary:#818cf8;--border:#1e293b}
body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:20px}
.container{max-width:1200px;margin:0 auto}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:40px}
@media(max-width:768px){.grid{grid-template-columns:1fr}}
.main-img{background:var(--card);border-radius:16px;overflow:hidden;aspect-ratio:1}
.main-img img{width:100%;height:100%;object-fit:cover}
.thumbs{display:flex;gap:8px;margin-top:12px}
.thumbs img{width:80px;height:80px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid transparent}
.thumbs img:hover{border-color:var(--primary)}
h1{font-size:28px;margin-bottom:8px}
.price{font-size:32px;font-weight:800;color:var(--primary);margin-bottom:20px}
.compare{font-size:18px;color:var(--muted);text-decoration:line-through;margin-left:12px}
.badge{background:#ef444420;color:#ef4444;padding:4px 8px;border-radius:6px;font-size:12px;margin-left:8px}
.desc{color:var(--muted);margin-bottom:24px;line-height:1.6}
.stock{margin-bottom:16px}
.in-stock{color:#10b981}
.out-stock{color:#ef4444}
.actions{display:flex;gap:12px;margin-bottom:24px}
.actions input{width:80px;padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:16px}
.btn{flex:1;padding:14px;font-size:16px;border:none;border-radius:12px;cursor:pointer;transition:.2s;display:flex;align-items:center;justify-content:center;gap:8px}
.btn-primary{background:var(--primary);color:#fff}
.btn-primary:hover{opacity:.9}
.btn:disabled{opacity:.5;cursor:not-allowed}
.tags{display:flex;gap:8px;flex-wrap:wrap}
.tag{padding:4px 12px;background:rgba(255,255,255,.05);border-radius:20px;font-size:12px}
.back{margin-bottom:20px}
.back a{color:var(--primary);text-decoration:none}
</style></head>
<body><div class="container">
<a href="/store/${product.userId}" class="back">&larr; Retour a la boutique</a>
<div class="grid">
<div><div class="main-img"><img src="${product.thumbnail || images[0] || '/placeholder.png'}" alt="${this._esc(product.name)}"></div>
${images.length > 1 ? `<div class="thumbs">${images.map(i => `<img src="${i}" alt="">`).join('')}</div>` : ''}</div>
<div>
<h1>${this._esc(product.name)}</h1>
<div class="price">${Number(product.price).toLocaleString()} ${currency}
${product.comparePrice > product.price ? `<span class="compare">${Number(product.comparePrice).toLocaleString()} ${currency}</span><span class="badge">-${Math.round((1-product.price/product.comparePrice)*100)}%</span>` : ''}</div>
<p class="desc">${this._esc(product.description || '')}</p>
${product.trackInventory ? `<div class="stock">${product.stock > 0 ? `<span class="in-stock">✓ En stock (${product.stock} disponible${product.stock>1?'s':''})</span>` : `<span class="out-stock">✗ Rupture de stock</span>`}</div>` : ''}
<div class="actions">
<input type="number" value="1" min="1" max="${product.stock||99}" id="qty">
<button class="btn btn-primary" onclick="addToCart('${product.id}')" ${product.trackInventory&&product.stock<=0?'disabled':''}>
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
Ajouter au panier</button></div>
${tags.length ? `<div class="tags">${tags.map(t => `<span class="tag">${this._esc(t)}</span>`).join('')}</div>` : ''}
</div></div></div>
<script>
async function addToCart(productId){const qty=parseInt(document.getElementById('qty').value)||1;const token=localStorage.getItem('flay_token');if(!token){window.location.href='/login.html';return}
const r=await fetch('/api/cart/add',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({productId,quantity:qty})})
if(r.ok){alert('Ajoute au panier !')}else{const d=await r.json();alert(d.error||'Erreur')}}
</script></body></html>`;
    }

    generateStorePage(userId, products, categories, storeInfo = {}) {
        const items = products.items || [];
        const profileUrl = storeInfo.profileSlug ? `/${storeInfo.profileSlug}` : null;
        return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${this._esc(storeInfo.storeName || 'Boutique')} | Flay</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a1a;--card:#12121f;--text:#e2e8f0;--muted:#64748b;--primary:#818cf8;--border:#1e293b;--accent:#818cf8}
body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.site-nav{display:flex;align-items:center;justify-content:space-between;padding:.75rem 1.5rem;background:rgba(0,0,0,.3);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}
.site-nav-brand{font-weight:700;color:var(--text);text-decoration:none;font-size:1.1rem}
.site-nav-links{display:flex;gap:.5rem;align-items:center}
.site-nav-link{color:var(--muted);text-decoration:none;padding:.4rem 1rem;border-radius:999px;font-size:.875rem;transition:all .2s}
.site-nav-link:hover{color:var(--text);background:rgba(255,255,255,.08)}
.site-nav-link.active{color:var(--accent);background:rgba(99,102,241,.15)}
.container{max-width:1200px;margin:0 auto;padding:20px}
.header{text-align:center;padding:40px 0}
.header h1{font-size:36px;margin-bottom:8px}
.header p{color:var(--muted)}
.categories{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:32px}
.cat-btn{padding:8px 20px;border:1px solid var(--border);border-radius:20px;background:transparent;color:var(--text);cursor:pointer;font-size:14px;transition:.2s}
.cat-btn:hover,.cat-btn.active{border-color:var(--primary);background:var(--primary);color:#fff}
.products-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px}
.product-card{background:var(--card);border-radius:16px;overflow:hidden;transition:.2s;cursor:pointer}
.product-card:hover{transform:translateY(-4px);box-shadow:0 8px 32px rgba(129,140,248,.15)}
.product-card img{width:100%;aspect-ratio:1;object-fit:cover}
.card-body{padding:16px}
.card-body h3{font-size:16px;margin-bottom:4px}
.card-price{font-size:18px;font-weight:700;color:var(--primary)}
.card-old{font-size:14px;color:var(--muted);text-decoration:line-through;margin-left:8px}
.empty{text-align:center;padding:60px 20px;color:var(--muted)}
.empty svg{width:64px;height:64px;margin-bottom:16px;opacity:.3}
footer{text-align:center;padding:2rem;color:var(--muted);font-size:.85rem;border-top:1px solid var(--border);margin-top:2rem}
footer a{color:var(--primary);text-decoration:none}
@media(max-width:600px){.products-grid{grid-template-columns:1fr 1fr}}
</style></head>
<body>
<nav class="site-nav">
    <a href="${profileUrl || '/'}" class="site-nav-brand">${this._esc(storeInfo.storeName || 'Boutique')}</a>
    <div class="site-nav-links">
        ${profileUrl ? `<a href="${profileUrl}" class="site-nav-link">👤 Profil</a>` : ''}
        <a href="#products-section" class="site-nav-link active">Produits</a>
    </div>
</nav>
<div class="container" id="products-section">
<div class="header">
<h1>${this._esc(storeInfo.storeName || 'Boutique')}</h1>
<p>${this._esc(storeInfo.storeDescription || 'Decouvrez nos produits')}</p></div>
${categories.length ? `<div class="categories"><button class="cat-btn active" onclick="filter('')">Tous</button>${categories.map(c => `<button class="cat-btn" onclick="filter('${this._esc(c.id)}')">${this._esc(c.name)}</button>`).join('')}</div>` : ''}
<div class="products-grid" id="products">
${items.length ? items.map(p => {
    const img = p.thumbnail || (Array.isArray(p.images) ? p.images[0] : '') || '/placeholder.png';
    return `<div class="product-card" onclick="window.location='/product/${p.id}'">
<img src="${img}" alt="${this._esc(p.name)}" loading="lazy">
<div class="card-body"><h3>${this._esc(p.name)}</h3>
<div><span class="card-price">${Number(p.price).toLocaleString()} ${p.currency||'XOF'}</span>
${p.comparePrice > p.price ? `<span class="card-old">${Number(p.comparePrice).toLocaleString()}</span>` : ''}</div></div></div>`;
}).join('') : `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg><p>Aucun produit pour le moment</p></div>`}</div>
<div class="pagination" style="text-align:center;padding:32px 0">
${products.pagination?.totalPages > 1 ? Array.from({length: products.pagination.totalPages}, (_, i) => `<button class="cat-btn ${i+1===products.pagination.page?'active':''}" onclick="window.location='?page=${i+1}'">${i+1}</button>`).join('') : ''}
</div>
<footer><a href="${profileUrl || '/'}">${this._esc(storeInfo.storeName || 'Retour au profil')}</a> &middot; Propulse par <strong>Flay</strong></footer>
</div>
<script>function filter(c){window.location='?category='+c}</script>
</body></html>`;
    }

    generateCartPage(userId) {
        const cart = this.getCart(userId);
        return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Panier | Flay</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a1a;--card:#12121f;--text:#e2e8f0;--muted:#64748b;--primary:#818cf8;--border:#1e293b}
body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.container{max-width:800px;margin:0 auto;padding:20px}
h1{font-size:28px;margin-bottom:24px}
.cart-item{display:flex;gap:16px;align-items:center;background:var(--card);padding:16px;border-radius:16px;margin-bottom:12px}
.cart-item img{width:80px;height:80px;object-fit:cover;border-radius:8px}
.item-info{flex:1}
.item-info h3{font-size:16px;margin-bottom:4px}
.item-price{color:var(--primary);font-weight:600}
.qty-controls{display:flex;align-items:center;gap:8px;margin-top:8px}
.qty-btn{width:32px;height:32px;border:1px solid var(--border);border-radius:8px;background:transparent;color:var(--text);cursor:pointer;font-size:16px}
.qty-btn:hover{background:var(--primary);border-color:var(--primary)}
.qty-val{font-size:16px;min-width:24px;text-align:center}
.remove{color:#ef4444;cursor:pointer;font-size:14px}
.summary{background:var(--card);border-radius:16px;padding:24px;margin-top:24px}
.summary-row{display:flex;justify-content:space-between;margin-bottom:12px}
.total{font-size:24px;font-weight:700;color:var(--primary)}
.checkout-btn{display:block;width:100%;padding:16px;background:var(--primary);color:#fff;border:none;border-radius:12px;font-size:18px;cursor:pointer;text-align:center;text-decoration:none;margin-top:16px}
.checkout-btn:hover{opacity:.9}
.empty{text-align:center;padding:60px 20px;color:var(--muted)}
</style></head>
<body><div class="container">
<h1>🛒 Mon Panier</h1>
${cart.items.length ? `
<div id="cart-items">${cart.items.map((item,i) => `
<div class="cart-item">
<img src="${item.image||'/placeholder.png'}" alt="${this._esc(item.name)}">
<div class="item-info"><h3>${this._esc(item.name)}</h3>
<div class="item-price">${Number(item.price).toLocaleString()} ${cart.currency}</div>
<div class="qty-controls">
<button class="qty-btn" onclick="updateQty(${i},${item.quantity-1})">−</button>
<span class="qty-val">${item.quantity}</span>
<button class="qty-btn" onclick="updateQty(${i},${item.quantity+1})">+</button>
</div></div>
<span class="remove" onclick="removeItem(${i})">Supprimer</span>
</div>`).join('')}</div>
<div class="summary">
<div class="summary-row"><span>Sous-total</span><span>${Number(cart.total).toLocaleString()} ${cart.currency}</span></div>
<div class="summary-row total"><span>Total</span><span>${Number(cart.total).toLocaleString()} ${cart.currency}</span></div>
<a href="/checkout.html" class="checkout-btn" onclick="return saveCart()">Commander</a>
</div>` : `<div class="empty"><p>Votre panier est vide</p><a href="/store" style="color:var(--primary);margin-top:12px;display:inline-block">Decouvrir la boutique</a></div>`}
</div>
<script>
async function updateQty(idx,qty){if(qty<1)return;const t=localStorage.getItem('flay_token');if(!t)return;
const r=await fetch('/api/cart/item',{method:'PUT',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},body:JSON.stringify({productId:'${cart.items.length?cart.items[0].productId:''}',quantity:qty})});
if(r.ok)location.reload()}
async function removeItem(idx){const t=localStorage.getItem('flay_token');if(!t)return;location.reload()}
async function saveCart(){return true}
</script></body></html>`;
    }
}

module.exports = new ECommerce();
