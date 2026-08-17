const translations = {
  ar: {store:'المتجر',categories:'الفئات',admin:'الإدارة',login:'تسجيل الدخول',sell:'+ أضف منتجاً',cart:'🛒',heroKicker:'سوق واحد. عالم كامل.',heroTitle:'اكتشف ما تحب، وبِع ما تملك.',heroText:'منصة عصرية للشراء والبيع، مفتوحة للجميع حول العالم.',explore:'استكشف المنتجات',search:'ابحث عن منتج أو فئة...',all:'كل الفئات',latest:'الأحدث',catKicker:'تسوق حسب الفئة',catTitle:'الفئات',productKicker:'منتجات حقيقية',productTitle:'اكتشف الجديد',footer:'Soukis — سوق عالمي بسيط، سريع، ومفتوح للجميع.',notLogged:'غير مسجل',count:n=>`${n} منتج`,categoriesCount:n=>`${n} فئة`},
  fr: {store:'Boutique',categories:'Catégories',admin:'Administration',login:'Se connecter',sell:'+ Vendre un produit',cart:'🛒',heroKicker:'Un marché. Un monde entier.',heroTitle:'Trouvez ce que vous aimez, vendez ce que vous avez.',heroText:'Une marketplace moderne pour acheter et vendre, ouverte au monde entier.',explore:'Découvrir les produits',search:'Rechercher un produit ou une catégorie...',all:'Toutes les catégories',latest:'Les plus récents',catKicker:'Acheter par catégorie',catTitle:'Catégories',productKicker:'Produits réels',productTitle:'Découvrez les nouveautés',footer:'Soukis — une marketplace mondiale, simple, rapide et ouverte à tous.',notLogged:'Non connecté',count:n=>`${n} produit${n>1?'s':''}`,categoriesCount:n=>`${n} catégorie${n>1?'s':''}`},
  en: {store:'Store',categories:'Categories',admin:'Admin',login:'Sign in',sell:'+ Sell a product',cart:'🛒',heroKicker:'One marketplace. A whole world.',heroTitle:'Discover what you love, sell what you own.',heroText:'A modern marketplace for buying and selling, open to everyone worldwide.',explore:'Explore products',search:'Search for a product or category...',all:'All categories',latest:'Newest',catKicker:'Shop by category',catTitle:'Categories',productKicker:'Real products',productTitle:'Discover what’s new',footer:'Soukis — a simple, fast global marketplace open to everyone.',notLogged:'Not signed in',count:n=>`${n} product${n===1?'':'s'}`,categoriesCount:n=>`${n} categor${n===1?'y':'ies'}`}
};

export function getCurrentLanguage(){return localStorage.getItem('soukis-language')||'ar';}
export function t(key,...args){const lang=getCurrentLanguage();const value=(translations[lang]||translations.ar)[key];return typeof value==='function'?value(...args):(value??key);}

export function installI18n(){
  const select=document.querySelector('#lang');
  if(!select)return;
  const apply=lang=>{
    const tset=translations[lang]||translations.ar;
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='ar'?'rtl':'ltr';
    const setText=(selector,key)=>{const el=document.querySelector(selector);if(el)el.textContent=tset[key];};
    setText('nav a[href="#products"]','store');setText('nav a[href="#categories"]','categories');
    setText('#admin','admin');setText('#authBtn','login');setText('#sellBtn','sell');setText('#heroSell','sell');
    setText('.hero small','heroKicker');setText('.hero h1','heroTitle');setText('.hero p','heroText');setText('.hero .ghost','explore');
    const search=document.querySelector('#search');if(search)search.placeholder=tset.search;
    const category=document.querySelector('#category');if(category&&category.options[0])category.options[0].textContent=tset.all;
    const sort=document.querySelector('#sort');if(sort&&sort.options[0])sort.options[0].textContent=tset.latest;
    setText('#categories .section-head small','catKicker');setText('#categories h2','catTitle');
    setText('#products .section-head small','productKicker');setText('#products h2','productTitle');
    const footer=document.querySelector('footer');if(footer)footer.textContent=tset.footer;
    const session=document.querySelector('#session');if(session&&!session.dataset.loggedIn)session.textContent=tset.notLogged;
    localStorage.setItem('soukis-language',lang);
    window.dispatchEvent(new CustomEvent('soukis:language-changed',{detail:{lang}}));
  };
  const saved=getCurrentLanguage();select.value=translations[saved]?saved:'ar';select.addEventListener('change',()=>apply(select.value));apply(select.value);
}
