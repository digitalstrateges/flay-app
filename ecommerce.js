/**
 * Flay v4.0 - E-Commerce Module
 * Produits, Panier, Commandes, Stocks, Coupons
 */

const crypto = require('crypto');

class ECommerce {
    constructor() {
        this.products = new Map();
        this.carts = new Map();
        this.orders = new Map();
        this.coupons = new Map();
        this.reviews = new Map();
    }

    // === PRODUCTS ===
    createProduct(userId, data) {
        const config = require('./config');
        const plan = config.PLANS[require('./data').users.get(userId)?.plan || 'free'];
        
        // Check product limit
        if (plan.limits.products !== -1) {
            const count = this.getUserProducts(userId).length;
            if (count >= plan.limits.products) {
                return { error: `Limite de ${plan.limits.products} produits atteinte. Passez au plan superieur.` };
            }
        }

        const product = {
            id: `prod_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            userId,
            name: data.name || '',
            description: data.description || '',
            shortDescription: data.shortDescription || '',
            price: data.price || 0,
            comparePrice: data.comparePrice || 0,
            currency: data.currency || 'XOF',
            category: data.category || '',
            images: data.images || [],
            thumbnail: data.thumbnail || '',
            sku: data.sku || '',
            stock: data.stock || 0,
            trackInventory: data.trackInventory !== false,
            allowBackorder: data.allowBackorder || false,
            weight: data.weight || 0,
            dimensions: data.dimensions || {},
            tags: data.tags || [],
            status: data.status || 'active', // active, draft, archived
            featured: data.featured || false,
            variants: data.variants || [],
            options: data.options || [],
            seo: {
                title: data.seoTitle || data.name,
                description: data.seoDescription || data.description?.substring(0, 160),
                slug: this.slugify(data.name)
            },
            stats: {
                views: 0,
                sales: 0,
                revenue: 0,
                rating: 0,
                reviewCount: 0
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.products.set(product.id, product);
        return product;
    }

    getProduct(productId) {
        return this.products.get(productId) || null;
    }

    getUserProducts(userId, filter = {}) {
        let products = [];
        for (const [, p] of this.products) {
            if (p.userId === userId) {
                if (filter.status && p.status !== filter.status) continue;
                if (filter.category && p.category !== filter.category) continue;
                products.push(p);
            }
        }
        return products;
    }

    getPublicProducts(userId, page = 1, perPage = 20) {
        const products = this.getUserProducts(userId, { status: 'active' });
        const total = products.length;
        const start = (page - 1) * perPage;
        const items = products.slice(start, start + perPage);
        
        return {
            items,
            pagination: {
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage)
            }
        };
    }

    updateProduct(productId, userId, data) {
        const product = this.products.get(productId);
        if (!product || product.userId !== userId) return null;
        
        const allowed = ['name', 'description', 'shortDescription', 'price', 'comparePrice', 
                         'category', 'images', 'thumbnail', 'sku', 'stock', 'trackInventory',
                         'allowBackorder', 'weight', 'dimensions', 'tags', 'status', 'featured',
                         'variants', 'options', 'seo'];
        
        for (const key of allowed) {
            if (data[key] !== undefined) product[key] = data[key];
        }
        
        if (data.name && !data.seo?.slug) {
            product.seo.slug = this.slugify(data.name);
        }
        
        product.updatedAt = new Date().toISOString();
        return product;
    }

    deleteProduct(productId, userId) {
        const product = this.products.get(productId);
        if (!product || product.userId !== userId) return false;
        this.products.delete(productId);
        return true;
    }

    // === CART ===
    getCart(userId) {
        return this.carts.get(userId) || { items: [], total: 0, currency: 'XOF' };
    }

    addToCart(userId, productId, quantity = 1, variant = null) {
        const product = this.products.get(productId);
        if (!product || product.status !== 'active') return { error: 'Produit non disponible' };
        
        // Check stock
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
                productId,
                name: product.name,
                price: product.price,
                image: product.thumbnail || product.images[0] || '',
                quantity,
                variant,
                maxQuantity: product.trackInventory ? product.stock : 999
            });
        }

        cart.total = cart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        cart.currency = product.currency;
        cart.updatedAt = new Date().toISOString();
        this.carts.set(userId, cart);
        return cart;
    }

    updateCartItem(userId, productId, quantity, variant = null) {
        const cart = this.getCart(userId);
        const itemIndex = cart.items.findIndex(i => 
            i.productId === productId && JSON.stringify(i.variant) === JSON.stringify(variant)
        );

        if (itemIndex < 0) return { error: 'Article non trouve' };

        if (quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = quantity;
        }

        cart.total = cart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        cart.updatedAt = new Date().toISOString();
        this.carts.set(userId, cart);
        return cart;
    }

    removeFromCart(userId, productId, variant = null) {
        return this.updateCartItem(userId, productId, 0, variant);
    }

    clearCart(userId) {
        this.carts.delete(userId);
        return { items: [], total: 0 };
    }

    // === ORDERS ===
    createOrder(userId, data) {
        const cart = this.getCart(userId);
        if (!cart.items.length) return { error: 'Panier vide' };

        const config = require('./config');
        const taxRate = config.ECOMMERCE.taxRate;
        const subtotal = cart.total;
        const tax = Math.round(subtotal * taxRate);
        const shipping = data.shippingMethod === 'express' ? 5000 : 
                        (subtotal >= config.ECOMMERCE.freeShippingThreshold ? 0 : 2000);
        const discount = data.couponCode ? this.applyCoupon(data.couponCode, subtotal) : 0;
        const total = subtotal + tax + shipping - discount;

        const order = {
            id: `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            userId,
            items: cart.items.map(item => ({
                ...item,
                subtotal: item.price * item.quantity
            })),
            subtotal,
            tax,
            taxRate,
            shipping,
            shippingMethod: data.shippingMethod || 'standard',
            discount,
            couponCode: data.couponCode || null,
            total,
            currency: cart.currency,
            status: 'pending',
            payment: {
                method: data.paymentMethod || 'wave',
                status: 'pending',
                waveRef: null,
                transactionId: null
            },
            shippingAddress: data.shippingAddress || {},
            billingAddress: data.billingAddress || {},
            notes: data.notes || '',
            customerNote: data.customerNote || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.orders.set(order.id, order);
        
        // Update product stock
        for (const item of cart.items) {
            const product = this.products.get(item.productId);
            if (product && product.trackInventory) {
                product.stock = Math.max(0, product.stock - item.quantity);
                product.stats.sales += item.quantity;
                product.stats.revenue += item.subtotal;
            }
        }

        // Clear cart
        this.clearCart(userId);

        return order;
    }

    getOrder(orderId) {
        return this.orders.get(orderId) || null;
    }

    getUserOrders(userId, page = 1, perPage = 20) {
        let orders = [];
        for (const [, o] of this.orders) {
            if (o.userId === userId) orders.push(o);
        }
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const total = orders.length;
        const start = (page - 1) * perPage;
        return {
            items: orders.slice(start, start + perPage),
            pagination: { total, page, perPage, totalPages: Math.ceil(total / perPage) }
        };
    }

    updateOrderStatus(orderId, userId, status) {
        const order = this.orders.get(orderId);
        if (!order || order.userId !== userId) return null;
        
        const validStatuses = require('./config').ECOMMERCE.orderStatuses;
        if (!validStatuses.includes(status)) return { error: 'Statut invalide' };
        
        order.status = status;
        order.updatedAt = new Date().toISOString();
        
        if (status === 'delivered') {
            order.deliveredAt = new Date().toISOString();
        }
        
        return order;
    }

    // === COUPONS ===
    createCoupon(userId, data) {
        const coupon = {
            id: `coupon_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            userId,
            code: data.code.toUpperCase(),
            type: data.type || 'percentage', // percentage, fixed
            value: data.value || 10,
            minPurchase: data.minPurchase || 0,
            maxUses: data.maxUses || -1,
            usedCount: 0,
            validFrom: data.validFrom || new Date().toISOString(),
            validUntil: data.validUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            active: true,
            createdAt: new Date().toISOString()
        };

        this.coupons.set(coupon.id, coupon);
        return coupon;
    }

    applyCoupon(code, subtotal) {
        for (const [, coupon] of this.coupons) {
            if (coupon.code === code && coupon.active) {
                if (subtotal < coupon.minPurchase) continue;
                if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) continue;
                
                coupon.usedCount++;
                return coupon.type === 'percentage' 
                    ? Math.round(subtotal * coupon.value / 100)
                    : coupon.value;
            }
        }
        return 0;
    }

    // === REVIEWS ===
    addReview(productId, userId, data) {
        const review = {
            id: `rev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            productId,
            userId,
            rating: Math.min(5, Math.max(1, data.rating || 5)),
            title: data.title || '',
            comment: data.comment || '',
            createdAt: new Date().toISOString()
        };

        this.reviews.set(review.id, review);
        
        // Update product rating
        const product = this.products.get(productId);
        if (product) {
            const allReviews = this.getProductReviews(productId);
            product.stats.reviewCount = allReviews.length;
            product.stats.rating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        }

        return review;
    }

    getProductReviews(productId) {
        const reviews = [];
        for (const [, r] of this.reviews) {
            if (r.productId === productId) reviews.push(r);
        }
        return reviews;
    }

    // === STATS ===
    getStoreStats(userId) {
        const products = this.getUserProducts(userId);
        const orders = [];
        for (const [, o] of this.orders) {
            if (o.userId === userId) orders.push(o);
        }

        const totalRevenue = orders
            .filter(o => ['confirmed', 'processing', 'shipped', 'delivered'].includes(o.status))
            .reduce((sum, o) => sum + o.total, 0);

        return {
            totalProducts: products.length,
            activeProducts: products.filter(p => p.status === 'active').length,
            totalOrders: orders.length,
            pendingOrders: orders.filter(o => o.status === 'pending').length,
            totalRevenue,
            averageOrderValue: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
            topProducts: products
                .sort((a, b) => b.stats.sales - a.stats.sales)
                .slice(0, 5)
                .map(p => ({ id: p.id, name: p.name, sales: p.stats.sales, revenue: p.stats.revenue }))
        };
    }

    // === HELPERS ===
    slugify(text) {
        return text.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    generateProductPage(product, storeInfo = {}) {
        const config = require('./config');
        const currency = product.currency || 'XOF';
        
        return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${product.name} | ${storeInfo.storeName || 'Boutique'}</title>
    <meta name="description" content="${(product.description || '').substring(0, 160)}">
    <link rel="stylesheet" href="/styles.css">
</head>
<body class="dark">
    <div class="product-page" style="max-width: 1200px; margin: 0 auto; padding: 20px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
            <div class="product-images">
                <div class="main-image" style="background: var(--card); border-radius: 16px; overflow: hidden; aspect-ratio: 1;">
                    <img src="${product.thumbnail || product.images[0] || '/placeholder.png'}" 
                         alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                ${product.images.length > 1 ? `
                <div class="thumbnails" style="display: flex; gap: 8px; margin-top: 12px;">
                    ${product.images.map(img => `
                        <img src="${img}" alt="" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; cursor: pointer;">
                    `).join('')}
                </div>` : ''}
            </div>
            
            <div class="product-info">
                <h1 style="font-size: 28px; margin-bottom: 8px;">${product.name}</h1>
                
                <div class="rating" style="margin-bottom: 16px;">
                    ${'★'.repeat(Math.round(product.stats.rating))}${'☆'.repeat(5 - Math.round(product.stats.rating))}
                    <span style="color: var(--muted); margin-left: 8px;">(${product.stats.reviewCount} avis)</span>
                </div>
                
                <div class="price" style="margin-bottom: 20px;">
                    <span style="font-size: 32px; font-weight: 800; color: var(--primary);">
                        ${product.price.toLocaleString()} ${currency}
                    </span>
                    ${product.comparePrice > product.price ? `
                        <span style="font-size: 18px; color: var(--muted); text-decoration: line-through; margin-left: 12px;">
                            ${product.comparePrice.toLocaleString()} ${currency}
                        </span>
                        <span style="background: #ef444420; color: #ef4444; padding: 4px 8px; border-radius: 6px; font-size: 12px; margin-left: 8px;">
                            -${Math.round((1 - product.price / product.comparePrice) * 100)}%
                        </span>
                    ` : ''}
                </div>
                
                <p style="color: var(--muted); margin-bottom: 24px; line-height: 1.6;">
                    ${product.description || product.shortDescription || ''}
                </p>
                
                ${product.trackInventory ? `
                <div class="stock" style="margin-bottom: 16px;">
                    ${product.stock > 0 
                        ? `<span style="color: #10b981;">✓ En stock (${product.stock} disponible${product.stock > 1 ? 's' : ''})</span>`
                        : `<span style="color: #ef4444;">✗ Rupture de stock</span>`
                    }
                </div>` : ''}
                
                <div class="actions" style="display: flex; gap: 12px; margin-bottom: 24px;">
                    <input type="number" value="1" min="1" max="${product.stock || 99}" 
                           id="quantity" style="width: 80px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); font-size: 16px;">
                    <button onclick="addToCart('${product.id}')" 
                            class="btn btn-primary" style="flex: 1; padding: 14px; font-size: 16px;"
                            ${product.trackInventory && product.stock <= 0 ? 'disabled' : ''}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                        </svg>
                        Ajouter au panier
                    </button>
                </div>
                
                ${product.tags.length ? `
                <div class="tags" style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${product.tags.map(tag => `
                        <span style="padding: 4px 12px; background: rgba(255,255,255,.05); border-radius: 20px; font-size: 12px;">
                            ${tag}
                        </span>
                    `).join('')}
                </div>` : ''}
            </div>
        </div>
    </div>
    
    <script>
        async function addToCart(productId) {
            const quantity = parseInt(document.getElementById('quantity').value) || 1;
            const token = localStorage.getItem('flay_token');
            if (!token) { window.location.href = '/login.html'; return; }
            
            const res = await fetch('/api/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ productId, quantity })
            });
            
            if (res.ok) {
                alert('Ajoute au panier !');
            } else {
                const data = await res.json();
                alert(data.error || 'Erreur');
            }
        }
    </script>
</body>
</html>`;
    }
}

module.exports = new ECommerce();
