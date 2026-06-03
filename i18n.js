const translations = {
    en: {
        "dashboard": "Dashboard",
        "live_map": "Live Map",
        "admins": "Admins",
        "buses": "Buses",
        "drivers": "Drivers",
        "stations": "Stations",
        "tickets": "Tickets",
        "routes": "Routes",
        "reports": "Reports",
        "sos_intelligence": "SOS Intelligence",
        "settings": "Settings",
        "logout": "Log Out",
        "bus_added_success": "Bus Added! 🚌",
        "error": "Error",
        "preferences": "Preferences",
        "language": "Language",
        "theme": "Theme",
        "settings_title": "Tactical Console Configuration",
        "nav_profile": "Command Profile",
        "nav_appearance": "UI Appearance",
        "nav_alerts": "Signal Alerts",
        "nav_security": "Protocol Security",
        "nav_system": "System Core",
        "profile_dossier": "Intelligence Dossier",
        "full_name_label": "Full Command Name",
        "email_label": "Signal Email",
        "phone_label": "Phone Frequency",
        "location_label": "Command Post (Location)",
        "update_btn": "Update Dossier",
        "appearance_title": "Visual Environment",
        "light_mode": "Solar Protocol",
        "dark_mode": "Void Protocol",
        "language_title": "Neural Language",
        "lang_en": "English (US)",
        "lang_ar": "العربية (EG)",
        "alert_incidents": "Sector Incidents",
        "alert_fleet": "Fleet Status Shifts",
        "alert_personnel": "Personnel Deployment",
        "security_title": "Access Encryption",
        "update_pass_btn": "Rotate Access Protocol",
        "danger_zone_title": "Terminal Zero",
        "reset_title": "Neural Reset",
        "danger_zone_title": "Terminal Zero",
        "reset_title": "Neural Reset",
        "reset_btn": "WIPE CONSOLE",
        "reset_desc": "Purge all local cache and protocol overrides",
        "light_mode_desc": "Clean & Precise (Light)",
        "dark_mode_desc": "Stealth & Focus (Dark)",
        "notif_complaints_desc": "Receive signals for new complaints and reports",
        "notif_fleet_desc": "Alerts for breakdown or delay sequences",
        "notif_drivers_desc": "Signals for new driver registrations",
        "regional_logistics": "Regional Logistics",
        "stations_desc": "Manage and monitor all regional transit hubs and terminal nodes.",
        "infrastructure_dir": "Infrastructure Directory",
        "add_station_btn": "Add New Station",
        "id": "ID",
        "station_name": "Station Name",
        "coordinates": "Coordinates",
        "assigned_route": "Assigned Route",
        "actions": "Actions",
        "search_hubs": "Search hubs...",
        "enter_full_name": "Enter Full Name",
        "phone_placeholder": "+20 XXX XXX XXXX",
        "location_placeholder": "e.g. Cairo Headquarters",
        "loading_stations": "Loading stations from server...",
        "network_error": "Network error — Could not reach server",
        "no_stations": "No stations found",
        "maintenance": "Maintenance",
        "line": "Line",
        "change_status": "Change Status",
        "edit_station": "Edit Station",
        "remove_station": "Remove Station",
        "select_route": "Select Route",
        "failed_load_routes": "Failed to load routes",
        "saving": "Saving...",
        "active": "Active",
        "inactive": "Inactive",
        "current_pass_label": "Current Security Key",
        "new_pass_label": "New Encryption Key",
        "confirm_pass_label": "Confirm Key",
        "new_pass_ph": "New Password",
        "confirm_pass_ph": "Confirm Password",
        "fleet_command_center": "Fleet Command Center",
        "select_date_range": "Select Date Range",
        "search_assets": "Deep search assets...",
        "welcome_back": "Welcome, ",
        "fleet_status": "Fleet Status: ",
        "all_systems_operational": "ALL SYSTEMS OPERATIONAL",
        "last_sync": "Last Sync",
        "connecting": "Connecting...",
        "total_drivers": "TOTAL DRIVERS",
        "active_now": "Active Now",
        "total_buses": "TOTAL BUSES",
        "in_fleet": "In Fleet",
        "complaints": "COMPLAINTS",
        "pending": "Pending",
        "bus_status": "BUS STATUS",
        "performance_engine": "Performance Intelligence Engine",
        "trips": "Trips",
        "revenue_analytics": "Ticket Revenue Analytics",
        "profile_link": "View Profile",
        "toggle_language": "Change Language",
        "logout_link": "Sign Out",
        "notifications_title": "Intelligence Signals",
        "mark_all_read": "Acknowledge All",
        "view_all_alerts": "Complete Neural Log"
    },
    ar: {
        "dashboard": "لوحة التحكم",
        "live_map": "الخريطة",
        "admins": "المشرفين",
        "buses": "الحافلات",
        "drivers": "السائقين",
        "stations": "المحطات",
        "tickets": "التذاكر",
        "routes": "المسارات",
        "reports": "الإشعارات والتقارير",
        "sos_intelligence": "طوارئ SOS",
        "settings": "الإعدادات",
        "logout": "تسجيل الخروج",
        "bus_added_success": "تمت إضافة الحافلة! 🚌",
        "error": "خطأ",
        "preferences": "تفضيلات النظام",
        "language": "اللغة",
        "theme": "المظهر",
        "settings_title": "إعدادات وحدة التحكم التكتيكية",
        "nav_profile": "ملف القيادة",
        "nav_appearance": "مظهر الواجهة",
        "nav_alerts": "تنبيهات الإشارة",
        "nav_security": "بروتوكول الأمان",
        "nav_system": "نواة النظام",
        "profile_dossier": "ملف الاستخبارات",
        "full_name_label": "اسم القائد بالكامل",
        "email_label": "بريد الإشارة",
        "phone_label": "تردد الهاتف",
        "location_label": "مركز القيادة (الموقع)",
        "update_btn": "تحديث الملف",
        "appearance_title": "البيئة المرئية",
        "light_mode": "بروتوكول شمسي (مضيء)",
        "dark_mode": "بروتوكول الفراغ (مظلم)",
        "language_title": "اللغة العصبية",
        "lang_en": "الإنجليزية (US)",
        "lang_ar": "العربية (EG)",
        "alert_incidents": "حوادث القطاع",
        "alert_fleet": "تحولات حالة الأسطول",
        "alert_personnel": "نشر الأفراد",
        "security_title": "تشفير الوصول",
        "update_pass_btn": "تدوير بروتوكول الوصول",
        "danger_zone_title": "نقطة الصفر",
        "reset_title": "إعادة التعيين العصبي",
        "danger_zone_title": "نقطة الصفر",
        "reset_title": "إعادة التعيين العصبي",
        "reset_btn": "مسح وحدة التحكم",
        "reset_desc": "مسح جميع ملفات التخزين المؤقت وتجاوزات البروتوكول",
        "light_mode_desc": "نظيف ودقيق (مضيء)",
        "dark_mode_desc": "خفي ومركز (مظلم)",
        "notif_complaints_desc": "تلقي إشارات عن الشكاوى والتقارير الجديدة",
        "notif_fleet_desc": "تنبيهات لسلاسل الأعطال أو التأخير",
        "notif_drivers_desc": "إشارات لتسجيلات السائقين الجدد",
        "regional_logistics": "الخدمات اللوجستية الإقليمية",
        "stations_desc": "إدارة ومراقبة جميع مراكز العبور الإقليمية وعقد المحطات.",
        "infrastructure_dir": "دليل البنية التحتية",
        "add_station_btn": "إضافة محطة جديدة",
        "id": "المعرف",
        "station_name": "اسم المحطة",
        "coordinates": "الإحداثيات",
        "assigned_route": "المسار المعين",
        "actions": "إجراءات",
        "search_hubs": "بحث في المراكز...",
        "enter_full_name": "أدخل الاسم بالكامل",
        "phone_placeholder": "+20 XXX XXX XXXX",
        "location_placeholder": "مثال: مقر القاهرة",
        "loading_stations": "جاري تحميل المحطات من الخادم...",
        "network_error": "خطأ في الشبكة - تعذر الاتصال بالخادم",
        "no_stations": "لم يتم العثور على محطات",
        "maintenance": "صيانة",
        "line": "خط",
        "change_status": "تغيير الحالة",
        "edit_station": "تعديل المحطة",
        "remove_station": "حذف المحطة",
        "select_route": "اختر المسار",
        "failed_load_routes": "فشل تحميل المسارات",
        "saving": "جاري الحفظ...",
        "active": "نشط",
        "inactive": "غير نشط",
        "current_pass_label": "مفتاح الأمان الحالي",
        "new_pass_label": "مفتاح التشفير الجديد",
        "confirm_pass_label": "تأكيد المفتاح",
        "new_pass_ph": "كلمة المرور الجديدة",
        "confirm_pass_ph": "تأكيد كلمة المرور",
        "fleet_command_center": "مركز قيادة الأسطول",
        "select_date_range": "اختر الفترة الزمنية",
        "search_assets": "بحث عميق في الأصول...",
        "welcome_back": "مرحباً، ",
        "fleet_status": "حالة الأسطول: ",
        "all_systems_operational": "جميع الأنظمة تعمل بشكل طبيعي",
        "last_sync": "آخر مزامنة",
        "connecting": "جاري الاتصال...",
        "total_drivers": "إجمالي السائقين",
        "active_now": "نشط الآن",
        "total_buses": "إجمالي الحافلات",
        "in_fleet": "في الأسطول",
        "complaints": "الشكاوى",
        "pending": "قيد الانتظار",
        "bus_status": "حالة الحافلات",
        "performance_engine": "محرك ذكاء الأداء",
        "trips": "الرحلات",
        "revenue_analytics": "تحليلات إيرادات التذاكر",
        "profile_link": "عرض الملف الشخصي",
        "toggle_language": "تغيير اللغة",
        "logout_link": "تسجيل الخروج",
        "notifications_title": "إشارات الاستخبارات",
        "mark_all_read": "تأكيد القراءة للكل",
        "view_all_alerts": "السجل العصبي الكامل"
    }
};

