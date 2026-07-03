export const EVENT_POOL = [
  // ===== 0-2岁：婴幼儿时期 =====
  {
    id: 'e_teething',
    title: '长牙之痛',
    minAge: 0,
    maxAge: 1, // 0-1岁
    chance: 0.2,
    text: '你开始长牙了，牙床痒痒的，疼得你哇哇大哭，整晚睡不着。',
    choices: [
      { 
        text: '咬手指', 
        check: (s) => s.stats.con > 8,
        success: { text: '你咬破了自己的手指，但终于不哭了，身体适应了痛感。', effect: { con: 0.5, health: -2 } },
        fail: { text: '哭得撕心裂肺，把嗓子都哑了。', effect: { health: -5, con: -0.5 } }
      },
      { 
        text: '大哭大闹', 
        check: null, 
        success: { text: '父母抱了你一整夜，你的心情变好了。', effect: { mood: 5 } } 
      }
    ]
  },
  {
    id: 'e_zhuazhou',
    title: '周岁抓周',
    minAge: 0.9, // 11个月左右
    maxAge: 1.1,
    chance: 0.4, // 必发事件
    text: '父母为你举行了抓周仪式，桌上摆满了书本、印章、算盘、胭脂...',
    choices: [
      { 
        text: '抓书本 (智力判定)', 
        check: (s) => s.stats.int > 7, 
        success: { text: '你一把抓住了书本，父亲大喜过望，夸你将来是读书的料。', effect: { stats: { int: 2 }, mood: 5 } }, 
        fail: { text: '你盯着书本看了一会儿，还是抓起了旁边的拨浪鼓。', effect: { stats: { chr: 1 }, mood: 2 } } 
      },
      { 
        text: '抓印章 (家境/运气)', 
        check: (s) => s.stats.luck > 7, 
        success: { text: '你抓住了大印，周围宾客纷纷道贺，说你有官运！', effect: { stats: { chr: 2, int: 1 }, mood: 5 } }, 
        fail: { text: '你没抓到印章，却摸到了胭脂盒，父亲脸色一沉。', effect: { stats: { chr: 1 }, mood: -2 } } 
      }
    ]
  },

  // ===== 3-6岁：孩童时期 =====
  {
    id: 'e_play_mud',
    title: '和泥巴',
    minAge: 3,
    maxAge: 5,
    chance: 0.15,
    text: '村里的小伙伴在玩泥巴，你兴奋地跑过去加入了他们。',
    choices: [
      { 
        text: '捏个小人 (智力)', 
        check: (s) => s.stats.int > 6, 
        success: { text: '你捏了一个栩栩如生的小泥人，大家都夸你手巧。', effect: { stats: { int: 1, dex: 1 }, mood: 3 } }, 
        fail: { text: '你捏了一坨不成样子的东西，被小伙伴们嘲笑。', effect: { mood: -2 } } 
      },
      { 
        text: '打仗 (力量)', 
        check: (s) => s.stats.str > 6, 
        success: { text: '你抓起泥巴团丢向别人，成为了孩子王！', effect: { stats: { str: 1 }, mood: 3 } }, 
        fail: { text: '你还没扔出去，就被别人的泥巴糊了一脸。', effect: { health: -2, mood: -3 } } 
      }
    ]
  },
  {
    id: 'e_toddler_sick',
    title: '贪凉生病',
    minAge: 4,
    maxAge: 6,
    chance: 0.1,
    condition: (s) => s.stats.con < 15,
    text: '夏天太热，你偷吃了冰镇的西瓜，结果半夜发起了高烧。',
    choices: [
      { 
        text: '硬扛', 
        check: (s) => s.stats.con > 12, 
        success: { text: '你身体底子不错，出了一身汗就好了，体质变强了。', effect: { health: -10, stats: { con: 1 } } }, 
        fail: { text: '你烧得迷迷糊糊，差点没醒过来。', effect: { health: -25, stats: { int: -1 } } } 
      },
      { 
        text: '找郎中', 
        check: (s) => s.money >= 10, 
        success: { text: '郎中开了一贴药，很快就好了。', effect: { money: -10, health: 20 } }, 
        fail: { text: '家里没钱请郎中，只能喝热水硬扛。', effect: { health: -15, mood: -5 } } 
      }
    ]
  },

  // ===== 7-12岁：少年时期 =====
  {
    id: 'e_school_bully',
    title: '私塾霸凌',
    minAge: 7,
    maxAge: 11,
    chance: 0.1,
    condition: (s) => s.familyStatus !== '皇室', // 皇子没人敢欺负
    text: '私塾里的富家子弟仗势欺人，把你的书扔到了地上。',
    choices: [
      { 
        text: '忍气吞声', 
        check: null, 
        success: { text: '你默默捡起书，心里暗暗发誓要出人头地。', effect: { stats: { int: 1 }, mood: -5 } } 
      },
      { 
        text: '揍他 (力量)', 
        check: (s) => s.stats.str > 14, 
        success: { text: '你一拳把他打趴下了！从此没人敢欺负你。', effect: { stats: { str: 1, chr: 1 }, mood: 5 } }, 
        fail: { text: '你打不过他，被反揍了一顿。', effect: { health: -10, mood: -10 } } 
      },
      { 
        text: '告老师', 
        check: (s) => s.stats.int > 14, 
        success: { text: '你义正言辞地告状，老师罚了对方站堂。', effect: { mood: 2 } }, 
        fail: { text: '老师偏袒富家子，说你多事。', effect: { mood: -3 } } 
      }
    ]
  },
  {
    id: 'e_find_money',
    title: '路边拾遗',
    minAge: 8,
    maxAge: 15,
    chance: 0.08,
    text: '你在路边草丛里发现了一个沉甸甸的钱袋。',
    choices: [
      { 
        text: '据为己有', 
        check: null, 
        success: { text: '你数了数，有不少钱！这一周可以吃肉了。', effect: { money: 50, mood: 5, stats: { luck: -1 } } } 
      },
      { 
        text: '寻找失主', 
        check: (s) => s.stats.luck > 8, 
        success: { text: '失主是位大善人，为了感谢你，给了你双倍的赏钱。', effect: { money: 100, mood: 5, stats: { chr: 2 } } }, 
        fail: { text: '你等了很久都没人来，最后只能自己留着了。', effect: { money: 50, mood: -2 } } 
      }
    ]
  },

  // ===== 13-18岁：青春期 =====
  {
    id: 'e_wandering_monk',
    title: '路遇高人',
    minAge: 14,
    maxAge: 18,
    chance: 0.05,
    text: '你在山上遇到一位衣衫褴褛的道士，他盯着你看了一会儿。',
    choices: [
      { 
        text: '请教武艺', 
        check: (s) => s.stats.str > 15, 
        success: { text: '道士传授了你一套强身健体的口诀，你顿觉神清气爽！', effect: { stats: { str: 3, con: 2 }, mood: 5 } }, 
        fail: { text: '道士摇头叹气：你根骨太差，练不了。', effect: { mood: -2 } } 
      },
      { 
        text: '请教长生', 
        check: (s) => s.stats.int > 15, 
        success: { text: '道士与你论道三日，你仿佛悟透了世间真理。', effect: { stats: { int: 3, luck: 2 }, mood: 5 } }, 
        fail: { text: '你听不懂他在说什么，无聊地睡着了。', effect: { mood: -2 } } 
      },
      { 
        text: '给他铜板', 
        check: (s) => s.money > 20, 
        success: { text: '道士给了你一个平安符，说能保你平安。', effect: { money: -20, health: 10, stats: { luck: 2 } } }, 
        fail: { text: '你不想理这个疯老头，转身走了。', effect: { stats: { luck: -1 } } } 
      }
    ]
  },
  {
    id: 'e_teen_love',
    title: '青梅竹马',
    minAge: 15,
    maxAge: 18,
    chance: 0.15,
    condition: (s) => s.stats.chr > 8,
    text: '隔壁家的阿花托人给你送来了一双亲手纳的鞋垫。',
    choices: [
      { 
        text: '欣然接受', 
        check: null, 
        success: { text: '你们互生情愫，经常偷偷幽会，心情大好。', effect: { mood: 10, stats: { luck: 1 } } } 
      },
      { 
        text: '严词拒绝', 
        check: (s) => s.stats.int > 12, 
        success: { text: '“男儿当以功名为重！”你把鞋垫退了回去。', effect: { stats: { int: 2 }, mood: -5 } }, 
        fail: { text: '你虽然拒绝了，但心里还是有点小鹿乱撞。', effect: { mood: -2 } } 
      }
    ]
  },

  // ===== 通用：突发事件 =====
  {
    id: 'e_famine',
    title: '天灾之年',
    minAge: 5,
    maxAge: 80,
    chance: 0.02,
    text: '今年大旱，粮食颗粒无收，饥民遍地。',
    choices: [
      { 
        text: '开仓放粮', 
        check: (s) => s.money > 500 && s.stats.chr > 10, 
        success: { text: '你施粥救济灾民，被乡亲们称为活菩萨。', effect: { money: -200, stats: { chr: 5, luck: 3 }, mood: 10 } }, 
        fail: { text: '你想帮忙，但自己也快没米下锅了。', effect: { money: -50, mood: -10 } } 
      },
      { 
        text: '紧闭大门', 
        check: null, 
        success: { text: '你们一家人省吃俭用，熬过了荒年。', effect: { money: -100, mood: -5 } } 
      }
    ]
  },
  {
    id: 'e_sick_old',
    title: '突发急病',
    minAge: 20,
    maxAge: 90,
    chance: 0.05,
    condition: (s) => s.stats.con < 20,
    text: '某天清晨，你突然感觉天旋地转，倒在了地上。',
    choices: [
      { 
        text: '求医问药', 
        check: (s) => s.money >= 50, 
        success: { text: '名医出手相救，虽然破了财，但命保住了。', effect: { money: -50, health: 30 } }, 
        fail: { text: '钱不够，只能开些草根树皮熬汤喝。', effect: { health: -20 } } 
      },
      { 
        text: '静养调息', 
        check: (s) => s.stats.int > 10, 
        success: { text: '你运用养生之法，慢慢调理好了身体。', effect: { health: 10, mood: -5 } }, 
        fail: { text: '病情加重，身体每况愈下。', effect: { health: -30, con: -2 } } 
      }
    ]
  }
]
