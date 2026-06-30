const express = require('express');
const { authenticate } = require('../lib/auth');
const ecommerce = require('../ecommerce');
const market = require('../market-intelligence');
const marketplace = require('../marketplace');
const db = require('../db');
const router = express.Router();

// === CATEGORIES ===
router.post('/categories', authenticate, (req, res) => {
    const cat = ecommerce.createCategory(req.user.id, req.body);
    res.status(201).json({ category: cat });
});

router.get('/categories', authenticate, (req, res) => {
    res.json({ categories: ecommerce.getUserCategories(req.user.id) });
});

router.put('/categories/:id', authenticate, (req, res) => {
    const cat = ecommerce.updateCategory(req.params.id, req.user.id, req.body);
    if (!cat) return res.status(404).json({ error: 'Categorie non trouvee' });
    res.json({ category: cat });
});

router.delete('/categories/:id', authenticate, (req, res) => {
    if (!ecommerce.deleteCategory(req.params.id, req.user.id)) return res.status(404).json({ error: 'Categorie non trouvee' });
    res.json({ message: 'Categorie supprimee' });
});

// --- Public categories ---
router.get('/categories/:userId/public', (req, res) => {
    const user = db.get('users', req.params.userId);
    if (!user) return res.status(404).json({ error: 'Non trouve' });
    res.json({ categories: ecommerce.getActiveCategories(req.params.userId) });
});

// === MY PRODUCTS (dashboard) ===
router.get('/my-products', authenticate, (req, res) => {
    const result = ecommerce.getUserProducts(req.user.id, {});
    res.json({ products: result.products || result || [] });
});

// === PRODUCTS ===
router.get('/products/:userId', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const filters = {};
    if (req.query.category) filters.category = req.query.category;
    if (req.query.search) filters.search = req.query.search;
    if (req.query.featured) filters.featured = true;
    if (req.query.sort) filters.sort = req.query.sort;
    const result = ecommerce.getPublicProducts(req.params.userId, page, 20, filters);
    const user = db.get('users', req.params.userId);
    result.storeName = user?.name || 'Boutique';
    result.storeDescription = user?.bio || '';
    const profile = db.findBy('profiles', 'userId', req.params.userId);
    if (profile) {
        result.storeDescription = profile.bio || result.storeDescription;
        const ld = typeof profile.locationData === 'string' ? JSON.parse(profile.locationData) : profile.locationData;
        if (ld && ld.lat && ld.lng) {
            result.profileLocation = { lat: ld.lat, lng: ld.lng, address: ld.address || profile.location || '' };
        } else if (profile.geoLocation) {
            const gl = typeof profile.geoLocation === 'string' ? JSON.parse(profile.geoLocation) : profile.geoLocation;
            if (gl && (gl.latitude || gl.coordinates?.lat)) {
                result.profileLocation = {
                    lat: gl.latitude || gl.coordinates?.lat,
                    lng: gl.longitude || gl.coordinates?.lng,
                    address: gl.address || profile.location || ''
                };
            }
        }
    }
    res.json(result);
});

router.get('/products/:userId/:productId', (req, res) => {
    const product = ecommerce.getProduct(req.params.productId);
    if (!product || product.userId !== req.params.userId) return res.status(404).json({ error: 'Produit non trouve' });
    const stats = typeof product.stats === 'string' ? JSON.parse(product.stats) : (product.stats || {});
    stats.views = (stats.views || 0) + 1;
    db.update('products', product.id, { stats: JSON.stringify(stats) });
    res.json({ product });
});

router.post('/products', authenticate, (req, res) => {
    const premiumFeatures = require('../premium-features');
    const userProducts = db.findAll('products', 'userId', req.user.id) || [];
    const check = premiumFeatures.checkLimit(req.user.id, 'products', userProducts.length);
    if (!check.allowed) return res.status(403).json({ error: check.reason, code: 'PLAN_LIMIT', limit: check.limit, current: check.current });
    const product = ecommerce.createProduct(req.user.id, req.body);
    if (product.error) return res.status(400).json({ error: product.error });
    res.status(201).json({ product });
});