const strictTextMappings = {
    "Add New Bus": "إضافة حافلة جديدة",
    "Assign driver to bus": "تعيين سائق لحافلة",
    "Bus ID": "معرف الحافلة",
    "Bus Number": "رقم الحافلة",
    "Plate Number": "رقم اللوحة",
    "License Number": "رقم الرخصة",
    "Route ID": "معرف المسار",
    "Capacity": "السعة",
    "Current Driver": "السائق الحالي",
    "Live Speed": "السرعة الحالية",
    "Status": "الحالة",
    "Actions": "إجراءات",
    "Active": "نشط",
    "Inactive": "غير نشط",
    "Add New Admin": "إضافة مشرف جديد",
    "Admin Name": "اسم المشرف",
    "Admin ID": "معرف المشرف",
    "Email": "البريد الإلكتروني",
    "Phone Number": "رقم الهاتف",
    "Email Address": "البريد الإلكتروني",
    "Generate Ticket": "إصدار تذكرة",
    "Export CSV": "تصدير CSV",
    "Search by name, ID or email...": "ابحث بالاسم، المعرف، أو البريد...",
    "Search by Bus ID, Route, or Driver...": "ابحث بمعرف الحافلة، المسار، الخ...",
    "Search Ticket ID or User...": "ابحث بمعرف التذكرة أوالراكب...",
    "Live Tracking Intelligence": "التتبع الذكي المباشر",
    "Fleet Management": "إدارة الأسطول",
    "Admins Management": "إدارة المشرفين",
    "Drivers Management": "إدارة السائقين",
    "Stations Network": "شبكة المحطات",
    "Tickets & Sales": "التذاكر والمبيعات",
    "Reports / Complaints": "التقارير والإشعارات",
    "Display Name": "اسم العرض",
    "Location": "الموقع الجغرافي",
    "Admin Profile Details": "بيانات حساب المشرف",
    "Save Changes": "حفظ التعديلات",
    "By User": "بواسطة الراكب",
    "Use QR": "مسح QR",
    "Report ID": "معرف التقرير",
    "User ID": "معرف المستخدم",
    "Message / Prediction": "الرسالة / التنبؤ",
    "Status Date": "تاريخ الحالة",
    "Departure Station": "محطة الانطلاق",
    "Destination Station": "محطة الوصول",
    "TRACK ROUTE": "تتبع المسار",
    "Total Buses": "إجمالي الحافلات",
    "Active Routes": "المسارات النشطة",
    "Total Stations": "عدد المحطات",
    "Total Tickets": "إجمالي التذاكر",
    "Search by Bus ID, Route, or Driver...": "ابحث بمعرف الحافلة، المسار...",
    "Dashboard": "لوحة التحكم",
    "Sold Tickets": "إجمالي المباعة",
    "Total Drivers": "إجمالي السائقين",
    "Active Buses": "الحافلات النشطة",
    "Crowd Stations": "المحطات المزدحمة",
    "Item approvals in": "الموافقات في",
    "This week": "هذا الأسبوع",
    "This month": "هذا الشهر",
    "Hello": "مرحباً",
    "All Stations": "جميع المحطات",
    "Station ID": "معرف المحطة",
    "Station Name": "اسم المحطة",
    "Coordinates (Lat, Lng)": "الإحداثيات",
    "Assigned Lines": "الخطوط",
    "Manage bus stops and locations": "إدارة محطات الحافلات",
    "View on Map": "عرض على الخريطة",
    "Add Station": "إضافة محطة",
    "Save Station": "حفظ المحطة",
    "Add New Station": "إضافة محطة جديدة",
    "Routes": "المسارات",
    "Route's List": "قائمة المسارات",
    "Route Id": "معرف المسار",
    "Route Number": "رقم المسار",
    "Name": "الاسم",
    "Add New": "إضافة جديد",
    "Add New Route": "إضافة مسار جديد",
    "Route Name": "اسم المسار",
    "Main Station": "المحطة الرئيسية",
    "Save Route": "حفظ المسار",
    "Cancel": "إلغاء",
    "Account": "الحساب",
    "Log Out": "تسجيل الخروج",
    "Sign out of your admin account": "الخروج من حساب المشرف",
    "Daily": "يومي",
    "Weekly": "أسبوعي",
    "Monthly": "شهري",
    "Yearly": "سنوي",
    "Revenue": "إجمالي الإيرادات",
    "Revenue (EGP)": "إجمالي الإيرادات (ج.م)",
    "Used Tickets": "التذاكر المستخدمة",
    "Available Tickets": "التذاكر المتاحة",
    "Available": "المتاحة",
    "Sold": "المباعة",
    "Recent Transactions": "سجل المعاملات الأخير",
    "View All": "عرض الكل",
    "Ticket ID": "رقم التذكرة",
    "Passenger": "الراكب",
    "Route": "المسار",
    "Date": "التاريخ",
    "Price": "السعر",
    "Price (EGP)": "السعر (ج.م)",
    "Invalid Price": "سعر غير صالح",
    "Profile": "الملف الشخصي",
    "Appearance": "المظهر",
    "Notifications": "الإشعارات",
    "System": "النظام",
    "Security": "الأمان",
    "System Administrator — Ministry of Public Transport": "مسؤول النظام — وزارة النقل العام",
    "Super Admin": "مشرف فائق",
    "Online": "متصل",
    "Personal Information": "المعلومات الشخصية",
    "Update your personal details and contact information": "قم بتحديث بياناتك الشخصية ومعلومات الاتصال",
    "Department": "القسم",
    "Employee ID": "معرف الموظف",
    "Appearance & Language": "المظهر واللغة",
    "Customize how TransitWay looks and feels": "قم بتخصيص مظهر وتجربة TransitWay",
    "Choose between light and dark mode": "اختر بين الوضع المضيء والداكن",
    "Select your preferred display language": "اختر لغة العرض المفضلة لديك",
    "Compact Mode": "الوضع المدمج",
    "Reduce spacing for denser data display": "تقليل المسافات لعرض بيانات بكثافة أكبر",
    "Animations": "الرسوم المتحركة",
    "Enable smooth UI transitions and effects": "تفعيل الانتقالات والتأثيرات المرئية السلسة",
    "Notification Preferences": "تفضيلات الإشعارات",
    "Control which alerts and updates you receive": "تحكم في التنبيهات والتحديثات التي تتلقاها",
    "Complaint Reports": "تقارير الشكاوى",
    "Get notified when new bus complaints are filed": "تلقي إشعار عند تقديم شكاوى جديدة عن الحافلات",
    "Bus Status Changes": "تغييرات حالة الحافلات",
    "Alerts when buses go inactive or return to service": "تنبيهات عند تعطل الحافلات أو عودتها للخدمة",
    "Ticket Sales Milestones": "مراحل مبيعات التذاكر",
    "Notifications when daily sales targets are reached": "إشعارات عند تحقيق أهداف المبيعات اليومية",
    "New Driver Registration": "تسجيل سائق جديد",
    "Get notified when new drivers join the system": "تلقي إشعار عند انضمام سائقين جدد للنظام",
    "Daily Summary Report": "الملخص اليومي",
    "Receive end-of-day operational summary": "تلقي ملخص تشغيلي في نهاية اليوم",
    "System Information": "معلومات النظام",
    "Technical details about the TransitWay platform": "التفاصيل الفنية المتعلقة بمنصة TransitWay",
    "Version": "الإصدار",
    "API Status": "حالة API",
    "Backend": "الخادم الخلفي",
    "Uptime": "مدة التشغيل",
    "Connection": "الاتصال",
    "Checking...": "جاري الفحص...",
    "Security & Account": "الأمان والحساب",
    "Manage your passwords and security preferences": "إدارة كلمات المرور وتفضيلات الأمان الخـاصة بك",
    "Change Password": "تغيير كلمة المرور",
    "Update your login password regularly for security": "قم بتحديث كلمة مرورك بانتظام لمزيد من الأمان",
    "Current Password": "كلمة المرور الحالية",
    "New Password": "كلمة المرور الجديدة",
    "Confirm New Password": "تأكيد كلمة المرور الجديدة",
    "Update Password": "تحديث كلمة المرور",
    "Danger Zone": "منطقة الخطر",
    "Irreversible actions for your account": "إجراءات لا يمكن التراجع عنها في حسابك",
    "Clear Cache & Local Data": "مسح الذاكرة المؤقتة",
    "Resets unsaved preferences and local app storage": "إعادة تعيين التفضيلات غير المحفوظة والمساحة المحلية",
    "Clear Data": "مسح البيانات",
    "Delete Account": "حذف الحساب",
    "Permanently remove your admin access from the system": "إزالة وصولك كمسؤول من النظام بشكل دائم",
    "Warn": "تحذير",
    "Ban": "حظر",
    "Unban": "إلغاء الحظر",
    "Delete": "حذف",
    "Details": "التفاصيل"
};

