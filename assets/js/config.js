/* =====================================================================
   DaffoMart  -  config.js   (all settings of the website are here)
   This file replaces includes/config.php of the PHP version.

   FIREBASE: paste your own web-app config in the "firebase" part below
   (Firebase console -> Project settings -> Your apps -> Web app -> Config).
   While apiKey still says PASTE_..., the site runs in DEMO MODE: data is kept
   only in your own browser (localStorage), so you can test everything offline.
   ===================================================================== */
window.DM_CONFIG = {

  // ---------- Store info ----------
  store: {
    name:    'DaffoMart',
    tagline: 'Everyday Essentials, Delivered with Care.',
    phone:   '01XXXXXXXXX',
    email:   'support@daffomart.example',
    address: 'Dhaka, Bangladesh',
    hours:   'Every day, 8:00 AM - 10:00 PM'
  },

  // ---------- Delivery (Taka) ----------
  delivery: {
    inside:   60,    // inside Dhaka
    outside:  120,   // outside Dhaka
    freeOver: 0      // 0 = free delivery is turned off, e.g. 1500 = free above 1500 Taka
  },

  // ---------- Other ----------
  perPage: 12,       // products per page in the shop

  // ---------- Firebase (paste YOUR config here) ----------
  firebase: {
    apiKey:            'AIzaSyDg-Gqcld6MNFetqzfkJWY62PGfuxqo_gs',
    authDomain:        'daffomart-static.firebaseapp.com',
    projectId:         'daffomart-static',
    storageBucket:     'daffomart-static.firebasestorage.app',
    messagingSenderId: '999882202744',
    appId:             '1:999882202744:web:0510f6e9ad853ca679578d'
  }
};