router.put('/products/:id', authenticate, (req, res) => {
    const product = ecommerce.updateProduct(req.params.id, req.user.id, req.body);
    if (!product) return res.status(404).json({ error: 'Produit non trouve' });
    res.json({ product });
});

router.delete('/products/:id', authenticate, (req, res) => {
    if (!ecommerce.deleteProduct(req.params.id, req.user.id)) return res.status(404).json({ error: 'Produit non trouve' });
    res.json({ message: 'Produit supprime' });
});

router.get('/my-products', authenticate, (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    res.json({ products: ecommerce.getUserProducts(req.user.id, filter) });
});

// --- Public product JSON (for SPA) ---
router.get('/products/public/:id', (req, res) => {
    const product = ecommerce.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produit non trouve' });
    const stats = typeof product.stats === 'string' ? JSON.parse(product.stats) : (product.stats || {});
    stats.views = (stats.views || 0) + 1;
    db.update('products', product.id, { stats: JSON.stringify(stats) });
    res.json({ product });
});

// --- Public product page (HTML) ---
router.get('/product/:id', (req, res) => {
    if (req.accepts('html')) {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) return res.redirect('/product.html?pid=' + req.params.id);
        const product = ecommerce.getProduct(req.params.id);
        if (!product) return res.status(404).send('Produit non trouve');
        const user = db.get('users', product.userId);
        const storeInfo = { storeName: user?.name || 'Boutique' };
        const stats = typeof product.stats === 'string' ? JSON.parse(product.stats) : (product.stats || {});
        stats.views = (stats.views || 0) + 1;
        db.update('products', product.id, { stats: JSON.stringify(stats) });
        const html = ecommerce.generateProductPage(product, storeInfo);
        res.send(html);
    } else {
        const product = ecommerce.getProduct(req.params.id);
        if (!product) return res.status(404).json({ error: 'Produit non trouve' });
        res.json({ product });
    }
});

// === RECOMMENDATIONS ===
router.get('/products/recommendations/:productId', (req, res) => {
    const userId = req.query.userId || null;
    const limit = parseInt(req.query.limit) || 6;
    const recommendations = ecommerce.getRecommendations(userId, req.params.productId, limit);
    res.json({ recommendations });
});

router.get('/products/popular/:userId', (req, res) => {
    const limit = parseInt(req.query.limit) || 12;
    const popular = ecommerce.getPopularProducts(req.params.userId, limit);
    res.json({ recommendations: popular });
});

// === STORE STATS ===
router.get('/store/stats', authenticate, (req, res) => {
    res.json(ecommerce.getStoreStats(req.user.id));
});

// --- Public store page (HTML) ---
router.get('/store/:userId', (req, res) => {
    const user = db.get('users', req.params.userId);
    if (!user) return res.status(404).send('Boutique non trouvee');
    const page = parseInt(req.query.page) || 1;
    const filters = {};
    if (req.query.category) filters.category = req.query.category;
    const products = ecommerce.getPublicProducts(req.params.userId, page, 20, filters);
    const categories = ecommerce.getActiveCategories(req.params.userId);
    const storeInfo = { storeName: user.name, storeDescription: '' };
    const profile = db.findBy('profiles', 'userId', req.params.userId);
    if (profile) storeInfo.storeDescription = profile.bio;
    const html = ecommerce.generateStorePage(req.params.userId, products, categories, storeInfo);
    res.send(html);
});

// --- Cart HTML page ---
router.get('/cart/page', authenticate, (req, res) => {
    const html = ecommerce.generateCartPage(req.user.id);
    res.send(html);
});

// === REVIEWS ===
router.post('/products/:id/reviews', authenticate, (req, res) => {
    const product = ecommerce.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produit non trouve' });
    const review = ecommerce.addReview(req.params.id, req.user.id, req.body);
    res.status(201).json({ review });
});

router.get('/products/:id/reviews', (req, res) => {
    res.json({ reviews: ecommerce.getProductReviews(req.params.id) });
});

