
export const TALENT_POOL = [
  {
    id: 't_genius',
    name: '天纵奇才',
    type: 'buff',
    effect: { int: 5, luck: 2 },
    desc: '智力+5，幸运+2。你从小就很聪明。',
    rarity: 'epic'
  },
  {
    id: 't_strong',
    name: '天生神力',
    type: 'buff',
    effect: { str: 5, con: 2 },
    desc: '力量+5，体质+2。力气比同龄人大很多。',
    rarity: 'rare'
  },
  {
    id: 't_sickly',
    name: '体弱多病',
    type: 'debuff',
    effect: { con: -5, maxHealth: -10 },
    desc: '体质-5，寿命上限-10。从小药不离口。',
    rarity: 'common'
  },
  {
    id: 't_beauty',
    name: '倾国倾城',
    type: 'buff',
    effect: { chr: 10 },
    desc: '容貌+10。无论走到哪里都备受关注。',
    rarity: 'legendary'
  },
  {
    id: 't_poor',
    name: '家徒四壁',
    type: 'debuff',
    effect: { startMoney: -50 },
    desc: '开局资金减少 50。',
    rarity: 'common'
  }
]