function getLang() {
    return localStorage.getItem('transitLang') || 'en';
}

function setLang(lang) {
    localStorage.setItem('transitLang', lang);
    applyLang();
}

function t(key, params = {}) {
    let str = translations[getLang()][key] || key;
    for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, v);
    }
    return str;
}

function walkTextNodesAndTranslate(node, toAr) {
    if (node.nodeType === 3) { 
        let originalText = node.nodeValue.trim();
        if (!originalText) return;
        
        if (toAr) {
            for (const [enTerm, arTerm] of Object.entries(strictTextMappings)) {
                if (originalText === enTerm) {
                    node.nodeValue = node.nodeValue.replace(enTerm, arTerm);
                    if (node.parentElement) node.parentElement.setAttribute('data-original-en', enTerm);
                }
            }
        } else {
            if (node.parentElement) {
                const storedEn = node.parentElement.getAttribute('data-original-en');
                if (storedEn) {
                    const arTerm = strictTextMappings[storedEn];
                    if (arTerm && node.nodeValue.includes(arTerm)) {
                        node.nodeValue = node.nodeValue.replace(arTerm, storedEn);
                    }
                }
            }
        }
    } else if (node.nodeType === 1 && node.nodeName !== "SCRIPT" && node.nodeName !== "STYLE") {
        let placeholder = node.getAttribute('placeholder');
        if (placeholder) {
            if (toAr) {
                for (const [enTerm, arTerm] of Object.entries(strictTextMappings)) {
                    if (placeholder === enTerm) {
                        node.setAttribute('placeholder', arTerm);
                        node.setAttribute('data-orig-ph', enTerm);
                    }
                }
            } else {
                let origPh = node.getAttribute('data-orig-ph');
                if (origPh) node.setAttribute('placeholder', origPh);
            }
        }
        
        for (let i = 0; i < node.childNodes.length; i++) {
            walkTextNodesAndTranslate(node.childNodes[i], toAr);
        }
    }
}

