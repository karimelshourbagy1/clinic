/* إعدادات النظام. الحاجات دي مش سرية: الحماية في قواعد Firestore وفي السيرفر الصغير بتاع المساعد. */
window.CLINIC_CFG = {
  // من Firebase: Project settings → Your apps → Web app → firebaseConfig
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },
  // لينك سيرفر المساعد على Cloudflare (سيبه فاضي لو مش عاوز المساعد الذكي)
  aiUrl: ""
};
