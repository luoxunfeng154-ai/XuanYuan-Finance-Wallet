// 支持的货币列表（包含马来西亚令吉）
const CURRENCIES = {
  'TWD': { symbol: 'NT$', locale: 'zh-TW', name: '新台幣' },
  'MYR': { symbol: 'RM', locale: 'ms-MY', name: '馬來西亞令吉' },
  'USD': { symbol: '$', locale: 'en-US', name: '美元' },
  'SGD': { symbol: 'S$', locale: 'en-SG', name: '新加坡元' },
  'JPY': { symbol: '¥', locale: 'ja-JP', name: '日圓' },
  'EUR': { symbol: '€', locale: 'de-DE', name: '歐元' },
  'GBP': { symbol: '£', locale: 'en-GB', name: '英鎊' },
  'AUD': { symbol: 'A$', locale: 'en-AU', name: '澳元' },
  'CAD': { symbol: 'C$', locale: 'en-CA', name: '加元' },
  'CNY': { symbol: '¥', locale: 'zh-CN', name: '人民幣' },
  'HKD': { symbol: 'HK$', locale: 'zh-HK', name: '港幣' },
  'KRW': { symbol: '₩', locale: 'ko-KR', name: '韓元' },
  'THB': { symbol: '฿', locale: 'th-TH', name: '泰銖' }
};

// 當前選中的貨幣（預設新台幣，會從 localStorage 讀取）
let currentCurrency = 'TWD';

// 格式化金額的函數（會自動處理千分位和貨幣符號）
function formatCurrency(amount) {
  const currency = CURRENCIES[currentCurrency];
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currentCurrency
  }).format(amount);
}

// 切換貨幣
function switchCurrency(currencyCode) {
  if (CURRENCIES[currencyCode]) {
    currentCurrency = currencyCode;
    localStorage.setItem('userCurrency', currencyCode); // 儲存到本地
    loadTransactions(); // 重新加載交易以更新顯示
  }
}