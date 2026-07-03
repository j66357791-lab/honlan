export const SHOP_ITEMS = [
  {
    id: 'item_menhalf',
    name: '孟婆汤(半碗)',
    price: 200,
    desc: '保留上一世 10% 的属性点转生。',
    type: 'rebirth',
    effect: 'keep_10pct'
  },
  {
    id: 'item_gold_finger',
    name: '金手指',
    price: 500,
    desc: '下辈子初始资金 +200。',
    type: 'start',
    effect: { startMoney: 200 }
  },
  {
    id: 'item_angel_kiss',
    name: '天使之吻',
    price: 300,
    desc: '下辈子必定随机到一个稀有(紫色)以上天赋。',
    type: 'start',
    effect: 'force_rare_talent'
  }
]
