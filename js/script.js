/* ═══════════════════════════════════════════════════
   script.js — PassGen CPRNG Password Generator
   Uses crypto.getRandomValues() with rejection sampling
   Auto-copies on length change & generate button
   ═══════════════════════════════════════════════════ */

;(function () {
    'use strict';

    // ── DOM elements ──
    const lengthInput = document.getElementById('password-length');
    const generateBtn = document.getElementById('generate-btn');
    const passwordOutput = document.getElementById('password-output');
    const copyBtn = document.getElementById('copy-btn');
    const toast = document.getElementById('toast');

    // ── Character set (printable ASCII, no space, no ambiguous chars) ──
    // Feel free to customize: set AMBIGUOUS_FREE to true to remove l,1,O,0 etc.
    const AMBIGUOUS_FREE = true;   // set false to include everything

    const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
    const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const DIGITS = '0123456789';
    const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

    function buildCharset() {
        let chars = LOWERCASE + UPPERCASE + DIGITS + SYMBOLS;
        if (AMBIGUOUS_FREE) {
            // Remove characters that are easily confused
            const ambiguous = 'l1IO0oO';
            for (const char of ambiguous) {
                chars = chars.replaceAll(char, '');
            }
        }
        // Deduplicate just in case (shouldn't be needed)
        return [...new Set(chars)].join('');
    }

    const CHARSET = buildCharset();

    // ── Toast notification ──
    let toastTimer = null;

    function showToast(message, icon = '✅') {
        if (toastTimer) clearTimeout(toastTimer);
        toast.querySelector('.toast__icon').textContent = icon;
        toast.querySelector('.toast__message').textContent = message;
        toast.classList.add('toast--visible');
        toastTimer = setTimeout(() => {
            toast.classList.remove('toast--visible');
        }, 2000);
    }

    // ── Copy to clipboard ──
    async function copyToClipboard(text) {
        if (!text || text === 'Your password will appear here') return;
        try {
            await navigator.clipboard.writeText(text);
            showToast('Copied to clipboard!', '✅');
        } catch (err) {
            // Fallback for older browsers or insecure contexts
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                showToast('Copied to clipboard!', '✅');
            } catch (execErr) {
                showToast('Copy failed. Please copy manually.', '⚠️');
            }
            document.body.removeChild(textArea);
        }
    }

    // ── Cryptographically secure random integer in [0, max) ──
    // Uses rejection sampling to eliminate modulo bias
    function secureRandomInt(max) {
        if (max <= 0) throw new Error('max must be > 0');
        // Calculate the number of bytes needed to cover the range
        const byteLimit = 256;
        // Find the largest multiple of max that fits in a byte
        const maxValid = byteLimit - (byteLimit % max);
        const randomBytes = new Uint8Array(1);

        // Loop until we get a value below the threshold
        while (true) {
            crypto.getRandomValues(randomBytes);
            if (randomBytes[0] < maxValid) {
                return randomBytes[0] % max;
            }
            // Otherwise, discard and try again
        }
    }

    // ── Generate password from charset ──
    function generatePassword(length) {
        if (length < 1) return '';
        const charsLength = CHARSET.length;
        let password = '';
        const result = new Array(length);

        for (let i = 0; i < length; i++) {
            result[i] = CHARSET[secureRandomInt(charsLength)];
        }
        return result.join('');
    }

    // ── Get sanitized length ──
    function getLength() {
        let raw = lengthInput.value.trim();
        if (raw === '') return 32; // default if empty
        let len = parseInt(raw, 10);
        if (isNaN(len) || len < 1) return 1;
        if (len > 5000) return 5000;
        return len;
    }

    // ── Set length input value (sanitized) ──
    function sanitizeInput() {
        const sanitized = getLength();
        lengthInput.value = sanitized;
        return sanitized;
    }

    // ── Main generation & copy flow ──
    function generateAndCopy() {
        const length = sanitizeInput();
        const password = generatePassword(length);
        passwordOutput.textContent = password;
        // Auto‑copy immediately
        copyToClipboard(password);
        // Also visually shake the output area? (optional subtle feedback)
        passwordOutput.style.transition = 'none';
        passwordOutput.style.transform = 'scale(1.02)';
        setTimeout(() => {
            passwordOutput.style.transition = 'transform 0.15s ease';
            passwordOutput.style.transform = 'scale(1)';
        }, 50);
    }

    // ── Event listeners ──
    function bindEvents() {
        // 1. Generate on any change to the length input
        lengthInput.addEventListener('input', () => {
            // Sanitize but don't generate if input is still being typed (partially)
            // Actually, we want to generate on every change as specified.
            // But to avoid weird states while typing '-', we'll check if valid.
            const val = lengthInput.value.trim();
            if (val === '-' || val === '') return; // skip while empty or just minus
            const num = parseInt(val, 10);
            if (isNaN(num)) return;
            generateAndCopy();
        });

        // 2. Generate button click
        generateBtn.addEventListener('click', () => {
            generateAndCopy();
        });

        // 3. Manual copy button
        copyBtn.addEventListener('click', () => {
            const password = passwordOutput.textContent;
            if (password && password !== 'Your password will appear here') {
                copyToClipboard(password);
            } else {
                showToast('No password to copy yet!', 'ℹ️');
            }
        });

        // 4. Blur on length input to ensure value is sanitized
        lengthInput.addEventListener('blur', () => {
            sanitizeInput();
        });

        // 5. Optional keyboard shortcut: Enter key inside input triggers generate
        lengthInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                generateAndCopy();
            }
        });
       // ── Global keyboard shortcuts ──
       document.addEventListener('keydown', function handleGlobalShortcut(e) {
          // Ignore if user is inside a textarea or contenteditable (safety, none exist here)
          if (e.target.isContentEditable || e.target.tagName === 'TEXTAREA') return;

          // '/' → focus & select the length input
          if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
             e.preventDefault();
             lengthInput.focus();
             lengthInput.select();
             return;
          }

          // Space → generate (unless the Generate button itself is focused)
          if (e.key === ' ' && document.activeElement !== generateBtn) {
             e.preventDefault();
             generateAndCopy();
          }
       });
    }

    // ── Initial generation on page load with default length ──
    function init() {
        bindEvents();
        // Set input value to default (32) and generate immediately
        lengthInput.value = 32;
        generateAndCopy();
    }

    // ── Start when DOM is ready ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
