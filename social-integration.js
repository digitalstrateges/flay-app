/**
 * Flay Omni - Social Media Integration
 * Partage, publication, conversion, analytics - reseaux sociaux
 */

const crypto = require('crypto');

class SocialIntegration {
    constructor() {
        this.platforms = this._initPlatforms();
        this.conversions = new Map();
        this.posts = new Map();
        this.shares = new Map();
        this.campaigns = new Map();
    }

    _initPlatforms() {
        return {
            whatsapp: {
                id: 'whatsapp',
                name: 'WhatsApp',
                icon: '💬',
                color: '#25D366',
                shareUrl: 'https://wa.me/{phone}?text={text}',
                shareUrlEncoded: 'https://api.whatsapp.com/send?text={text}',
                features: ['share', 'message', 'business'],
                businessApi: true,
                metrics: ['clicks', 'shares', 'messages']
            },
            facebook: {
                id: 'facebook',
                name: 'Facebook',
                icon: '📘',
                color: '#1877F2',
                shareUrl: 'https://www.facebook.com/sharer/sharer.php?u={url}',
                postUrl: 'https://www.facebook.com/sharer/sharer.php?u={url}&quote={text}',
                features: ['share', 'post', 'ads', 'pixel', 'messenger'],
                businessApi: true,
                metrics: ['shares', 'likes', 'comments', 'reach', 'impressions']
            },
            instagram: {
                id: 'instagram',
                name: 'Instagram',
                icon: '📸',
                color: '#E4405F',
                shareUrl: 'https://www.instagram.com/',
                features: ['post', 'story', 'reels', 'shop'],
                businessApi: true,
                metrics: ['likes', 'comments', 'saves', 'reach', 'impressions', 'engagement']
            },
            twitter: {
                id: 'twitter',
                name: 'Twitter/X',
                icon: '🐦',
                color: '#1DA1F2',
                shareUrl: 'https://twitter.com/intent/tweet?url={url}&text={text}',
                features: ['share', 'post', 'spaces'],
                metrics: ['tweets', 'retweets', 'likes', 'impressions', 'clicks']
            },
            linkedin: {
                id: 'linkedin',
                name: 'LinkedIn',
                icon: '💼',
                color: '#0A66C2',
                shareUrl: 'https://www.linkedin.com/sharing/share-offsite/?url={url}',
                features: ['share', 'post', 'company-page'],
                businessApi: true,
                metrics: ['shares', 'likes', 'comments', 'impressions']
            },
            youtube: {
                id: 'youtube',
                name: 'YouTube',
                icon: '🎬',
                color: '#FF0000',
                features: ['video', 'shorts', 'live'],
                businessApi: true,
                metrics: ['views', 'likes', 'comments', 'subscribers']
            },
            tiktok: {
                id: 'tiktok',
                name: 'TikTok',
                icon: '🎵',
                color: '#000000',
                features: ['video', 'live', 'shop'],
                metrics: ['views', 'likes', 'comments', 'shares']
            },
            telegram: {
                id: 'telegram',
                name: 'Telegram',
                icon: '✈️',
                color: '#0088CC',
                shareUrl: 'https://t.me/share/url?url={url}&text={text}',
                features: ['share', 'channel', 'bot'],
                metrics: ['shares', 'views', 'clicks']
            },
            snapchat: {
                id: 'snapchat',
                name: 'Snapchat',
                icon: '👻',
                color: '#FFFC00',
                features: ['snap', 'spotlight'],
                metrics: ['views', 'screenshot']
            },
            pinterest: {
                id: 'pinterest',
                name: 'Pinterest',
                icon: '📌',
                color: '#BD081C',
                shareUrl: 'https://pinterest.com/pin/create/button/?url={url}&description={text}',
                features: ['pin', 'board', 'shop'],
                metrics: ['pins', 'saves', 'clicks']
            }
        };
    }