// === CART ===
router.get('/cart', authenticate, (req, res) => {
    res.json(ecommerce.getCart(req.user.id));
});

router.post('/cart/add', authenticate, (req, res) => {
    const cart = ecommerce.addToCart(req.user.id, req.body.productId, req.body.quantity || 1, req.body.variant);
    if (cart.error) return res.status(400).json({ error: cart.error });
    res.json({ cart });
});

router.put('/cart/item', authenticate, (req, res) => {
    const cart = ecommerce.updateCartItem(req.user.id, req.body.productId, req.body.quantity, req.body.variant);
    if (cart.error) return res.status(400).json({ error: cart.error });
    res.json({ cart });
});

router.delete('/cart/:productId', authenticate, (req, res) => {
    const cart = ecommerce.removeFromCart(req.user.id, req.params.productId, req.query.variant);
    res.json({ cart });
});

router.delete('/cart', authenticate, (req, res) => {
    res.json({ cart: ecommerce.clearCart(req.user.id) });
});

// === ORDERS ===
router.post('/orders', authenticate, (req, res) => {
    const order = ecommerce.createOrder(req.user.id, req.body);
    if (order.error) return res.status(400).json({ error: order.error });
    const config = require('../config');
    const parcel = ecommerce.getOrderParcel(order.id);
    const whatsappMsg = `Bonjour%2C%20je%20viens%20de%20passer%20une%20commande%20%23${order.id.substring(0,12)}%20d%27un%20montant%20de%20${order.total}%20FCFA.%20Merci%20de%20me%20confirmer%20le%20paiement%20Wave.`;
    const whatsappLink = config.WHATSAPP_LINK ? `${config.WHATSAPP_LINK}?text=${whatsappMsg}` : null;
    res.status(201).json({
        order,
        whatsappPaymentLink: whatsappLink,
        trackingNumber: parcel?.trackingNumber || null,
        trackingUrl: parcel ? `/track/${parcel.trackingNumber}` : null
    });
});

router.get('/orders', authenticate, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    res.json(ecommerce.getUserOrders(req.user.id, page));
});

router.get('/orders/:id', authenticate, (req, res) => {
    const order = ecommerce.getOrder(req.params.id);
    if (!order || order.userId !== req.user.id) return res.status(404).json({ error: 'Commande non trouvee' });
    res.json({ order });
});

router.put('/orders/:id/status', authenticate, (req, res) => {
    const order = ecommerce.updateOrderStatus(req.params.id, req.user.id, req.body.status);
    if (!order) return res.status(404).json({ error: 'Commande non trouvee' });
    if (order.error) return res.status(400).json({ error: order.error });
    res.json({ order });
});

router.put('/orders/:id/delivery', authenticate, (req, res) => {
    const order = ecommerce.updateDeliveryStatus(req.params.id, req.user.id, req.body.status);
    if (!order) return res.status(404).json({ error: 'Commande non trouvee' });
    res.json({ order });
});

// === COUPONS ===
router.post('/coupons', authenticate, (req, res) => {
    const coupon = ecommerce.createCoupon(req.user.id, req.body);
    res.status(201).json({ coupon });
});

router.get('/coupons', authenticate, (req, res) => {
    res.json({ coupons: ecommerce.getUserCoupons(req.user.id) });
});

router.delete('/coupons/:id', authenticate, (req, res) => {
    if (!ecommerce.deleteCoupon(req.params.id, req.user.id)) return res.status(404).json({ error: 'Coupon non trouve' });
    res.json({ message: 'Coupon supprime' });
});

// === PARCEL TRACKING ===
router.post('/parcels', authenticate, (req, res) => {
    const parcel = ecommerce.createParcel(req.user.id, req.body.orderId);
    if (parcel.error) return res.status(400).json({ error: parcel.error });
    res.status(201).json({ parcel });
});

router.get('/parcels', authenticate, (req, res) => {
    res.json({ parcels: ecommerce.getUserParcels(req.user.id) });
});

