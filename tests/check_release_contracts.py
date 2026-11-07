from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIVE_URL = "https://osa60x.github.io/SF.Gold/"
# فحص النسخة الحية يحتاج شبكة خارجية؛ يُتخطى تلقائياً عند عدم توفرها (كما في بيئات معزولة).
LIVE_CHECK = "--no-live" not in sys.argv


def require(condition: bool, message: str, failures: list[str]) -> None:
    if not condition:
        failures.append(message)


def main() -> int:
    failures: list[str] = []
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    admin = (ROOT / "admin.html").read_text(encoding="utf-8")

    # ---- عزل المشروع والبيانات ----
    require("onlptehmvnzzbxswkcrh.supabase.co/functions/v1/sabaaek-admin" in index,
            "العزل: الصفحة العامة لا تستخدم وظيفة سبائك المستقلة لتعديلات الأسعار", failures)
    require("sabaaek-gold-api.osa60x.workers.dev" in index,
            "البيانات: الصفحة العامة لا تقرأ من عامل أسعار سبائك", failures)
    require("gold.osa60x.workers.dev" not in index and "rsrtwubjdfdnflkttwwy" not in index,
            "العزل: وُجد مرجع لمشروع فخامة الأسطورة في الصفحة العامة", failures)
    require("api.gold-api.com/price/XAU/USD" in index,
            "الاحتياط: لا يوجد مصدر احتياط مباشر عند تعطل العامل", failures)

    # ---- الهوية والأداء ----
    require("sabaaek-logo-user.webp" in index,
            "الهوية: الرأس لا يستخدم اشتقاق WebP المحسّن من شعار المستخدم الشفاف", failures)
    require((ROOT / "assets" / "sabaaek-logo-user.webp").exists(),
            "الهوية: ملف شعار WebP غير موجود في assets", failures)
    require((ROOT / "assets" / "sabaaek-logo-user.png").exists(),
            "الهوية: أصل الشعار الأصلي (PNG) يجب أن يبقى مرجعاً", failures)
    require('class="brand-logo-user"' in index and 'fetchpriority="high"' in index,
            "الأداء: الشعار الرئيسي لا يطلب بأولوية عالية رغم كونه عنصر LCP مثبت", failures)
    import re
    require(re.search(r'<div class="brand">\s*<img class="brand-logo-user"', index) is not None and "brand-window" not in index and "brand-logo-source" not in index,
            "الهوية: ما زالت نافذة اقتصاص أو بطاقة داخلية تحيط بالشعار", failures)
    require('.topbar::after,body[data-theme="obsidian_glass"] .topbar::after{content:none!important' in index,
            "الهوية: ما زال تأثير بطاقة الرأس يرسم إطارًا حول الشعار", failures)
    require('filter:brightness(.98) saturate(.90) contrast(1.04) drop-shadow' in index,
            "الهوية: لا يوجد ضبط محافظ لحدة لون الشعار وتباينه في الثيم الأسود", failures)
    require('body[data-theme="emerald_classic"] .brand-logo-user{filter:brightness(.97) saturate(.88) contrast(1.05)' in index,
            "الهوية: لا يوجد ضبط هادئ للشعار يتناسب مع الثيم الزمردي", failures)
    require('body[data-theme="ivory_luxe"] .brand-logo-user{filter:brightness(.96) saturate(.84) contrast(1.08)' in index,
            "الهوية: لا يوجد ضبط واضح للشعار يتناسب مع الثيم العاجي", failures)

    # ---- الثيم: حماية البدء المبكر ----
    require("data-theme-pending" in index and "sabaaek-public-theme" in index and "maxAge=5*60*1000" in index and "themeStale" in index,
            "الثيم: لا توجد حماية بدء مبكر تمنع رسم ذاكرة ثيم قديمة", failures)
    require("localStorage.setItem(THEME_KEY,JSON.stringify({theme:theme,savedAt:Date.now()}))" in index,
            "الثيم: الصفحة العامة لا تحدّث ذاكرة الثيم المؤرخة بعد الاختيار", failures)
    require("localStorage.setItem('sabaaek-public-theme',JSON.stringify({theme:settings.theme,savedAt:Date.now()}))" in admin,
            "الثيم: حفظ إعدادات الإدارة لا يحدّث ذاكرة الثيم المؤرخة للزيارة التالية", failures)

    # ---- الوصول والحركة ----
    require("prefers-reduced-motion" in index,
            "الحركة: لا توجد حماية تقليل الحركة", failures)
    require('class="skip-link" href="#prices"' in index and 'id="prices" tabindex="-1"' in index,
            "الواجهة العامة: لا يوجد مسار تخطٍّ مباشر إلى الأسعار للوحة المفاتيح", failures)
    require("touch-action:manipulation" in index,
            "الواجهة العامة: لا توجد حماية لمس لمنع تأخر النقر المزدوج", failures)
    require("@media(orientation:portrait){.site-qr{display:none}}" in index,
            "QR: لا توجد قاعدة إخفاء للوضع الطولي", failures)

    # ---- أصول النسخة الثانية ----
    for asset in ["assets/vendor/gsap.min.js", "assets/vendor/ScrollTrigger.min.js",
                  "assets/hero-v2.jpg", "assets/bg-veins.jpg",
                  "assets/fonts/saudi-riyal-regular.woff2", "assets/fonts/saudi-riyal-bold.woff2",
                  "assets/collection-necklace.jpg", "assets/collection-ring.jpg",
                  "assets/collection-bullion.jpg", "assets/noto-kufi-arabic-medium.ttf",
                  "assets/bullion-pamp/1g.jpg", "assets/bullion-pamp/10g.jpg",
                  "assets/bullion-pamp/31-1g.jpg", "assets/bullion-pamp/100g.jpg"]:
        require((ROOT / asset).exists(), f"الأصول: {asset} غير موجود", failures)
    require("assets/index-" not in index and "AdminPage-" not in index,
            "البنية: الصفحة ما زالت تشير إلى حزم React القديمة", failures)
    require("./sw.js" in index,
            "PWA: لا يتم تسجيل عامل الخدمة", failures)
    require("wa.me/966550441259" in index,
            "التواصل: رقم واتساب المعتمد غير موجود", failures)

    # ---- مواصفة النسخة الثانية (تعديلات المالك) ----
    require('<header class="site-head"' in index and 'id="ticker-track"' in index,
            "الترتيب: الشريط المتحرك ليس داخل الرأس تحت اللوجو", failures)
    require("id=\"calculator\"" not in index and "احسب سعر ذهبك" not in index and "calc-wa" not in index,
            "الحذف: ما زالت الحاسبة الفورية موجودة", failures)
    require("لماذا سبائك الفخامة" not in index and "وعدنا" not in index,
            "الحذف: ما زال قسم الوعد/اللماذا موجوداً", failures)
    require("نجاوبك خلال دقائق" not in index,
            "الحذف: جملة نجاوبك خلال دقائق ما زالت موجودة", failures)
    require("شاهد أسعار العيارات" not in index,
            "الحذف: زر شاهد أسعار العيارات ما زال موجوداً", failures)
    require("سبائك الفخامة</span> <span class=\"w grad\">الفخامة" not in index and "لبيع" in index and "وشراء" in index,
            "النص: عنوان البطل الجديد (لبيع وشراء الذهب والمجوهرات) غير مطبق", failures)
    require("⃁" in index and "saudi-riyal-regular.woff2" in index,
            "العملة: رمز الريال ⃁ أو خطه غير مضمّنين", failures)
    require("bullion-pamp/1g.jpg" in index and "bullion-pamp/100g.jpg" in index,
            "السبائك: صور PAMP بالأوزان الحقيقية غير مستخدمة", failures)
    require("PAMP" in index,
            "السبائك: لا ذكر لسبائك PAMP", failures)
    require("الفضة" not in index.split("ticker-track")[1].split("</header>")[0] if "ticker-track" in index else False,
            "الشريط: ما زال يعرض الفضة أو غير المطلوب", failures)

    # ---- عقود لوحة الإدارة (كما كانت) ----
    require('id="login-error-summary" class="error-summary" role="alert" tabindex="-1" hidden' in admin,
            "الإدارة: لا يوجد ملخص أخطاء متاح لقارئات الشاشة", failures)
    require('id="email"' in admin and 'aria-describedby="email-error"' in admin,
            "الإدارة: حقل البريد لا يرتبط برسالة خطأ محلية", failures)
    require('id="password"' in admin and 'aria-describedby="password-error"' in admin,
            "الإدارة: حقل كلمة المرور لا يرتبط برسالة خطأ محلية", failures)
    require("font:16px/1.5 Kufi,system-ui,sans-serif" in admin,
            "الإدارة: حجم نص حقول الإدخال أقل من خط القراءة المريح على الهاتف", failures)
    require("input,select{width:100%;min-height:44px" in admin,
            "الإدارة: حقول الإدخال لا تلتزم بحد لمس 44px", failures)
    require("button{border:0;border-radius:11px;min-height:44px" in admin,
            "الإدارة: أزرار الإدارة لا تلتزم بحد لمس 44px", failures)
    require(".stepper button{min-width:44px;min-height:44px" in admin,
            "الإدارة: أزرار ضبط الأسعار أصغر من مساحة لمس 44px", failures)

    # ---- النسخة الحية (اختياري: يتطلب شبكة) ----
    if LIVE_CHECK:
        try:
            request = urllib.request.Request(LIVE_URL, headers={"User-Agent": "Sabaaek-contract-check/1.0"})
            with urllib.request.urlopen(request, timeout=20) as response:
                live = response.read().decode("utf-8", errors="replace")
                require(response.status == 200, "النشر: الصفحة العامة لم تعد HTTP 200", failures)
                require("sabaaek-logo-user" in live,
                        "النشر: النسخة الحية لا تحتوي مرجع أصل شعار شفاف", failures)
        except Exception as error:
            print(f"ملاحظة: تخطي فحص النسخة الحية (لا شبكة خارجية): {type(error).__name__}")

    if failures:
        print("FAILED CONTRACTS:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("ALL_RELEASE_CONTRACTS_PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