function applyLang() {
    const lang = getLang();
    document.documentElement.setAttribute('lang', lang);
    
    const isAr = (lang === 'ar');
    
    if (isAr) {
        document.documentElement.setAttribute('dir', 'rtl');
        document.body.classList.add('rtl-mode');
    } else {
        document.documentElement.setAttribute('dir', 'ltr');
        document.body.classList.remove('rtl-mode');
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            const icon = el.querySelector('i');
            if (icon) {
                el.innerHTML = '';
                el.appendChild(icon);
                el.appendChild(document.createTextNode(' ' + translations[lang][key]));
            } else {
                el.innerText = translations[lang][key];
            }
        }
    });

    document.querySelectorAll('[data-i18n-text]').forEach(el => {
        const enText = el.getAttribute('data-i18n-text');
        if (isAr && strictTextMappings[enText]) {
            el.innerText = strictTextMappings[enText];
        } else {
            el.innerText = enText;
        }
    });

    walkTextNodesAndTranslate(document.body, isAr);
    window.dispatchEvent(new Event('langChanged'));
}

document.addEventListener('DOMContentLoaded', () => {
    applyLang();

    // Keep SOS Intelligence tab visible across all pages
    /*
    const path = window.location.pathname.toLowerCase();
    const isDashboardOrReports = path.includes('dashboard.html') || path.includes('reports.html');
    if (!isDashboardOrReports) {
        const sosLink = document.querySelector('aside.sidebar a[href*="sos.html"], aside.sidebar a[data-i18n="sos_intelligence"]');
        if (sosLink) {
            sosLink.style.display = 'none';
        }
    }
    */

    
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#langToggle, #headerLangToggle');
        if (btn) {
            const current = getLang();
            const newLang = current === 'en' ? 'ar' : 'en';
            setLang(newLang);
        }
    });
});

