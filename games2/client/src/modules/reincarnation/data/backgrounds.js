// src/modules/reincarnation/data/backgrounds.js

// 基础地名库（用于随机生成普通身世）
const LOCATIONS = [
  '幽州', '并州', '冀州', '青州', '徐州', '豫州', '凉州', '益州', 
  '扬州', '荆州', '交州', '长安', '洛阳', '建康', '成都', '杭州', 
  '苏州', '扬州', '广州', '登州', '泉州', '开封', '临安', '大都'
]

// 精选的特殊身世库 (25个)
const UNIQUE_BACKGROUNDS = [
  // --- 【皇权贵胄】 ---
  {
    id: 'bg_royal_prince',
    name: '九五至尊',
    rarity: 'legendary',
    location: '皇宫',
    description: '你生来便是太子，锦衣玉食，天下皆是你的。',
    father: { name: '当今圣上', job: '皇帝', trait: '多疑' },
    mother: { name: '皇后', trait: '端庄' },
    baseStats: { str: 3, int: 5, chr: 5, con: 2, luck: 5 },
    startMoney: 10000,
    familyStatus: '皇室'
  },
  {
    id: 'bg_prime_minister',
    name: '权相之后',
    rarity: 'legendary',
    location: '相府',
    description: '父亲是一人之下万人之上的宰相，家中权势滔天。',
    father: { name: '张居正', job: '首辅', trait: '权谋' },
    mother: { name: '王夫人', trait: '精明' },
    baseStats: { int: 5, luck: 3, chr: 4, con: 0 },
    startMoney: 5000,
    familyStatus: '权贵'
  },
  {
    id: 'bg_imperial_clan',
    name: '落魄皇族',
    rarity: 'epic',
    location: '破败王府',
    description: '虽是皇族血脉，但因朝堂争斗家道中落，只剩虚名。',
    father: { name: '闲散王爷', job: '无', trait: '颓废' },
    mother: { name: '侧福晋', trait: '抱怨' },
    baseStats: { int: 2, chr: 4, luck: 1, con: -1 },
    startMoney: 200,
    familyStatus: '没落贵族'
  },

  // --- 【名门世家】 ---
  {
    id: 'bg_general_son',
    name: '将门虎子',
    rarity: 'epic',
    location: '雁门关',
    description: '父亲是威震边关的大将军，你从小在军营长大。',
    father: { name: '霍去病', job: '大将军', trait: '威严' },
    mother: { name: '公孙氏', trait: '刚烈' },
    baseStats: { str: 5, con: 4, int: -1 },
    startMoney: 800,
    familyStatus: '武将世家'
  },
  {
    id: 'bg_scholar_family',
    name: '书香门第',
    rarity: 'rare',
    location: '徽州',
    description: '祖上三代读书，规矩极多，你从小饱读诗书。',
    father: { name: '孔夫子', job: '教书先生', trait: '迂腐' },
    mother: { name: '孟氏', trait: '贤惠' },
    baseStats: { int: 4, chr: 1, str: -2, con: -1 },
    startMoney: 300,
    familyStatus: '士族'
  },
  {
    id: 'bg_doctor_family',
    name: '杏林世家',
    rarity: 'rare',
    location: '终南山',
    description: '父亲是神医，你耳濡目染，略懂医理。',
    father: { name: '华佗', job: '神医', trait: '仁慈' },
    mother: { name: '青囊', trait: '善良' },
    baseStats: { int: 2, dex: 2, con: 1 },
    startMoney: 400,
    familyStatus: '名医世家'
  },
  {
    id: 'bg_artist_family',
    name: '丹青世家',
    rarity: 'rare',
    location: '江南',
    description: '家中世代皆为画师，琴棋书画样样精通。',
    father: { name: '唐伯虎', job: '画家', trait: '风流' },
    mother: { name: '秋香', trait: '温柔' },
    baseStats: { int: 2, chr: 3, dex: 1 },
    startMoney: 500,
    familyStatus: '艺术世家'
  },

  // --- 【商贾巨富】 ---
  {
    id: 'bg_salt_merchant',
    name: '盐商巨贾',
    rarity: 'epic',
    location: '扬州',
    description: '家里垄断盐运，富可敌国，但也树敌不少。',
    father: { name: '鲍财神', job: '盐商', trait: '霸道' },
    mother: { name: '赵姨娘', trait: '妩媚' },
    baseStats: { int: 1, luck: 2, chr: 3, con: 0 },
    startMoney: 1500,
    familyStatus: '皇商'
  },
  {
    id: 'bg_silk_merchant',
    name: '丝绸富商',
    rarity: 'rare',
    location: '杭州',
    description: '经营丝绸生意，府邸雕梁画栋。',
    father: { name: '沈万三', job: '丝绸商', trait: '精明' },
    mother: { name: '柳如烟', trait: '优雅' },
    baseStats: { int: 2, luck: 3, chr: 2 },
    startMoney: 1000,
    familyStatus: '富商'
  },

  // --- 【江湖草莽】 ---
  {
    id: 'bg_bandit_king',
    name: '绿林好汉',
    rarity: 'epic',
    location: '梁山',
    description: '父亲是山大王，虽然不被官府认可，但兄弟众多。',
    father: { name: '宋江', job: '山大王', trait: '义气' },
    mother: { name: '阎婆惜', trait: '泼辣' },
    baseStats: { str: 4, con: 3, luck: 1 },
    startMoney: 300,
    familyStatus: '草莽'
  },
  {
    id: 'bg_swordsman',
    name: '剑客之子',
    rarity: 'rare',
    location: '漠北',
    description: '父亲是江湖浪子，教你一手好剑法，居无定所。',
    father: { name: '独孤求败', job: '剑客', trait: '孤傲' },
    mother: { name: '无', trait: '无' },
    baseStats: { dex: 4, str: 2, luck: 1 },
    startMoney: 50,
    familyStatus: '江湖儿女'
  },

  // --- 【普通平民】 ---
  {
    id: 'bg_farmer_rich',
    name: '富庶农户',
    rarity: 'common',
    location: '成都',
    description: '家里有几十亩良田，在村里算是小地主，生活富足。',
    father: { name: '王二狗', job: '富农', trait: '吝啬' },
    mother: { name: '李氏', trait: '节俭' },
    baseStats: { str: 2, con: 2 },
    startMoney: 200,
    familyStatus: '富农'
  },
  {
    id: 'bg_craftsman_iron',
    name: '铁匠之子',
    rarity: 'common',
    location: '洛阳',
    description: '从小听惯了打铁声，身体结实，手掌布满老茧。',
    father: { name: '铁匠李', job: '铁匠', trait: '固执' },
    mother: { name: '刘氏', trait: '唠叨' },
    baseStats: { str: 3, con: 1, int: -1 },
    startMoney: 100,
    familyStatus: '工匠'
  },
  {
    id: 'bg_hunter_mountain',
    name: '猎户之后',
    rarity: 'common',
    location: '秦岭',
    description: '出生在深山，跟着父亲打猎，练就了敏锐的直觉。',
    father: { name: '猎户张', job: '猎人', trait: '勇敢' },
    mother: { name: '山妮', trait: '淳朴' },
    baseStats: { dex: 3, str: 1, int: -1 },
    startMoney: 50,
    familyStatus: '平民'
  },
  {
    id: 'bg_fisher_water',
    name: '水上人家',
    rarity: 'common',
    location: '洞庭湖',
    description: '一生都在船上度过，水性极佳。',
    father: { name: '渔夫', job: '渔民', trait: '粗犷' },
    mother: { name: '渔婆', trait: '水性' },
    baseStats: { con: 2, dex: 2 },
    startMoney: 30,
    familyStatus: '平民'
  },

  // --- 【贫困潦倒】 ---
  {
    id: 'bg_beggar_temple',
    name: '寺庙孤儿',
    rarity: 'common',
    location: '少林寺',
    description: '被遗弃在山门前，由老方丈抚养长大。',
    father: { name: '方丈', job: '和尚', trait: '慈悲' },
    mother: { name: '无', trait: '无' },
    baseStats: { con: 2, str: 1, luck: 1 },
    startMoney: 5,
    familyStatus: '僧侣'
  },
  {
    id: 'bg_refugee',
    name: '流民之子',
    rarity: 'common',
    location: '流民营',
    description: '因战乱失去家园，跟随父母四处逃荒。',
    father: { name: '流民', job: '无', trait: '绝望' },
    mother: { name: '流民', trait: '体弱' },
    baseStats: { con: -1, luck: -2 },
    startMoney: 0,
    familyStatus: '乞丐'
  },
  {
    id: 'bg_slave',
    name: '家生奴婢',
    rarity: 'common',
    location: '京城',
    description: '生来就是奴籍，没有自由，属于主人的财产。',
    father: { name: '家奴', job: '仆人', trait: '卑躬' },
    mother: { name: '洗衣妇', trait: '胆小' },
    baseStats: { str: -1, int: -1, con: 1 },
    startMoney: 0,
    familyStatus: '贱籍'
  },

  // --- 【特殊职业】 ---
  {
    id: 'bg_musician_court',
    name: '教坊司乐师',
    rarity: 'rare',
    location: '教坊司',
    description: '精通音律，身份低微，常需侍奉权贵。',
    father: { name: '乐师', job: '乐师', trait: '风流' },
    mother: { name: '舞姬', trait: '妩媚' },
    baseStats: { chr: 4, int: 1, str: -2 },
    startMoney: 100,
    familyStatus: '贱籍'
  },
  {
    id: 'bg_taoist',
    name: '道童',
    rarity: 'rare',
    location: '龙虎山',
    description: '自幼在道观修行，虽不富裕，但清心寡欲。',
    father: { name: '道长', job: '道士', trait: '超脱' },
    mother: { name: '无', trait: '无' },
    baseStats: { int: 3, con: 1, luck: 2 },
    startMoney: 10,
    familyStatus: '道士'
  }
]

