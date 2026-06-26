const express = require('express');
const { authenticate } = require('../lib/auth');
const ecommerce = require('../ecommerce');
const db = require('../db');
const router = express.Router();

// --- Products ---
router.get('/products/:userId', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    res.json(ecommerce.getPublicProducts(req.params.userId, page));
});

router.get('/products/:userId/:productId', (req, res) => {
    const product = ecommerce.getProduct(req.params.productId);
    if (!product || product.userId !== req.params.userId) return res.status(404).json({ error: 'Product not found' });
    product.stats.views++;
    res.json({ product });
});

router.post('/products', authenticate, (req, res) => {
    const product = ecommerce.createProduct(req.user.id, req.body);
    if (product.error) return res.status(400).json({ error: product.error });
    res.status(201).json({ product });
});

router.put('/products/:id', authenticate, (req, res) => {
    const product = ecommerce.updateProduct(req.params.id, req.user.id, req.body);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
});

router.delete('/products/:id', authenticate, (req, res) => {
    if (!ecommerce.deleteProduct(req.params.id, req.user.id)) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Produit supprime' });
});

router.get('/my-products', authenticate, (req, res) => {
    res.json({ products: ecommerce.getUserProducts(req.user.id) });
});

// --- Reviews ---
router.post('/products/:id/reviews', authenticate, (req, res) => {
    const review = ecommerce.addReview(req.params.id, req.user.id, req.body);
    res.status(201).json({ review });
});

router.get('/products/:id/reviews', (req, res) => {
    res.json({ reviews: ecommerce.getProductReviews(req.params.id) });
});

// --- Cart ---
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
    const cart = ecommerce.removeFromCart(req.user.id, req.params.productId);
    res.json({ cart });
});

router.delete('/cart', authenticate, (req, res) => {
    res.json({ cart: ecommerce.clearCart(req.user.id) });
});

// --- Orders ---
router.post('/orders', authenticate, (req, res) => {
    const order = ecommerce.createOrder(req.user.id, req.body);
    if (order.error) return res.status(400).json({ error: order.error });
    res.status(201).json({ order });
});

router.get('/orders', authenticate, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    res.json(ecommerce.getUserOrders(req.user.id, page));
});

router.get('/orders/:id', authenticate, (req, res) => {
    const order = ecommerce.getOrder(req.params.id);
    if (!order || order.userId !== req.user.id) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
});

router.put('/orders/:id/status', authenticate, (req, res) => {
    const order = ecommerce.updateOrderStatus(req.params.id, req.user.id, req.body.status);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.error) return res.status(400).json({ error: order.error });
    res.json({ order });
});

// --- Coupons ---
router.post('/coupons', authenticate, (req, res) => {
    const coupon = ecommerce.createCoupon(req.user.id, req.body);
    res.status(201).json({ coupon });
});

// --- Store Stats ---
router.get('/store/stats', authenticate, (req, res) => {
    res.json(ecommerce.getStoreStats(req.user.id));
});

module.exports = router;
