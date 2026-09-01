(function () {
  const q = (text) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
  const dir = (points) => {
    const p = points.map(encodeURIComponent);
    const origin = p.shift();
    const destination = p.pop();
    const waypoints = p.length ? `&waypoints=${p.join("%7C")}` : "";
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=driving`;
  };
  const commons = (name, width = 1400) => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(name)}?width=${width}`;
  const food = [
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=78",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=78",
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=78",
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=78"
  ];
  const meal = (name, type, query, notes, imageIndex = 0, booking = "") => ({ name, type, query, url: q(query), notes, image: food[imageIndex % food.length], booking });
  const stop = (name, lat, lng, query, kind = "景点", note = "") => ({ name, lat, lng, query, kind, note, map: q(query) });

  const hotels = [
    { id:"chc-airport", date:"9.25", nights:1, city:"基督城机场", name:"Airport Gateway Motor Lodge", address:"45 Roydvale Avenue, Burnside, Christchurch 8053", price:1216, user:489, shen:727, facts:["两家不同房型","免费停车","机场区"], image:commons("The Botanic Gardens in Christchurch New Zealand.jpg"), map:q("Airport Gateway Motor Lodge Christchurch"), link:"https://www.airportgateway.co.nz/accommodation", note:"贵房为沈家，便宜房为你家；不参与AA。", lat:-43.4897, lng:172.5570 },
    { id:"tekapo", date:"9.26", nights:1, city:"Lake Tekapo / Takapō", name:"New peaceful / warm / family friendly Unit B", address:"35 Andrew Don Drive, Lake Tekapo 7999", price:3892.76, facts:["2卧优先","停车方便","整套房"], image:commons("Church of the Good Shepherd at Lake Tekapo.jpg"), map:q("35 Andrew Don Drive Lake Tekapo"), note:"入住15:00，退房10:00。", lat:-44.0010, lng:170.4748 },
    { id:"twizel", date:"9.27", nights:1, city:"Twizel", name:"A True Family House", address:"206 Mackenzie Drive, Twizel 7901", price:2142.40, facts:["4卧","2卫","免费停车"], image:commons("NZ Hooker Valley track.jpg"), map:q("206 Mackenzie Drive Twizel"), link:"https://www.airbnb.com/rooms/26610263", note:"空间充足；页面提示个人洗护用品可能需自备。", lat:-44.2595, lng:170.0983 },
    { id:"wanaka", date:"9.28–29", nights:2, city:"Wānaka", name:"Cosy home with indoor fireplace / outdoor patio", address:"70B Matai Road, Wānaka 9305", price:5817, facts:["2晚","壁炉","庭院停车"], image:commons("Lake wanaka.jpg"), map:q("70B Matai Road Wanaka"), link:"https://www.airbnb.com/rooms/48686136", note:"入住9.28，退房9.30。", lat:-44.6827, lng:169.1368 },
    { id:"queenstown", date:"9.30–10.1", nights:2, city:"Queenstown", name:"Queenstown Mountain View Retreat", address:"44 Goldfield Heights, Queenstown 9300", price:5165.73, facts:["2晚","山景","停车方便"], image:commons("Queenstown - Wakatipu Lake & Remarkables Mountains View from Skyline Gondola Observation Deck.jpg"), map:q("44 Goldfield Heights Queenstown"), link:"https://www.airbnb.com/rooms/1644535952191581825", note:"离CBD约10分钟车程；进城优先公共停车场。", lat:-45.0257, lng:168.6901 },
    { id:"teanau", date:"10.2–3", nights:2, city:"Te Anau", name:"Relaxing Te Anau Retreat", address:"8 Lawson Burrows Crescent, Te Anau 9600", price:3342.08, facts:["2晚","整套房","车位"], image:commons("00 1373 Milford Sound -New Zealand.jpg"), map:q("8 Lawson Burrows Crescent Te Anau"), link:"https://www.airbnb.com/rooms/48750684", note:"米尔福德出发基地；10.3出发前务必加满油。", lat:-45.4044, lng:167.7237 },
    { id:"haast", date:"10.4", nights:1, city:"Haast", name:"Beachfront Paradise: The Black Moth", address:"35 Fox Moth Drive, Haast 7886", price:2682.72, facts:["海边","免费停车","整套房"], image:commons("NZ - Knights Point - Haast Pass - Obelisk.jpg"), map:q("35 Fox Moth Drive Haast"), link:"https://www.airbnb.com/rooms/1148248503776849185", note:"长途转场后的休息站；提前在Wānaka/Makarora补给。", lat:-43.8518, lng:169.0135 },
    { id:"franz", date:"10.5", nights:1, city:"Franz Josef / Waiau", name:"TWO FOUR CRON · Downtown 2 Bedroom Premium Stay", address:"24 Cron Street, Franz Josef / Waiau 7886（请以订单页最终门牌为准）", price:1824.80, facts:["2卧","2卫","免费停车 / EV"], image:commons("Franz Josef Glacier, New Zealand (5).JPG"), map:q("24 Cron Street Franz Josef"), link:"https://www.airbnb.com/rooms/1192646002050539125", note:"市中心，餐厅步行方便；保留现有订单。", lat:-43.3887, lng:170.1843 },
    { id:"hokitika", date:"10.6", nights:1, city:"Hokitika", name:"Hoki Boatshed Accommodation", address:"2 Revell Street, Hokitika 7810", price:1891.17, facts:["海边位置","4人","停车"], image:commons("Hokitika Gorge (3).jpg"), map:q("2 Revell Street Hokitika"), link:"https://www.airbnb.com/rooms/1095911928830221258", note:"入住15:00，退房11:00；适合日落后去Glow Worm Dell。", lat:-42.7151, lng:170.9651 },
    { id:"castlehill", date:"10.7", nights:1, city:"Castle Hill", name:"Castle Hill现代宽敞度假屋", address:"3 Bevel Court, Castle Hill Village 7580", price:2421.06, facts:["3卧","2卫","免费停车"], image:commons("Kura Tāwhiti, Castle Hill, Canterbury, New Zealand.jpg"), map:q("3 Bevel Court Castle Hill New Zealand"), link:"https://www.airbnb.com/rooms/22409971", note:"已调整为10月7日入住；山区别墅，附近餐饮很少，抵达前买好晚餐和早餐。", lat:-43.2270, lng:171.7118 },
    { id:"chc-final", date:"10.8–9", nights:2, city:"基督城市中心", name:"第6套：漫步到体育场 · 2卧2卫 · 预留停车位", address:"187 Kilmore Street, Christchurch Central, Christchurch 8013, New Zealand", price:"", facts:["2卧","2卫","King + 2张单人床","预留车位"], image:commons("Christchurch Botanic Gardens in autumn.jpg"), map:q("187 Kilmore Street Christchurch 8013 New Zealand"), link:"https://www.airbnb.com/rooms/1241368912811080729", note:"已确认预订；10月8–10日入住。第6套房源总价待从订单补录。", lat:-43.5230, lng:172.6260 }
  ];
  hotels.forEach(h => { if (h.user == null) { h.user = h.price / 2; h.shen = h.price / 2; } });

  const days = [
    {
      id:"d01", date:"09.25", weekday:"周五", title:"落地基督城，只做三件事", base:"基督城机场", distanceKm:6, driveTime:"约15分钟", stayId:"chc-airport",
      summary:"16:25落地后取车、验车、采购。第一晚不赶路，把左侧驾驶和车辆功能适应好。",
      image:commons("The Botanic Gardens in Christchurch New Zealand.jpg"), credit:"HeatherJoyMilne / Wikimedia Commons",
      routeUrl:dir(["Christchurch Airport","Airport Gateway Motor Lodge Christchurch"]),
      schedule:[
        {time:"16:25", title:"抵达基督城机场", notes:"入境、取行李、租车；拍全车视频，确认备胎/补胎工具、雨刷、灯光和油种。", query:"Christchurch Airport"},
        {time:"18:00", title:"入住 Airport Gateway Motor Lodge", notes:"两家房型不同，分别办理入住。", query:"Airport Gateway Motor Lodge Christchurch"},
        {time:"18:30", title:"采购与简餐", notes:"购买早餐、饮用水、零食、防风雨补给；不要把新鲜食品留到离境。", query:"Countdown Christchurch Airport"}
      ],
      highlights:[
        {name:"租车验车照片", tag:"实用打卡", notes:"车身四角、轮毂、挡风玻璃、油表、里程和租车合同各拍一张。", photoTip:"手机横拍一遍完整车况视频，上传云端。", query:"Christchurch Airport car rentals", image:commons("The Botanic Gardens in Christchurch New Zealand.jpg")},
        {name:"超市补给", tag:"今晚必做", notes:"重点买早餐、保温水、坚果、三明治材料和垃圾袋。", photoTip:"把收据和采购清单拍下来，方便两家结算。", query:"Countdown Christchurch Airport", image:food[1]}
      ],
      meals:[meal("Good Thai Restaurant", "晚餐 · 机场区", "Good Thai Restaurant Christchurch", "落地较晚时的热食选择；出发前一周确认周五营业时间。", 0), meal("机场区超市简餐", "备选 · 最省时", "Woolworths Christchurch Airport", "若入境耗时，直接买熟食和第二天早餐。", 1)],
      fuel:"取车时确认油量和还车规则；机场周边加油站多，不必特意加满。", clothing:"下机后温差明显，外层防风衣放在随身行李最上面。", caution:"不要在疲劳、天黑和刚适应左侧驾驶时赶往Tekapo。", booking:"无", planB:"航班延误就取消采购，次日出城前在机场区超市完成。",
      stops:[stop("基督城机场",-43.4894,172.5322,"Christchurch Airport","交通"), stop("Airport Gateway Motor Lodge",-43.4897,172.5570,"Airport Gateway Motor Lodge Christchurch","住宿")]
    },
    {
      id:"d02", date:"09.26", weekday:"周六", title:"穿过坎特伯雷平原，抵达星空湖", base:"Lake Tekapo", distanceKm:235, driveTime:"约3小时15分", stayId:"tekapo",
      summary:"基督城—Geraldine—Fairlie—Tekapo。下午留给湖边、好牧羊人教堂和Mount John，夜里看星。",
      image:commons("Church of the Good Shepherd at Lake Tekapo.jpg"), credit:"Pseudopanax / Public Domain",
      routeUrl:dir(["Airport Gateway Motor Lodge Christchurch","Geraldine New Zealand","Fairlie New Zealand","Church of the Good Shepherd Lake Tekapo","35 Andrew Don Drive Lake Tekapo"]),
      schedule:[
        {time:"08:30", title:"出发前往Geraldine", notes:"平原路段适合练习左侧驾驶；每90分钟换司机或休息。", query:"Geraldine New Zealand"},
        {time:"10:15", title:"Geraldine咖啡 / 小镇短停", notes:"补咖啡、洗手间，控制在40分钟。", query:"Geraldine New Zealand"},
        {time:"12:00", title:"Fairlie午餐", notes:"吃馅饼并加油，之后进入高地天气变化区。", query:"Fairlie Bakehouse"},
        {time:"14:00", title:"Lake Tekapo湖畔与教堂", notes:"先看湖色，再避开旅行团高峰拍教堂。", query:"Church of the Good Shepherd Lake Tekapo"},
        {time:"16:00", title:"Mount John / 湖区高点", notes:"天气好再上山；有风或低云就改湖边步道。", query:"Mt John Observatory Lake Tekapo"},
        {time:"20:00后", title:"星空体验", notes:"付费观星需提前预约；自由观星也要关掉车灯、尊重暗夜环境。", query:"Dark Sky Project Lake Tekapo"}
      ],
      highlights:[
        {name:"好牧羊人教堂", tag:"经典机位", notes:"石砌教堂、蓝湖与雪山同框；内部是礼拜空间，保持安静。", photoTip:"傍晚从步道侧面拍，人物放在画面下三分之一。", query:"Church of the Good Shepherd Lake Tekapo", image:commons("Church of the Good Shepherd at Lake Tekapo.jpg")},
        {name:"Mount John全景", tag:"高处视角", notes:"俯瞰Tekapo与Alexandrina两湖；风力常比镇上大。", photoTip:"用2倍焦段压缩湖岸与雪山，避免广角把山拍小。", query:"Mt John Observatory Lake Tekapo", image:commons("Church of the Good Shepherd Lake Tekapo.jpg")},
        {name:"Aoraki Mackenzie星空", tag:"夜间精华", notes:"月光和云量会影响观感；专业团可使用望远镜并听南半球星空讲解。", photoTip:"手机用三脚架与夜景模式，关闭闪光灯。", query:"Dark Sky Project Lake Tekapo", image:"https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=1200&q=82"}
      ],
      meals:[meal("Fairlie Bakehouse", "午餐 · 馅饼", "Fairlie Bakehouse", "在进入Mackenzie Basin前快速解决午餐；热门口味可能售罄。", 2), meal("Kohan Restaurant", "晚餐 · 日式 / 三文鱼", "Kohan Restaurant Lake Tekapo", "Tekapo经典选择，建议提前订位；不想排队可改Dark Sky Diner。", 0, "建议预约")],
      fuel:"建议在Fairlie加满；Tekapo也有加油站，但价格和营业便利度通常不如大镇。", clothing:"白天防晒，日落后迅速降温；观星穿羽绒/抓绒、帽子、手套。", caution:"Burkes Pass可能有霜、雾或残雪；早上查NZTA与MetService。", booking:"Dark Sky Project Summit/Crater Experience建议提前订。", planB:"低云或大风：取消Mount John户外观景，改Dark Sky Project室内体验与湖边咖啡。",
      stops:[stop("Airport Gateway",-43.4897,172.5570,"Airport Gateway Motor Lodge Christchurch","住宿"), stop("Geraldine",-44.0906,171.2430,"Geraldine New Zealand"), stop("Fairlie",-44.0984,170.8284,"Fairlie New Zealand","餐饮"), stop("好牧羊人教堂",-44.0034,170.4824,"Church of the Good Shepherd Lake Tekapo"), stop("Mount John",-43.9856,170.4658,"Mt John Observatory Lake Tekapo"), stop("Tekapo住宿",-44.0010,170.4748,"35 Andrew Don Drive Lake Tekapo","住宿")]
    },
    {
      id:"d03", date:"09.27", weekday:"周日", title:"普卡基蓝与Aoraki雪山正面", base:"Twizel", distanceKm:175, driveTime:"约2小时40分", stayId:"twizel",
      summary:"Tekapo—Lake Pukaki—Aoraki/Mount Cook—Twizel。天气好走完整Hooker Valley；天气差改Tasman Glacier短线。",
      image:commons("NZ Hooker Valley track.jpg"), credit:"Jan Helebrant / CC0",
      routeUrl:dir(["35 Andrew Don Drive Lake Tekapo","Lake Pukaki Viewpoint","White Horse Hill Campground","206 Mackenzie Drive Twizel"]),
      schedule:[
        {time:"08:00", title:"退房前往Lake Pukaki", notes:"先看Peter's Lookout，再沿SH80进入雪山走廊。", query:"Peter's Lookout Lake Pukaki"},
        {time:"10:00", title:"White Horse Hill停车", notes:"支付停车费后开始Hooker Valley；带水和午餐。", query:"White Horse Hill Campground"},
        {time:"10:20–14:00", title:"Hooker Valley Track", notes:"完整往返约10公里/3小时；新第二吊桥已于2026年7月开放。", query:"Hooker Valley Track"},
        {time:"14:30", title:"Mount Cook Village热饮", notes:"若走累就直接休息，不再叠加Tasman短线。", query:"Old Mountaineers Cafe Mount Cook"},
        {time:"17:00", title:"抵达Twizel入住", notes:"超市采购次日早餐和Wānaka路上的零食。", query:"206 Mackenzie Drive Twizel"}
      ],
      highlights:[
        {name:"Peter's Lookout", tag:"公路大片", notes:"SH80、普卡基湖和Aoraki形成最经典的纵深构图。", photoTip:"站在安全观景区，用长焦把公路和雪山压缩在一起，禁止站上车道。", query:"Peter's Lookout Lake Pukaki", image:commons("Track to Hooker Valley on a winter morning with Mt Sefton and Mount Cook in the background.jpg")},
        {name:"Hooker Valley Track", tag:"今日主角", notes:"步道坡度温和但天气变化快；冰雪环境下不要走上湖冰或接近冰山。", photoTip:"吊桥上不要久停，过桥后回望能拍出人物与雪峰。", query:"Hooker Valley Track", image:commons("NZ Hooker Valley track.jpg")},
        {name:"Hooker Lake终点", tag:"雪山终章", notes:"风大时体感温度很低；吃东西与拍照后及时返程。", photoTip:"低机位让碎石作前景，人物站侧边而非正中央。", query:"Hooker Lake", image:commons("The Hooker Track.jpg")}
      ],
      meals:[meal("Mt Cook Alpine Salmon", "途中补给 · 三文鱼", "Mt Cook Alpine Salmon Lake Pukaki", "以采购和短暂停为主，不在这里耗太久。", 2), meal("Ministry of Works Bar & Eatery", "晚餐 · Twizel", "Ministry of Works Bar and Eatery Twizel", "适合徒步后吃热食；周日营业情况出发前再确认。", 0)],
      fuel:"Tekapo或Twizel均可加油；进入SH80前至少保持半箱。", clothing:"真正的四季装备日：排汗层、抓绒、轻羽绒、防水外壳、帽子、手套、防滑徒步鞋。", caution:"White Horse Hill停车现为付费：NZ$2.50/半小时或NZ$25/天，刷卡、无现金；出发前复核DOC页面。", booking:"步道无需预约；停车到场付款。", planB:"风雪/低云：走Kea Point或Tasman Glacier View短线，取消完整Hooker Valley。",
      stops:[stop("Tekapo住宿",-44.0010,170.4748,"35 Andrew Don Drive Lake Tekapo","住宿"), stop("Peter's Lookout",-44.1083,170.1710,"Peter's Lookout Lake Pukaki"), stop("White Horse Hill",-43.7181,170.0910,"White Horse Hill Campground"), stop("Twizel住宿",-44.2595,170.0983,"206 Mackenzie Drive Twizel","住宿")]
    },
    {
      id:"d04", date:"09.28", weekday:"周一", title:"穿过黏土尖塔和Lindis Pass", base:"Wānaka", distanceKm:190, driveTime:"约3小时", stayId:"wanaka",
      summary:"Twizel—Omarama Clay Cliffs—Lindis Pass—Wānaka。路线不难，但Clay Cliffs支路可能是碎石路。",
      image:commons("Lake wanaka.jpg"), credit:"Ann Woolliams / CC BY-SA 4.0",
      routeUrl:dir(["206 Mackenzie Drive Twizel","Omarama Clay Cliffs","Lindis Pass Viewpoint","70B Matai Road Wanaka"]),
      schedule:[
        {time:"09:00", title:"Twizel出发", notes:"先加油，再往Omarama。", query:"Twizel petrol station"},
        {time:"10:15", title:"Omarama Clay Cliffs", notes:"碎石支路慢行；雨后泥泞或租车条款不允许时直接跳过。", query:"Omarama Clay Cliffs"},
        {time:"12:30", title:"Omarama午餐", notes:"热食、洗手间，给Lindis Pass留出天光。", query:"Omarama New Zealand"},
        {time:"14:00", title:"Lindis Pass Viewpoint", notes:"停车区小，只有安全车位才停。", query:"Lindis Pass Viewpoint"},
        {time:"16:30", title:"Wānaka入住与湖边", notes:"傍晚散步到That Wānaka Tree，降低第一天强度。", query:"That Wanaka Tree"}
      ],
      highlights:[
        {name:"Omarama Clay Cliffs", tag:"地貌", notes:"灰白与赭色尖塔像天然城堡；现场可能收少量通行费。", photoTip:"人物穿纯色外套，站在尖塔阴影边缘更有比例。", query:"Omarama Clay Cliffs", image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82"},
        {name:"Lindis Pass", tag:"公路观景", notes:"高地草坡与公路弧线是重点；不要越过护栏。", photoTip:"用竖构图，把弯曲公路留在下半部。", query:"Lindis Pass Viewpoint", image:"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=82"},
        {name:"That Wānaka Tree", tag:"日落机位", notes:"尊重湖岸与树木，不下水攀爬。", photoTip:"长焦拍树和远山，湖面留白比贴近广角更耐看。", query:"That Wanaka Tree", image:commons("Lonely tree of Wanaka.jpg")}
      ],
      meals:[meal("The Wrinkly Rams", "午餐 · Omarama", "The Wrinkly Rams Omarama", "路线中段的稳妥热食停靠。", 0), meal("Big Fig Wānaka", "晚餐 · 地中海共享盘", "Big Fig Wanaka", "不用正式排餐，适合到达时间不确定的转场日。", 2)],
      fuel:"Twizel或Omarama加满；到Wānaka再补下一阶段。", clothing:"高地风大，车里放防风外套；Clay Cliffs穿防滑、耐脏鞋。", caution:"Clay Cliffs最后一段为非铺装路，先核对租车合同；雨后不勉强进入。", booking:"无强制预约。", planB:"雨天跳过Clay Cliffs，把时间留给Wānaka咖啡馆和湖边。",
      stops:[stop("Twizel住宿",-44.2595,170.0983,"206 Mackenzie Drive Twizel","住宿"), stop("Clay Cliffs",-44.4888,169.9596,"Omarama Clay Cliffs"), stop("Lindis Pass",-44.5869,169.6360,"Lindis Pass Viewpoint"), stop("Wānaka住宿",-44.6827,169.1368,"70B Matai Road Wanaka","住宿"), stop("Wānaka Tree",-44.6981,169.1171,"That Wanaka Tree")]
    },
    {
      id:"d05", date:"09.29", weekday:"周二", title:"把Wānaka留给湖、山和慢早餐", base:"Wānaka", distanceKm:45, driveTime:"约1小时", stayId:"wanaka",
      summary:"不做特种兵。上午Diamond Lake/Rocky Mountain，下午湖边与小镇；Roy's Peak仅作为体能和天气都优秀时的替代。",
      image:commons("Lonely tree of Wanaka.jpg"), credit:"Tom Hall / CC BY 2.0",
      routeUrl:dir(["70B Matai Road Wanaka","Diamond Lake Conservation Area","Rippon Winery Wanaka","70B Matai Road Wanaka"]),
      schedule:[
        {time:"08:30", title:"镇上慢早餐", notes:"睡够再出发，西海岸长途驾驶在后面。", query:"Federal Diner Wanaka"},
        {time:"10:00", title:"Diamond Lake / Rocky Mountain", notes:"按天气选择45分钟短线或2–3小时完整环线。", query:"Diamond Lake Conservation Area Wanaka"},
        {time:"14:30", title:"湖边、咖啡与自由时间", notes:"可逛小店、湖边步道或回房休息。", query:"Wanaka Lakefront"},
        {time:"16:30", title:"Rippon视野 / 预约品鉴", notes:"酒后不驾驶；安排一位完全不饮酒司机。", query:"Rippon Winery Wanaka"}
      ],
      highlights:[
        {name:"Diamond Lake", tag:"轻徒步", notes:"比Roy's Peak轻松，仍能得到湖与山的层次；湿滑时缩短路线。", photoTip:"观景台用中焦拍湖湾曲线，避免人物贴边。", query:"Diamond Lake Conservation Area Wanaka", image:commons("Lake wanaka.jpg")},
        {name:"Wānaka湖滨", tag:"慢游", notes:"湖边长椅、咖啡和散步比塞满景点更适合这一天。", photoTip:"蓝调时刻拍灯光与湖面，手机曝光略降。", query:"Wanaka Lakefront", image:commons("Wanaka Tree (49545488493).jpg")},
        {name:"Rippon高地视野", tag:"葡萄园", notes:"是否开放品鉴及预约规则以官网/地图近期信息为准。", photoTip:"沿葡萄藤行列取引导线，人物不要进入生产区。", query:"Rippon Winery Wanaka", image:"https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=82"}
      ],
      meals:[meal("Federal Diner", "早餐 / Brunch", "Federal Diner Wanaka", "空间小、口碑好；避开正午高峰。", 1), meal("Francesca's Italian Kitchen", "晚餐 · 意式", "Francesca's Italian Kitchen Wanaka", "建议订位，适合两家一起正式吃一顿。", 0, "建议预约")],
      fuel:"Wānaka加满，为明日Crown Range与之后Te Anau做准备。", clothing:"分层穿衣；徒步鞋、防晒、轻薄雨衣。", caution:"Rob Roy在5–11月存在雪崩风险，且进山道路条件复杂，本路书不把它列为主线。", booking:"Rippon品鉴和Francesca's晚餐可提前预约。", planB:"全天雨：Puzzling World + Cinema Paradiso + 咖啡馆。",
      stops:[stop("Wānaka住宿",-44.6827,169.1368,"70B Matai Road Wanaka","住宿"), stop("Diamond Lake",-44.6672,168.9847,"Diamond Lake Conservation Area Wanaka"), stop("Rippon",-44.6969,169.0998,"Rippon Winery Wanaka"), stop("Wānaka住宿",-44.6827,169.1368,"70B Matai Road Wanaka","住宿")]
    },
    {
      id:"d06", date:"09.30", weekday:"周三", title:"Cardrona与Arrowtown，把路开进皇后镇", base:"Queenstown", distanceKm:120, driveTime:"约2小时15分", stayId:"queenstown",
      summary:"Wānaka—Cardrona—Crown Range—Arrowtown—Queenstown。若Crown Range有雪冰，改走Cromwell的SH6稳妥路线。",
      image:commons("Queenstown - Wakatipu Lake & Remarkable Mountains View from Skyline Gondola Observation Deck.jpg"), credit:"Wikimedia Commons / Public Domain",
      routeUrl:dir(["70B Matai Road Wanaka","Cardrona Hotel","Crown Range Summit","Arrowtown Chinese Settlement","44 Goldfield Heights Queenstown"]),
      schedule:[
        {time:"09:00", title:"Wānaka出发", notes:"先查看Crown Range webcam和QLDC路况。", query:"Crown Range Summit webcam"},
        {time:"10:00", title:"Cardrona Hotel短停", notes:"经典红色建筑；只喝咖啡，不饮酒驾驶。", query:"Cardrona Hotel"},
        {time:"11:15", title:"Crown Range安全观景", notes:"只在正式停车区停，严禁路肩急停。", query:"Crown Range Summit"},
        {time:"12:30", title:"Arrowtown午餐与华人定居点", notes:"留2–3小时慢走历史街区。", query:"Arrowtown Chinese Settlement"},
        {time:"16:30", title:"Queenstown入住", notes:"Goldfield Heights停车方便，晚上进城可用公共停车。", query:"44 Goldfield Heights Queenstown"}
      ],
      highlights:[
        {name:"Cardrona Hotel", tag:"公路地标", notes:"经典外墙与老车是机位；尊重住客和营业空间。", photoTip:"人在红车旁作为比例，避免正午顶光。", query:"Cardrona Hotel", image:"https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=82"},
        {name:"Arrowtown华人定居点", tag:"历史", notes:"理解19世纪华人淘金者生活，不只是拍旧房子。", photoTip:"用门框做前景，人物从小屋间穿行。", query:"Arrowtown Chinese Settlement", image:"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=82"},
        {name:"Lake Hayes", tag:"可选短停", notes:"若天气平静，可在湖边短走；时间不足直接略过。", photoTip:"低机位拍芦苇与倒影。", query:"Lake Hayes Pavilion", image:commons("Glenorchy at the Head of Lake Wakatipu.jpg")}
      ],
      meals:[meal("Provisions of Arrowtown", "午餐 / 咖啡", "Provisions of Arrowtown", "花园环境舒服；如果排队长就去The Fork and Tap。", 1), meal("Blue Kanu", "晚餐 · Pacific / Asian", "Blue Kanu Queenstown", "适合共享菜；热门时段建议订位。", 0, "建议预约")],
      fuel:"Wānaka出发前加满；Queenstown/Frankton加油站选择多。", clothing:"Crown Range停车拍照时风冷明显，防风外套放手边。", caution:"Crown Range春季仍可能黑冰或降雪；QLDC提示需要时携带并会安装防滑链。", booking:"Blue Kanu晚餐可预约。", planB:"Crown Range关闭：走Wānaka—Cromwell—Frankton的SH6，增加约45–60分钟。",
      stops:[stop("Wānaka住宿",-44.6827,169.1368,"70B Matai Road Wanaka","住宿"), stop("Cardrona Hotel",-44.8776,168.9947,"Cardrona Hotel"), stop("Crown Range",-44.9635,168.9482,"Crown Range Summit"), stop("Arrowtown",-44.9388,168.8360,"Arrowtown Chinese Settlement"), stop("Queenstown住宿",-45.0257,168.6901,"44 Goldfield Heights Queenstown","住宿")]
    },
    {
      id:"d07", date:"10.01", weekday:"周四", title:"Glenorchy公路与皇后镇夜景", base:"Queenstown", distanceKm:95, driveTime:"约1小时50分", stayId:"queenstown",
      summary:"上午沿Lake Wakatipu去Glenorchy，下午回Queenstown坐Skyline或逛湖滨。风景密度高但不需要早起赶路。",
      image:commons("Glenorchy at the Head of Lake Wakatipu.jpg"), credit:"Vladka Kennett / CC BY-SA 3.0",
      routeUrl:dir(["44 Goldfield Heights Queenstown","Bennett's Bluff Lookout","Glenorchy Wharf","Skyline Queenstown","44 Goldfield Heights Queenstown"]),
      schedule:[
        {time:"08:30", title:"出发去Glenorchy", notes:"湖岸弯道多，观景只进正式停车区。", query:"Glenorchy New Zealand"},
        {time:"09:30", title:"Bennett's Bluff Lookout", notes:"主观景平台拍湖湾与山脉。", query:"Bennett's Bluff Lookout"},
        {time:"10:30", title:"Glenorchy Wharf与红棚", notes:"走湖岸、喝咖啡；不继续深入碎石天堂公路。", query:"Glenorchy Wharf"},
        {time:"14:30", title:"返回Queenstown", notes:"回房休息或Queenstown Gardens。", query:"Queenstown Gardens"},
        {time:"17:00", title:"Skyline Gondola / 夜景", notes:"提前订票可减少排队，日落前上山。", query:"Skyline Queenstown"}
      ],
      highlights:[
        {name:"Bennett's Bluff", tag:"湖岸大片", notes:"Wakatipu湖弯与雪山的层次最强。", photoTip:"用长焦把弯道、湖湾和山体压在一起。", query:"Bennett's Bluff Lookout", image:commons("Glenorchy at the Head of Lake Wakatipu.jpg")},
        {name:"Glenorchy红棚", tag:"地标", notes:"码头与红棚适合轻松散步；风大时注意湖边安全。", photoTip:"从栈道斜侧面拍，让红棚与雪山错开。", query:"Glenorchy Wharf", image:commons("Glenorchy at the Head of Lake Wakatipu.jpg")},
        {name:"Skyline Bob's Peak", tag:"城市全景", notes:"俯瞰Queenstown、Lake Wakatipu与The Remarkables。", photoTip:"日落前30分钟上观景台，等城市灯亮后再下山。", query:"Skyline Queenstown", image:commons("Queenstown - Wakatipu Lake & Remarkable Mountains View from Skyline Gondola Observation Deck.jpg")}
      ],
      meals:[meal("Mrs Woolly's General Store", "午餐 · Glenorchy", "Mrs Woolly's General Store Glenorchy", "轻食与咖啡，节省行程时间。", 1), meal("Botswana Butchery", "晚餐 · 牛排", "Botswana Butchery Queenstown", "预算较高但适合正式晚餐；需要提前订位。", 0, "建议预约")],
      fuel:"Queenstown/Frankton出发前半箱以上即可；Glenorchy往返不要依赖沿途补给。", clothing:"湖边与山顶都风大，防风层不可少。", caution:"Queenstown CBD停车紧张，优先Man Street或Boundary Road等公共停车并步行。", booking:"Skyline Gondola建议提前；Botswana Butchery建议订位。", planB:"全天雨：Queenstown Arts & Crafts、咖啡馆、Onsen Hot Pools（如已预约）。",
      stops:[stop("Queenstown住宿",-45.0257,168.6901,"44 Goldfield Heights Queenstown","住宿"), stop("Bennett's Bluff",-44.9120,168.4937,"Bennett's Bluff Lookout"), stop("Glenorchy Wharf",-44.8505,168.3830,"Glenorchy Wharf"), stop("Skyline",-45.0261,168.6499,"Skyline Queenstown"), stop("Queenstown住宿",-45.0257,168.6901,"44 Goldfield Heights Queenstown","住宿")]
    },
    {
      id:"d08", date:"10.02", weekday:"周五", title:"从冒险之都转入峡湾前厅", base:"Te Anau", distanceKm:175, driveTime:"约2小时25分", stayId:"teanau",
      summary:"Queenstown—Kingston—Te Anau。下午以湖边、鸟类保护区或Glowworm Caves为主，为次日Milford保存体力。",
      image:commons("00 1373 Milford Sound -New Zealand.jpg"), credit:"W. Bulach / CC BY-SA 4.0",
      routeUrl:dir(["44 Goldfield Heights Queenstown","Kingston New Zealand","8 Lawson Burrows Crescent Te Anau"]),
      schedule:[
        {time:"09:30", title:"离开Queenstown", notes:"避开早高峰后出发，Frankton加油。", query:"Frankton Queenstown petrol station"},
        {time:"10:30", title:"Devil's Staircase / Kingston短停", notes:"正式观景位短停，不占路肩。", query:"Devils Staircase Lookout New Zealand"},
        {time:"13:00", title:"抵达Te Anau午餐入住", notes:"确认Milford船票、天气和SH94状态。", query:"8 Lawson Burrows Crescent Te Anau"},
        {time:"15:30", title:"湖边或鸟类保护区", notes:"轻松散步；若订Glowworm Caves则按船班提前报到。", query:"Te Anau Bird Sanctuary"}
      ],
      highlights:[
        {name:"Lake Te Anau湖滨", tag:"慢下来", notes:"大湖与远山是峡湾前奏，适合在长途日之间放空。", photoTip:"沿Lakefront Drive找木栈道与水鸟作前景。", query:"Lake Te Anau waterfront", image:commons("Milford Sound. New Zealand. (8171073678).jpg")},
        {name:"Te Anau Bird Sanctuary", tag:"本土鸟类", notes:"可了解takahē等新西兰鸟类；捐赠与开放信息临行前确认。", photoTip:"不用闪光灯，不追逐鸟类。", query:"Te Anau Bird Sanctuary", image:"https://images.unsplash.com/photo-1452570053594-1b985d6ea890?auto=format&fit=crop&w=1200&q=82"},
        {name:"Glowworm Caves", tag:"可选预约", notes:"含湖上往返和洞穴小船；洞内8–12°C且禁止拍照。", photoTip:"把相机收好，照片留给湖上航程。", query:"RealNZ Te Anau Glowworm Caves", image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82"}
      ],
      meals:[meal("Sandfly Cafe", "午餐 / 咖啡", "Sandfly Cafe Te Anau", "轻松、适合到达后用餐。", 1), meal("Redcliff Restaurant & Bar", "晚餐 · 新西兰料理", "Redcliff Restaurant Te Anau", "Milford前一晚的正式晚餐，建议订位但不要吃得太晚。", 0, "建议预约")],
      fuel:"进入Te Anau前或抵达后加满，10.3早上不要临时找油站。", clothing:"湖边风冷；Glowworm Caves穿防滑鞋、防水外套和抓绒。", caution:"今晚早睡。Milford Road驾驶强度高，驾驶员禁止饮酒。", booking:"Glowworm Caves可选，若参加需提前选好不影响早睡的时段。", planB:"雨天直接Glowworm Caves或回房休息。",
      stops:[stop("Queenstown住宿",-45.0257,168.6901,"44 Goldfield Heights Queenstown","住宿"), stop("Kingston",-45.3329,168.7146,"Kingston New Zealand"), stop("Te Anau住宿",-45.4044,167.7237,"8 Lawson Burrows Crescent Te Anau","住宿"), stop("Te Anau湖滨",-45.4161,167.7166,"Lake Te Anau waterfront")]
    },
    {
      id:"d09", date:"10.03", weekday:"周六", title:"Milford Sound：路本身就是景点", base:"Te Anau", distanceKm:240, driveTime:"约4小时30分", stayId:"teanau",
      summary:"Te Anau—Eglinton Valley—Mirror Lakes—Homer Tunnel—Milford Sound往返。推荐预订中午船班，留足道路停靠和突发管制缓冲。",
      image:commons("00 1373 Milford Sound -New Zealand.jpg"), credit:"W. Bulach / CC BY-SA 4.0",
      routeUrl:dir(["8 Lawson Burrows Crescent Te Anau","Eglinton Valley","Mirror Lakes Fiordland","Monkey Creek","Milford Sound Visitor Terminal","8 Lawson Burrows Crescent Te Anau"]),
      schedule:[
        {time:"07:00", title:"满油出发", notes:"再次查看Milford Road状态；车内备水、热饮和午餐。", query:"Milford Road status"},
        {time:"08:00", title:"Eglinton Valley", notes:"路旁正式停车位短停10–15分钟。", query:"Eglinton Valley"},
        {time:"08:40", title:"Mirror Lakes", notes:"小步道约20–30分钟，平静无风时倒影最好。", query:"Mirror Lakes Fiordland"},
        {time:"10:00", title:"Monkey Creek / Homer Tunnel", notes:"看天气和停车条件选择；不要喂kea。", query:"Monkey Creek Fiordland"},
        {time:"11:15", title:"抵达Milford Visitor Terminal", notes:"至少提前30分钟停车、步行、办理登船。", query:"Milford Sound Visitor Terminal"},
        {time:"12:00–14:00", title:"峡湾巡游", notes:"甲板湿滑，防水外套和防滑鞋比雨伞有用。", query:"Milford Sound cruise terminal"},
        {time:"17:30前", title:"返回Te Anau", notes:"天黑前返回；回程减少停靠。", query:"8 Lawson Burrows Crescent Te Anau"}
      ],
      highlights:[
        {name:"Mirror Lakes", tag:"倒影", notes:"水面平静时可看到Earl Mountains倒影；早到人少。", photoTip:"把镜头贴近水面高度，竖构图同时收天空与倒影。", query:"Mirror Lakes Fiordland", image:commons("Milford Sound. New Zealand. (8171073678).jpg")},
        {name:"Homer Tunnel前高山", tag:"公路奇观", notes:"可能有kea靠近车辆，严禁投喂、关好车门。", photoTip:"只在指定停车区拍摄，不在隧道口车道停留。", query:"Homer Tunnel", image:"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=82"},
        {name:"Milford Sound Cruise", tag:"必订精华", notes:"雨天瀑布反而更多；船上室内外都能看景。", photoTip:"靠近瀑布时保护镜头，Mitre Peak用竖构图。", query:"Milford Sound cruise terminal", image:commons("00 1373 Milford Sound -New Zealand.jpg")}
      ],
      meals:[meal("自带午餐与热饮", "最稳妥", "FreshChoice Te Anau", "前一晚准备三明治、巧克力和热水，避免依赖沿途餐饮。", 2), meal("Ditto Te Anau", "晚餐 · 回城后", "Ditto Te Anau", "回程时间不确定，先查看是否可订较晚时段。", 0)],
      fuel:"Te Anau出发必须满油；不要把Milford当作可靠补给点。", clothing:"防水外壳、抓绒/羽绒、防滑鞋、备用袜、帽子、驱蚊。", caution:"SH94有雪崩、落石、冰雪和无信号路段；道路关闭绝不绕行或等待硬闯。", booking:"Milford Sound船票必须提前；建议选择可改期/可退款条款。", planB:"Milford Road关闭：改Te Anau湖、Glowworm Caves或Manapouri；联系船公司改期/退款。",
      stops:[stop("Te Anau住宿",-45.4044,167.7237,"8 Lawson Burrows Crescent Te Anau","住宿"), stop("Eglinton Valley",-45.0199,167.9993,"Eglinton Valley"), stop("Mirror Lakes",-45.0267,168.0194,"Mirror Lakes Fiordland"), stop("Monkey Creek",-44.7815,168.0151,"Monkey Creek Fiordland"), stop("Milford Terminal",-44.6715,167.9260,"Milford Sound Visitor Terminal"), stop("Te Anau住宿",-45.4044,167.7237,"8 Lawson Burrows Crescent Te Anau","住宿")]
    },
    {
      id:"d10", date:"10.04", weekday:"周日", title:"全程最长转场：蒂阿瑙到哈斯特", base:"Haast", distanceKm:455, driveTime:"约6小时15分纯驾驶", stayId:"haast",
      summary:"这是全程唯一需要严格控时的长途日。07:30出发，Queenstown/Frankton、Wānaka、Makarora分段休息，最多保留两处Haast Pass短停。",
      image:commons("NZ - Knights Point - Haast Pass - Obelisk.jpg"), credit:"Genet / CC BY-SA 4.0",
      routeUrl:dir(["8 Lawson Burrows Crescent Te Anau","Frankton Queenstown","Wanaka New Zealand","Blue Pools Track","Thunder Creek Falls","35 Fox Moth Drive Haast"]),
      schedule:[
        {time:"07:30", title:"准时离开Te Anau", notes:"早餐和行李前一晚整理好；两位司机轮换。", query:"8 Lawson Burrows Crescent Te Anau"},
        {time:"09:45", title:"Frankton加油与休息", notes:"20分钟完成加油、洗手间、咖啡。", query:"Frankton Queenstown petrol station"},
        {time:"12:00", title:"Wānaka早午餐 / 补给", notes:"控制45分钟，下午山口与西岸天气更不稳定。", query:"Wanaka New Zealand"},
        {time:"14:15", title:"Blue Pools或Thunder Creek二选一", notes:"Blue Pools较耗时；若出发晚或下雨，只停Thunder Creek。", query:"Blue Pools Track"},
        {time:"17:30前", title:"抵达Haast", notes:"天黑前入住；晚餐选择少，准备自炊。", query:"35 Fox Moth Drive Haast"}
      ],
      highlights:[
        {name:"Blue Pools Track", tag:"按时取舍", notes:"吊桥、蓝绿色河谷；只有在14:00前到达且天气稳定时才走。", photoTip:"桥上快速拍摄并给其他游客让路。", query:"Blue Pools Track", image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82"},
        {name:"Thunder Creek Falls", tag:"五分钟精华", notes:"停车到瀑布很近，是长途日最合适的短停。", photoTip:"阴天用慢快门效果好，手机保持稳定。", query:"Thunder Creek Falls", image:"https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=82"},
        {name:"Haast海岸", tag:"抵达奖励", notes:"若天色和体力允许，在住宿附近看海，不再额外开远路。", photoTip:"海风强，人物背风站，镜头注意盐雾。", query:"Haast Beach", image:commons("NZ - Knights Point - Haast Pass - Obelisk.jpg")}
      ],
      meals:[meal("Big Fig Wānaka / 超市补给", "早午餐", "Big Fig Wanaka", "用餐与采购一次完成，给西岸留出时间。", 2), meal("自炊或Hard Antler", "晚餐 · Haast", "Hard Antler Bar and Restaurant Haast", "到店前电话/地图确认营业；最好准备自炊备选。", 0)],
      fuel:"Te Anau出发半箱以上；Frankton加满，Wānaka/Makarora看油量补充。Haast补给有限。", clothing:"全天分层、防雨；车内放保温水和薄毯。", caution:"全程最累的一天，严禁把Blue Pools、所有瀑布和海岸点全部塞入。任一司机疲劳立即换人。", booking:"无门票，但住宿晚餐补给需提前规划。", planB:"Crown Range/SH6天气差时仍按主干道走；若明显延误，取消所有Haast Pass步道，仅安全到达。",
      stops:[stop("Te Anau住宿",-45.4044,167.7237,"8 Lawson Burrows Crescent Te Anau","住宿"), stop("Frankton",-45.0180,168.7420,"Frankton Queenstown petrol station","加油"), stop("Wānaka",-44.6967,169.1367,"Wanaka New Zealand","餐饮"), stop("Blue Pools",-44.1641,169.2787,"Blue Pools Track"), stop("Thunder Creek",-44.1381,169.3507,"Thunder Creek Falls"), stop("Haast住宿",-43.8518,169.0135,"35 Fox Moth Drive Haast","住宿")]
    },
    {
      id:"d11", date:"10.05", weekday:"周一", title:"西海岸雨林、镜湖与双冰川", base:"Franz Josef", distanceKm:165, driveTime:"约2小时50分", stayId:"franz",
      summary:"Haast—Ship Creek—Fox Glacier—Lake Matheson—Franz Josef。今天里程不长，把最好的天气窗口给Lake Matheson。",
      image:commons("Glassy mirror-like Lake Matheson from Reflection Island jetty.jpg"), credit:"Pseudopanax / Public Domain",
      routeUrl:dir(["35 Fox Moth Drive Haast","Ship Creek New Zealand","Lake Matheson Walk","Fox Glacier South Side Walk","24 Cron Street Franz Josef"]),
      schedule:[
        {time:"08:30", title:"Haast出发", notes:"驱蚊涂好，先去Ship Creek短走。", query:"Ship Creek New Zealand"},
        {time:"09:15", title:"Ship Creek海岸雨林", notes:"选择Dune Lake Walk短线，控制30–45分钟。", query:"Ship Creek Walk"},
        {time:"11:30", title:"Fox Glacier镇午餐", notes:"先看山峰是否出云，决定Lake Matheson顺序。", query:"Fox Glacier New Zealand"},
        {time:"12:30", title:"Lake Matheson", notes:"短线Jetty 45分钟往返，完整环线约1.5小时。", query:"Lake Matheson Walk"},
        {time:"15:00", title:"Fox Glacier短线 / 咖啡", notes:"若低云或下雨，不追求冰川远眺。", query:"Fox Glacier South Side Walk"},
        {time:"17:00", title:"入住Franz Josef市中心", notes:"2卧2卫，晚餐步行解决。", query:"24 Cron Street Franz Josef"}
      ],
      highlights:[
        {name:"Ship Creek", tag:"海岸雨林", notes:"海浪、沙丘和古老雨林同时出现；沙蝇活跃。", photoTip:"用栈道和树根做前景，海岸留在远处。", query:"Ship Creek Walk", image:"https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=82"},
        {name:"Lake Matheson", tag:"今日主角", notes:"无风、山峰无云时倒影最佳；只走Jetty也足够。", photoTip:"镜头贴近水面，避免碰触植被；曝光略降保留雪山。", query:"Lake Matheson Walk", image:commons("Glassy mirror-like Lake Matheson from Reflection Island jetty.jpg")},
        {name:"Franz Josef小镇", tag:"冰川基地", notes:"实际冰川观景受云量和步道状态影响，直升机体验需天气确认。", photoTip:"镇上拍雪山背景时用长焦压缩街道。", query:"Franz Josef Glacier New Zealand", image:commons("Franz Josef Glacier, New Zealand (5).JPG")}
      ],
      meals:[meal("Matheson Cafe", "午餐 / 咖啡 · Fox", "Matheson Cafe Fox Glacier", "和Lake Matheson行程自然衔接；临行前查营业日。", 1), meal("Alice May Restaurant", "晚餐 · Franz Josef", "Alice May Restaurant Franz Josef", "镇中心稳妥选择，建议提前订位。", 0, "建议预约")],
      fuel:"Haast出发前看油量；Fox Glacier或Franz Josef补油，为次日北上。", clothing:"防水外套、徒步鞋、驱蚊；镜湖清晨/阴影处湿冷。", caution:"西海岸天气变化很快；直升机只选清晰退款/改期条款，不因天气勉强。", booking:"若考虑Heli Hike或观光飞行，提前预订可退款时段，并把天气作为最终决定。", planB:"大雨：缩短Lake Matheson，去West Coast Wildlife Centre或咖啡馆。",
      stops:[stop("Haast住宿",-43.8518,169.0135,"35 Fox Moth Drive Haast","住宿"), stop("Ship Creek",-43.6761,169.2218,"Ship Creek Walk"), stop("Lake Matheson",-43.4392,169.9665,"Lake Matheson Walk"), stop("Fox Glacier",-43.4631,169.9981,"Fox Glacier South Side Walk"), stop("Franz住宿",-43.3887,170.1843,"24 Cron Street Franz Josef","住宿")]
    },
    {
      id:"d12", date:"10.06", weekday:"周二", title:"冰川晨光之后，追一抹峡谷蓝", base:"Hokitika", distanceKm:205, driveTime:"约3小时15分", stayId:"hokitika",
      summary:"Franz Josef—Ross—Hokitika Gorge—Hokitika。先看天气：山峰清晰则上午短走，之后北上；Hokitika Gorge放在下午。",
      image:commons("Hokitika Gorge (3).jpg"), credit:"lumoplank / CC0",
      routeUrl:dir(["24 Cron Street Franz Josef","Ross New Zealand","Hokitika Gorge Scenic Reserve","2 Revell Street Hokitika"]),
      schedule:[
        {time:"08:00", title:"Franz Josef晨间短走", notes:"可选Tatare Tunnels或Waiho河谷短线，按DOC当日信息。", query:"Franz Josef Glacier Valley Walk"},
        {time:"10:30", title:"北上Ross", notes:"历史淘金小镇短停或直接通过。", query:"Ross New Zealand"},
        {time:"13:00", title:"Hokitika午餐", notes:"先补给再去峡谷，避免在峡谷找餐。", query:"Hokitika New Zealand"},
        {time:"14:15", title:"Hokitika Gorge", notes:"完整环线约1小时，雨后水色与流量变化大。", query:"Hokitika Gorge Scenic Reserve"},
        {time:"17:30", title:"海滩日落与小镇", notes:"入住Revell Street后步行去海边。", query:"Hokitika Beach Sign"},
        {time:"天黑后", title:"Glow Worm Dell可选", notes:"关闭手电直射、不触碰萤火虫环境。", query:"Glow Worm Dell Hokitika"}
      ],
      highlights:[
        {name:"Hokitika Gorge", tag:"峡谷蓝", notes:"冰川粉末形成独特蓝绿色；吊桥和环线步道视角不同。", photoTip:"阴天水色反而均匀，使用偏振镜可减少反光。", query:"Hokitika Gorge Scenic Reserve", image:commons("Hokitika Gorge (3).jpg")},
        {name:"Hokitika Beach Sign", tag:"日落", notes:"漂流木字样与塔斯曼海日落是小镇标志。", photoTip:"低机位让字样完整，太阳放在字母缝隙间。", query:"Hokitika Beach Sign", image:"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=82"},
        {name:"Glow Worm Dell", tag:"免费夜景", notes:"很短的夜间体验；保持安静和黑暗。", photoTip:"不建议手机硬拍，肉眼体验更好。", query:"Glow Worm Dell Hokitika", image:"https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=1200&q=82"}
      ],
      meals:[meal("Gatherer Wholefoods", "午餐 · Hokitika", "Gatherer Wholefoods Hokitika", "轻食和蔬菜补给；若休息则改Stumpers。", 1), meal("Stumpers Bar & Cafe", "晚餐 · 小镇中心", "Stumpers Bar and Cafe Hokitika", "适合日落前后，出发前核对周二营业。", 0)],
      fuel:"Franz Josef或Hokitika加油；去Hokitika Gorge前确保至少半箱。", clothing:"峡谷步道湿滑，防水鞋；海边看日落加防风层。", caution:"Hokitika Gorge手机信号和餐饮有限；不要越过护栏接近急流。", booking:"无门票；若前一日直升机因天气改期，不建议占用今天太晚时段。", planB:"大雨或峡谷关闭：留在Hokitika看手工艺、海滩和咖啡馆。",
      stops:[stop("Franz住宿",-43.3887,170.1843,"24 Cron Street Franz Josef","住宿"), stop("Ross",-42.8970,170.8150,"Ross New Zealand"), stop("Hokitika Gorge",-42.9564,171.0171,"Hokitika Gorge Scenic Reserve"), stop("Hokitika住宿",-42.7151,170.9651,"2 Revell Street Hokitika","住宿")]
    },
    {
      id:"d13", date:"10.07", weekday:"周三", title:"沿SH73翻越Arthur's Pass，住进Castle Hill", base:"Arthur's Pass / Castle Hill", distanceKm:255, driveTime:"约3小时45分–4小时15分", stayId:"castlehill",
      summary:"Hokitika—Greymouth—Otira Viaduct—Arthur's Pass—Castle Hill。取消Punakaiki后，今天以高山公路、峡谷观景和傍晚入住为主。",
      image:commons("New Zealand Arthurs Pass.jpg"), credit:"Eli Duke / CC BY-SA 2.0",
      routeUrl:dir(["2 Revell Street Hokitika","Greymouth New Zealand","Otira Viaduct Lookout","Arthur's Pass Village","Devils Punchbowl Walking Track","3 Bevel Court Castle Hill"]),
      schedule:[
        {time:"08:30", title:"离开Hokitika", notes:"早餐后直接出发；先在Greymouth完成加油、午餐和最后补给。", query:"Greymouth New Zealand"},
        {time:"09:30", title:"Greymouth补给", notes:"把水、零食和Castle Hill晚餐买齐，之后SH73沿线补给选择很少。", query:"Greymouth New Zealand"},
        {time:"11:30", title:"Otira Viaduct Lookout", notes:"短停拍高架桥、峡谷和山路；留意横风，不在车道边停车。", query:"Otira Viaduct Lookout"},
        {time:"12:15", title:"Arthur's Pass Village午餐", notes:"餐饮选择少，营业时间以当天为准；也可直接吃自带午餐。", query:"Arthur's Pass Cafe"},
        {time:"13:15", title:"Devils Punchbowl Track（可选）", notes:"往返约1小时、台阶较多；雨大、结冰或行程延误就跳过。", query:"Devils Punchbowl Walking Track"},
        {time:"16:30–17:00", title:"抵达Castle Hill入住", notes:"3 Bevel Court；先安顿、做饭，若天色和天气允许再拍Kura Tāwhiti晚光。", query:"3 Bevel Court Castle Hill New Zealand"}
      ],
      highlights:[
        {name:"Otira Viaduct Lookout", tag:"峡谷公路", notes:"高架桥跨越陡峭山谷，是SH73最有辨识度的观景点之一。", photoTip:"用长焦压缩公路、桥和山谷；人站在护栏内侧，避免靠近车道。", query:"Otira Viaduct Lookout", image:commons("New Zealand Arthurs Pass.jpg")},
        {name:"Arthur's Pass Village", tag:"高山小镇", notes:"短走、热饮和看kea即可，不要在当天再叠加长线徒步。", photoTip:"拍站牌、铁路线和雪山的层次；不要给kea喂食。", query:"Arthur's Pass Village", image:commons("New Zealand Arthurs Pass 01.jpg")},
        {name:"Kura Tāwhiti晚光", tag:"入住地预热", notes:"Castle Hill住处离石灰岩景观很近，天气好可在日落前后短拍。", photoTip:"低角度把岩体和远山放在同一画面，勿攀爬或触碰脆弱岩面。", query:"Kura Tawhiti Castle Hill Conservation Area", image:commons("Kura Tāwhiti, Castle Hill, Canterbury, New Zealand.jpg")}
      ],
      meals:[meal("Sevenpenny", "午餐 · Greymouth", "Sevenpenny Greymouth", "适合在长距离高山公路前补充热量；也可改为超市采购。", 1), meal("Wobbly Kea", "午餐备选 · Arthur's Pass", "Wobbly Kea Arthur's Pass", "营业时间和座位有限，建议随车准备三明治和热水。", 0), meal("Castle Hill自炊", "晚餐 · 住宿", "Four Square Springfield New Zealand", "在Greymouth或Arthur's Pass前买好食材，Castle Hill周边不要临时找餐厅。", 2)],
      fuel:"Greymouth加满；Arthur's Pass与Springfield虽有补给但不应作为唯一依赖。", clothing:"高山风雨和低温，穿保暖层、防水壳、手套/帽子；瀑布步道穿防滑鞋。", caution:"每天出发前查NZTA SH73路况；遇雪冰或官方关闭绝不进入。车内不留可见行李，kea会啄橡胶部件。", booking:"无门票；Devils Punchbowl按天气和体力现场决定。", planB:"SH73仍开放但天气差：只停Otira与Arthur's Pass村，取消瀑布步道，提前到Castle Hill入住。",
      stops:[stop("Hokitika住宿",-42.7151,170.9651,"2 Revell Street Hokitika","住宿"), stop("Greymouth",-42.4504,171.2108,"Greymouth New Zealand","加油/午餐"), stop("Otira Viaduct",-42.8737,171.5588,"Otira Viaduct Lookout"), stop("Arthur's Pass",-42.9440,171.5660,"Arthur's Pass Village"), stop("Devils Punchbowl",-42.9398,171.5628,"Devils Punchbowl Walking Track"), stop("Castle Hill住宿",-43.2270,171.7118,"3 Bevel Court Castle Hill New Zealand","住宿")]
    },
    {
      id:"d14", date:"10.08", weekday:"周四", title:"Castle Hill晨光，回到基督城入住第6套", base:"Castle Hill → Christchurch", distanceKm:110, driveTime:"约1小时30分–1小时45分", stayId:"chc-final",
      summary:"早晨拍Kura Tāwhiti，经过Springfield回到基督城；下午以市中心散步和第6套房源入住为主。",
      image:commons("Kura Tāwhiti, Castle Hill, Canterbury, New Zealand.jpg"), credit:"Michal Klajban / CC BY-SA 4.0",
      routeUrl:dir(["3 Bevel Court Castle Hill New Zealand","Kura Tawhiti Castle Hill Conservation Area","Springfield New Zealand","187 Kilmore Street Christchurch 8013 New Zealand"]),
      schedule:[
        {time:"08:00", title:"Kura Tāwhiti Access Track", notes:"免费、无需预订；安排1–2小时自由环行，带水并只在指定区域活动。", query:"Kura Tawhiti Castle Hill Conservation Area"},
        {time:"10:30", title:"经Springfield回城", notes:"SH73转SH1；Springfield可短停买馅饼或咖啡，不要把午后行程排太满。", query:"Springfield New Zealand"},
        {time:"12:30", title:"Springfield午餐", notes:"以当日营业为准；若排队，简单打包带走。", query:"Springfield New Zealand"},
        {time:"14:00", title:"入住第6套基督城房源", notes:"确认自助入住、车库/预留车位和行李卸放；入住地址为187 Kilmore Street。", query:"187 Kilmore Street Christchurch 8013 New Zealand"},
        {time:"15:00", title:"市中心轻松散步", notes:"按体力选择New Regent Street、Cathedral Junction、Riverside Market和Avon River。", query:"New Regent Street Christchurch"}
      ],
      highlights:[
        {name:"Kura Tāwhiti / Castle Hill", tag:"晨光大景", notes:"清晨侧光能把石灰岩体积和纹理拍出来，是今天最重要的打卡点。", photoTip:"广角拍环境、长焦拍孤立岩体；不攀爬、不涂写、不越过脆弱植被。", query:"Kura Tawhiti Castle Hill Conservation Area", image:commons("Kura Tāwhiti, Castle Hill, Canterbury, New Zealand.jpg")},
        {name:"Springfield小镇", tag:"公路停靠", notes:"适合作为从高山回城的短休息点，停留不必超过1小时。", photoTip:"拍小镇街景和公路牌即可，不为打卡绕路。", query:"Springfield New Zealand", image:"https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=82"},
        {name:"New Regent Street", tag:"城市色彩", notes:"西班牙传教式彩色建筑与电车构成基督城经典街景。", photoTip:"等电车进入画面，用2倍焦段减少杂乱；傍晚光线更柔和。", query:"New Regent Street Christchurch", image:"https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=82"}
      ],
      meals:[meal("Springfield午餐", "午餐 · 公路馅饼", "Springfield New Zealand", "从Castle Hill回城的顺路停靠；营业情况以当天为准。", 2), meal("Riverside Market", "晚餐 · 多人多选择", "Riverside Market Christchurch", "抵达市中心后各自选餐，适合四人不想再开车的一晚。", 0), meal("Little High Eatery", "备选 · 市中心", "Little High Eatery Christchurch", "若Riverside过于拥挤，可改去Little High。", 1)],
      fuel:"Castle Hill出发前确认油量；Springfield或进城后加油，第二天还车前再按合同要求补满。", clothing:"早晨仍按高山层次穿着，进入城市后可减层；随身带轻便雨衣。", caution:"Castle Hill无饮用水和稳定手机信号；车内不放贵重物品，确认第6套车库/预留车位的使用规则。", booking:"无必须预订；若想坐电车或Avon River Punt，临近出发查看班次。", planB:"雨雪或低云：取消Kura Tāwhiti长走，直接经Springfield进城，把下午留给Art Gallery、Canterbury Museum和Riverside。",
      stops:[stop("Castle Hill住宿",-43.2270,171.7118,"3 Bevel Court Castle Hill New Zealand","住宿"), stop("Kura Tāwhiti",-43.2304,171.7154,"Kura Tawhiti Castle Hill Conservation Area"), stop("Springfield",-43.3885,172.3523,"Springfield New Zealand","餐饮"), stop("基督城第6套住宿",-43.5230,172.6260,"187 Kilmore Street Christchurch 8013 New Zealand","住宿"), stop("Riverside Market",-43.5330,172.6334,"Riverside Market Christchurch","餐饮")]
    },
    {
      id:"d15", date:"10.09", weekday:"周五", title:"基督城市区慢游：花园、艺术与河畔", base:"Christchurch Central City", distanceKm:12, driveTime:"城市步行/短途驾车", stayId:"chc-final",
      summary:"不再搬家，整天以步行和短途车程游览基督城；晚上继续住第6套房源，减少还车前的折腾。",
      image:commons("Christchurch Botanic Gardens in autumn.jpg"), credit:"Bernard Spragg / CC0",
      routeUrl:dir(["187 Kilmore Street Christchurch 8013 New Zealand","Christchurch Botanic Gardens","Christchurch Art Gallery Te Puna o Waiwhetu","Riverside Market Christchurch","New Regent Street Christchurch"]),
      schedule:[
        {time:"09:00", title:"Botanic Gardens与Avon River", notes:"清晨光线柔和，安排1.5–2小时；可从市中心步行或短驾前往。", query:"Christchurch Botanic Gardens"},
        {time:"11:30", title:"Arts Centre / Art Gallery", notes:"根据当天开放时间二选一或都看；室内项目适合雨天。", query:"Christchurch Art Gallery Te Puna o Waiwhetu"},
        {time:"13:00", title:"市中心午餐", notes:"Victoria Street、Riverside Market或Little High均可，减少开车找位。", query:"Riverside Market Christchurch"},
        {time:"15:00", title:"New Regent Street与Cathedral Junction", notes:"彩色街屋、电车和城市复兴建筑集中，适合慢拍。", query:"New Regent Street Christchurch"},
        {time:"17:00", title:"回房整理行李", notes:"把护照、驾照、租车合同和充电器集中；确认第二天还车路线。", query:"187 Kilmore Street Christchurch 8013 New Zealand"}
      ],
      highlights:[
        {name:"Christchurch Botanic Gardens", tag:"城市绿洲", notes:"从高山和西海岸回到花园与Avon River，节奏自然放缓。", photoTip:"沿河拍桥、倒影和春季新绿；人物放在步道交叉处增加尺度。", query:"Christchurch Botanic Gardens", image:commons("Christchurch Botanic Gardens in autumn.jpg")},
        {name:"Arts Centre / Art Gallery", tag:"雨天备选", notes:"建筑、展览和城市历史都集中在步行范围内。", photoTip:"用对称构图拍老建筑拱廊，室内注意不使用闪光灯。", query:"Christchurch Art Gallery Te Puna o Waiwhetu", image:"https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=82"},
        {name:"Riverside Market与New Regent Street", tag:"最后一晚", notes:"一个适合吃饭，一个适合拍城市色彩；两处都不依赖长距离开车。", photoTip:"Riverside拍摊位细节，New Regent等电车经过再按快门。", query:"Riverside Market Christchurch", image:"https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=82"}
      ],
      meals:[meal("Victoria Street咖啡馆", "早餐 · 市中心", "Victoria Street Christchurch cafes", "靠近第6套房源，先看当天开门情况。", 1), meal("Riverside Market", "午餐 · 多选择", "Riverside Market Christchurch", "四人可以分开选餐，饭后直接步行去河畔。", 0), meal("Little High Eatery", "晚餐 · 备选", "Little High Eatery Christchurch", "不想排队时的室内备选；提前查营业时间。", 2)],
      fuel:"今天不必专门开车加油；晚餐后确认油量，必要时到机场方向油站加满。", clothing:"城市步行为主，穿舒适防滑鞋；带轻便雨衣和薄外套，早晚温差仍明显。", caution:"市中心部分路段有施工或单行线；停车尽量使用房源车位或正规停车场，不在街边长时间留行李。", booking:"电车、Punt和正式餐厅均为可选项目；不预订也能完成核心城市路线。", planB:"全天下雨：Art Gallery + Canterbury Museum + Riverside Market + 咖啡馆，取消花园长走。",
      stops:[stop("第6套住宿",-43.5230,172.6260,"187 Kilmore Street Christchurch 8013 New Zealand","住宿"), stop("Botanic Gardens",-43.5302,172.6207,"Christchurch Botanic Gardens"), stop("Arts Centre",-43.5308,172.6255,"Christchurch Arts Centre"), stop("Riverside Market",-43.5330,172.6334,"Riverside Market Christchurch","餐饮"), stop("New Regent Street",-43.5286,172.6368,"New Regent Street Christchurch")]
    },
    {
      id:"d16", date:"10.10", weekday:"周六", title:"退房、加油还车，飞回悉尼转成都", base:"Christchurch → Sydney → Chengdu", distanceKm:14, driveTime:"约25分钟 + 还车", stayId:null,
      summary:"10:00退房后不再安排远距离景点；完成加油、还车和国际航班值机，15:25起飞。",
      image:commons("Christchurch Botanic Gardens in autumn.jpg"), credit:"Bernard Spragg / CC0",
      routeUrl:dir(["187 Kilmore Street Christchurch 8013 New Zealand","Christchurch Airport petrol station","Christchurch Airport"]),
      schedule:[
        {time:"08:00", title:"最后早餐与短散步", notes:"在第6套房源附近解决，控制行李和时间，不再安排远处景点。", query:"breakfast near 187 Kilmore Street Christchurch"},
        {time:"10:00", title:"退房", notes:"核对护照、充电器、驾照、租车合同与全部行李；确认房源车位无遗留物。", query:"187 Kilmore Street Christchurch 8013 New Zealand"},
        {time:"11:30", title:"机场方向加油", notes:"按租车合同补至要求油量，保留小票并拍油表。", query:"Christchurch Airport petrol station"},
        {time:"12:00–12:15", title:"还车与前往航站楼", notes:"为找还车点、接驳和国际安检留出缓冲。", query:"Christchurch Airport car rental returns", url:"https://maps.app.goo.gl/eGEPVYGisXpXQqKk7"},
        {time:"15:25–17:05", title:"NZ223 基督城—悉尼", notes:"均为当地时间；抵达后按跨航站楼/安检指引转机。", query:"Christchurch Airport"},
        {time:"21:20", title:"3U3892 悉尼—成都", notes:"抵达成都05:15+1。", query:"Sydney Airport International Terminal"}
      ],
      highlights:[
        {name:"还车前车况", tag:"证据照片", notes:"油表、里程、车身四角、车内和还车位再次拍照，保留至押金退回。", photoTip:"照片带时间信息；把加油小票与租车合同一起保存。", query:"Christchurch Airport car rental returns", url:"https://maps.app.goo.gl/eGEPVYGisXpXQqKk7", image:"https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=82"},
        {name:"机场最后合影", tag:"旅程收尾", notes:"不要为了最后一张照片压缩还车和国际航班缓冲。", photoTip:"在航站楼或还车后拍四人合影，不在道路边停车。", query:"Christchurch Airport", image:commons("Christchurch Botanic Gardens in autumn.jpg")}
      ],
      meals:[meal("市中心早餐", "早餐 · 近房源", "breakfast near 187 Kilmore Street Christchurch", "优先步行解决，给退房和还车留出余量。", 1), meal("机场餐饮", "备选 · 航站楼", "Christchurch Airport food", "不为市区餐厅压缩还车和国际航班缓冲。", 0)],
      fuel:"按租车合同规定油量还车；保留加油小票并拍油表。", clothing:"把一套轻薄衣物放随身行李，悉尼转机和成都抵达温差不同。", caution:"15:25为国际航班，建议12:00左右进入机场流程；确认租车公司还车点、营业时间和机场接驳。", booking:"无需新增景点预订；保存两段航班和租车订单截图。", planB:"市区拥堵或天气差：退房后直接去机场，机场内吃午餐。",
      stops:[stop("第6套住宿",-43.5230,172.6260,"187 Kilmore Street Christchurch 8013 New Zealand","住宿"), stop("机场加油",-43.4932,172.5494,"Christchurch Airport petrol station","加油"), stop("基督城机场",-43.4894,172.5322,"Christchurch Airport","交通")]
    }
  ];

  const bookings = [
    { id:"milford", priority:"最高优先", title:"10.3 Milford Sound Cruise", note:"建议预订中午前后船班；自驾从Te Anau单程约121公里/2–3小时并留停车步行时间。选择可改期或至少提前24小时退款条款。", link:"https://www.realnz.com/en/experiences/day-cruises/milford-sound-day-trip-from-te-anau/" },
    { id:"stargazing", priority:"建议提前", title:"9.26 Tekapo星空体验", note:"Summit Experience约1小时45分；天气不佳时会有室内替代/改期安排，具体以订单条款为准。", link:"https://www.darkskyproject.co.nz/experiences/" },
    { id:"skyline", priority:"建议提前", title:"10.1 Skyline Queenstown Gondola", note:"提前购票可减少售票排队；开放时间随季节调整。", link:"https://queenstown.skyline.co.nz/things-to-do/queenstown-gondola/" },
    { id:"glowworm", priority:"可选", title:"10.2 Te Anau Glowworm Caves", note:"含湖上往返；洞内8–12°C、需弯腰和上下台阶、禁止摄影。", link:"https://www.realnz.com/en/experiences/glowworm-caves/te-anau-glowworm-caves/" },
    { id:"heli", priority:"天气项目", title:"10.5–10.6 冰川观光飞行 / Heli Hike", note:"仅选择清晰的天气取消与退款条款；把它视为加分项，不让它拖乱西海岸住宿路线。", link:q("Franz Josef Glacier heli hike") },
    { id:"restaurants", priority:"餐厅", title:"Queenstown / Wānaka / Te Anau正式晚餐", note:"优先订Blue Kanu、Botswana Butchery、Francesca's、Redcliff；其余保持机动。", link:q("Blue Kanu Queenstown") },
    { id:"chch-tram", priority:"可选", title:"10.8–10.9 Christchurch Tram / Punt", note:"市中心步行已经足够；若想坐电车或Avon River Punt，再临近出发查看班次与订票。", link:q("Christchurch Tramway") },
    { id:"roads", priority:"每日", title:"当天07:00检查NZTA / Milford Road / QLDC", note:"重点：SH8、Crown Range、SH94 Milford Road、SH6 Haast Pass、SH73 Arthur's Pass。", link:"https://www.journeys.nzta.govt.nz/" }
  ];

  const prep = [
    { icon:"🚗", title:"左侧驾驶与驾照", text:"有效海外驾照；非英文证件按租车公司与NZTA要求准备认可英文翻译或IDP。环岛让行、单车道桥和限速必须提前熟悉。", link:"https://nzta.govt.nz/travelling-on-our-roads/visitors-and-new-residents/visiting-new-zealand", label:"NZTA访客驾驶" },
    { icon:"❄️", title:"春季仍按冬季开车", text:"9月底至10月初高山路仍可能霜、冰、雪和临时关闭。每天出发前检查路况；至少半箱油，车内备暖衣、水和食物。", link:"https://www.nzta.govt.nz/safety/driving-safely/driving-to-the-conditions/winter-driving", label:"NZTA冬季驾驶" },
    { icon:"🛞", title:"防滑链", text:"取车时确认是否配链、适用轮胎以及是否允许使用。Crown Range、Milford Road、SH73遇雪可能要求安装。", link:"https://webadmin.qldc.govt.nz/services/transport-and-parking/winter-road-reports/", label:"QLDC道路报告" },
    { icon:"⛽", title:"加油原则", text:"Fairlie、Twizel、Wānaka、Frankton、Te Anau、Greymouth是主要补给节点。进入Milford、Haast Pass与Arthur's Pass前不低于半箱。", link:"https://www.journeys.nzta.govt.nz/", label:"NZTA Journey Planner" },
    { icon:"🥾", title:"衣物与徒步", text:"排汗层+抓绒/轻羽绒+防水硬壳；防滑徒步鞋、备用袜、手套、帽子、驱蚊和防晒。车里常备干衣。", link:"https://www.doc.govt.nz/parks-and-recreation/know-before-you-go/what-to-take/", label:"DOC装备建议" },
    { icon:"🌿", title:"入境生物安全", text:"徒步鞋、登山杖和户外装备彻底清洁；如实申报食品、木制品、动植物制品。拿不准就申报。", link:"https://www.mpi.govt.nz/travel-and-recreation/arriving-in-new-zealand/", label:"MPI入境申报" }
  ];

  const sources = [
    { label:"DOC · Hooker Valley Track", url:"https://www.doc.govt.nz/parks-and-recreation/places-to-go/canterbury/places/aoraki-mount-cook-national-park/things-to-do/tracks/hooker-valley-track/", note:"新第二吊桥、步道、停车收费与高山安全；查询2026.08.15" },
    { label:"NZTA · Journey Planner", url:"https://www.journeys.nzta.govt.nz/", note:"道路关闭、施工、摄像头和行程规划；每日临行复核" },
    { label:"NZTA · Winter driving", url:"https://www.nzta.govt.nz/safety/driving-safely/driving-to-the-conditions/winter-driving", note:"冰雪、能见度、半箱油与白天驾驶建议" },
    { label:"QLDC · Winter Road Reports", url:"https://webadmin.qldc.govt.nz/services/transport-and-parking/winter-road-reports/", note:"Crown Range webcam、雪冰与防滑链提示" },
    { label:"RealNZ · Milford Sound Day Trip", url:"https://www.realnz.com/en/experiences/day-cruises/milford-sound-day-trip-from-te-anau/", note:"行程时长、携带物、改期与取消政策" },
    { label:"RealNZ · Te Anau Glowworm Caves", url:"https://www.realnz.com/en/experiences/glowworm-caves/te-anau-glowworm-caves/", note:"价格、装备、洞内禁拍与出发地点" },
    { label:"Dark Sky Project · Tekapo", url:"https://www.darkskyproject.co.nz/experiences/", note:"Summit / Crater / 室内体验与预约" },
    { label:"Skyline Queenstown", url:"https://queenstown.skyline.co.nz/things-to-do/queenstown-gondola/", note:"开放时间与提前购票建议" },
    { label:"DOC · Lake Matheson", url:"https://www.doc.govt.nz/parks-and-recreation/places-to-go/west-coast/places/westland-tai-poutini-national-park/things-to-do/tracks/lake-matheson-walk/", note:"短线、完整环线、最佳倒影时段与装备" },
    { label:"DOC · Devils Punchbowl", url:"https://www.doc.govt.nz/parks-and-recreation/places-to-go/canterbury/places/arthurs-pass-national-park/things-to-do/tracks/devils-punchbowl-walking-track/", note:"台阶、河流风险、停车与SH73天气" },
    { label:"DOC · Kura Tāwhiti", url:"https://www.doc.govt.nz/parks-and-recreation/places-to-go/canterbury/places/kura-tawhiti-castle-hill/kura-tawhiti-access-track/", note:"文化礼仪、停车、饮水与安全" },
    { label:"ChristchurchNZ · Top day activities", url:"https://www.christchurchnz.com/visit/things-to-do/get-inspired/top-day-activities-in-christchurch", note:"植物园、Arts Centre、Riverside等城市活动；查询2026.08.16" },
    { label:"Wikimedia Commons", url:"https://commons.wikimedia.org/", note:"页面景点图；具体作者与许可见各图链接/alt说明" },
    { label:"OpenStreetMap / Leaflet", url:"https://www.openstreetmap.org/copyright", note:"交互地图底图与路线示意；非实时导航" }
  ];

  window.TRIP_DATA = {
    meta: {
      title:"新西兰南岛15晚自驾路书", dates:"2026.09.25—10.10", travelers:"4人 / 2对夫妻", nights:15, distanceKm:2470, queryDate:"2026.08.15",
      routeBases:[
        {name:"Christchurch Airport",lat:-43.4894,lng:172.5322},{name:"Lake Tekapo",lat:-44.0040,lng:170.4771},{name:"Twizel",lat:-44.2595,lng:170.0983},{name:"Wānaka",lat:-44.6967,lng:169.1367},{name:"Queenstown",lat:-45.0312,lng:168.6626},{name:"Te Anau",lat:-45.4145,lng:167.7180},{name:"Milford Sound",lat:-44.6715,lng:167.9260},{name:"Haast",lat:-43.8800,lng:169.0400},{name:"Franz Josef",lat:-43.3890,lng:170.1800},{name:"Hokitika",lat:-42.7160,lng:170.9670},{name:"Arthur's Pass",lat:-42.9440,lng:171.5660},{name:"Castle Hill",lat:-43.2304,lng:171.7154},{name:"Christchurch",lat:-43.5321,lng:172.6362}
      ]
    },
    hotels, days, bookings, prep, sources,
    helpers:{ q, dir, commons }
  };
})();