    // Generate share URLs
    generateShareUrl(platformId, { url, text, phone, hashtags, image }) {
        const platform = this.platforms[platformId];
        if (!platform) return null;

        const encodedUrl = encodeURIComponent(url || '');
        const encodedText = encodeURIComponent(text || '');
        const hashtagStr = hashtags ? hashtags.map(h => `#${h}`).join(' ') : '';

        let shareUrl = platform.shareUrl || '';

        switch (platformId) {
            case 'whatsapp':
                shareUrl = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
                if (phone) shareUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodedText}%20${encodedUrl}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
                if (image) shareUrl += `&picture=${encodeURIComponent(image)}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
                if (hashtagStr) shareUrl += `&hashtags=${encodeURIComponent(hashtagStr.replace(/#/g, ''))}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
                break;
            case 'pinterest':
                shareUrl = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedText}`;
                if (image) shareUrl += `&media=${encodeURIComponent(image)}`;
                break;
            case 'snapchat':
                shareUrl = `https://www.snapchat.com/scan?attachmentUrl=${encodedUrl}`;
                break;
            default:
                shareUrl = platform.shareUrl?.replace('{url}', encodedUrl).replace('{text}', encodedText) || url;
        }

        return shareUrl;
    }

    // Generate all share buttons for a URL
    generateShareButtons(url, text, options = {}) {
        const { hashtags = [], image, phone, platforms: selectedPlatforms } = options;
        const targetPlatforms = selectedPlatforms || Object.keys(this.platforms);

        return targetPlatforms.map(platformId => {
            const platform = this.platforms[platformId];
            if (!platform) return null;

            const shareUrl = this.generateShareUrl(platformId, { url, text, phone, hashtags, image });
            if (!shareUrl) return null;

            return {
                id: platformId,
                name: platform.name,
                icon: platform.icon,
                color: platform.color,
                shareUrl,
                windowFeatures: 'width=600,height=400,scrollbars=yes'
            };
        }).filter(Boolean);
    }

    // Track share event
    trackShare(userId, platformId, url, metadata = {}) {
        const shareId = `share_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const share = {
            id: shareId,
            userId,
            platform: platformId,
            url,
            metadata,
            createdAt: new Date().toISOString()
        };

        this.shares.set(shareId, share);
        return share;
    }

    // Track conversion (click from social to profile)
    trackConversion(userId, platformId, source, metadata = {}) {
        const conversionId = `conv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const conversion = {
            id: conversionId,
            userId,
            platform: platformId,
            source,
            metadata,
            createdAt: new Date().toISOString(),
            status: 'clicked'
        };

        this.conversions.set(conversionId, conversion);
        return conversion;
    }

    // Create campaign
    createCampaign(userId, data) {
        const campaignId = `camp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const campaign = {
            id: campaignId,
            userId,
            name: data.name,
            platforms: data.platforms || ['facebook', 'instagram'],
            budget: data.budget || 0,
            startDate: data.startDate || new Date().toISOString(),
            endDate: data.endDate,
            status: 'active',
            metrics: {
                impressions: 0,
                clicks: 0,
                shares: 0,
                conversions: 0,
                cost: 0
            },
            createdAt: new Date().toISOString()
        };

        this.campaigns.set(campaignId, campaign);
        return campaign;
    }

    // Update campaign metrics
    updateCampaignMetrics(campaignId, metrics) {
        const campaign = this.campaigns.get(campaignId);
        if (!campaign) return null;

        Object.assign(campaign.metrics, metrics);
        this.campaigns.set(campaignId, campaign);
        return campaign;
    }

    // Get social analytics
    getAnalytics(userId, days = 30) {
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const allShares = Array.from(this.shares.values()).filter(s => s.userId === userId && s.createdAt >= since);
        const allConversions = Array.from(this.conversions.values()).filter(c => c.userId === userId && c.createdAt >= since);

        // By platform
        const byPlatform = {};
        allShares.forEach(s => {
            if (!byPlatform[s.platform]) byPlatform[s.platform] = { shares: 0, clicks: 0 };
            byPlatform[s.platform].shares++;
        });

        allConversions.forEach(c => {
            if (!byPlatform[c.platform]) byPlatform[c.platform] = { shares: 0, clicks: 0 };
            byPlatform[c.platform].clicks++;
        });

        // By day
        const byDay = {};
        allShares.forEach(s => {
            const day = s.createdAt.substring(0, 10);
            if (!byDay[day]) byDay[day] = 0;
            byDay[day]++;
        });

        return {
            totalShares: allShares.length,
            totalConversions: allConversions.length,
            byPlatform,
            byDay,
            conversionRate: allShares.length > 0 ? ((allConversions.length / allShares.length) * 100).toFixed(1) : 0
        };
    }

    // Generate social meta tags
    generateMetaTags({ title, description, url, image, type = 'website', siteName = 'Flay' }) {
        return `
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${siteName}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
<meta name="twitter:url" content="${url}">
<meta name="theme-color" content="#818cf8">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">`;
    }

    // Generate QR code URL for social sharing
    generateQRCode(url, size = 300) {
        return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=png`;
    }

    // Generate social share card (HTML)
    generateShareCard({ title, description, url, image, theme = 'dark' }) {
        const isDark = theme === 'dark';
        return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Inter,system-ui,sans-serif;background:${isDark ? '#0a0a1a' : '#ffffff'};display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.card{background:${isDark ? '#15152a' : '#f8f9fa'};border-radius:16px;overflow:hidden;max-width:500px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
.card-image{width:100%;height:280px;object-fit:cover}
.card-content{padding:24px}
.card-title{font-size:20px;font-weight:700;color:${isDark ? '#fff' : '#1a1a2e'};margin-bottom:8px}
.card-desc{font-size:14px;color:${isDark ? '#94a3b8' : '#666'};line-height:1.6;margin-bottom:20px}
.share-buttons{display:flex;gap:10px;flex-wrap:wrap}
.share-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;color:#fff;transition:transform .2s}
.share-btn:hover{transform:translateY(-2px)}
.share-btn.whatsapp{background:#25D366}
.share-btn.facebook{background:#1877F2}
.share-btn.twitter{background:#1DA1F2}
.share-btn.linkedin{background:#0A66C2}
.share-btn.telegram{background:#0088CC}
.share-btn.instagram{background:linear-gradient(135deg,#833AB4,#FD1D1D,#F77737)}
.url-box{margin-top:16px;padding:10px 14px;background:${isDark ? '#1a1a35' : '#fff'};border:1px solid ${isDark ? '#252545' : '#e0e0e0'};border-radius:8px;display:flex;align-items:center;justify-content:space-between}
.url-text{font-size:12px;color:${isDark ? '#64748b' : '#999'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80%}
.copy-btn{background:none;border:none;cursor:pointer;color:${isDark ? '#818cf8' : '#6366f1'};font-size:12px;font-weight:600}
.flay-badge{text-align:center;padding:12px;font-size:11px;color:${isDark ? '#475569' : '#999'}}
</style></head><body>
<div class="card">
    <img class="card-image" src="${image || 'https://flay.app/og-default.png'}" alt="${title}">
    <div class="card-content">
        <div class="card-title">${title}</div>
        <div class="card-desc">${description}</div>
        <div class="share-buttons">
            <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}" class="share-btn whatsapp" target="_blank">💬 WhatsApp</a>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" class="share-btn facebook" target="_blank">📘 Facebook</a>
            <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}" class="share-btn twitter" target="_blank">🐦 Twitter</a>
            <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}" class="share-btn linkedin" target="_blank">💼 LinkedIn</a>
            <a href="https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}" class="share-btn telegram" target="_blank">✈️ Telegram</a>
        </div>
        <div class="url-box">
            <span class="url-text">${url}</span>
            <button class="copy-btn" onclick="navigator.clipboard.writeText('${url}');this.textContent='Copie!';setTimeout(()=>this.textContent='Copier',1500)">Copier</button>
        </div>
    </div>
    <div class="flay-badge">Propulse par Flay</div>
</div></body></html>`;
    }

    // Get platform stats
    getPlatformStats() {
        return Object.entries(this.platforms).map(([id, p]) => ({
            id,
            name: p.name,
            icon: p.icon,
            color: p.color,
            features: p.features,
            businessApi: p.businessApi || false
        }));
    }

    // UTM builder
    generateUTM(url, { source, medium, campaign, content, term }) {
        const params = new URLSearchParams();
        if (source) params.set('utm_source', source);
        if (medium) params.set('utm_medium', medium);
        if (campaign) params.set('utm_campaign', campaign);
        if (content) params.set('utm_content', content);
        if (term) params.set('utm_term', term);
        return `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
    }

    // Short link generator (via free API)
    async generateShortLink(url) {
        try {
            const https = require('https');
            return new Promise((resolve, reject) => {
                const shortUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`;
                https.get(shortUrl, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => resolve(data.trim() || url));
                }).on('error', () => resolve(url));
            });
        } catch (e) {
            return url;
        }
    }
}

module.exports = new SocialIntegration();