// 随机生成函数：补充剩下的背景，保证总数足够多
function generateGenericBackgrounds(count) {
  const generics = []
  const jobs = ['农夫', '樵夫', '货郎', '屠夫', '秀才', '店小二', '更夫']
  const traits = ['老实', '木讷', '乐观', '悲观', '胆小', '粗鲁']
  
  for (let i = 0; i < count; i++) {
    const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)]
    const job = jobs[Math.floor(Math.random() * jobs.length)]
    const trait = traits[Math.floor(Math.random() * traits.length)]
    
    generics.push({
      id: `bg_generic_${i}`,
      name: `${loc}${job}`,
      rarity: 'common',
      location: loc,
      description: `出生在${loc}的一个普通家庭，父亲是一名${job}。`,
      father: { name: `张${job}`, job: job, trait: trait },
      mother: { name: '李氏', job: '主妇', trait: '勤劳' },
      baseStats: {
        str: Math.floor(Math.random() * 3),
        int: Math.floor(Math.random() * 3),
        con: Math.floor(Math.random() * 3),
        chr: Math.floor(Math.random() * 3),
        luck: Math.floor(Math.random() * 3)
      },
      startMoney: Math.floor(Math.random() * 50) + 10,
      familyStatus: '平民'
    })
  }
  return generics
}

// 导出合并后的完整列表 (25个精选 + 35个随机生成 = 60个)
export const BACKGROUNDS = [...UNIQUE_BACKGROUNDS, ...generateGenericBackgrounds(35)]
