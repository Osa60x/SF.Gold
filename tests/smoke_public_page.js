/* اختبار إقلاع الصفحة العامة في بيئة DOM حقيقية (jsdom)
   يتحقق من: إقلاع الثيم، جلب السعر من العامل، رسم العيارات،
   الشريط المتحرك، الحاسبة، السبائك، والمخطط — بلا أي خطأ جافاسكربت. */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const ROOT = '/home/user/SF.Gold';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');

const XAU = 4354.9;
const GRAMS = 31.1034768, SAR = 3.75;
const RATIO = { 24: 1, 21: 21 / 24, 18: 18 / 24 };
const gram = c => XAU * SAR * RATIO[c] / GRAMS;

// بيانات تاريخية: 24 نقطة خلال 24 ساعة
const now = Date.now();
const points = Array.from({ length: 25 }, (_, i) => ({
  price: XAU + Math.sin(i / 3) * 8,
  ts: new Date(now - (24 - i) * 3600e3).toISOString(),
}));

const dom = new JSDOM(html, {
  url: 'https://osa60x.github.io/SF.Gold/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  resources: undefined,
  beforeParse(window) {
    window.fetch = (url) => {
      const u = String(url);
      let body = null;
      if (u.includes('/quote')) body = { price: XAU, fetchedAt: new Date(now - 5e3).toISOString(), sourceUpdatedAt: new Date(now - 1e4).toISOString() };
      else if (u.includes('/history')) body = { points };
      else if (u.includes('public-adjustments')) body = { adjustments: [{ carat: 21, adjustment_sar: 5 }] };
      else if (u.includes('public-settings')) body = { settings: { theme: 'obsidian_glass', contact_actions: [] } };
      else if (u.includes('XAG')) body = { price: 63.13 };
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    };
    window.HTMLCanvasElement.prototype.getContext = () => null; // لا كانفاس في jsdom
    window.addEventListener('error', e => { errors.push(e.message); });
  },
});
const errors = [];
const { window } = dom;
const { document } = window;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const nf1 = new Intl.NumberFormat('ar-SA-u-nu-latn', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmt = v => nf1.format(Math.round(v * 10) / 10);

let failed = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name);
  if (!cond) failed++;
}

(async () => {
  await sleep(1600); // انتظار DOMContentLoaded + الوعود + العدّادات

  check('لا أخطاء جافاسكربت أثناء الإقلاع', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));

  check('حماية الثيم المبكر أزالت حالة الانتظار', !document.documentElement.hasAttribute('data-theme-pending'));
  check('الثيم الافتراضي أوبسيديان', document.documentElement.getAttribute('data-theme') === 'obsidian_glass');

  check('سعر الأونصة في البطل', /4,354\.90/.test(document.querySelector('#hero-ounce').textContent));
  check('جرام 24 في البطل', document.querySelector('#hero-gram').textContent.includes(fmt(gram('24'))));
  for (const c of ['24', '21', '18']) {
    const expected = c === '21' ? gram('21') + 5 : gram(c);
    check(`بطاقة عيار ${c} تعرض ${fmt(expected)}`, document.querySelector('#price-' + c).textContent.includes(fmt(expected)));
    if (c !== '18') check(`شريحة البطل لعيار ${c}`, document.querySelector('#chip-' + c).textContent.includes(fmt(expected)));
  }
  check('تعديل المتجر ظهر على عيار 21', document.querySelector('#market-21').textContent.includes(fmt(gram('21'))));

  check('الشريط المتحرك بُني بمحتوى مكرر', document.querySelectorAll('#ticker-track .tick-items').length === 2);
  check('الشريط يتضمن الفضة', document.querySelector('#ticker-track').textContent.includes('63.13'));

  check('شريحة الاتجاه لعيار 24', /▲|▼|ثابت/.test(document.querySelector('#dir-24').textContent));
  check('خط المصغّر رسم لعيار 21', (document.querySelector('#spark-21 path') || {}).getAttribute !== undefined && document.querySelector('#spark-21 path') !== null);

  const chartSvg = document.querySelector('#chart-svg').innerHTML;
  check('المخطط رسم مساراً', chartSvg.includes('c-line') && chartSvg.includes('M'));
  check('المخطط فيه تسميات وقت', /ساعة|\d{1,2}:\d{2}/.test(chartSvg) || chartSvg.includes('text'));

  const calcVal = document.querySelector('#calc-value').textContent;
  check(`الحاسبة (10 جرام × 21 + تعديل) = ${fmt(10 * (gram('21') + 5))}`, calcVal.includes(fmt(10 * (gram('21') + 5))));
  check('رابط واتساب للحاسبة يحمل الرسالة', decodeURIComponent(document.querySelector('#calc-wa').href).includes('عيار 21'));

  check(`سعر السبيكة الافتراضية (10×24) = ${fmt(10 * gram('24'))}`, document.querySelector('#bullion-price').textContent.includes(fmt(10 * gram('24'))));
  check('أوزان السبائك ثمانية', document.querySelectorAll('#weight-list .chip').length === 8);

  check('مسار التخطي موجود', !!document.querySelector('.skip-link[href="#prices"]'));
  check('QR مخفي في الوضع الطولي (قاعدة CSS)', html.includes('@media(orientation:portrait){.site-qr{display:none}}'));
  check('الشعار بأولوية عالية', !!document.querySelector('img.brand-logo-user[fetchpriority="high"]'));

  // تبديل الثيم يعمل ويحفظ
  document.querySelector('.theme-dot.dot-ivory').click();
  check('تبديل الثيم إلى العاجي', document.documentElement.getAttribute('data-theme') === 'ivory_luxe');
  const mem = JSON.parse(window.localStorage.getItem('sabaaek-public-theme') || '{}');
  check('ذاكرة الثيم مؤرخة', mem.theme === 'ivory_luxe' && typeof mem.savedAt === 'number');

  // تبديل مدى المخطط
  const tabs = document.querySelectorAll('#range-tabs button');
  tabs[1].click();
  await sleep(400);
  check('تبديل المدى إلى 7 أيام', tabs[1].getAttribute('aria-selected') === 'true');

  console.log(failed === 0 ? '\nALL_SMOKE_TESTS_PASSED' : `\n${failed} SMOKE FAILURES`);
  process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error('TEST CRASH:', e); process.exit(1); });