const rtlStyles = `
<style>
  /* Base RTL */
  html[dir="rtl"] { direction: rtl; }
  
  /* Sidebar Adjustments */
  html[dir="rtl"] .sidebar {
      border-right: none;
      border-left: 1px solid var(--border-color);
  }
  html[dir="rtl"] .nav-link i {
      margin-right: 0;
      margin-left: 12px;
  }
  html[dir="rtl"] .sidebar-logo {
      flex-direction: row-reverse;
  }
  
  /* Top Bar Adjustments */
  html[dir="rtl"] .top-header {
      flex-direction: row-reverse;
  }
  html[dir="rtl"] .header-right {
      flex-direction: row-reverse;
  }
  html[dir="rtl"] .search-bar i {
      left: auto;
      right: 15px;
  }
  html[dir="rtl"] .search-bar input {
      padding: 10px 42px 10px 15px;
  }
  
  /* Metrics & Tables */
  html[dir="rtl"] .metric-header {
      flex-direction: row-reverse;
  }
  html[dir="rtl"] .metric-change {
      flex-direction: row-reverse;
  }
  html[dir="rtl"] .metric-card, html[dir="rtl"] .v-card {
      text-align: right;
  }
  html[dir="rtl"] table th, html[dir="rtl"] table td {
      text-align: right;
  }
  
  /* Shared Toggles Styling */
  .theme-toggle-btn, .lang-toggle-btn {
      width: 40px; height: 40px; border-radius: 12px; border: 1px solid var(--border-color);
      background: var(--bg-card); color: var(--text-main); display: flex; align-items: center;
      justify-content: center; cursor: pointer; transition: 0.2s; font-size: 1.1rem;
  }
  .theme-toggle-btn:hover, .lang-toggle-btn:hover { 
      border-color: var(--primary-color); color: var(--primary-color); transform: translateY(-2px); 
      background: rgba(16, 185, 129, 0.05);
  }
</style>
`;
document.head.insertAdjacentHTML('beforeend', rtlStyles);
