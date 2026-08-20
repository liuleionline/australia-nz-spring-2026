(function () {
  "use strict";

  // This file extends the existing South Island data set with the confirmed
  // Australia itinerary, flights, final accommodation prices and journal data.
  const data = window.TRIP_DATA;
  const q = data.helpers.q;
  const dir = data.helpers.dir;
  const transitDir = (points) => {
    const encoded = points.map(encodeURIComponent);
    const origin = encoded.shift();
    const destination = encoded.pop();
    const waypoints = encoded.length ? `&waypoints=${encoded.join("%7C")}` : "";
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=transit`;
  };
  const image = (id, width = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=82`;
  const asset = (name) => `assets/photos/${name}.webp`;
  const foodPool = [
    image("photo-1414235077428-338989a2e8c0"),
    image("photo-1495474472287-4d71bcdd2085"),
    image("photo-1467003909585-2f8a72700288"),
    image("photo-1568901346375-23c9450c58cd"),
    image("photo-1559339352-11d035aa65de")
  ];
  const foodImage = foodPool[0];
  const cityImage = asset("sydney-arrival");
  const melbourneImage = asset("melbourne-city");
  const beachImage = asset("sydney-bondi");
  const marketImage = asset("melbourne-market");

  const meal = (name, type, query, notes, photo = foodImage, booking = "") => ({
    name, type, query, url: q(query), notes, image: photo, booking
  });
  const stop = (name, lat, lng, query, kind = "目的地", note = "") => ({
    name, lat, lng, query, kind, note, map: q(query)
  });

  const auHotels = [
    {
      id: "sydney-ibis",
      date: "9.19–21",
      nights: 3,
      city: "Sydney",
      name: "ibis Styles Sydney Central",
      address: "27–33 Wentworth Avenue, Sydney NSW 2010",
      price: 5036.44,
      user: 2357.74,
      shen: 2678.70,
      facts: ["2间房", "中央车站 / Surry Hills", "沈家与刘家价格不同"],
      image: cityImage,
      map: q("ibis Styles Sydney Central 27-33 Wentworth Avenue Sydney"),
      link: "https://www.ibisstylessydneycentral.com.au/accommodation-sydney-cbd/",
      note: "沈家 ¥2,678.70；刘家 ¥2,357.74；这项不AA。"
    },
    {
      id: "melbourne-hie",
      date: "9.22–24",
      nights: 3,
      city: "Melbourne",
      name: "Holiday Inn Express Melbourne Little Collins",
      address: "589–599 Little Collins Street, Melbourne VIC 3000",
      price: 6312.94,
      user: 3156.47,
      shen: 3156.47,
      facts: ["2间房", "含早餐", "Southern Cross附近", "两家AA"],
      image: melbourneImage,
      map: q("Holiday Inn Express Melbourne Little Collins 589 Little Collins Street"),
      link: "https://www.ihg.com/holidayinnexpress/hotels/gb/en/melbourne/mellc/hoteldetail?fromRedirect=true&glat=sear&qDest=melbourne",
      note: "付款记录 ¥3,152.97 + ¥3,159.97；按两家AA，每家 ¥3,156.47。"
    }
  ];

  const auDays = [
    {
      id: "au0",
      date: "09.18",
      weekday: "周五",
      title: "夜间从成都出发",
      base: "机上",
      distanceKm: 0,
      driveTime: "—",
      stayId: null,
      flightIds: ["3u3891"],
      summary: "晚上前往成都天府机场，搭乘3U3891。把护照、机票、保险和入境资料放在随身小包，尽量在飞机上睡一段。",
      image: cityImage,
      credit: "Unsplash / Sydney harbour mood image",
      routeUrl: q("Chengdu Tianfu International Airport"),
      schedule: [
        { time: "22:00前", title: "抵达成都天府机场", notes: "国际航班建议至少提前3小时到达；确认托运行李是否直挂悉尼。", query: "成都天府国际机场" },
        { time: "01:25", title: "3U3891 成都天府→悉尼", notes: "航班时间为当地时间；飞行中按悉尼时间逐步调整作息。", query: "Chengdu Tianfu International Airport" }
      ],
      highlights: [
        { name: "出发资料包", tag: "航前检查", notes: "护照、机票、保险、酒店订单、租车订单和紧急联系人集中放置。", photoTip: "把所有订单关键页截图到手机离线相册。", query: "Chengdu Tianfu International Airport", image: cityImage }
      ],
      meals: [meal("机场简餐", "晚餐 / 登机前", "成都天府国际机场 餐厅", "不要吃太油；准备一瓶过安检后购买的水和少量坚果。", foodImage)],
      fuel: "无自驾。",
      clothing: "穿舒适分层衣物；薄外套放在随身包外层。",
      caution: "确认入境澳大利亚的食品、生物安全申报要求；不要携带未申报的肉类、种子和新鲜食品。",
      booking: "出发前复核两段澳洲航班和悉尼住宿订单。",
      planB: "若航班延误，优先保证9.19入住与休息，悉尼首日晚间景点全部可删。",
      stops: [stop("成都天府国际机场", 30.3125, 104.441, "成都天府国际机场", "航班")],
      journalPrompts: ["这次出发前最期待什么？", "行李里最有用的三样东西是什么？"]
    },
    {
      id: "au1",
      date: "09.19",
      weekday: "周六",
      title: "抵达悉尼：只走海港核心",
      base: "悉尼",
      distanceKm: 0,
      driveTime: "公共交通 / 打车",
      stayId: "sydney-ibis",
      flightIds: ["3u3891"],
      summary: "14:15抵达后入住ibis Styles Sydney Central。首日不安排远距离移动，傍晚只看Circular Quay、歌剧院和The Rocks。",
      image: cityImage,
      credit: "Unsplash / Sydney harbour",
      routeUrl: transitDir(["Sydney Airport", "ibis Styles Sydney Central", "Circular Quay", "Sydney Opera House", "The Rocks Sydney"]),
      schedule: [
        { time: "14:15", title: "抵达悉尼机场", notes: "入境、取行李、购买交通卡或确认手机支付；四人带行李可比较机场火车与打车。", query: "Sydney Airport" },
        { time: "16:30", title: "入住ibis Styles Sydney Central", notes: "先洗漱、补水，确认第二天早餐和交通。", query: "ibis Styles Sydney Central" },
        { time: "17:30", title: "Circular Quay→歌剧院→The Rocks", notes: "沿海港边慢走，不买正式歌剧院演出票也能完成外观和海港打卡。", query: "Circular Quay Sydney" },
        { time: "19:30", title: "The Rocks晚餐", notes: "以能看到海港的轻松餐厅为主，避免第一晚排队太久。", query: "The Rocks Sydney restaurants" }
      ],
      highlights: [
        { name: "Sydney Opera House", tag: "首日必拍", notes: "外观、Bennelong Point和Circular Quay台阶都适合拍；歌剧院内部参观需要单独购票。", photoTip: "蓝调时刻从Circular Quay向歌剧院拍，人物站在栏杆前侧。", query: "Sydney Opera House", image: cityImage },
        { name: "Harbour Bridge与Circular Quay", tag: "海港合影", notes: "把歌剧院与海港大桥放在同一画面，适合四人合影。", photoTip: "建议在日落前20分钟到达，留出找机位时间。", query: "Circular Quay Sydney", image: cityImage },
        { name: "The Rocks小巷", tag: "街区漫步", notes: "石砌建筑、老酒吧和海港夜景，首晚保持轻松。", photoTip: "用巷口透视线拍人物，不必追求全景。", query: "The Rocks Sydney", image: cityImage }
      ],
      meals: [
        meal("Opera Bar", "晚餐 / 海港景", "Opera Bar Sydney", "适合第一晚看歌剧院夜景；建议提前查看座位和天气。", foodImage, "建议预约"),
        meal("The Rocks小餐馆", "备选 / 轻松晚餐", "The Rocks Sydney restaurants", "如果Opera Bar排队，直接在The Rocks选择当晚有位的餐厅。", foodImage)
      ],
      fuel: "无自驾。",
      clothing: "海边风大，穿轻薄防风层；长途飞行后准备舒适鞋。",
      caution: "不要把第一晚排得太满；若入境排队超过1小时，直接入住后在酒店附近吃饭。",
      booking: "歌剧院内部参观不是必需；若想进场，尽早查看官方场次。",
      planB: "下雨：改为The Rocks室内餐厅、Museum of Contemporary Art或早休息。",
      stops: [stop("Sydney Airport", -33.9399, 151.1753, "Sydney Airport", "航班"), stop("ibis Styles Sydney Central", -33.8808, 151.2045, "ibis Styles Sydney Central", "住宿"), stop("Circular Quay", -33.8610, 151.2110, "Circular Quay Sydney"), stop("Sydney Opera House", -33.8568, 151.2153, "Sydney Opera House", "拍照"), stop("The Rocks", -33.8599, 151.2090, "The Rocks Sydney", "餐饮")],
      journalPrompts: ["落地后的第一印象是什么？", "第一张真正想留在相册里的照片是哪一张？"]
    },
    {
      id: "au2",
      date: "09.20",
      weekday: "周日",
      title: "海港核心、植物园与亲友晚餐",
      base: "悉尼",
      distanceKm: 0,
      driveTime: "步行 / 公共交通",
      stayId: "sydney-ibis",
      summary: "把悉尼最经典的城市景观集中在一条步行线上，晚上预留与大姐、三姐见面吃饭。",
      image: cityImage,
      credit: "Unsplash / Sydney harbour",
      routeUrl: transitDir(["ibis Styles Sydney Central", "Royal Botanic Garden Sydney", "Art Gallery of New South Wales", "Barangaroo Reserve", "Sydney CBD restaurant"]),
      schedule: [
        { time: "08:30", title: "酒店早餐 / 前往海港", notes: "周日不要过早排太多室内项目；先沿Hyde Park和Macquarie Street走向海港。", query: "Hyde Park Sydney" },
        { time: "09:30", title: "皇家植物园与Mrs Macquarie's Chair", notes: "拍歌剧院、大桥和海港同框；园内慢走约1.5–2小时。", query: "Mrs Macquarie's Chair Sydney" },
        { time: "12:00", title: "Art Gallery of NSW", notes: "挑重点展厅，不追求看完；下雨时可把这里作为主线。", query: "Art Gallery of New South Wales" },
        { time: "15:00", title: "Barangaroo / 海港咖啡", notes: "沿海港步道休息，给晚餐和第二天留体力。", query: "Barangaroo Reserve Sydney" },
        { time: "18:00", title: "与亲友约饭", notes: "具体餐厅由亲友确认；建议约在CBD或Barangaroo，方便回酒店。", query: "Sydney CBD restaurants" }
      ],
      highlights: [
        { name: "Mrs Macquarie's Chair", tag: "悉尼明信片机位", notes: "歌剧院与海港大桥同框最稳定的点位之一。", photoTip: "上午光线通常更均匀；四人合影可站在岩石旁，不要爬危险边缘。", query: "Mrs Macquarie's Chair Sydney", image: cityImage },
        { name: "Royal Botanic Garden", tag: "城市绿洲", notes: "把海港景与热带植物、草坪结合，适合慢节奏。", photoTip: "从园内路径回望歌剧院，比海边正面更有层次。", query: "Royal Botanic Garden Sydney", image: cityImage },
        { name: "Barangaroo Reserve", tag: "现代海港", notes: "岩石层叠的现代公园，适合下午光线和城市建筑。", photoTip: "用步道弧线带出人物与海面。", query: "Barangaroo Reserve Sydney", image: cityImage }
      ],
      meals: [
        meal("Art Gallery Cafe", "午餐 / 轻食", "Art Gallery of New South Wales cafe", "适合把午餐和艺术馆安排在一起。", foodImage),
        meal("亲友约饭", "晚餐 / 具体待定", "Sydney CBD restaurants", "由亲友选店；建议提前确认是否周日营业、是否需要预约。", foodImage, "请亲友确认")
      ],
      fuel: "无自驾。",
      clothing: "城市步行量较大，穿软底鞋；随身带防晒和折叠伞。",
      caution: "Art Gallery NSW部分展览有时间或收费要求，临近日期再确认；植物园日落后部分区域照明较弱。",
      booking: "如果想看特展或参加歌剧院导览，提前买票；亲友晚餐提前锁定餐厅。",
      planB: "雨天顺序：Art Gallery NSW→Museum of Sydney→The Rocks餐厅，删掉Barangaroo长距离步行。",
      stops: [stop("ibis Styles Sydney Central", -33.8808, 151.2045, "ibis Styles Sydney Central", "住宿"), stop("Mrs Macquarie's Chair", -33.8599, 151.2250, "Mrs Macquarie's Chair Sydney", "拍照"), stop("Art Gallery NSW", -33.8688, 151.2170, "Art Gallery of New South Wales", "艺术"), stop("Barangaroo Reserve", -33.8643, 151.2018, "Barangaroo Reserve Sydney", "拍照"), stop("Sydney CBD restaurants", -33.8688, 151.2069, "Sydney CBD restaurants", "餐饮")],
      journalPrompts: ["亲友见面最开心的瞬间？", "今天哪一处景色最像你想象中的悉尼？"]
    },
    {
      id: "au3",
      date: "09.21",
      weekday: "周一",
      title: "海岸线日：天气好走Bondi，天气一般走Manly",
      base: "悉尼",
      distanceKm: 0,
      driveTime: "公交 / 渡轮",
      stayId: "sydney-ibis",
      summary: "保留两个完整选项。A更适合晴天和拍海岸线；B更轻松，适合风大、阴天或不想连续爬坡。",
      image: beachImage,
      credit: "Unsplash / coastal walk",
      routeUrl: transitDir(["ibis Styles Sydney Central", "Bondi Beach", "Coogee Beach"]),
      schedule: [
        { time: "08:30", title: "看天气决定A/B", notes: "出发前查看降雨、风力和海浪；海岸线湿滑时不要硬走全程。", query: "Sydney weather" },
        { time: "09:30", title: "选项A或选项B", notes: "见下方两套行程卡；二者不要叠加。", query: "Sydney CBD" },
        { time: "18:00", title: "回酒店整理行李", notes: "次日14:30飞墨尔本，提前把证件和小件行李归拢。", query: "ibis Styles Sydney Central" }
      ],
      choices: [
        {
          label: "A · Bondi → Coogee海岸步道（晴天优先）",
          summary: "约6公里，按舒适速度约2–3小时；Bondi、Tamarama、Bronte、Clovelly、Coogee依次展开。",
          routeUrl: transitDir(["ibis Styles Sydney Central", "Bondi Beach", "Tamarama Beach", "Bronte Beach", "Coogee Beach"]),
          schedule: [
            { time: "09:30", title: "Bondi Beach开走", notes: "从Bondi南端开始，避开正午暴晒。", query: "Bondi Beach" },
            { time: "10:30", title: "Tamarama / Bronte", notes: "海湾、泳池和悬崖步道是主要拍照段。", query: "Bronte Beach Sydney" },
            { time: "12:30", title: "Clovelly / Gordons Bay", notes: "视体力决定是否完整走到Coogee。", query: "Clovelly Beach Sydney" },
            { time: "14:00", title: "Coogee午餐与休息", notes: "海边吃饭后返回市区。", query: "Coogee Pavilion" }
          ],
          highlights: [
            { name: "Bondi Icebergs外观", tag: "海岸线标志", notes: "泳池、海浪和沙滩同框。", photoTip: "从北侧高处取景，人物靠近栏杆但不要越过安全线。", query: "Bondi Icebergs", image: beachImage },
            { name: "Tamarama–Bronte悬崖段", tag: "最出片", notes: "海岸曲线和岩石平台是步道精华。", photoTip: "用竖构图表现悬崖高度，注意风大时保护手机。", query: "Tamarama Beach Sydney", image: beachImage },
            { name: "Coogee Beach", tag: "收尾海湾", notes: "适合午餐、咖啡和下水前的休息。", photoTip: "在海边台阶拍四人剪影，避开正午顶光。", query: "Coogee Beach", image: beachImage }
          ],
          meals: [meal("Coogee Pavilion", "午餐 / 海边", "Coogee Pavilion", "到店前查看当天座位；体力不足时可在Bronte提前吃。", foodImage)]
        },
        {
          label: "B · Manly Ferry + 海滩（阴天或想轻松时）",
          summary: "从Circular Quay搭F1渡轮看海港，再在Manly Beach、The Corso和North Steyne慢走。",
          routeUrl: transitDir(["ibis Styles Sydney Central", "Circular Quay Wharf 3", "Manly Wharf", "Manly Beach"]),
          schedule: [
            { time: "09:30", title: "Circular Quay搭F1渡轮", notes: "提前查看Transport for NSW班次，坐船外侧位置看歌剧院和大桥。", query: "Circular Quay Wharf 3" },
            { time: "10:15", title: "Manly Wharf与The Corso", notes: "沿主街走到海滩，咖啡和小店都集中。", query: "Manly Wharf" },
            { time: "12:00", title: "Manly Beach / North Steyne", notes: "天气好可加Shelly Beach短线；风大则只在海滩边停留。", query: "Manly Beach" },
            { time: "15:30", title: "渡轮返回Circular Quay", notes: "留出回酒店整理行李的缓冲。", query: "Manly Wharf" }
          ],
          highlights: [
            { name: "悉尼海港渡轮视角", tag: "城市大片", notes: "从水面回看歌剧院和海港大桥，最省体力的高质量机位。", photoTip: "去程拍城市，回程拍夕阳；注意甲板风。", query: "Sydney ferry Circular Quay Manly", image: cityImage },
            { name: "Manly Beach", tag: "海滩散步", notes: "海滩、棕榈树和The Corso构成轻松半日。", photoTip: "从The Corso尽头向海滩拍，人物沿中轴线走入画面。", query: "Manly Beach", image: beachImage },
            { name: "Shelly Beach", tag: "可选短线", notes: "体力和天气允许再走，不追求完整环线。", photoTip: "用海湾弧线拍人像，避免正午强光。", query: "Shelly Beach Manly", image: beachImage }
          ],
          meals: [meal("Manly Wharf小餐馆", "午餐 / 海边", "Manly Wharf restaurants", "选择能快速出餐的餐厅，避免错过返程船。", foodImage), meal("Fishmongers Manly", "备选 / 海鲜", "Fishmongers Manly", "适合想吃炸鱼薯条的轻松选项。", foodImage)]
        }
      ],
      highlights: [
        { name: "天气决策点", tag: "行程关键", notes: "A需要较稳定天气；B对阴天和风力更宽容。", photoTip: "当天只选一套，给行程留余量。", query: "Sydney weather", image: beachImage }
      ],
      meals: [meal("Bondi / Manly海边餐", "按选项选择", "Sydney coastal restaurants", "两个方案都不建议预订过于固定的晚餐，给返程留弹性。", foodImage)],
      fuel: "无自驾。",
      clothing: "海边防风层、帽子、防晒；A选项一定穿防滑鞋。",
      caution: "Bondi–Coogee有台阶和陡坡，官方提示约6公里；海风和湿滑路面可能显著放慢速度。",
      booking: "F1渡轮不需要观光团预约，但要临近出发查看班次；餐厅尽量选可现场排队的。",
      planB: "A走到Bronte就累了可直接公交回市区；B不适合时改为Barangaroo + 博物馆。",
      stops: [stop("Bondi Beach", -33.8915, 151.2767, "Bondi Beach", "选项A"), stop("Coogee Beach", -33.9211, 151.2570, "Coogee Beach", "选项A"), stop("Circular Quay Wharf 3", -33.8614, 151.2116, "Circular Quay Wharf 3", "选项B"), stop("Manly Beach", -33.7969, 151.2886, "Manly Beach", "选项B")],
      journalPrompts: ["今天选了A还是B？为什么？", "哪一段海岸最值得再来？"]
    },
    {
      id: "au4",
      date: "09.22",
      weekday: "周二",
      title: "悉尼飞墨尔本：从海港切换到巷弄",
      base: "墨尔本",
      distanceKm: 0,
      driveTime: "机场接驳 / 步行",
      stayId: "melbourne-hie",
      flightIds: ["jq609"],
      summary: "上午在悉尼轻松收尾，14:30搭JQ609去墨尔本。到达后入住Holiday Inn Express Little Collins，晚上只安排Flinders Street和Yarra河畔。",
      image: melbourneImage,
      credit: "Unsplash / Melbourne city image",
      routeUrl: transitDir(["ibis Styles Sydney Central", "Sydney Airport", "Melbourne Airport", "Holiday Inn Express Melbourne Little Collins", "Flinders Street Station"]),
      schedule: [
        { time: "08:30", title: "悉尼酒店退房 / 咖啡", notes: "不要安排远郊；把行李和护照分开收好。", query: "ibis Styles Sydney Central" },
        { time: "12:00前", title: "前往悉尼机场", notes: "国内航班建议至少提前2小时到机场；Jetstar托运行李规则临行复核。", query: "Sydney Airport domestic terminal" },
        { time: "14:30–16:05", title: "JQ609 悉尼→墨尔本", notes: "当地时间；到达后取行李，前往酒店。", query: "Melbourne Airport" },
        { time: "17:30", title: "入住Holiday Inn Express", notes: "确认早餐时间和9月25日退房、去机场的路线。", query: "Holiday Inn Express Melbourne Little Collins" },
        { time: "18:30", title: "Flinders Street Station + Yarra夜景", notes: "第一晚不安排远距离，沿河散步到Federation Square。", query: "Flinders Street Station" }
      ],
      highlights: [
        { name: "Flinders Street Station", tag: "墨尔本地标", notes: "钟楼、黄色外墙和电车是城市第一张名片。", photoTip: "在Federation Square对面取全景，蓝调时刻最有层次。", query: "Flinders Street Station", image: melbourneImage },
        { name: "Federation Square", tag: "城市会客厅", notes: "连接车站、河岸和NGV方向，适合第一晚熟悉城市。", photoTip: "拍建筑几何线条，不必把人放太小。", query: "Federation Square Melbourne", image: melbourneImage },
        { name: "Yarra River Southbank", tag: "夜景", notes: "沿河走一小段即可，不建议第一晚走到太远。", photoTip: "把倒影和电车灯带一起收入画面。", query: "Southbank Promenade Melbourne", image: melbourneImage }
      ],
      meals: [meal("Hardware Lane", "晚餐 / 巷弄餐厅", "Hardware Lane Melbourne restaurants", "从酒店步行可达，适合抵达日晚餐；临行看店铺营业日。", foodImage), meal("Southbank河畔", "备选 / 夜景餐", "Southbank Promenade Melbourne restaurants", "想看夜景再选河畔，不要为了餐厅走太远。", foodImage)],
      fuel: "无自驾；9.25到基督城取车后再开始自驾。",
      clothing: "墨尔本风大，薄风衣随身；晚间沿Yarra河边体感更冷。",
      caution: "悉尼国内航站楼与国际航站楼不同；确认JQ609航站楼和行李政策。",
      booking: "确认Holiday Inn Express早餐包含在订单内；临行复核Jetstar航班状态。",
      planB: "航班延误：到酒店后只保留Flinders Street Station外观和附近晚餐。",
      stops: [stop("Sydney Airport Domestic", -33.9330, 151.1817, "Sydney Airport Domestic Terminal", "航班"), stop("Melbourne Airport", -37.6690, 144.8410, "Melbourne Airport", "航班"), stop("Holiday Inn Express Melbourne Little Collins", -37.8150, 144.9558, "Holiday Inn Express Melbourne Little Collins", "住宿"), stop("Flinders Street Station", -37.8183, 144.9671, "Flinders Street Station", "拍照"), stop("Southbank Promenade", -37.8205, 144.9650, "Southbank Promenade Melbourne", "拍照")],
      journalPrompts: ["悉尼与墨尔本的第一印象差异？", "今天最值得记录的一次转场细节？"]
    },
    {
      id: "au5",
      date: "09.23",
      weekday: "周三",
      title: "墨尔本城市核心：市场、巷弄与艺术",
      base: "墨尔本",
      distanceKm: 0,
      driveTime: "步行 / 免费电车",
      stayId: "melbourne-hie",
      summary: "把墨尔本最有代表性的城市气质排在同一天：Queen Victoria Market、State Library、巷弄咖啡、NGV与Southbank。",
      image: marketImage,
      credit: "Unsplash / market image",
      routeUrl: transitDir(["Holiday Inn Express Melbourne Little Collins", "Queen Victoria Market", "State Library Victoria", "Hosier Lane", "NGV International", "Southbank Promenade"]),
      schedule: [
        { time: "08:30", title: "酒店早餐", notes: "利用含早餐优势，早一点出发。", query: "Holiday Inn Express Melbourne Little Collins" },
        { time: "09:30", title: "Queen Victoria Market", notes: "周三通常关闭；若2026日期有特别活动，以官方What's On为准，常规市场可改9.24早上或下午外观。", query: "Queen Victoria Market Melbourne" },
        { time: "10:30", title: "State Library Victoria", notes: "La Trobe Reading Room是室内拍照重点，注意安静。", query: "State Library Victoria" },
        { time: "12:30", title: "Hardware Lane / Chinatown午餐", notes: "先吃再逛巷弄，避免把午餐拖到下午。", query: "Hardware Lane Melbourne" },
        { time: "14:00", title: "Hosier Lane与AC/DC Lane", notes: "看街头艺术和咖啡店，拍照时不要堵住店铺出入口。", query: "Hosier Lane Melbourne" },
        { time: "16:00", title: "NGV International + Southbank", notes: "选重点展厅，晚上沿Yarra散步。", query: "NGV International Melbourne" }
      ],
      highlights: [
        { name: "State Library La Trobe Reading Room", tag: "室内建筑", notes: "穹顶、书桌和俯拍视角是墨尔本城市照的高质量选项。", photoTip: "二楼平台向下拍，人物不要触碰阅览桌。", query: "State Library Victoria La Trobe Reading Room", image: marketImage },
        { name: "Hosier Lane", tag: "街头艺术", notes: "壁画更新很快，每次来看到的内容可能不同。", photoTip: "用巷道透视线拍纵深，避免只拍一面墙。", query: "Hosier Lane Melbourne", image: marketImage },
        { name: "NGV International", tag: "艺术", notes: "如果只看一馆，优先NGV International；具体展览票务临行确认。", photoTip: "建筑入口和水墙适合拍人像，展厅内遵守禁拍标识。", query: "NGV International Melbourne", image: marketImage },
        { name: "Southbank Promenade", tag: "河畔收尾", notes: "傍晚把城市、河面和电车灯串起来。", photoTip: "日落前到河岸，等灯光亮起再拍一轮。", query: "Southbank Promenade Melbourne", image: melbourneImage }
      ],
      meals: [
        meal("Queen Victoria Market食品摊", "早午餐 / 市场", "Queen Victoria Market food hall Melbourne", "先确认当天是否营业；市场开放日以官方日历为准。", marketImage),
        meal("Market Lane Coffee", "咖啡", "Market Lane Coffee Queen Victoria Market", "适合上午补咖啡；不把咖啡排成唯一早餐。", foodImage),
        meal("Tipo 00", "晚餐 / 意大利面", "Tipo 00 Melbourne", "热门店，想吃需提前预约；没有位置就选Hardware Lane备选。", foodImage, "建议预约")
      ],
      fuel: "无自驾。",
      clothing: "城市步行日穿舒适鞋；市场和巷弄部分路面不平。",
      caution: "Queen Victoria Market常规周三关闭，不能把它当成固定营业日；请在出发前复核官方日历。",
      booking: "NGV特展与Tipo 00如有明确目标，提前订；普通常设展可灵活安排。",
      planB: "若QVM关闭：改为Melbourne Museum或Royal Exhibition Building，下午保留NGV和Southbank。",
      stops: [stop("Holiday Inn Express Melbourne Little Collins", -37.8150, 144.9558, "Holiday Inn Express Melbourne Little Collins", "住宿"), stop("Queen Victoria Market", -37.8076, 144.9568, "Queen Victoria Market Melbourne", "市场"), stop("State Library Victoria", -37.8097, 144.9652, "State Library Victoria", "拍照"), stop("Hosier Lane", -37.8176, 144.9691, "Hosier Lane Melbourne", "拍照"), stop("NGV International", -37.8226, 144.9689, "NGV International Melbourne", "艺术"), stop("Southbank Promenade", -37.8205, 144.9650, "Southbank Promenade Melbourne", "拍照")],
      journalPrompts: ["今天最喜欢的巷弄或咖啡是哪一个？", "哪件艺术作品或建筑细节让你停留最久？"]
    },
    {
      id: "au6",
      date: "09.24",
      weekday: "周四",
      title: "墨尔本近郊二选一：企鹅岛或酒乡",
      base: "墨尔本",
      distanceKm: 0,
      driveTime: "一日游 / 约2–3小时交通",
      stayId: "melbourne-hie",
      summary: "A适合想看澳洲野生动物，B适合想轻松吃喝。大洋路不放在这天，避免长途赶路影响次日飞行。",
      image: beachImage,
      credit: "Unsplash / coastal landscape",
      routeUrl: transitDir(["Holiday Inn Express Melbourne Little Collins", "Phillip Island Penguin Parade"]),
      schedule: [
        { time: "07:30", title: "早餐后决定A/B", notes: "A要预留返程交通和企鹅入场等待；B更适合睡到自然醒。", query: "Holiday Inn Express Melbourne Little Collins" },
        { time: "全天", title: "选择一套近郊方案", notes: "见下方两套行程卡，晚上回酒店整理次日飞行行李。", query: "Melbourne CBD" },
        { time: "20:30前", title: "回酒店确认JQ171", notes: "确认11:05起飞、行李额度和前往机场的交通。", query: "Melbourne Airport" }
      ],
      choices: [
        {
          label: "A · Phillip Island企鹅归巢（经典动物记忆）",
          summary: "距墨尔本约90分钟车程，企鹅入场后还要等待归巢；最省心是参加正规一日团，不建议临时拼公共交通。",
          routeUrl: q("Phillip Island Penguin Parade 1019 Ventnor Road Summerlands Victoria"),
          schedule: [
            { time: "上午", title: "参加Phillip Island一日游", notes: "确认接送点和返程时间，带外套。", query: "Phillip Island Nature Parks" },
            { time: "下午", title: "Nobbies / 海岸线（视团程）", notes: "以当天团行程为准，不额外叠加太多点。", query: "The Nobbies Phillip Island" },
            { time: "日落后", title: "Penguin Parade", notes: "官方要求提前购票；现场禁止闪光灯、不要触碰或喂食企鹅。", query: "Penguin Parade Phillip Island" }
          ],
          highlights: [
            { name: "Penguin Parade观景台", tag: "必打卡", notes: "小企鹅每天傍晚回到海滩，入场和座位按票种安排。", photoTip: "现场禁止闪光灯，提前把手机调至夜景并保持安静。", query: "Penguin Parade Phillip Island", image: beachImage },
            { name: "The Nobbies", tag: "海岸风景", notes: "木栈道、海风和海鸟，按天气与团程安排。", photoTip: "风大时用广角低机位，注意帽子和手机。", query: "The Nobbies Phillip Island", image: beachImage }
          ],
          meals: [meal("Penguin Parade Visitor Centre", "晚餐 / 简餐", "Penguin Parade Visitor Centre cafe", "先确认团餐安排；企鹅归巢前不要吃得过饱。", foodImage), meal("Cowes小镇", "备选 / 晚餐", "Cowes Phillip Island restaurants", "若团程允许，在Cowes解决晚餐。", foodImage)]
        },
        {
          label: "B · Yarra Valley酒庄与乡村午餐（轻松优先）",
          summary: "以1–2家酒庄加一顿午餐为限，不追求一天打卡很多酒庄；建议参加有接送的一日团。",
          routeUrl: q("Yarra Valley Victoria wineries"),
          schedule: [
            { time: "09:00", title: "参加Yarra Valley一日游", notes: "确认接送点与是否包含品酒费用。", query: "Yarra Valley Victoria" },
            { time: "11:00", title: "酒庄 / 乳酪 / 巧克力体验", notes: "优先选择景观和午餐质量，不叠加过多点位。", query: "Yarra Valley winery" },
            { time: "15:30", title: "回程咖啡", notes: "把晚上留给整理行李和早睡。", query: "Yarra Valley cafe" }
          ],
          highlights: [
            { name: "葡萄园山谷视角", tag: "乡村风景", notes: "秋季色彩、山谷和酒庄建筑适合慢拍。", photoTip: "避免把酒庄拍成纯旅游团照，留出道路和山脊线。", query: "Yarra Valley winery", image: beachImage },
            { name: "酒庄午餐", tag: "味觉记忆", notes: "安排一顿坐下来吃的午餐，比连续品酒更舒服。", photoTip: "拍桌面细节、窗外山谷和同行者举杯。", query: "Yarra Valley winery restaurant", image: foodImage }
          ],
          meals: [meal("Yarra Valley酒庄餐厅", "午餐 / 酒乡", "Yarra Valley winery restaurant", "提前确认是否含午餐、是否需要预订。", foodImage, "建议预约"), meal("墨尔本CBD晚餐", "晚餐 / 回城", "Melbourne CBD restaurants", "回城后简单吃，别安排需要长时间排队的店。", foodImage)]
        }
      ],
      highlights: [
        { name: "不选大洋路的理由", tag: "节奏取舍", notes: "大洋路一日往返车程很长；这次把它留作下一次专门安排，更符合9.25早班飞行。", photoTip: "不要为了多一个目的地牺牲最后一晚睡眠。", query: "Great Ocean Road Victoria", image: beachImage }
      ],
      meals: [meal("按A/B方案安排", "近郊午餐", "Melbourne day tour restaurants", "预订一日游时确认是否包含午餐、返程时间与接送点。", foodImage)],
      fuel: "无自驾；如果参加酒庄/企鹅团，确认是否含接送。",
      clothing: "无论A/B都要带防风保暖层；企鹅岛晚间明显更冷。",
      caution: "企鹅归巢不是演出，时间随日落变化；必须预留等待时间并遵守禁拍和安静规定。",
      booking: "Penguin Parade必须提前购票；Yarra Valley酒庄和一日团也建议提前锁定。",
      planB: "近郊团售罄或天气恶劣：改为Melbourne Museum + Carlton + Fitzroy咖啡街区。",
      stops: [stop("Phillip Island Penguin Parade", -38.0504, 145.2400, "Penguin Parade Phillip Island", "选项A"), stop("The Nobbies", -38.5104, 145.1124, "The Nobbies Phillip Island", "选项A"), stop("Yarra Valley", -37.6900, 145.5600, "Yarra Valley Victoria", "选项B"), stop("Holiday Inn Express Melbourne Little Collins", -37.8150, 144.9558, "Holiday Inn Express Melbourne Little Collins", "住宿")],
      journalPrompts: ["企鹅岛还是Yarra Valley？这次取舍满意吗？", "今天最值得提前预订的体验是什么？"]
    }
  ];

  // Final accommodation update from the latest ledger screenshot.
  data.hotels.forEach((hotel) => {
    if (hotel.id === "castlehill") {
      hotel.price = 2421.63;
      hotel.user = 1210.815;
      hotel.shen = 1210.815;
      hotel.note = "最终账本金额 ¥2,421.63；10月7日入住，附近餐饮很少，抵达前买好晚餐和早餐。";
    }
    if (hotel.id === "chc-final") {
      hotel.price = 3153.60;
      hotel.user = 1576.80;
      hotel.shen = 1576.80;
      hotel.note = "最终账本金额 ¥3,153.60；10月8–10日入住，第6套房源，2卧2卫，含预留停车位。";
    }
  });

  data.hotels = [...auHotels, ...data.hotels];
  data.days = [...auDays, ...data.days];
  data.meta = {
    ...data.meta,
    title: "澳新之春 · 悉尼—墨尔本—新西兰南岛",
    dates: "2026.09.18—10.11",
    travelers: "4人 / 2对夫妻",
    nights: 21,
    distanceKm: 2470,
    queryDate: "2026.08.16",
    cityNote: "澳洲城市段以步行、公共交通和机场接驳为主；9.25基督城取车后开始南岛自驾。",
    routeBases: [
      { name: "Sydney", lat: -33.8688, lng: 151.2093 },
      { name: "Melbourne", lat: -37.8136, lng: 144.9631 },
      { name: "Christchurch", lat: -43.5321, lng: 172.6362 },
      { name: "Lake Tekapo", lat: -44.0040, lng: 170.4771 },
      { name: "Twizel", lat: -44.2595, lng: 170.0983 },
      { name: "Wānaka", lat: -44.6967, lng: 169.1367 },
      { name: "Queenstown", lat: -45.0312, lng: 168.6626 },
      { name: "Te Anau", lat: -45.4145, lng: 167.7180 },
      { name: "Milford Sound", lat: -44.6715, lng: 167.9260 },
      { name: "Haast", lat: -43.8800, lng: 169.0400 },
      { name: "Franz Josef", lat: -43.3890, lng: 170.1800 },
      { name: "Hokitika", lat: -42.7160, lng: 170.9670 },
      { name: "Castle Hill", lat: -43.2304, lng: 171.7154 },
      { name: "Christchurch", lat: -43.5321, lng: 172.6362 }
    ]
  };

  data.flights = [
    { id: "3u3891", date: "09.18–19", airline: "四川航空 3U3891", route: "成都天府 → 悉尼", depart: "09.18 01:25", arrive: "09.19 14:15", timeNote: "当地时间", note: "9月18日晚上出发；提前确认行李是否直挂和悉尼入境材料。" },
    { id: "jq609", date: "09.22", airline: "Jetstar JQ609", route: "悉尼 → 墨尔本", depart: "14:30", arrive: "16:05", timeNote: "当地时间", note: "国内航班；从悉尼市区前往机场要留出行李托运和安检时间。" },
    { id: "jq171", date: "09.25", airline: "Jetstar JQ171", route: "墨尔本 → 基督城", depart: "11:05", arrive: "16:25", timeNote: "当地时间", note: "到达后取车、验车、买补给；第一晚只住机场区。" },
    { id: "nz223", date: "10.10", airline: "Air New Zealand NZ223", route: "基督城 → 悉尼", depart: "15:25", arrive: "17:05", timeNote: "当地时间", note: "还车后预留机场值机与行李托运时间。" },
    { id: "3u3892", date: "10.10–11", airline: "四川航空 3U3892", route: "悉尼 → 成都", depart: "21:20", arrive: "10.11 05:15", timeNote: "当地时间", note: "NZ223到达与本航班间隔约4小时15分；确认是否需要重新托运行李。" }
  ];

  data.accounting = {
  "lodgingTotal": 44899.27,
  "lodgingUser": 22170.155,
  "lodgingShen": 22729.115,
  "tripLedger": {
    "total": 106444.27,
    "mySpend": 27316.08,
    "myPaid": 74603.56,
    "myReceivable": 47287.48
  },
  "expenses": [
    {
      "id": "e01",
      "date": "2026-07-03",
      "type": "交通",
      "amount": 5505,
      "payer": "LL",
      "participants": [
        "LL",
        "YM"
      ],
      "note": "基督城→悉尼机票"
    },
    {
      "id": "e02",
      "date": "2026-07-03",
      "type": "交通",
      "amount": 5506,
      "payer": "LL",
      "participants": [
        "LL",
        "YM",
        "QNL",
        "SZ"
      ],
      "note": "新西兰15天租车"
    },
    {
      "id": "e03",
      "date": "2026-07-03",
      "type": "交通",
      "amount": 13737,
      "payer": "QNL",
      "participants": [
        "QNL",
        "SZ"
      ],
      "note": "成都—悉尼往返机票"
    },
    {
      "id": "e04",
      "date": "2026-07-03",
      "type": "交通",
      "amount": 5534,
      "payer": "QNL",
      "participants": [
        "QNL",
        "SZ"
      ],
      "note": "基督城→悉尼机票"
    },
    {
      "id": "e05",
      "date": "2026-07-03",
      "type": "交通",
      "amount": 1020,
      "payer": "LL",
      "participants": [
        "LL",
        "YM"
      ],
      "note": "悉尼→墨尔本机票"
    },
    {
      "id": "e06",
      "date": "2026-07-03",
      "type": "交通",
      "amount": 6774,
      "payer": "LL",
      "participants": [
        "LL",
        "YM"
      ],
      "note": "墨尔本→基督城机票"
    },
    {
      "id": "e07",
      "date": "2026-07-03",
      "type": "交通",
      "amount": 1057,
      "payer": "QNL",
      "participants": [
        "QNL",
        "SZ"
      ],
      "note": "悉尼→墨尔本机票（9月22日）"
    },
    {
      "id": "e08",
      "date": "2026-07-03",
      "type": "交通",
      "amount": 6002,
      "payer": "QNL",
      "participants": [
        "QNL",
        "SZ"
      ],
      "note": "墨尔本→基督城机票（9月25日）"
    },
    {
      "id": "e09",
      "date": "2026-07-03",
      "type": "交通",
      "amount": 16410,
      "payer": "LL",
      "participants": [
        "LL",
        "YM"
      ],
      "note": "成都—悉尼往返机票＋选座"
    },
    {
      "id": "e10",
      "date": "2026-08-15",
      "type": "住宿",
      "amount": 727,
      "payer": "LL",
      "participants": [
        "QNL",
        "SZ"
      ],
      "note": "9月25日基督城 Airport Gateway Motor Lodge（沈家）"
    },
    {
      "id": "e11",
      "date": "2026-08-15",
      "type": "住宿",
      "amount": 489,
      "payer": "LL",
      "participants": [
        "LL",
        "YM"
      ],
      "note": "9月25日基督城 Airport Gateway Motor Lodge（刘家）"
    },
    {
      "id": "e12",
      "date": "2026-08-15",
      "type": "住宿",
      "amount": 3892.76,
      "payer": "LL",
      "participants": [
        "LL",
        "YM",
        "QNL",
        "SZ"
      ],
      "note": "9月26日 Lake Tekapo 民宿"
    },
    {
      "id": "e13",
      "date": "2026-08-15",
      "type": "住宿",
      "amount": 2142.4,
      "payer": "LL",
      "participants": [
        "LL",
        "YM",
        "QNL",
        "SZ"
      ],
      "note": "9月27日 Twizel"
    },
    {
      "id": "e14",
      "date": "2026-08-15",
      "type": "住宿",
      "amount": 5817,
      "payer": "LL",
      "participants": [
        "LL",
        "YM",
        "QNL",
        "SZ"
      ],
      "note": "9月28–29日 Wānaka"
    },
    {
      "id": "e15",
      "date": "2026-08-15",
      "type": "住宿",
      "amount": 5165.73,
      "payer": "LL",
      "participants": [
        "LL",
        "YM",
        "QNL",
        "SZ"
      ],
      "note": "9月30日–10月1日 Queenstown"
    },
    {
      "id": "e16",
      "date": "2026-08-15",
      "type": "住宿",
      "amount": 3342.08,
      "payer": "LL",
      "participants": [
        "LL",
        "YM",
        "QNL",
        "SZ"
      ],
      "note": "10月2–3日 Te Anau"
    },
    {
      "id": "e17",
      "date": "2026-08-15",
      "type": "住宿",
      "amount": 2682.72,
      "payer": "LL",
      "participants": [
        "LL",
        "YM",
        "QNL",
        "SZ"
      ],
      "note": "10月4日 Haast"
    },
    {
      "id": "e18",
      "date": "2026-08-15",
      "type": "住宿",
      "amount": 1824.8,
      "payer": "LL",
      "participants": [
        "LL",
        "YM",
        "QNL",
        "SZ"
      ],
      "note": "10月5日 Franz Josef/Waiau"
    },
    {
      "id": "e19",
      "date": "2026-08-15",
      "type": "住宿",
      "amount": 1891.17,
      "payer": "LL",
      "participants": [
        "LL",
        "YM",
        "QNL",
        "SZ"
      ],
      "note": "10月6日 Hokitika"
    },
    {
      "id": "e20",
      "date": "2026-08-15",
      "type": "住宿",
      "amount": 2421.63,
      "payer": "LL",
      "participants": [
        "LL",
        "YM",
        "QNL",
        "SZ"
      ],
      "note": "10月7日 Castle Hill"
    },
    {
      "id": "e21",
      "date": "2026-08-15",
      "type": "住宿",
      "amount": 3153.6,
      "payer": "LL",
      "participants": [
        "LL",
        "YM",
        "QNL",
        "SZ"
      ],
      "note": "10月8–9日基督城市中心"
    },
    {
      "id": "e22",
      "date": "2026-08-16",
      "type": "住宿",
      "amount": 2357.74,
      "payer": "YM",
      "participants": [
        "LL",
        "YM"
      ],
      "note": "9月19–21日悉尼 Ibis Styles（刘家）"
    },
    {
      "id": "e23",
      "date": "2026-08-16",
      "type": "住宿",
      "amount": 2678.7,
      "payer": "LL",
      "participants": [
        "QNL",
        "SZ"
      ],
      "note": "9月19–21日悉尼 Ibis Styles（沈家）"
    },
    {
      "id": "e24",
      "date": "2026-08-16",
      "type": "住宿",
      "amount": 3152.97,
      "payer": "YM",
      "participants": [
        "LL",
        "YM",
        "QNL",
        "SZ"
      ],
      "note": "9月22–24日墨尔本 Holiday Inn Express"
    },
    {
      "id": "e25",
      "date": "2026-08-16",
      "type": "住宿",
      "amount": 3159.97,
      "payer": "LL",
      "participants": [
        "LL",
        "YM",
        "QNL",
        "SZ"
      ],
      "note": "9月22–24日墨尔本 Holiday Inn Express"
    }
  ],
  "notes": [
    "第1、4笔均按更正后的“基督城→悉尼机票”导入。",
    "9.25 Airport Gateway Motor Lodge：刘家 ¥489，沈家 ¥727，不AA。",
    "9.19–21 悉尼：沈家 ¥2,678.70，刘家 ¥2,357.74，不AA。",
    "其余住宿按两家AA；墨尔本两笔付款 ¥3,152.97 + ¥3,159.97 合计后AA。",
    "账本总额 ¥106,444.27，包含已提供的交通与住宿记录。"
  ]
};

  data.regions = {
    australia: [
      { name: "Sydney", lat: -33.8688, lng: 151.2093 },
      { name: "Melbourne", lat: -37.8136, lng: 144.9631 }
    ],
    newZealand: data.meta.routeBases.slice(2)
  };

  data.bookings = [
    { id: "au-flights", priority: "航班", title: "澳洲与返程航班状态", note: "出发前72小时、每次转机当天各查一次；时间均为当地时间。", link: "https://www.jetstar.com/au/en/help/articles/flight-status" },
    { id: "opera-tour", priority: "可选", title: "悉尼歌剧院内部导览 / 演出", note: "外观免费；若想进场或看演出，按官方场次购票。", link: "https://www.sydneyoperahouse.com/tours" },
    { id: "bondi-weather", priority: "每日", title: "9.21 Bondi / Manly天气决策", note: "出发当天看降雨、风力和海浪；A/B二选一。", link: "https://www.bom.gov.au/nsw/forecasts/sydney.shtml" },
    { id: "penguins", priority: "必须", title: "Phillip Island Penguin Parade", note: "官方明确要求提前购票；确认票种、接送和返程时间。", link: "https://www.penguins.org.au/public/attractions/penguin-parade/" },
    { id: "yarra", priority: "可选", title: "Yarra Valley酒庄一日游", note: "如果选B，提前预约接送型一日游和午餐。", link: "https://www.visityarravalley.com.au/" },
    { id: "qvm", priority: "核对", title: "Queen Victoria Market营业日", note: "常规周三关闭；9.23当天不要把市场当成必到点，临行核对官方日历。", link: "https://qvm.com.au/about/" },
    ...data.bookings
  ];

  data.prep = [
    { icon: "🛂", title: "澳洲入境与食品申报", text: "澳大利亚生物安全严格；肉类、种子、鲜果、药品和户外装备按要求申报，拿不准就申报。", link: "https://www.abf.gov.au/entering-and-leaving-australia", label: "Australian Border Force" },
    { icon: "📱", title: "交通与航班App", text: "澳洲段准备航空公司App、Transport for NSW、PTV / Google Maps；新西兰段保留NZTA Journey Planner。", link: "https://transportnsw.info/", label: "Transport for NSW" },
    { icon: "🎒", title: "城市段轻装", text: "9.19–25不需要租车；把大件行李控制在机场转场方便的状态，9.25到基督城再取车。", link: "https://www.sydneyairport.com.au/", label: "机场信息" },
    ...data.prep
  ];

  data.sources = [
    { label: "Sydney Opera House · Getting here", url: "https://www.sydneyoperahouse.com/visit/getting-here", note: "歌剧院位置、Circular Quay步行与交通；查询2026.08.16" },
    { label: "NSW Government · Bondi to Coogee Walk", url: "https://www.nsw.gov.au/visiting-and-exploring-nsw/locations-and-attractions/bondi-to-coogee-coastal-walk", note: "约6公里、免费、海岸步道安全提示；临行复核天气" },
    { label: "Art Gallery of NSW", url: "https://www.artgallery.nsw.gov.au/", note: "展览、开放时间和活动预约；查询2026.08.16" },
    { label: "Phillip Island Nature Parks · Penguin Parade", url: "https://www.penguins.org.au/public/attractions/penguin-parade/", note: "必须提前购票、到场时间、禁闪光灯与地址" },
    { label: "Queen Victoria Market · Official hours", url: "https://qvm.com.au/about/", note: "常规营业日与市场说明；周三通常关闭" },
    { label: "NGV", url: "https://www.ngv.vic.gov.au/", note: "展览、门票与开放时间；查询2026.08.16" },
    { label: "Holiday Inn Express Melbourne Little Collins", url: "https://www.ihg.com/holidayinnexpress/hotels/gb/en/melbourne/mellc/hoteldetail?fromRedirect=true&glat=sear&qDest=melbourne", note: "酒店位置、含早餐、停车和房型信息" },
    { label: "Dorsett Melbourne", url: "https://www.dorsetthotels.com/dorsett-melbourne/", note: "用于住宿比较：位置、Southern Cross步行、泳池和设施" },
    { label: "PTV · Free Tram Zone", url: "https://www.ptv.vic.gov.au/more/travelling-on-the-network/travel-tips-and-tools/free-tram-zone/", note: "墨尔本市区电车范围；临行复核线路" },
    { label: "Jetstar · Flight status", url: "https://www.jetstar.com/au/en/help/articles/flight-status", note: "JQ609、JQ171临行查看；航班号以订单为准" },
    { label: "Wikimedia Commons / Unsplash", url: "https://commons.wikimedia.org/", note: "页面图片为视觉预览；实际图片版权与作者以链接页面为准" },
    ...data.sources
  ];

  data.members = [
    { id: "LL", name: "3_stones" },
    { id: "YM", name: "杨眉" },
    { id: "QNL", name: "兰花" },
    { id: "SZ", name: "飞流" }
  ];
  data.todos = [
    { id: "todo-nz-visa", kind: "todo", priority: "待办", title: "办理新西兰签证 / 签注", note: "提前办理签注；当前行程按不需要签证理解，出发前仍按官方要求复核。", link: "https://www.immigration.govt.nz/" },
    { id: "todo-sim", kind: "todo", priority: "待办", title: "购买电话卡", note: "9月19日开始使用，准备覆盖30天；提前确认eSIM/实体卡、热点和流量。", link: "" },
    { id: "todo-dinner", kind: "todo", priority: "待办", title: "跟大姐、三姐约饭", note: "优先安排9月20日，若不便则改为9月21日。", link: "" },
    { id: "todo-insurance", kind: "todo", priority: "待办", title: "购买旅行保险", note: "覆盖澳大利亚、新西兰自驾、航班延误、医疗和租车相关风险；购买后把保单放进路书。", link: "" }
  ];
  const australiaDayPhotos = {
    au0: asset("hero-australia"), au1: asset("sydney-arrival"), au2: asset("sydney-gardens"),
    au3: asset("sydney-bondi"), au4: asset("melbourne-city"), au5: asset("melbourne-laneway"),
    au6: asset("phillip-island"), au7: asset("melbourne-city")
  };
  const placePhoto = (item, fallback) => {
    const key = `${item.name || ""} ${item.query || ""} ${item.kind || ""}`.toLowerCase();
    if (/bondi|coogee|tamarama|icebergs/.test(key)) return asset("sydney-bondi");
    if (/manly|shelly|ferry/.test(key)) return asset("sydney-manly");
    if (/botanic|macquarie|barangaroo/.test(key)) return asset("sydney-gardens");
    if (/opera|circular|rocks|harbour/.test(key)) return asset("sydney-arrival");
    if (/hosier|laneway|degraves/.test(key)) return asset("melbourne-laneway");
    if (/library|ngv/.test(key)) return asset("melbourne-library");
    if (/queen victoria|market/.test(key)) return asset("melbourne-market");
    if (/酒庄午餐|winery restaurant/.test(key)) return foodPool[1];
    if (/yarra valley|winery|vineyard|酒庄|葡萄园/.test(key)) return asset("yarra-valley");
    if (/penguin parade|企鹅/.test(key)) return asset("penguin-parade");
    if (/nobbies/.test(key)) return asset("nobbies");
    if (/cowes/.test(key)) return asset("cowes");
    if (/phillip/.test(key)) return asset("phillip-island");
    if (/flinders|federation|southbank|melbourne|yarra river/.test(key)) return asset("melbourne-city");
    return fallback;
  };
  data.days.forEach((day, dayIndex) => {
    if (!day.id?.startsWith("au")) return;
    day.image = australiaDayPhotos[day.id] || day.image;
    day.credit = "Wikimedia Commons · 已压缩为本地图片";
    (day.highlights || []).forEach((item) => { item.image = placePhoto(item, day.image); });
    (day.meals || []).forEach((item, itemIndex) => {
      const key = `${item.name || ""} ${item.type || ""}`.toLowerCase();
      item.image = /按a\/b/.test(key) ? foodPool[4] : (/wine|酒庄|yarra/.test(key) ? asset("yarra-valley") : foodPool[(dayIndex + itemIndex) % foodPool.length]);
    });
    (day.choices || []).forEach((choice, choiceIndex) => {
      choice.image = placePhoto(choice, day.image);
      (choice.highlights || []).forEach((item) => { item.image = placePhoto(item, choice.image); });
      (choice.meals || []).forEach((item, itemIndex) => {
        const key = `${item.name || ""} ${item.type || ""}`.toLowerCase();
        if (/cowes/.test(key)) item.image = asset("cowes");
        else if (/visitor centre/.test(key)) item.image = foodPool[0];
        else if (/酒庄|yarra|winery/.test(key)) item.image = foodPool[2];
        else if (/cbd/.test(key)) item.image = foodPool[3];
        else item.image = foodPool[(dayIndex + choiceIndex + itemIndex) % foodPool.length];
      });
    });
  });
  const hotelPhotos = { "sydney-ibis": asset("sydney-arrival"), "melbourne-hie": asset("melbourne-city"), "christchurch": asset("christchurch-city") };
  data.hotels.forEach((hotel) => { if (hotelPhotos[hotel.id]) hotel.image = hotelPhotos[hotel.id]; });
  data.meta.tripLedger = data.accounting.tripLedger;
  data.meta.lodgingTotal = data.accounting.lodgingTotal;
  data.meta.lodgingRule = "9.25悉尼机场与9.19–21悉尼按两家各自付款，其余住宿AA";
})();
