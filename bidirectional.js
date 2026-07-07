/**
 * Flay Omni - Bidirectional Support
 * RTL/LTR support complet pour l'interface
 */

class BidirectionalSupport {
    constructor() {
        this.rtlLanguages = ['ar', 'he', 'fa', 'ur', 'yi'];
    }

    isRTL(langCode) {
        return this.rtlLanguages.includes(langCode.toLowerCase());
    }

    getDirection(langCode) {
        return this.isRTL(langCode) ? 'rtl' : 'ltr';
    }

    getCSSVariables(langCode) {
        const isRTL = this.isRTL(langCode);
        return {
            '--direction': isRTL ? 'rtl' : 'ltr',
            '--text-align-start': isRTL ? 'right' : 'left',
            '--text-align-end': isRTL ? 'left' : 'right',
            '--margin-start': isRTL ? 'margin-right' : 'margin-left',
            '--margin-end': isRTL ? 'margin-left' : 'margin-right',
            '--padding-start': isRTL ? 'padding-right' : 'padding-left',
            '--padding-end': isRTL ? 'padding-left' : 'padding-right',
            '--border-start': isRTL ? 'border-right' : 'border-left',
            '--border-end': isRTL ? 'border-left' : 'border-right',
            '--float-start': isRTL ? 'right' : 'left',
            '--float-end': isRTL ? 'left' : 'right',
            '--flex-direction': isRTL ? 'row-reverse' : 'row',
            '--justify-start': isRTL ? 'flex-end' : 'flex-start',
            '--justify-end': isRTL ? 'flex-start' : 'flex-end'
        };
    }

    getTransformedCSS(css, langCode) {
        const isRTL = this.isRTL(langCode);
        if (!isRTL) return css;

        return css
            .replace(/margin-left/g, '__TEMP_ML__')
            .replace(/margin-right/g, 'margin-left')
            .replace(/__TEMP_ML__/g, 'margin-right')
            .replace(/padding-left/g, '__TEMP_PL__')
            .replace(/padding-right/g, 'padding-left')
            .replace(/__TEMP_PL__/g, 'padding-right')
            .replace(/border-left/g, '__TEMP_BL__')
            .replace(/border-right/g, 'border-left')
            .replace(/__TEMP_BL__/g, 'border-right')
            .replace(/left:/g, '__TEMP_L__')
            .replace(/right:/g, 'left:')
            .replace(/__TEMP_L__/g, 'right:')
            .replace(/text-align: left/g, 'text-align: right')
            .replace(/text-align: right/g, 'text-align: left')
            .replace(/float: left/g, 'float: right')
            .replace(/float: right/g, 'float: left')
            .replace(/flex-direction: row/g, 'flex-direction: row-reverse')
            .replace(/flex-direction: row-reverse/g, 'flex-direction: row')
            .replace(/justify-content: flex-start/g, '__TEMP_JFS__')
            .replace(/justify-content: flex-end/g, 'justify-content: flex-start')
            .replace(/__TEMP_JFS__/g, 'justify-content: flex-end');
    }

    generateRTLCSS(baseCSS, langCode) {
        if (!this.isRTL(langCode)) return baseCSS;

        const rtlCSS = `
/* RTL Overrides for ${langCode} */
[dir="rtl"] {
    direction: rtl;
    text-align: right;
}

[dir="rtl"] * {
    box-sizing: border-box;
}

[dir="rtl"] .sidebar {
    left: auto;
    right: 0;
    border-right: none;
    border-left: 1px solid var(--border);
}

[dir="rtl"] .main {
    margin-left: 0;
    margin-right: 260px;
}

[dir="rtl"] .nav-item::before {
    left: auto;
    right: 0;
    border-radius: 3px 0 0 3px;
}

[dir="rtl"] .dropdown-menu {
    left: auto;
    right: 0;
}

[dir="rtl"] .modal {
    margin-left: auto;
    margin-right: auto;
}

[dir="rtl"] .toast-container {
    left: 20px;
    right: auto;
}

[dir="rtl"] .stat-card::after {
    left: auto;
    right: 0;
}

[dir="rtl"] .form-row {
    flex-direction: row-reverse;
}

[dir="rtl"] .btn-group {
    flex-direction: row-reverse;
}

[dir="rtl"] .breadcrumb {
    flex-direction: row-reverse;
}

[dir="rtl"] .pagination {
    flex-direction: row-reverse;
}

[dir="rtl"] .tabs {
    flex-direction: row-reverse;
}

[dir="rtl"] .avatar-group > * {
    margin-left: -8px;
    margin-right: 0;
}

[dir="rtl"] .avatar-group > *:first-child {
    margin-left: 0;
}

[dir="rtl"] .notification-bell::after {
    left: auto;
    right: -4px;
}

[dir="rtl"] .tooltip {
    left: auto;
    right: 50%;
    transform: translateX(50%);
}

[dir="rtl"] .dropdown-toggle::after {
    margin-left: 0;
    margin-right: 0.255em;
}

[dir="rtl"] .input-group > :not(:first-child) {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-top-right-radius: var(--radius);
    border-bottom-right-radius: var(--radius);
}

[dir="rtl"] .input-group > :not(:last-child) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-top-left-radius: var(--radius);
    border-bottom-left-radius: var(--radius);
}

/* Mirror icons that need flipping */
[dir="rtl"] .icon-mirror {
    transform: scaleX(-1);
}

/* Chevron icons */
[dir="rtl"] .chevron-left {
    transform: rotate(180deg);
}

[dir="rtl"] .chevron-right {
    transform: rotate(180deg);
}

/* Arrow icons */
[dir="rtl"] .arrow-left {
    transform: rotate(180deg);
}

[dir="rtl"] .arrow-right {
    transform: rotate(180deg);
}

/* Progress bars */
[dir="rtl"] progress {
    direction: rtl;
}

/* Range inputs */
[dir="rtl"] input[type="range"] {
    direction: rtl;
}

/* Scrollbars */
[dir="rtl"] ::-webkit-scrollbar-thumb {
    left: 0;
    right: auto;
}

@media (max-width: 900px) {
    [dir="rtl"] .sidebar {
        transform: translateX(100%);
    }
    [dir="rtl"] .sidebar.open {
        transform: translateX(0);
    }
    [dir="rtl"] .main {
        margin-right: 0;
    }
}
`;
        return baseCSS + rtlCSS;
    }

    // HTML attribute helpers
    getHTMLAttributes(langCode) {
        const dir = this.getDirection(langCode);
        const lang = langCode.toLowerCase();
        return {
            dir,
            lang,
            'data-direction': dir,
            'data-lang': lang
        };
    }

    // Mirror layout for RTL
    mirrorLayout(element, langCode) {
        if (!this.isRTL(langCode)) return;
        element.style.direction = 'rtl';
        element.setAttribute('dir', 'rtl');
    }
}

module.exports = new BidirectionalSupport();