router.get('/parcels/:id', authenticate, (req, res) => {
    const parcel = ecommerce.getParcel(req.params.id);
    if (!parcel || parcel.userId !== req.user.id) return res.status(404).json({ error: 'Colis non trouve' });
    res.json({ parcel });
});

router.put('/parcels/:id/status', authenticate, (req, res) => {
    const result = ecommerce.updateParcelStatus(req.params.id, req.user.id, req.body.status, req.body.note);
    if (!result) return res.status(404).json({ error: 'Colis non trouve' });
    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ parcel: result });
});

// Public tracking lookup
router.get('/track/:trackingNumber', (req, res) => {
    const parcel = ecommerce.getParcelByTracking(req.params.trackingNumber);
    if (!parcel) return res.status(404).json({ error: 'Colis non trouve' });
    const order = db.get('orders', parcel.orderId);
    res.json({ parcel, order: order ? { id: order.id, status: order.status, total: order.total } : null });
});

// === MARKET INTELLIGENCE ===
const marketAuth = [authenticate];

router.get('/market/sales', ...marketAuth, (req, res) => {
    const period = req.query.period || '30d';
    res.json(market.getSalesAnalytics(req.user.id, period));
});

router.get('/market/products', ...marketAuth, (req, res) => {
    const period = req.query.period || '30d';
    res.json(market.getProductAnalytics(req.user.id, period));
});

router.get('/market/customers', ...marketAuth, (req, res) => {
    res.json(market.getCustomerInsights(req.user.id));
});

router.get('/market/trends', ...marketAuth, (req, res) => {
    res.json(market.getTrends(req.user.id));
});

router.get('/market/report', ...marketAuth, (req, res) => {
    res.json(market.generateReport(req.user.id));
});

// === MARKETPLACE & REFERRALS ===
router.get('/vendors', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    res.json(marketplace.getVendors(page));
});

router.get('/referral/code', authenticate, (req, res) => {
    let ref = marketplace.getReferralCode(req.user.id);
    if (!ref) ref = marketplace.generateReferralCode(req.user.id);
    res.json({ referral: marketplace.getReferralStats(req.user.id) });
});

router.post('/referral/generate', authenticate, (req, res) => {
    const ref = marketplace.generateReferralCode(req.user.id);
    res.json({ referral: ref });
});

router.post('/referral/track', (req, res) => {
    const result = marketplace.trackReferral(req.body.code, req.body.userId);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ conversion: result });
});

router.get('/referral/stats', authenticate, (req, res) => {
    res.json(marketplace.getReferralStats(req.user.id));
});

// === WISHLIST ===
router.get('/wishlist', authenticate, (req, res) => {
    const items = db.findAll('wishlist', 'userId', req.user.id) || [];
    const products = items.map(item => {
        const product = db.get('products', item.productId);
        return product ? { ...product, wishlistId: item.id, addedAt: item.createdAt } : null;
    }).filter(Boolean);
    res.json({ items: products, count: products.length });
});

router.post('/wishlist/:productId', authenticate, (req, res) => {
    const premiumFeatures = require('../premium-features');
    if (!premiumFeatures.hasFeature(req.user.id, 'wishlist')) {
        return res.status(403).json({ error: 'Wishlist requires Premium plan', code: 'PLAN_REQUIRED' });
    }
    const existing = db.queryOne('SELECT * FROM wishlist WHERE userId = ? AND productId = ?', [req.user.id, req.params.productId]);
    if (existing) return res.status(400).json({ error: 'Already in wishlist' });
    const product = db.get('products', req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const item = db.insert('wishlist', {
        userId: req.user.id,
        productId: req.params.productId
    });
    res.status(201).json({ item, message: 'Added to wishlist' });
});

router.delete('/wishlist/:productId', authenticate, (req, res) => {
    const items = db.findAll('wishlist', 'userId', req.user.id) || [];
    const item = items.find(i => i.productId === req.params.productId);
    if (!item) return res.status(404).json({ error: 'Not in wishlist' });
    db.delete('wishlist', item.id);
    res.json({ message: 'Removed from wishlist' });
});

module.exports = router;
