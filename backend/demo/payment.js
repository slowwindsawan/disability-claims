// test-hyp-relay.js (CommonJS)
// Usage: node test-hyp-relay.js

require('dotenv').config();
const axios = require('axios');
const { parseStringPromise } = require('xml2js');

/**
 * Create Hyp hosted payment page via /xpo/Relay
 * @param {Object} opts
 * @param {string} opts.orderId    unique order id (string)
 * @param {number} opts.amount     amount in main currency units (e.g. 29 means 29.00 ILS)
 * @param {string} opts.successUrl where user is redirected on success
 * @param {string} opts.errorUrl   where user is redirected on error
 * @returns {Promise<string>} hosted payment page URL (mpiHostedPageUrl)
 */
async function createHypHostedPage({ orderId, amount, successUrl, errorUrl }) {
  if (!orderId || typeof amount !== 'number') {
    throw new Error('orderId (string) and amount (number) are required');
  }

  const RELAY_URL = process.env.HYP_RELAY_URL;
  const API_USER = process.env.HYP_API_USER;
  const API_PASSWORD = process.env.HYP_API_PASSWORD;
  const TERMINAL = process.env.HYP_TERMINAL; // Masof

  if (!RELAY_URL || !API_USER || !API_PASSWORD || !TERMINAL) {
    throw new Error(
      'Missing env variables: HYP_RELAY_URL, HYP_API_USER, HYP_API_PASSWORD, HYP_TERMINAL'
    );
  }

  // Hyp expects amount in subunits (agorot). Convert 29.00 -> 2900
  const totalSubunits = Math.round(amount * 100);

  // Build XML payload — adjust fields if your onboarding doc specifies different tags
  const xmlPayload = `
<ashrait>
  <request>
    <command>doDeal</command>
    <terminal>${escapeXml(TERMINAL)}</terminal>
    <order>${escapeXml(orderId)}</order>
    <total>${totalSubunits}</total>
    <currency>1</currency>
    <successUrl>${escapeXml(successUrl)}</successUrl>
    <errorUrl>${escapeXml(errorUrl)}</errorUrl>
  </request>
</ashrait>`.trim();

  // Build form data
  const form = new URLSearchParams({
    user: API_USER,
    password: API_PASSWORD,
    int_in: xmlPayload,
  }).toString();

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/xml, text/xml, */*',
  };

  const res = await axios.post(RELAY_URL, form, { headers, timeout: 20000 });

  // Parse XML response
  const parsed = await parseStringPromise(res.data, { explicitArray: false });

  // search for common keys that might contain hosted page URL
  const candidates = [
    'mpiHostedPageUrl',
    'mpiHostedPage',
    'HostedPageUrl',
    'redirectUrl',
    'redirect',
    'url',
  ];
  const hostedUrl = searchForKey(parsed, candidates);
  if (hostedUrl) return hostedUrl;

  throw new Error('Hosted page URL not found in Hyp response. Raw response:\n' + res.data);
}

/* helpers */
function escapeXml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function searchForKey(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (const k of Object.keys(obj)) {
    if (keys.includes(k)) {
      const v = obj[k];
      if (typeof v === 'string') return v;
      if (v && typeof v === 'object') {
        if ('_' in v && typeof v._ === 'string') return v._;
        if ('$' in v && v.$ && v.$.href) return v.$.href;
      }
    }
    const found = searchForKey(obj[k], keys);
    if (found) return found;
  }
  return null;
}

console.log('=== Hyp hosted payment page creation test ===',process.env.HYP_RELAY_URL);

/* === quick test invocation === */
(async () => {
  try {
    const url = await createHypHostedPage({
      orderId: 'ORD_TEST_' + Date.now(),
      amount: 29, // 29.00 ILS
      successUrl: 'https://adhdeal.com/payment-success',
      errorUrl: 'https://adhdeal.com/payment-fail',
    });
    console.log('Redirect user to:', url);
  } catch (err) {
    console.error('Error creating hosted page:', err.message || err);
    if (err.response && err.response.data) {
      console.error('Raw response body:', err.response.data);
    }
  }
})();
