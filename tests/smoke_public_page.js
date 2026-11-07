/* اختبار إقلاع الصفحة العامة (النسخة الثانية) في بيئة DOM حقيقية (jsdom)
   يتحقق من: الرأس + الشريط الملاصق (بالعناصر الأربعة فقط)، عنوان البطل الجديد،
   حذف الحاسبة والوعد والأزرار، أسعار العيارات، سبائك PAMP الثمانية،
   المخطط، الخدمات، الثيمات — بلا أي خطأ جافاسكربت.
   التشغيل:  cd tests && npm install && node smoke_public_page.js */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');

const XAU = 4354.9;
const GRAMS = 31.1034768, SAR = 3.75;
const RATIO = { 24: 1, 21: 21 / 24, 18: 18 / 24 };
const gram = c => XAU * SAR * RATIO[c] / GRAMS;

const now = Date.now();
const points = Array.from({ length: 25 }, (_, i) => ({
  price: XAU + Math.sin(i / 3) * 8,
  ts: new Date(now - (24 - i) * 3600e3).toISOString(),
}));

const dom = new JSDOM(html, {
  url: 'https://osa60x.github.io/SF.Gold/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.fetch = (url) => {
      const u = String(url);
      let body = null;
      if (u.includes('/quote')) body = { price: XAU, fetchedAt: new Date(now - 5e3).toISOString(), sourceUpdatedAt: new Date(now - 1e4).toISOString() };
      else if (u.includes('/history')) body = { points };
      else if (u.includes('public-adjustments')) body = { adjustments: [{ carat: 21, adjustment_sar: 5 }] };
      else if (u.includes('public-settings')) body = { settings: { theme: 'obsidian_glass', contact_actions: [] } };
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
const nf2 = new Intl.NumberFormat('ar-SA-u-nu-latn', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let failed = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name);
  if (!cond) failed++;
}

(async () => {
  await sleep(1700);

  check('لا أخطاء جافاسكربت أثناء الإقلاع', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));

  /* ---- الرأس والشريط الملاصق ---- */
  const head = document.querySelector('header.site-head');
  check('الرأس موجود', !!head);
  check('الشريط المتحرك داخل الرأس تحت اللوجو', !!(head && head.querySelector('#ticker-track')));
  check('اللوجو داخل الرأس بأولوية عالية', !!(head && head.querySelector('img.brand-logo-user[fetchpriority="high"]')));
  const tickerText = document.querySelector('#ticker-track').textContent;
  check('الشريط: أونصة الذهب بالدولار $', tickerText.includes('أونصة الذهب') && tickerText.includes('$' + nf2.format(XAU)));
  check('الشريط: ثلاثة عيارات فقط بالريال', (tickerText.match(/عيار \d+/g) || []).length >= 6 /* نسختان × 3 */);
  check('الشريط: لا فضة ولا نسبة ولا تحديث', !tickerText.includes('الفضة') && !tickerText.includes('نسبة') && !tickerText.includes('آخر تحديث'));
  check('الشريط: رمز الريال ⃁ موجود', tickerText.includes('\u20C1'));
  check('الشريط مكرر للحلقة المستمرة', document.querySelectorAll('#ticker-track .tick-items').length === 2);

  /* ---- البطل ---- */
  check('عنوان البطل الجديد: لبيع وشراء الذهب والمجوهرات', document.body.textContent.includes('لبيع') && document.body.textContent.includes('وشراء') && document.body.textContent.includes('والمجوهرات'));
  check('العنوان مقسم كلمات متحركة', document.querySelectorAll('.hero-title .w').length === 6);
  check('لا أزرار في البطل', !document.querySelector('.hero-ctas') && !document.body.textContent.includes('شاهد أسعار العيارات') && !document.body.textContent.includes('احسب سعر ذهبك'));
  check('أونصة البطل $', document.querySelector('#hero-ounce').textContent === '$' + nf2.format(XAU));
  check('جرام 24 في البطل', document.querySelector('#hero-gram').textContent.includes(fmt(gram('24'))));

  /* ---- المحذوفات ---- */
  check('لا قسم حاسبة', !document.querySelector('#calculator'));
  check('لا قسم وعدنا/لماذا', !document.body.textContent.includes('لماذا سبائك الفخامة'));
  check('لا جملة نجاوبك خلال دقائق', !document.body.textContent.includes('نجاوبك خلال دقائق'));
  check('لا رابط حاسبة في القائمة أو التذييل', ![...document.querySelectorAll('a')].some(a => (a.textContent || '').includes('الحاسبة')));

  /* ---- لوحة الأسعار ---- */
  check('حماية الثيم المبكر أزالت الانتظار', !document.documentElement.hasAttribute('data-theme-pending'));
  for (const c of ['24', '21', '18']) {
    const expected = c === '21' ? gram('21') + 5 : gram(c);
    check(`بطاقة عيار ${c} = ${fmt(expected)}`, document.querySelector('#price-' + c).textContent.includes(fmt(expected)));
  }
  check('تعديل المتجر ظهر على عيار 21', document.querySelector('#market-21').textContent.includes(fmt(gram('21'))));
  check('رمز الريال في بطاقات العيارات', !!document.querySelector('.karat-price .sar'));

  /* ---- المخطط ---- */
  const chartSvg = document.querySelector('#chart-svg').innerHTML;
  check('المخطط رسم مساراً', chartSvg.includes('c-line') && chartSvg.includes('M'));
  const tabs = document.querySelectorAll('#range-tabs button');
  tabs[1].click();
  await sleep(300);
  check('تبديل المدى إلى 7 أيام', tabs[1].getAttribute('aria-selected') === 'true');

  /* ---- سبائك PAMP ---- */
  const cards = document.querySelectorAll('.bullion-card');
  check('ثماني بطاقات سبائك PAMP', cards.length === 8);
  check('سعر أول سبيكة (1 جرام × 24) = ' + fmt(1 * gram('24')), document.querySelector('.bullion-card [data-bp]').textContent.includes(fmt(1 * gram('24'))));
  const lastCard = cards[cards.length - 1];
  check('سعر آخر سبيكة (100 جرام) = ' + fmt(100 * gram('24')), lastCard.querySelector('[data-bp]').textContent.includes(fmt(100 * gram('24'))));
  check('روابط واتساب لكل سبيكة تعمل', [...cards].every(c => c.href.includes('wa.me/966550441259') && c.href.includes('text=')));
  check('صور PAMP بأوزان حقيقية', [...cards].every(c => c.querySelector('img') && c.querySelector('img').src.includes('bullion-pamp/')));

  /* ---- الخدمات والفواصل ---- */
  check('أربع خدمات متحركة', document.querySelectorAll('.svc-row').length === 4);
  check('الفاصل النصي الضخم مبني ومكرر', document.querySelectorAll('#mega-track .mega-line').length === 2);
  check('الفاصل يذكر PAMP والعيارات', document.querySelector('#mega-track').textContent.includes('PAMP'));

  /* ---- التواصل والثيم ---- */
  check('زر مشاركة موجود', !!document.querySelector('#share-btn'));
  check('QR مخفي في الوضع الطولي (قاعدة CSS)', html.includes('@media(orientation:portrait){.site-qr{display:none}}'));
  document.querySelector('.theme-dot.dot-ivory').click();
  check('تبديل الثيم إلى العاجي', document.documentElement.getAttribute('data-theme') === 'ivory_luxe');
  const mem = JSON.parse(window.localStorage.getItem('sabaaek-public-theme') || '{}');
  check('ذاكرة الثيم مؤرخة', mem.theme === 'ivory_luxe' && typeof mem.savedAt === 'number');
  check('مسار التخطي موجود', !!document.querySelector('.skip-link[href="#prices"]'));

  console.log(failed === 0 ? '\nALL_SMOKE_TESTS_PASSED' : `\n${failed} SMOKE FAILURES`);
  process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error('TEST CRASH:', e); process.exit(1); });
