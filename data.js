// GCJ-02 到 WGS84 坐标转换函数
var earthR = 6378137.0;

function outOfChina(lat, lng) {
    if ((lng < 72.004) || (lng > 137.8347)) {
        return true;
    }
    if ((lat < 0.8293) || (lat > 55.8271)) {
        return true;
    }
    return false;
}

function transform(x, y) {
    var xy = x * y;
    var absX = Math.sqrt(Math.abs(x));
    var xPi = x * Math.PI;
    var yPi = y * Math.PI;
    var d = 20.0*Math.sin(6.0*xPi) + 20.0*Math.sin(2.0*xPi);

    var lat = d;
    var lng = d;

    lat += 20.0*Math.sin(yPi) + 40.0*Math.sin(yPi/3.0);
    lng += 20.0*Math.sin(xPi) + 40.0*Math.sin(xPi/3.0);

    lat += 160.0*Math.sin(yPi/12.0) + 320*Math.sin(yPi/30.0);
    lng += 150.0*Math.sin(xPi/12.0) + 300.0*Math.sin(xPi/30.0);

    lat *= 2.0 / 3.0;
    lng *= 2.0 / 3.0;

    lat += -100.0 + 2.0*x + 3.0*y + 0.2*y*y + 0.1*xy + 0.2*absX;
    lng += 300.0 + x + 2.0*y + 0.1*x*x + 0.1*xy + 0.1*absX;

    return {lat: lat, lng: lng}
}

function delta(lat, lng) {
    var ee = 0.00669342162296594323;
    var d = transform(lng-105.0, lat-35.0);
    var radLat = lat / 180.0 * Math.PI;
    var magic = Math.sin(radLat);
    magic = 1 - ee*magic*magic;
    var sqrtMagic = Math.sqrt(magic);
    d.lat = (d.lat * 180.0) / ((earthR * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
    d.lng = (d.lng * 180.0) / (earthR / sqrtMagic * Math.cos(radLat) * Math.PI);
    return d;
}

function gcj2wgs(gcjLat, gcjLng) {
    if (outOfChina(gcjLat, gcjLng)) {
        return {lat: gcjLat, lng: gcjLng};
    }
    var d = delta(gcjLat, gcjLng);
    return {lat: gcjLat - d.lat, lng: gcjLng - d.lng};
}

// 批量转换GCJ-02坐标到WGS84坐标
function convertGCJ02ToWGS84(gcjLat, gcjLng) {
    var wgs84 = gcj2wgs(gcjLat, gcjLng);
    return [wgs84.lng, wgs84.lat]; // 返回[lng, lat]格式
}

// 直接使用WGS84坐标（已经是WGS84格式）
function useWGS84Coordinates(lat, lng) {
    return [lng, lat]; // 返回[lng, lat]格式
}

// // 坐标转换模型 - 基于七组控制点建立
// // 控制点数据：原相机坐标 -> 真实坐标
// var coordinateControlPoints = [
//     {
//         original: [113.986821, 22.546845], // 花样年香年广场A座 - 原相机坐标
//         real: [113.982060, 22.550101]      // 花样年香年广场A座 - 真实坐标
//     },
//     {
//         original: [113.946639, 22.514938], // 华润大厦艺术中心-发布厅 - 原相机坐标
//         real: [113.941635, 22.517732]      // 华润大厦艺术中心-发布厅 - 真实坐标
//     },
//     {
//         original: [113.951178, 22.517657], // 春茧体育馆大树广场 - 原相机坐标
//         real: [113.944734, 22.520191]      // 春茧体育馆大树广场 - 真实坐标
//     },
//     {
//         original: [114.030781, 22.536130], // 绿景广场C座 - 原相机坐标
//         real: [114.025531, 22.539318]      // 绿景广场C座 - 真实坐标
//     },
//     {
//         original: [114.027534, 22.535665], // 深铁置业大厦 - 原相机坐标
//         real: [114.022821, 22.538409]      // 深铁置业大厦 - 真实坐标
//     },
//     {
//         original: [113.890390, 22.503653], // 愈欣书店（前海印里店） - 原相机坐标
//         real: [113.885437, 22.506669]      // 愈欣书店（前海印里店） - 真实坐标
//     },
//     {
//         original: [113.887788, 22.543201], // 钟书阁 - 原相机坐标
//         real: [113.882947, 22.546183]      // 钟书阁 - 真实坐标
//     }
// ];

// // 计算加权平均偏移量（基于距离权重）
// function calculateWeightedOffset(targetLng, targetLat) {
//     var totalWeight = 0;
//     var weightedLngOffset = 0;
//     var weightedLatOffset = 0;
    
//     coordinateControlPoints.forEach(function(point) {
//         // 计算到目标点的距离
//         var distance = Math.sqrt(
//             Math.pow(targetLng - point.original[0], 2) + 
//             Math.pow(targetLat - point.original[1], 2)
//         );
        
//         // 使用距离的倒数作为权重（距离越近权重越大）
//         var weight = 1 / (distance + 0.0001); // 加小值避免除零
        
//         var lngOffset = point.real[0] - point.original[0];
//         var latOffset = point.real[1] - point.original[1];
        
//         weightedLngOffset += lngOffset * weight;
//         weightedLatOffset += latOffset * weight;
//         totalWeight += weight;
//     });
    
//     return {
//         lngOffset: weightedLngOffset / totalWeight,
//         latOffset: weightedLatOffset / totalWeight
//     };
// }

// // 坐标转换函数（使用加权平均）
// function convertToRealCoordinates(originalLng, originalLat) {
//     var offset = calculateWeightedOffset(originalLng, originalLat);
//     return [
//         originalLng + offset.lngOffset,
//         originalLat + offset.latOffset
//     ];
// }

// // 简单平均偏移量（用于参考）
// function calculateAverageOffset() {
//     var totalLngOffset = 0;
//     var totalLatOffset = 0;
    
//     coordinateControlPoints.forEach(function(point) {
//         totalLngOffset += (point.real[0] - point.original[0]);
//         totalLatOffset += (point.real[1] - point.original[1]);
//     });
    
//     return {
//         lngOffset: totalLngOffset / coordinateControlPoints.length,
//         latOffset: totalLatOffset / coordinateControlPoints.length
//     };
// }

// 机位图片映射表
var spotImageMap = {
    '花样年香年广场A座': '../机位采集数据/花样年香年广场A座_0.png',
    '绿景广场C座': '../机位采集数据/绿景广场C座_0.png',
    '深铁汇坊(深铁置业大厦店)': '../机位采集数据/深铁汇坊(深铁置业大厦店)_0.png',
    '华润大厦艺术中心-发布厅': '../机位采集数据/华润大厦艺术中心-发布厅_0.png',
    '愈欣书店(前海印里店)': '../机位采集数据/愈欣书店(前海印里店)_0.png',
    '钟书阁': '../机位采集数据/钟书阁_0.png',
    '粤海城·金啤坊': '../机位采集数据/粤海城·金啤坊_0.png',
    '春茧体育馆大树广场': '../机位采集数据/春茧体育馆大树广场_0.png',
    '深圳人才公园': '../机位采集数据/深圳人才公园_0.png',
    '深圳曼哈顿机位-文华大厦楼顶': '../机位采集数据/深圳曼哈顿机位-文华大厦楼顶_0.png',
    '腾讯滨海大厦': '../机位采集数据/腾讯滨海大厦_0.png',
    '春笋大厦-后海大桥': '../机位采集数据/春笋大厦-后海大桥_0.png',
    '皇岗村灵王古庙': '../机位采集数据/皇岗村灵王古庙_0.png',
    '石鼓小区': '../机位采集数据/石鼓小区_0.png',
    '大疆天空之城-万科云设计公社的橙色人行桥': '../机位采集数据/大疆天空之城-万科云设计公社的橙色人行桥_0.png',
    '万科云城设计公社-屋顶花园': '../机位采集数据/万科云城设计公社-屋顶花园_0.png',
    '金中环国际商务大厦': '../机位采集数据/金中环国际商务大厦_0.png',
    '深圳湾公园-南山CBD': '../机位采集数据/深圳湾公园-南山CBD_0.png',
    '深圳博物馆古代艺术馆': '../机位采集数据/深圳博物馆古代艺术馆_0.png',
    '桂湾公园-前海CBD': '../机位采集数据/桂湾公园-前海CBD_0.png',
    '人才公园后海大桥-南山CBD': '../机位采集数据/人才公园后海大桥-南山CBD_0.png',
    '莲花山公园-罗湖CBD': '../机位采集数据/莲花山公园-罗湖CBD_0.png',
    '愈欣书店(龙华印象汇店)': '../机位采集数据/愈欣书店(龙华印象汇店)_0.png',
    '深圳岗厦北地铁站': '../机位采集数据/深圳岗厦北地铁站_0.png',
    '深中通道日落': '../机位采集数据/深中通道日落_0.png',
    '深圳·盐田高级中学观景台': '../机位采集数据/深圳·盐田高级中学观景台_0.png',
    '深圳市当代艺术与城市规划馆': '../机位采集数据/深圳市当代艺术与城市规划馆_0.png',
    '古玩城·茶都(南门)': '../机位采集数据/古玩城·茶都(南门)_0.png',
    '西湾红树林': '../机位采集数据/西湾红树林_0.png',
    '深圳泰华梧桐村': '../机位采集数据/深圳泰华梧桐村_0.png',
    '弯月山谷公园': '../机位采集数据/弯月山谷公园_0.png',
    '荔枝公园': '../机位采集数据/荔枝公园_0.png',
    '深圳宝安区欢乐港湾-滨海艺术中心': '../机位采集数据/深圳宝安区欢乐港湾-滨海艺术中心_0.png',
    '汉京金融中心（深大北天桥上）': '../机位采集数据/汉京金融中心（深大北天桥上）_0.png',
    '望海路人行天桥': '../机位采集数据/望海路人行天桥_0.png',
    '全至科技创新园': '../机位采集数据/全至科技创新园_0.png',
    '科创大厦': '../机位采集数据/科创大厦_1.png'
};

// 机位数据 - 使用转换后的真实坐标
var spotData = [
    {
        id: 'spot_001',
        name: '花样年香年广场A座',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.546845,113.986821), // GCJ-02转WGS84坐标
        price: '免费',
        description: '建筑摄影机位，室内环境，免费使用',
        facilities: ['地铁站', '停车场', '餐饮', '休息区'],
        restrictions: ['需要商场许可', '禁止闪光灯'],
        rating: 4.3,
        environment: 'indoor', // 室内
        weather: ['sunny', 'cloudy', 'rainy'], // 适宜天气
        bestTime: '写字楼开放即可拍摄',
        address: '深圳市南山区侨香路4060号(侨城北地铁站D口）',
        imagePath: '../机位采集数据/花样年香年广场A座_0.png',
        shootingType: '建筑',
        environmentType: '室内',
        focalLength: '广角镜头',
        tripodRequired: '否',
        nearbyMetro: '侨城北D口',
        shootingTips: '建议大家拍照的时候相机调为静音模式。有两栋办公楼，A和C栋，A栋是正方形，C栋是长方形。坐电梯到3楼仰拍，20楼俯拍，拍照时注意安全。'
    },
    {
        id: 'spot_002',
        name: '绿景广场C座',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.536130,114.030781), // GCJ-02转WGS84坐标
        price: '免费',
        description: '建筑摄影机位，室内环境，免费使用',
        facilities: ['地铁站', '停车场', '餐饮'],
        restrictions: ['注意人流高峰'],
        rating: 4.1,
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        bestTime: '写字楼开放即可拍摄',
        address: '深圳市福田区深南大道6011号(车公庙地铁站J口）',
        imagePath: '../机位采集数据/绿景广场C座_0.png',
        shootingType: '建筑',
        environmentType: '室内',
        focalLength: '广角镜头',
        tripodRequired: '是，大厦内部灯光较暗',
        nearbyMetro: '车公庙J1出口',
        shootingTips: '拍摄地点为办公楼，进门左侧前往低区电梯1-18层，5楼有平台可以仰视拍照'
    },
    {
        id: 'spot_003',
        name: '深铁汇坊(深铁置业大厦店)',
        type: 'video',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.535665,114.027534), // GCJ-02转WGS84坐标
        price: '免费',
        description: '创意摄影机位，室内环境，免费使用',
        facilities: ['地铁站', '停车场', '餐饮', '休息区'],
        restrictions: ['需要申请许可', '注意光线'],
        rating: 4.0,
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        bestTime: '6:00-23:00',
        address: '深圳市福田区深南大道6011深铁置业大厦B2层（车公庙E口）',
        imagePath: '../机位采集数据/深铁汇坊(深铁置业大厦店)_0.png',
        shootingType: '创意',
        environmentType: '室内',
        focalLength: '广角镜头',
        tripodRequired: '否',
        nearbyMetro: '车公庙站F口',
        shootingTips: '这里其实是一条地铁食街，比较小，10来分钟可逛完；最好错开上下班高峰期，高峰期人太多；'
    },
    {
        id: 'spot_004',
        name: '华润大厦艺术中心-发布厅',
        type: 'video',
        status: 'occupied',
        coordinates: convertGCJ02ToWGS84(22.514938,113.946639), // GCJ-02转WGS84坐标
        price: '免费',
        description: '建筑摄影机位，室内环境，免费使用',
        facilities: ['地铁站', '专业设备', '休息区'],
        restrictions: ['需要预约', '专业设备要求'],
        rating: 4.7,
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        bestTime: '写字楼开放时间即可拍摄',
        address: '深圳市南山区中国华润大厦（后海站L口）',
        imagePath: '../机位采集数据/华润大厦艺术中心-发布厅_0.png',
        shootingType: '建筑',
        environmentType: '室内',
        focalLength: '广角镜头',
        tripodRequired: '否',
        nearbyMetro: '后海L口',
        shootingTips: '想拍干净的场景得早上7点半之前去蹲守，最好带脚架开延时拍，总能蹲到没人空窗瞬间。艺术馆内部设有围栏暂不开放拍摄'
    },
    {
        id: 'spot_005',
        name: '愈欣书店(前海印里店)',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.503653,113.890390), // GCJ-02转WGS84坐标
        price: '免费',
        description: '创意摄影机位，室内环境，免费使用',
        facilities: ['地铁站', '休息区', '咖啡厅'],
        restrictions: ['保持安静', '禁止闪光灯'],
        rating: 4.4,
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        bestTime: '10:00-22:00',
        address: '深圳市南山区自贸大街86号前海L2层（铁路公园A口）',
        imagePath: '../机位采集数据/愈欣书店(前海印里店)_0.png',
        shootingType: '创意',
        environmentType: '室内',
        focalLength: '广角镜头',
        tripodRequired: '否',
        nearbyMetro: '铁路公园A口',
        shootingTips: '广角低机位拍摄，可避免人潮10点刚开门就到店拍摄打卡'
    },
    {
        id: 'spot_006',
        name: '钟书阁',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.543201,113.887788), // GCJ-02转WGS84坐标
        price: '免费',
        description: '创意摄影机位，室内环境，免费使用',
        facilities: ['地铁站', '休息区', '咖啡厅'],
        restrictions: ['保持安静', '禁止闪光灯'],
        rating: 4.6,
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        bestTime: '10:00-22:00',
        address: '深圳市宝安区华侨城欢乐港湾东岸L1-021（临海B2口）',
        imagePath: '../机位采集数据/钟书阁_0.png',
        shootingType: '创意',
        environmentType: '室内',
        focalLength: '广角镜头',
        tripodRequired: '否',
        nearbyMetro: '临海B2口',
        shootingTips: '运用广角镜头拍摄最佳，画面更具有张力。贴地拍摄，可以拍出倒影，呈现出画面对称的美感。为了避免人多，可以早上刚开门的时候去拍，我10点开门的时候就去几乎没人，随意找角度慢慢拍'
    },
    {
        id: 'spot_007',
        name: '粤海城·金啤坊',
        type: 'drone',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.578234, 114.135330), // GCJ-02转WGS84坐标
        price: '免费',
        description: '建筑摄影机位，室外环境，免费使用',
        facilities: ['地铁站', '停车场', '餐饮'],
        restrictions: ['需要申请许可', '注意飞行高度'],
        rating: 4.2,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限',
        address: '深圳市罗湖区东昌路9号（布心B口）',
        imagePath: '../机位采集数据/粤海城·金啤坊_0.png',
        shootingType: '建筑',
        environmentType: '室外',
        focalLength: '广角/长焦镜头',
        tripodRequired: '否',
        nearbyMetro: '布心B口/太安站E口',
        shootingTips: '这里以前是金威啤酒的旧厂址，现在被改造成了工业创意街区，保留了工业遗址又增添了新的现代元素，周末人也很少，拍照不需要排队。附近还有一家星巴克甄选店。拍摄时可以低机位仰拍极简风格，也可以长焦拍特殊建筑'
    },
    {
        id: 'spot_008',
        name: '春茧体育馆大树广场',
        type: 'drone',
        status: 'maintenance',
        coordinates: useWGS84Coordinates(22.520076,113.944714), // GCJ-02转WGS84坐标
        price: '免费',
        description: '建筑摄影机位，室外环境，免费使用',
        facilities: ['地铁站', '停车场', '休息区'],
        restrictions: ['需要申请许可', '注意活动安排'],
        rating: 4.5,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限',
        address: '深圳市南山区滨海大道3001号（后海M口）',
        imagePath: '../机位采集数据/春茧体育馆大树广场_0.png',
        shootingType: '建筑',
        environmentType: '室外',
        focalLength: '广角/长焦/大光圈人像焦段',
        tripodRequired: '否',
        nearbyMetro: '后海H口',
        shootingTips: '这里网状钢结构非常有质感，可以拍摄人像，也可以广角拍摄建筑，抑或是长焦拍处于框架钟的春笋大楼'
    },
    {
        id: 'spot_009',
        name: '深圳人才公园',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.510111, 113.948600),
        price: '免费',
        description: '城市风光摄影机位，室外环境，免费使用',
        facilities: ['地铁站', '公园', '停车场'],
        restrictions: [],
        rating: 4.5,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限',
        address: '广东省深圳市南山区粤海街道科苑南路3329号',
        imagePath: '../机位采集数据/深圳人才公园_0.png',
        shootingType: '城市风光',
        environmentType: '室外',
        focalLength: '广角',
        tripodRequired: '否',
        nearbyMetro: '后海站L口，人才公园B1口',
        shootingTips: '傍晚时刻，等待大厦亮灯后可尝试大场景拍摄城市内透或晚霞（需要脚架）。亦可找花花草草当前景，拍摄春笋大厦同框'
    },
    {
        id: 'spot_010',
        name: '深圳曼哈顿机位-文华大厦楼顶',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.545401, 114.135972),
        price: '免费',
        description: '城市风光摄影机位，室外环境（楼顶），免费使用',
        facilities: ['地铁站', '楼顶'],
        restrictions: ['需提前预约'],
        rating: 4.2,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '日落-城市灯光亮起',
        address: '广东省深圳市罗湖区深南东路1027号',
        imagePath: '../机位采集数据/深圳曼哈顿机位-文华大厦楼顶_0.png',
        shootingType: '城市风光',
        environmentType: '室外（楼顶）',
        focalLength: '广角/中等焦段',
        tripodRequired: '是',
        nearbyMetro: '黄贝岭H口',
        shootingTips: '进入大楼后直接坐电梯到顶楼，尽量在落日前30分钟抵达机位，可拍摄日落黄金时刻，蓝调时刻，等到城市灯光亮起又是另一番景象'
    },
    {
        id: 'spot_011',
        name: '腾讯滨海大厦',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.522807, 113.935338), // GCJ-02转WGS84坐标
        price: '免费',
        description: '建筑摄影机位，室外环境，免费使用',
        facilities: ['地标建筑'],
        restrictions: [],
        rating: 4.3,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，推荐夜晚建筑亮灯拍摄',
        address: '广东省深圳市南山区海天二路33号',
        imagePath: '../机位采集数据/腾讯滨海大厦_0.png',
        shootingType: '建筑',
        environmentType: '室外',
        focalLength: '广角',
        tripodRequired: '否',
        nearbyMetro: '深大南站A1口',
        shootingTips: '可低机位仰拍建筑，夜晚时刻可以使用小光圈长曝光搭配三脚架拍星芒'
    },
    {
        id: 'spot_012',
        name: '春笋大厦-后海大桥',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.510260, 113.952340), // GCJ-02转WGS84坐标
        price: '免费',
        description: '建筑摄影机位，室外环境，免费使用',
        facilities: ['地标建筑', '大桥'],
        restrictions: [],
        rating: 4.1,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，推荐夜晚建筑亮灯拍摄',
        address: '广东省深圳市南山区',
        imagePath: '../机位采集数据/春笋大厦-后海大桥_0.png',
        shootingType: '建筑',
        environmentType: '室外',
        focalLength: '中长焦',
        tripodRequired: '是',
        nearbyMetro: '后海站L口/人才公园B1口',
        shootingTips: '夜晚使用脚架长曝光拍摄'
    },
    {
        id: 'spot_014',
        name: '皇岗村灵王古庙',
        type: 'photo',
        status: 'available',
        coordinates:  useWGS84Coordinates(22.528212,114.054359), // GCJ-02转WGS84坐标
        price: '免费',
        description: '建筑摄影机位，室外环境，免费使用',
        facilities: ['古庙', '地铁站'],
        restrictions: [],
        rating: 4.2,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限',
        address: '广东省深圳市福田区福田街道皇岗村文化广场10号',
        imagePath: '../机位采集数据/皇岗村灵王古庙_0.png',
        shootingType: '建筑',
        environmentType: '室外',
        focalLength: '中长焦',
        tripodRequired: '否',
        nearbyMetro: '皇岗村E口',
        shootingTips: '平安金融大厦与祠堂的同框，推荐使用三脚架大光圈长曝光拍摄'
    },
    {
        id: 'spot_015',
        name: '石鼓小区',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.576373, 113.947799), // GCJ-02转WGS84坐标
        price: '免费',
        description: '建筑摄影机位，室外环境，免费使用',
        facilities: ['小区', '地铁站'],
        restrictions: [],
        rating: 4.0,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，建议夜晚建筑亮灯拍摄',
        address: '广东省深圳市南山区沙河路与石鼓路交叉口',
        imagePath: '../机位采集数据/石鼓小区_0.png',
        shootingType: '建筑',
        environmentType: '室外',
        focalLength: '中长焦',
        tripodRequired: '否',
        nearbyMetro: '留仙洞A口',
        shootingTips: '可以拍摄出老旧居民楼与未来感高楼的跨时空对比，通过仰拍以及中长焦压缩空间的效果，使画面更加震撼'
    },
    {
        id: 'spot_016',
        name: '大疆天空之城-万科云设计公社的橙色人行桥',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.575868, 113.941042), // GCJ-02转WGS84坐标
        price: '免费',
        description: '建筑摄影机位，室外环境，免费使用',
        facilities: ['人行桥', '地标建筑'],
        restrictions: [],
        rating: 4.3,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，建议夜晚建筑亮灯拍摄',
        address: '广东省深圳市南山区仙茶路与兴科路交叉路口南侧',
        imagePath: '../机位采集数据/大疆天空之城-万科云设计公社的橙色人行桥_0.png',
        shootingType: '建筑',
        environmentType: '室外',
        focalLength: '广角/中长焦',
        tripodRequired: '否',
        nearbyMetro: '留仙洞A口',
        shootingTips: '沿着空中走廊来到设计公社B区，可以找到拍大疆总部的绝佳位置'
    },
    {
        id: 'spot_017',
        name: '万科云城设计公社-屋顶花园',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.575861, 113.940401), // GCJ-02转WGS84坐标
        price: '免费',
        description: '建筑摄影机位，室外环境，免费使用',
        facilities: ['屋顶花园'],
        restrictions: [],
        rating: 4.1,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，建议夜晚建筑亮灯拍摄',
        address: '广东省深圳市南山区创科路与打石二路交汇处',
        imagePath: '../机位采集数据/万科云城设计公社-屋顶花园_0.png',
        shootingType: '建筑',
        environmentType: '室外',
        focalLength: '广角/中长焦',
        tripodRequired: '否',
        nearbyMetro: '留仙洞A口',
        shootingTips: '在万科云城-设计公社的屋顶花园，这里能完整拍到这栋未来建筑的全貌，建议等到晚上大厦开了灯以后再拍，有种魔幻都市的既视感'
    },
    {
        id: 'spot_018',
        name: '金中环国际商务大厦',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.534426, 114.062825), // GCJ-02转WGS84坐标
        price: '免费',
        description: '城市风光摄影机位，室内环境，免费使用',
        facilities: ['地铁站', '写字楼'],
        restrictions: ['非自由进入'],
        rating: 4.3,
        environment: 'indoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '写字楼开放时间即可拍摄',
        address: '广东省深圳市福田区金田路3037',
        imagePath: '../机位采集数据/金中环国际商务大厦_0.png',
        shootingType: '城市风光',
        environmentType: '室内',
        focalLength: '广角',
        tripodRequired: '否',
        nearbyMetro: '会展中心A1口',
        shootingTips: 'A座进去就有电梯，记住要选能上38~42~44楼的。非自由进入，吸烟区有人抽烟才能进，不一定能有人开门'
    },
    {
        id: 'spot_019',
        name: '深圳湾公园-南山CBD',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.518984, 113.962951), // GCJ-02转WGS84坐标
        price: '免费',
        description: '城市风光摄影机位，室外环境，免费使用',
        facilities: ['公园', '观景平台'],
        restrictions: [],
        rating: 4.5,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，建议夜晚建筑亮灯拍摄',
        address: '深圳湾公园北湾鹭港观景平台',
        imagePath: '../机位采集数据/深圳湾公园-南山CBD_0.png',
        shootingType: '城市风光',
        environmentType: '室外',
        focalLength: '广角',
        tripodRequired: '否',
        nearbyMetro: '深圳湾公园C口',
        shootingTips: '建议日落和蓝调时刻搭配ND镜和三脚架长曝光拍摄城市内透'
    },
    {
        id: 'spot_020',
        name: '深圳博物馆古代艺术馆',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.542609, 114.101231), // GCJ-02转WGS84坐标
        price: '免费',
        description: '创意摄影机位，室内环境，免费使用',
        facilities: ['博物馆'],
        restrictions: [],
        rating: 4.3,
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        bestTime: '10:00-17:30（周一闭馆）',
        address: '广东省深圳市福田区同心路6号',
        imagePath: '../机位采集数据/深圳博物馆古代艺术馆_0.png',
        shootingType: '创意',
        environmentType: '室内',
        focalLength: '广角/长焦镜头',
        tripodRequired: '否',
        nearbyMetro: '科学馆站F口',
        shootingTips: '胶囊电梯拍照点建议在对面的2-3楼，最好等电梯动起来会更好看。'
    },
    {
        id: 'spot_021',
        name: '桂湾公园-前海CBD',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.524687, 113.898792), // GCJ-02转WGS84坐标
        price: '免费',
        description: '城市风光摄影机位，室外环境，免费使用',
        facilities: ['公园', '桥'],
        restrictions: [],
        rating: 4.4,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限',
        address: '广东省深圳市南山区前海鸿荣源中心8号门',
        imagePath: '../机位采集数据/桂湾公园-前海CBD_0.png',
        shootingType: '城市风光',
        environmentType: '室外',
        focalLength: '广角',
        tripodRequired: '否',
        nearbyMetro: '桂湾站B口',
        shootingTips: '拍摄机位在桂湾公园纤云桥底下，建议使用广角，nd+三脚架长曝光拍丝滑水面和流云'
    },
    {
        id: 'spot_022',
        name: '人才公园后海大桥-南山CBD',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.510260, 113.952340), // GCJ-02转WGS84坐标
        price: '免费',
        description: '城市风光摄影机位，室外环境，免费使用',
        facilities: ['大桥'],
        restrictions: [],
        rating: 4.1,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，建议夜晚建筑亮灯拍摄',
        address: '后海大桥',
        imagePath: '../机位采集数据/人才公园后海大桥-南山CBD_0.png',
        shootingType: '城市风光',
        environmentType: '室外',
        focalLength: '广角',
        tripodRequired: '否',
        nearbyMetro: '后海站L口/人才公园B1口',
        shootingTips: '建议在日落前30分钟到达机位，使用广角，nd+三脚架长曝光拍丝滑水面和晚霞'
    },
    {
        id: 'spot_023',
        name: '莲花山公园-罗湖CBD',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.553224, 114.059453), // GCJ-02转WGS84坐标
        price: '免费',
        description: '城市风光摄影机位，室外环境，免费使用',
        facilities: ['公园'],
        restrictions: [],
        rating: 4.4,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，建议白天需要爬山',
        address: '广东省深圳市福田区红荔路6030号',
        imagePath: '../机位采集数据/莲花山公园-罗湖CBD_0.png',
        shootingType: '城市风光',
        environmentType: '室外',
        focalLength: '广角/中长焦',
        tripodRequired: '否',
        nearbyMetro: '少年宫F1口',
        shootingTips: '需要登山，能看到邓小平爷爷雕像，登顶后可俯瞰福田CBD/罗湖CBD'
    },
    {
        id: 'spot_024',
        name: '愈欣书店(龙华印象汇店)',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.605195, 114.047251), // GCJ-02转WGS84坐标
        price: '免费',
        description: '创意摄影机位，室内环境，免费使用',
        facilities: ['书店', '地铁站'],
        restrictions: [],
        rating: 4.3,
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        bestTime: '10:00-22:00',
        address: '广东省深圳市龙华区民治街道民乐路与民治大道交叉口东南200米',
        imagePath: '../机位采集数据/愈欣书店(龙华印象汇店)_0.png',
        shootingType: '创意',
        environmentType: '室内',
        focalLength: '广角',
        tripodRequired: '否',
        nearbyMetro: '白石龙A口',
        shootingTips: '广角低机位拍摄，可避免人潮10点刚开门就到店拍摄打卡'
    },
    {
        id: 'spot_025',
        name: '深圳岗厦北地铁站',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.540763, 114.069290), // GCJ-02转WGS84坐标
        price: '免费',
        description: '创意摄影机位，室内环境，免费使用',
        facilities: ['地铁站'],
        restrictions: [],
        rating: 4.0,
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        bestTime: '不限',
        address: '',
        imagePath: '../机位采集数据/深圳岗厦北地铁站_0.png',
        shootingType: '创意',
        environmentType: '室内',
        focalLength: '广角',
        tripodRequired: '否',
        nearbyMetro: '岗厦北站',
        shootingTips: '中庭无柱大跨钢结构，有着独特的"深圳之眼"造型，螺旋线式的风格，多个天眼分布其中，阳光透过天眼洒下，光影效果超震撼，为摄影创作提供了丰富的几何线条和光影对比。'
    },
    {
        id: 'spot_026',
        name: '深中通道日落',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.582734,113.837124), // GCJ-02转WGS84坐标
        price: '免费',
        description: '城市风光摄影机位，室外环境，免费使用',
        facilities: ['公园', '海滨'],
        restrictions: [],
        rating: 4.5,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，建议傍晚拍日落',
        address: '广东省深圳市宝安区西乡街道金湾大道旁西湾红树林公园内',
        imagePath: '../机位采集数据/深中通道日落_0.png',
        shootingType: '城市风光',
        environmentType: '室外',
        focalLength: '长焦',
        tripodRequired: '是',
        nearbyMetro: '固戍站D口/碧海湾站 E 口',
        shootingTips: '固戍站 D 出口，步行约 2 公里；11 号线碧海湾站 E 出口，换乘 M197 路公交车到固戍井湾新村站下车，步行导航至西湾红树林观海平台。西湾红树林公园内 沿着海滨步道一直走到石滩，从桥底用长焦'
    },
    {
        id: 'spot_027',
        name: '深圳·盐田高级中学观景台',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.572362, 114.252136), // GCJ-02转WGS84坐标
        price: '免费',
        description: '城市风光摄影机位，室外环境，免费使用',
        facilities: ['观景台', '登山'],
        restrictions: [],
        rating: 4.2,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，建议傍晚拍蓝调',
        address: '',
        imagePath: '../机位采集数据/深圳·盐田高级中学观景台_0.png',
        shootingType: '城市风光',
        environmentType: '室外',
        focalLength: '广角/中长焦',
        tripodRequired: '否',
        nearbyMetro: '盐田港西站',
        shootingTips: '需要登山，从盐田港西地铁站到登山口，可见木制楼梯（P11），往上遇到路口往盐田高级中学方向（P12），约20分钟可到观景台。'
    },
    {
        id: 'spot_028',
        name: '深圳市当代艺术与城市规划馆',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.545895, 114.062039), // GCJ-02转WGS84坐标
        price: '无需门票，但需要提前预约',
        description: '创意摄影机位，室内环境，需要预约',
        facilities: ['艺术馆', '地铁站'],
        restrictions: ['需预约'],
        rating: 4.3,
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        bestTime: '周二至周日10:00-18:00，周一闭馆',
        address: '广东省深圳市福田区莲花街道福中路184号',
        imagePath: '../机位采集数据/深圳市当代艺术与城市规划馆_0.png',
        shootingType: '创意',
        environmentType: '室内',
        focalLength: '广角',
        tripodRequired: '否',
        nearbyMetro: '少年宫A2口',
        shootingTips: '主要机位：上电梯后进门正对的建筑。各种楼梯，形成引导线构图和切割画面，寻找冷暖对比。三楼平台上，向下拍摄旋梯，中间的暖色非常好看，整体的建筑线条硬朗，非常出片'
    },
    {
        id: 'spot_029',
        name: '古玩城·茶都(南门)',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.547348, 114.144405), // GCJ-02转WGS84坐标
        price: '免费',
        description: '城市风光摄影机位，室外环境，免费使用',
        facilities: ['古玩城'],
        restrictions: [],
        rating: 4.0,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限',
        address: '广东省深圳市罗湖区新秀路与秀一街交叉口',
        imagePath: '../机位采集数据/古玩城·茶都(南门)_0.png',
        shootingType: '城市风光',
        environmentType: '室外',
        focalLength: '中长焦',
        tripodRequired: '否',
        nearbyMetro: '黄贝岭H口',
        shootingTips: '这条路正对深圳地标，在这里能拍到三大地标同框，长焦压缩画面效果更佳'
    },
    {
        id: 'spot_030',
        name: '西湾红树林',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.579509,113.835976), // GCJ-02转WGS84坐标
        price: '免费',
        description: '创意摄影机位，室外环境，免费使用',
        facilities: ['红树林', '公园'],
        restrictions: [],
        rating: 4.4,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，建议傍晚拍日落',
        address: '广东省深圳市宝安区金湾大道与西海堤交汇处',
        imagePath: '../机位采集数据/西湾红树林_0.png',
        shootingType: '创意',
        environmentType: '室外',
        focalLength: '长焦',
        tripodRequired: '是',
        nearbyMetro: '固戍站D口/碧海湾站 E 口',
        shootingTips: '固戍站 D 出口，步行约 2 公里；11 号线碧海湾站 E 出口，换乘 M197 路公交车到固戍井湾新村站下车，步行导航至西湾红树林观海平台。在公园最南端的广深沿江高速下，犹如时空之门一般'
    },
    {
        id: 'spot_031',
        name: '深圳泰华梧桐村',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.550268, 113.890233), // GCJ-02转WGS84坐标
        price: '免费',
        description: '建筑摄影机位，室外环境，免费使用',
        facilities: ['小区', '地铁站'],
        restrictions: [],
        rating: 4.1,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，建议白天',
        address: '广东省深圳市宝安区新安泰华梧桐聚落花园',
        imagePath: '../机位采集数据/深圳泰华梧桐村_0.png',
        shootingType: '建筑',
        environmentType: '室外',
        focalLength: '广角',
        tripodRequired: '否',
        nearbyMetro: '宝安中心A口',
        shootingTips: '可从建筑内部低机位仰拍，亦可拍摄建筑外围绿植包围建筑奇特景象'
    },
    {
        id: 'spot_032',
        name: '弯月山谷公园',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.505557, 113.953650), // GCJ-02转WGS84坐标
        price: '免费',
        description: '城市风光摄影机位，室外环境，免费使用',
        facilities: ['公园'],
        restrictions: [],
        rating: 4.0,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限',
        address: '广东省深圳市南山区东滨沙河西立交桥',
        imagePath: '../机位采集数据/弯月山谷公园_0.png',
        shootingType: '城市风光',
        environmentType: '室外',
        focalLength: '广角/长焦',
        tripodRequired: '否',
        nearbyMetro: '后海M口',
        shootingTips: '从人才公园步行15分钟到，适合拍摄大场景城市风光，适合无人机拍摄'
    },
    {
        id: 'spot_033',
        name: '荔枝公园',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.545611, 114.102311), // GCJ-02转WGS84坐标
        price: '免费',
        description: '建筑摄影机位，室外环境，免费使用',
        facilities: ['公园'],
        restrictions: [],
        rating: 4.2,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，建议白天',
        address: '广东省深圳市福田区华强北街道红岭中路1001号',
        imagePath: '../机位采集数据/荔枝公园_0.png',
        shootingType: '建筑',
        environmentType: '室外',
        focalLength: '广角',
        tripodRequired: '否',
        nearbyMetro: '红岭F口',
        shootingTips: '建议在湖边，以石头为前景，夹脚架搭配nd拍摄长曝光大厦风光'
    },
    {
        id: 'spot_034',
        name: '深圳宝安区欢乐港湾-滨海艺术中心',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.544971, 113.882266), // GCJ-02转WGS84坐标
        price: '免费',
        description: '建筑摄影机位，室外环境，免费使用',
        facilities: ['艺术中心'],
        restrictions: [],
        rating: 4.3,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，建议白天',
        address: '广东省深圳市宝安区宝兴路欢乐港湾16号',
        imagePath: '../机位采集数据/深圳宝安区欢乐港湾-滨海艺术中心_0.png',
        shootingType: '建筑',
        environmentType: '室外',
        focalLength: '广角',
        tripodRequired: '是',
        nearbyMetro: '宝华A2口',
        shootingTips: '适合长曝光拍摄明度风建筑，低机位拍摄拉丝水面与流云'
    },
    {
        id: 'spot_035',
        name: '汉京金融中心（深大北天桥上）',
        type: 'photo',
        status: 'available',
        coordinates: useWGS84Coordinates(22.542645, 113.934143), // 天桥WGS84坐标
        price: '免费',
        description: '建筑摄影机位，室外环境，免费使用',
        facilities: ['金融中心'],
        restrictions: [],
        rating: 4.2,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，建议夜晚建筑亮灯拍摄',
        address: '广东省深圳市南山区深南大道9968号',
        imagePath: '../机位采集数据/汉京金融中心（深大北天桥上）_0.png',
        shootingType: '建筑',
        environmentType: '室外',
        focalLength: '广角/中等焦段',
        tripodRequired: '是',
        nearbyMetro: '深大A3口',
        shootingTips: '适合长曝光，拍摄车流尾灯拉丝'
    },
    {
        id: 'spot_036',
        name: '望海路人行天桥',
        type: 'photo',
        status: 'available',
        coordinates: useWGS84Coordinates(22.506497, 113.946908), // 天桥WGS84坐标
        price: '免费',
        description: '建筑摄影机位，室外环境，免费使用',
        facilities: ['天桥', '地铁站'],
        restrictions: [],
        rating: 4.0,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，建议夜晚建筑亮灯拍摄',
        address: '深圳湾口岸地铁站旁',
        imagePath: '../机位采集数据/望海路人行天桥_0.png',
        shootingType: '建筑',
        environmentType: '室外',
        focalLength: '广角',
        tripodRequired: '是',
        nearbyMetro: '深圳湾口岸地铁站',
        shootingTips: '适合长曝光，拍摄车流尾灯拉丝'
    },
    {
        id: 'spot_037',
        name: '全至科技创新园',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.764948, 113.822221), // GCJ-02转WGS84坐标
        price: '免费',
        description: '创意摄影机位，室外环境，免费使用',
        facilities: ['科技园'],
        restrictions: [],
        rating: 4.1,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，建议夜晚建筑亮灯拍摄',
        address: '广东省深圳市宝安区松安路与松河南路交叉口西南方向178米左右',
        imagePath: '../机位采集数据/全至科技创新园_0.png',
        shootingType: '创意',
        environmentType: '室外',
        focalLength: '中长焦',
        tripodRequired: '否',
        nearbyMetro: '朗下B口',
        shootingTips: '创意楼梯，极简风格'
    },
    {
        id: 'spot_038',
        name: '科创大厦',
        type: 'photo',
        status: 'available',
        coordinates: convertGCJ02ToWGS84(22.764771, 113.821419), // GCJ-02转WGS84坐标
        price: '免费',
        description: '创意摄影机位，室外环境，免费使用',
        facilities: ['大厦'],
        restrictions: [],
        rating: 4.0,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '不限，建议夜晚建筑亮灯拍摄',
        address: '广东省深圳市宝安区河滨南路4号',
        imagePath: '../机位采集数据/科创大厦_1.png',
        shootingType: '创意',
        environmentType: '室外',
        focalLength: '广角',
        tripodRequired: '是，建筑内部灯光较暗',
        nearbyMetro: '朗下B口',
        shootingTips: '建议低机位拍摄科技矩阵大楼风格'
    }
];

// 香港迪士尼导览数据
var disneyData = [
    // 交通站点
    {
        id: 'disney_transport_001',
        name: '迪士尼巴士车站',
        type: 'transport',
        category: 'transport',
        status: 'available',
        coordinates: [114.045557, 22.316634], // WGS84坐标
        price: '免费',
        description: '香港迪士尼乐园主要巴士接驳站，连接机场、市区等地',
        facilities: ['巴士站', '候车亭', '售票处'],
        restrictions: ['按班次时间表运营'],
        rating: 4.2,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        bestTime: '06:00-23:00',
        address: '香港迪士尼乐园度假区',
        waitTime: '5-15分钟',
        operatingHours: '06:00-23:00',
        tips: '建议提前查看班车时刻表，高峰期可能需要排队'
    },
    {
        id: 'disney_transport_002',
        name: '港铁迪士尼线',
        type: 'transport',
        category: 'transport',
        status: 'available',
        coordinates: [114.045137, 22.315348],
        price: '按港铁收费',
        description: '迪士尼线地铁站，直达香港迪士尼乐园',
        facilities: ['地铁站', '售票机', '客服中心'],
        restrictions: ['按地铁运营时间'],
        rating: 4.6,
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        bestTime: '06:00-24:00',
        address: '香港迪士尼地铁站',
        waitTime: '3-8分钟',
        operatingHours: '06:00-24:00',
        tips: '最便捷的到达方式，车站内有迪士尼主题装饰'
    },
    {
        id: 'disney_transport_003',
        name: '迪士尼入口处',
        type: 'entrance',
        category: 'transport',
        status: 'available',
        coordinates: [114.045682, 22.314936],
        price: '免费进入',
        description: '香港迪士尼乐园正门入口，检票和安检区域',
        facilities: ['检票口', '安检设备', '游客服务中心'],
        restrictions: ['需要有效门票', '禁带物品检查'],
        rating: 4.4,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        bestTime: '开园前30分钟',
        address: '香港迪士尼乐园正门',
        waitTime: '5-30分钟',
        operatingHours: '根据开园时间',
        tips: '建议提前30分钟到达，避免开园高峰期排队'
    },
    
    // 园区景点
    {
        id: 'disney_attraction_001',
        name: '魔雪奇缘世界',
        type: 'attraction',
        category: 'themed_area',
        status: 'available',
        coordinates: [114.038456, 22.312087],
        price: '园区门票包含',
        description: '以《冰雪奇缘》为主题的园区，有安娜和艾莎的冰雪王国',
        facilities: ['主题景点', '商店', '餐厅', '拍照点'],
        restrictions: ['部分项目有身高限制'],
        rating: 4.8,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '10:00-18:00',
        address: '香港迪士尼乐园魔雪奇缘世界',
        waitTime: '20-60分钟',
        operatingHours: '园区开放时间内',
        tips: '新开放区域，人气很高，建议早上或晚上游玩'
    },
    {
        id: 'disney_attraction_002',
        name: '反斗奇兵大本营',
        type: 'attraction',
        category: 'themed_area',
        status: 'available',
        coordinates: [114.039499, 22.310503],
        price: '园区门票包含',
        description: '玩具总动员主题区域，充满童趣的游乐设施',
        facilities: ['过山车', '旋转木马', '主题商店'],
        restrictions: ['部分项目有身高限制'],
        rating: 4.5,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '11:00-17:00',
        address: '香港迪士尼乐园反斗奇兵大本营',
        waitTime: '15-45分钟',
        operatingHours: '园区开放时间内',
        tips: '适合全家游玩，特别受小朋友喜爱'
    },
    {
        id: 'disney_attraction_003',
        name: '迷离庄园',
        type: 'attraction',
        category: 'themed_area',
        status: 'available',
        coordinates: [114.040881, 22.309745],
        price: '园区门票包含',
        description: '充满神秘色彩的探险主题区域',
        facilities: ['室内过山车', '主题展览', '纪念品店'],
        restrictions: ['建议8岁以上游玩'],
        rating: 4.6,
        environment: 'mixed',
        weather: ['sunny', 'cloudy', 'rainy'],
        bestTime: '12:00-18:00',
        address: '香港迪士尼乐园迷离庄园',
        waitTime: '20-50分钟',
        operatingHours: '园区开放时间内',
        tips: '室内项目，雨天游玩的好选择'
    },
    {
        id: 'disney_attraction_004',
        name: '灰熊山谷',
        type: 'attraction',
        category: 'themed_area',
        status: 'available',
        coordinates: [114.041917, 22.310083],
        price: '园区门票包含',
        description: '以美国西部采矿镇为背景的主题区域',
        facilities: ['矿山车', '探险步道', '西部餐厅'],
        restrictions: ['矿山车有身高限制'],
        rating: 4.7,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '10:00-16:00',
        address: '香港迪士尼乐园灰熊山谷',
        waitTime: '25-55分钟',
        operatingHours: '园区开放时间内',
        tips: '刺激的矿山过山车是园区热门项目之一'
    },
    {
        id: 'disney_attraction_005',
        name: '狮子王庆典',
        type: 'show',
        category: 'entertainment',
        status: 'available',
        coordinates: [114.043139, 22.311785],
        price: '园区门票包含',
        description: '精彩的狮子王主题音乐剧表演',
        facilities: ['表演剧场', '空调设施', '音响设备'],
        restrictions: ['按表演时间安排'],
        rating: 4.4,
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        bestTime: '表演时间',
        address: '香港迪士尼乐园狮子王剧场',
        waitTime: '提前15-30分钟',
        operatingHours: '按表演时刻表',
        tips: '建议提前查看表演时刻表并提前入场'
    },
    {
        id: 'disney_attraction_006',
        name: '探险世界',
        type: 'attraction',
        category: 'themed_area',
        status: 'available',
        coordinates: [114.042153, 22.311970],
        price: '园区门票包含',
        description: '热带雨林主题的冒险区域',
        facilities: ['丛林漂流', '泰山树屋', '探险餐厅'],
        restrictions: ['部分项目有身高限制'],
        rating: 4.3,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '09:00-17:00',
        address: '香港迪士尼乐园探险世界',
        waitTime: '15-40分钟',
        operatingHours: '园区开放时间内',
        tips: '建议穿着轻便服装，部分项目可能会溅水'
    },
    {
        id: 'disney_attraction_007',
        name: '美国小镇大街',
        type: 'attraction',
        category: 'main_street',
        status: 'available',
        coordinates: [114.043806, 22.313008],
        price: '园区门票包含',
        description: '重现20世纪初美国小镇风情的主街区',
        facilities: ['商店街', '餐厅', '古董车', '表演舞台'],
        restrictions: [],
        rating: 4.2,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '全天',
        address: '香港迪士尼乐园美国小镇大街',
        waitTime: '无需等待',
        operatingHours: '园区开放时间内',
        tips: '入园必经之路，适合购物和用餐，晚上有灯光表演'
    },
    {
        id: 'disney_attraction_008',
        name: '明日世界',
        type: 'attraction',
        category: 'themed_area',
        status: 'available',
        coordinates: [114.042697, 22.313880],
        price: '园区门票包含',
        description: '充满科幻色彩的未来主题区域',
        facilities: ['太空飞船', '科幻游戏', '未来餐厅'],
        restrictions: ['部分项目有身高限制'],
        rating: 4.5,
        environment: 'mixed',
        weather: ['sunny', 'cloudy', 'rainy'],
        bestTime: '11:00-19:00',
        address: '香港迪士尼乐园明日世界',
        waitTime: '20-50分钟',
        operatingHours: '园区开放时间内',
        tips: '包含多个刺激项目，适合年轻游客'
    },
    {
        id: 'disney_attraction_009',
        name: '幻想世界',
        type: 'attraction',
        category: 'themed_area',
        status: 'available',
        coordinates: [114.040565, 22.312657],
        price: '园区门票包含',
        description: '迪士尼经典童话故事主题区域',
        facilities: ['城堡', '旋转杯', '童话餐厅', '公主见面会'],
        restrictions: ['部分项目适合小朋友'],
        rating: 4.6,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '09:00-18:00',
        address: '香港迪士尼乐园幻想世界',
        waitTime: '10-35分钟',
        operatingHours: '园区开放时间内',
        tips: '园区的核心区域，睡公主城堡是标志性建筑'
    },
    {
        id: 'disney_attraction_010',
        name: '小小世界',
        type: 'attraction',
        category: 'classic_ride',
        status: 'available',
        coordinates: [114.038848, 22.313706],
        price: '园区门票包含',
        description: '经典的迪士尼音乐游船项目',
        facilities: ['室内游船', '多国文化展示', '经典音乐'],
        restrictions: ['适合全年龄段'],
        rating: 4.1,
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        bestTime: '全天',
        address: '香港迪士尼乐园小小世界',
        waitTime: '5-20分钟',
        operatingHours: '园区开放时间内',
        tips: '经典必玩项目，室内空调环境，适合休息'
    },
    
    // 标志性城堡
    {
        id: 'disney_castle_001',
        name: '奇妙梦想城堡',
        type: 'landmark',
        category: 'themed_area',
        status: 'available',
        coordinates: [114.041114, 22.312600],
        price: '园区门票包含',
        description: '香港迪士尼乐园的标志性城堡，园区的地标建筑和拍照圣地',
        facilities: ['城堡内部参观', '公主会面', '拍照区域', '纪念品店'],
        restrictions: ['内部参观时间限制', '拍照需排队'],
        rating: 4.8,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '09:00-18:00',
        address: '香港迪士尼乐园奇妙梦想城堡',
        waitTime: '10-30分钟',
        operatingHours: '园区开放时间内',
        tips: '迪士尼最经典的打卡地标，建议上午或黄昏时拍照光线最佳，城堡内可参观公主画廊'
    },
    
    // 特殊观景点
    {
        id: 'disney_viewpoint_001',
        name: '烟花观赏最佳机位',
        type: 'viewpoint',
        category: 'photography',
        status: 'available',
        coordinates: [114.044046, 22.313089],
        price: '园区门票包含',
        description: '观赏迪士尼烟花表演的最佳位置',
        facilities: ['开阔视野', '城堡正面', '最佳拍摄角度'],
        restrictions: ['仅在烟花表演时开放'],
        rating: 4.9,
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        bestTime: '烟花表演时间前1小时',
        address: '香港迪士尼乐园中央广场',
        waitTime: '建议提前1小时占位',
        operatingHours: '烟花表演期间',
        tips: '园区最佳烟花观赏点，建议提前占位，带上外套以防夜晚凉意'
    }
];

// 迪士尼导览模式配置
var disneyConfig = {
    name: '香港迪士尼乐园导览',
    center: [114.042, 22.312], // 园区中心坐标
    zoom: 16,
    categories: {
        'transport': { name: '交通接驳', color: '#3498db', icon: '🚌' },
        'themed_area': { name: '主题区域', color: '#e74c3c', icon: '🎠' },
        'entertainment': { name: '娱乐表演', color: '#f39c12', icon: '🎭' },
        'main_street': { name: '主街', color: '#2ecc71', icon: '🏪' },
        'classic_ride': { name: '经典项目', color: '#9b59b6', icon: '🎪' },
        'photography': { name: '拍摄点', color: '#e67e22', icon: '📷' }
    }
};

// 魔雪奇缘世界详细游玩项目数据
var frozenWorldAttractions = [
    {
        id: 'frozen_sled_001',
        name: '雪岭滑雪橇',
        type: 'ride',
        category: 'thrill_ride',
        status: 'available',
        heightRequirement: '95厘米（37.5英寸）或以上',
        operatingHours: '上午 10:00 至 晚上 9:00',
        intensity: '普通',
        description: '在艾莎的冰雪王国中体验刺激的滑雪橇冒险',
        facilities: ['快速通道', '储物柜', '拍照点'],
        restrictions: ['身高限制', '心脏病患者不建议'],
        rating: 4.7,
        waitTime: '30-90分钟',
        tips: '建议使用快速通道，高峰期等待时间较长',
        bestTime: '开园后或闭园前',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/frozen_sled.jpg'
    },
    {
        id: 'frozen_journey_002',
        name: '魔雪奇幻之旅',
        type: 'ride',
        category: 'dark_ride',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:00 至 晚上 9:00',
        intensity: '水花四溅',
        description: '乘坐小船穿越艾莎的冰雪城堡，体验《冰雪奇缘》的经典场景',
        facilities: ['室内排队区', '空调设施', '拍照点'],
        restrictions: ['可能溅水', '建议携带雨衣'],
        rating: 4.8,
        waitTime: '45-120分钟',
        tips: '园区最受欢迎的项目之一，建议优先体验',
        bestTime: '开园后立即前往',
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        imagePath: '../images/frozen_journey.jpg'
    }
];

// 反斗奇兵大本营详细游玩项目数据
var toyStoryAttractions = [
    {
        id: 'toy_story_barrel_001',
        name: '欢乐桶',
        type: 'ride',
        category: 'family_ride',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:30 至 晚上 9:00',
        intensity: '普通',
        description: '在巨大的玩具桶中旋转，体验童趣十足的欢乐时光',
        facilities: ['家庭友好', '拍照点', '主题装饰'],
        restrictions: ['无特殊限制'],
        rating: 4.3,
        waitTime: '15-45分钟',
        tips: '适合全家游玩，特别受小朋友喜爱',
        bestTime: '上午或傍晚',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/toy_story_barrel.jpg'
    },
    {
        id: 'toy_story_rc_002',
        name: '冲天遥控车',
        type: 'ride',
        category: 'thrill_ride',
        status: 'available',
        heightRequirement: '120厘米（48英寸）或以上',
        operatingHours: '上午 10:30 至 晚上 9:00',
        intensity: '高速',
        description: '体验遥控车般的刺激过山车，在U型轨道上高速穿梭',
        facilities: ['快速通道', '储物柜', '刺激体验'],
        restrictions: ['身高限制', '心脏病患者不建议', '孕妇不建议'],
        rating: 4.6,
        waitTime: '30-90分钟',
        tips: '园区最刺激的项目之一，建议使用快速通道',
        bestTime: '开园后或闭园前',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/toy_story_rc.jpg'
    },
    {
        id: 'toy_story_slingshot_003',
        name: '转转弹弓狗',
        type: 'ride',
        category: 'family_ride',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:30 至 晚上 9:00',
        intensity: '普通',
        description: '乘坐可爱的弹弓狗，在圆形轨道上旋转，体验童趣',
        facilities: ['家庭友好', '拍照点', '主题音乐'],
        restrictions: ['无特殊限制'],
        rating: 4.2,
        waitTime: '10-30分钟',
        tips: '适合小朋友和家庭，等待时间较短',
        bestTime: '上午或下午',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/toy_story_slingshot.jpg'
    },
    {
        id: 'toy_story_parachute_004',
        name: '玩具兵团跳降伞',
        type: 'ride',
        category: 'thrill_ride',
        status: 'available',
        heightRequirement: '81厘米（32英寸）或以上',
        operatingHours: '上午 10:30 至 晚上 9:00',
        intensity: '高速',
        description: '模拟跳伞体验，在安全的环境中感受自由落体的刺激',
        facilities: ['安全设备', '专业指导', '刺激体验'],
        restrictions: ['身高限制', '心脏病患者不建议', '恐高者不建议'],
        rating: 4.5,
        waitTime: '20-60分钟',
        tips: '刺激但安全，适合寻求冒险的游客',
        bestTime: '上午或下午',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/toy_story_parachute.jpg'
    },
    {
        id: 'toy_story_training_005',
        name: '玩具兵团训练营',
        type: 'show',
        category: 'stage_performance',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '无适用时段',
        intensity: '舞台表演',
        description: '精彩的玩具兵团主题舞台表演，展示军人的英勇精神',
        facilities: ['表演舞台', '音响设备', '主题装饰'],
        restrictions: ['按表演时间安排'],
        rating: 4.4,
        waitTime: '提前15-30分钟',
        tips: '建议提前查看表演时刻表',
        bestTime: '表演时间',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/toy_story_training.jpg'
    }
];

// 迷离庄园详细游玩项目数据
var mysticManorAttractions = [
    {
        id: 'mystic_garden_001',
        name: '奇幻庭园',
        type: 'ride',
        category: 'family_ride',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:30 至 晚上 9:00',
        intensity: '普通',
        description: '在神秘的奇幻庭园中漫步，体验超自然的神秘氛围',
        facilities: ['主题装饰', '拍照点', '神秘氛围'],
        restrictions: ['无特殊限制'],
        rating: 4.1,
        waitTime: '10-25分钟',
        tips: '适合所有年龄段的游客，体验神秘氛围',
        bestTime: '上午或傍晚',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/mystic_garden.jpg'
    },
    {
        id: 'mystic_mansion_002',
        name: '迷离大宅',
        type: 'ride',
        category: 'dark_ride',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:30 至 晚上 9:00',
        intensity: '普通',
        description: '探索神秘的迷离大宅，体验超自然现象和神秘事件',
        facilities: ['室内排队区', '空调设施', '特效设备'],
        restrictions: ['胆小者谨慎', '建议8岁以上'],
        rating: 4.4,
        waitTime: '25-60分钟',
        tips: '园区热门项目，建议使用快速通道',
        bestTime: '上午或下午',
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        imagePath: '../images/mystic_mansion.jpg'
    },
    {
        id: 'mystic_cargo_003',
        name: '迷离庄园货运站',
        type: 'ride',
        category: 'family_ride',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:30 至 晚上 9:00',
        intensity: '普通',
        description: '在神秘的货运站中探索，体验超自然的神秘事件',
        facilities: ['主题装饰', '拍照点', '神秘氛围'],
        restrictions: ['无特殊限制'],
        rating: 4.0,
        waitTime: '15-35分钟',
        tips: '适合全家游玩，体验神秘氛围',
        bestTime: '上午或下午',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/mystic_cargo.jpg'
    }
];

// 灰熊山谷详细游玩项目数据
var grizzlyGulchAttractions = [
    {
        id: 'grizzly_fountain_001',
        name: '喷泉山谷',
        type: 'ride',
        category: 'water_ride',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:30 至 晚上 9:00',
        intensity: '水花四溅',
        description: '在西部风格的喷泉山谷中体验清凉的水花四溅',
        facilities: ['水花设施', '拍照点', '西部主题'],
        restrictions: ['可能溅水', '建议携带雨衣'],
        rating: 4.2,
        waitTime: '20-40分钟',
        tips: '夏季游玩的好选择，注意防水',
        bestTime: '上午或下午',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/grizzly_fountain.jpg'
    },
    {
        id: 'grizzly_photo_002',
        name: '西部拍拍照',
        type: 'attraction',
        category: 'photo_op',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:30 至 晚上 9:00',
        intensity: '普通',
        description: '在西部风格的场景中拍摄纪念照片，体验牛仔风情',
        facilities: ['拍照点', '西部道具', '专业摄影'],
        restrictions: ['无特殊限制'],
        rating: 4.0,
        waitTime: '5-15分钟',
        tips: '适合全家拍照留念，建议携带相机',
        bestTime: '上午或下午',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/grizzly_photo.jpg'
    },
    {
        id: 'grizzly_mine_003',
        name: '灰熊山极速矿车',
        type: 'ride',
        category: 'thrill_ride',
        status: 'available',
        heightRequirement: '112厘米（44英寸）或以上',
        operatingHours: '上午 10:30 至 晚上 9:00',
        intensity: '高速',
        description: '体验刺激的矿山过山车，在灰熊山中高速穿梭',
        facilities: ['快速通道', '储物柜', '刺激体验'],
        restrictions: ['身高限制', '心脏病患者不建议', '孕妇不建议'],
        rating: 4.7,
        waitTime: '35-90分钟',
        tips: '园区最刺激的项目之一，建议使用快速通道',
        bestTime: '开园后或闭园前',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/grizzly_mine.jpg'
    }
];

// 狮子王庆典详细游玩项目数据
var lionKingAttractions = [
    {
        id: 'lion_king_market_001',
        name: '加利布尼市集',
        type: 'attraction',
        category: 'shopping',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '任何时段',
        intensity: '普通',
        description: '充满非洲风情的市集，提供各种纪念品和特色商品',
        facilities: ['纪念品店', '特色商品', '非洲主题'],
        restrictions: ['无特殊限制'],
        rating: 4.1,
        waitTime: '无需等待',
        tips: '购买纪念品的好地方，建议预留时间购物',
        bestTime: '全天开放',
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        imagePath: '../images/lion_king_market.jpg'
    },
    {
        id: 'lion_king_show_002',
        name: '狮子王庆典',
        type: 'show',
        category: 'stage_performance',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '下午 12:00, 下午 1:45, 下午 4:45（30min）',
        intensity: '舞台表演',
        description: '精彩的狮子王主题音乐剧表演，重现经典动画场景',
        facilities: ['表演剧场', '音响设备', '专业演员'],
        restrictions: ['按表演时间安排', '建议提前入场'],
        rating: 4.4,
        waitTime: '提前15-30分钟',
        tips: '建议提前查看表演时刻表并提前入场',
        bestTime: '表演时间',
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        imagePath: '../images/lion_king_show.jpg'
    }
];

// 探险世界详细游玩项目数据
var adventureWorldAttractions = [
    {
        id: 'adventure_river_001',
        name: '森林河流之旅',
        type: 'ride',
        category: 'water_ride',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:00 至 晚上 9:00',
        intensity: '水花四溅',
        description: '乘坐小船穿越热带雨林，体验刺激的河流冒险',
        facilities: ['水花设施', '拍照点', '雨林主题'],
        restrictions: ['可能溅水', '建议携带雨衣'],
        rating: 4.3,
        waitTime: '25-60分钟',
        tips: '夏季游玩的好选择，注意防水',
        bestTime: '上午或下午',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/adventure_river.jpg'
    },
    {
        id: 'adventure_fountain_002',
        name: '历奇喷水池',
        type: 'ride',
        category: 'water_ride',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:00 至 晚上 9:00',
        intensity: '水花四溅',
        description: '在历奇主题的喷水池中体验清凉的水花四溅',
        facilities: ['水花设施', '拍照点', '历奇主题'],
        restrictions: ['可能溅水', '建议携带雨衣'],
        rating: 4.0,
        waitTime: '15-35分钟',
        tips: '适合小朋友游玩，注意防水',
        bestTime: '上午或下午',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/adventure_fountain.jpg'
    },
    {
        id: 'adventure_celebration_003',
        name: '魔海奇缘凯旋庆典',
        type: 'show',
        category: 'stage_performance',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '下午 12:30, 下午 2:15, 下午 4:00（20min）',
        intensity: '舞台表演',
        description: '精彩的魔海奇缘主题舞台表演，重现经典动画场景',
        facilities: ['表演舞台', '音响设备', '专业演员'],
        restrictions: ['按表演时间安排', '建议提前入场'],
        rating: 4.2,
        waitTime: '提前10-20分钟',
        tips: '建议提前查看表演时刻表并提前入场',
        bestTime: '表演时间',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/adventure_celebration.jpg'
    }
];

// 奇妙梦想城堡详细游玩项目数据
var castleAttractions = [
    {
        id: 'castle_court_001',
        name: '皇室礼宾庭',
        type: 'attraction',
        category: 'meet_greet',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '无适用时段',
        intensity: '普通',
        description: '在皇室礼宾庭与迪士尼公主和王子见面，体验皇室礼仪',
        facilities: ['见面会', '拍照点', '皇室装饰'],
        restrictions: ['按见面时间安排'],
        rating: 4.5,
        waitTime: '提前15-30分钟',
        tips: '建议提前查看见面时刻表',
        bestTime: '见面时间',
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        imagePath: '../images/castle_court.jpg'
    },
    {
        id: 'castle_main_002',
        name: '奇妙梦想城堡',
        type: 'attraction',
        category: 'landmark',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:00 至 晚上 9:00',
        intensity: '普通',
        description: '迪士尼的标志性建筑，梦幻城堡的完美体现',
        facilities: ['参观', '拍照点', '城堡装饰'],
        restrictions: ['无特殊限制'],
        rating: 4.8,
        waitTime: '无需等待',
        tips: '园区最佳拍照地点，建议早晚光线最佳时拍照',
        bestTime: '上午或黄昏',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/castle_main.jpg'
    },
    {
        id: 'castle_party_003',
        name: '迪士尼好友Live：城堡派对',
        type: 'show',
        category: 'stage_performance',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 11:30, 下午 1:50, 下午 3:15（15min）',
        intensity: '舞台表演',
        description: '在城堡前与迪士尼好友一起欢庆，体验精彩的派对表演',
        facilities: ['表演舞台', '音响设备', '迪士尼好友'],
        restrictions: ['按表演时间安排', '建议提前入场'],
        rating: 4.3,
        waitTime: '提前10-15分钟',
        tips: '建议提前查看表演时刻表并提前入场',
        bestTime: '表演时间',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/castle_party.jpg'
    }
];

// 明日世界详细游玩项目数据
var tomorrowlandAttractions = [
    {
        id: 'tomorrowland_antman_001',
        name: '"蚁侠与黄蜂女：击战特攻！"',
        type: 'ride',
        category: 'interactive_ride',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:00 至 晚上 9:00',
        intensity: '普通',
        description: '与蚁侠和黄蜂女一起参与互动射击游戏，拯救世界',
        facilities: ['互动设备', '激光射击', '3D特效'],
        restrictions: ['无特殊限制'],
        rating: 4.2,
        waitTime: '20-45分钟',
        tips: '适合全家游玩，互动性强',
        bestTime: '上午或下午',
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        imagePath: '../images/tomorrowland_antman.jpg'
    },
    {
        id: 'tomorrowland_spaceship_002',
        name: '太空飞碟',
        type: 'ride',
        category: 'family_ride',
        status: 'closed',
        heightRequirement: '任何高度',
        operatingHours: '暂停开放',
        intensity: '普通',
        description: '乘坐太空飞碟在明日世界中翱翔，体验未来科技',
        facilities: ['旋转设施', '太空主题', '拍照点'],
        restrictions: ['暂停开放'],
        rating: 4.0,
        waitTime: '暂停开放',
        tips: '目前暂停开放，请关注园区公告',
        bestTime: '暂停开放',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/tomorrowland_spaceship.jpg'
    },
    {
        id: 'tomorrowland_ironman_003',
        name: '史达工业呈献：铁甲奇侠装备展',
        type: 'exhibition',
        category: 'exhibit',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '无使用时间段',
        intensity: '普通',
        description: '参观铁甲奇侠的装备展览，了解高科技装甲的秘密',
        facilities: ['装备展览', '互动展示', '拍照点'],
        restrictions: ['无特殊限制'],
        rating: 4.1,
        waitTime: '无需等待',
        tips: '适合铁甲奇侠粉丝参观',
        bestTime: '全天开放',
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        imagePath: '../images/tomorrowland_ironman_exhibit.jpg'
    },
    {
        id: 'tomorrowland_ironman_ride_004',
        name: '"铁甲奇侠飞行之旅" - 由友邦呈献',
        type: 'ride',
        category: 'thrill_ride',
        status: 'available',
        heightRequirement: '102厘米（40英寸）或以上',
        operatingHours: '上午 10:00 至 晚上 8:00',
        intensity: '高速',
        description: '与铁甲奇侠一起飞行，体验刺激的3D飞行冒险',
        facilities: ['3D影院', '飞行模拟', '特效设备'],
        restrictions: ['身高限制', '心脏病患者不建议'],
        rating: 4.6,
        waitTime: '30-75分钟',
        tips: '园区热门项目，建议使用快速通道',
        bestTime: '上午或下午',
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        imagePath: '../images/tomorrowland_ironman_ride.jpg'
    },
    {
        id: 'tomorrowland_starwars_005',
        name: '星战极速穿梭',
        type: 'ride',
        category: 'thrill_ride',
        status: 'available',
        heightRequirement: '102厘米（40英寸）或以上',
        operatingHours: '上午 10:00 至 晚上 9:00',
        intensity: '高速',
        description: '在星球大战的世界中极速穿梭，体验星际冒险',
        facilities: ['过山车', '星际主题', '特效设备'],
        restrictions: ['身高限制', '心脏病患者不建议', '孕妇不建议'],
        rating: 4.7,
        waitTime: '35-90分钟',
        tips: '园区最刺激的项目之一，建议使用快速通道',
        bestTime: '开园后或闭园前',
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        imagePath: '../images/tomorrowland_starwars.jpg'
    }
];

// 幻想世界详细游玩项目数据
var fantasylandAttractions = [
    {
        id: 'fantasyland_teacups_001',
        name: '疯帽子旋转杯',
        type: 'ride',
        category: 'family_ride',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:00 至 晚上 9:00',
        intensity: '普通',
        description: '乘坐爱丽丝梦游仙境主题的旋转杯，体验童趣',
        facilities: ['旋转设施', '主题装饰', '拍照点'],
        restrictions: ['无特殊限制'],
        rating: 4.1,
        waitTime: '15-35分钟',
        tips: '适合小朋友和家庭游玩',
        bestTime: '上午或下午',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/fantasyland_teacups.jpg'
    },
    {
        id: 'fantasyland_smallworld_002',
        name: '"小小世界"',
        type: 'ride',
        category: 'dark_ride',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:30 至 晚上 9:00',
        intensity: '普通',
        description: '乘坐小船环游世界，欣赏各国文化特色',
        facilities: ['室内排队区', '空调设施', '世界文化展示'],
        restrictions: ['无特殊限制'],
        rating: 4.3,
        waitTime: '20-50分钟',
        tips: '经典项目，适合全家游玩',
        bestTime: '上午或下午',
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        imagePath: '../images/fantasyland_smallworld.jpg'
    },
    {
        id: 'fantasyland_storybook_003',
        name: '迪士尼魔法书房',
        type: 'show',
        category: 'stage_performance',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 11:15, 下午 12:30, 下午 1:45（28min）',
        intensity: '舞台表演',
        description: '在魔法书房中体验迪士尼经典故事的精彩表演',
        facilities: ['表演剧场', '音响设备', '魔法特效'],
        restrictions: ['按表演时间安排', '建议提前入场'],
        rating: 4.2,
        waitTime: '提前15-25分钟',
        tips: '建议提前查看表演时刻表并提前入场',
        bestTime: '表演时间',
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        imagePath: '../images/fantasyland_storybook.jpg'
    },
    {
        id: 'fantasyland_garden_004',
        name: '梦想花园',
        type: 'attraction',
        category: 'garden',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:00 至 晚上 9:00',
        intensity: '普通',
        description: '在美丽的梦想花园中漫步，欣赏迪士尼主题园艺',
        facilities: ['花园景观', '拍照点', '休息区'],
        restrictions: ['无特殊限制'],
        rating: 4.0,
        waitTime: '无需等待',
        tips: '适合休息和拍照，环境优美',
        bestTime: '上午或傍晚',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/fantasyland_garden.jpg'
    },
    {
        id: 'fantasyland_pooh_005',
        name: '小熊维尼历险之旅',
        type: 'ride',
        category: 'dark_ride',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:00 至 晚上 9:00',
        intensity: '普通',
        description: '与小熊维尼一起在百亩森林中冒险',
        facilities: ['室内排队区', '空调设施', '维尼主题'],
        restrictions: ['无特殊限制'],
        rating: 4.4,
        waitTime: '25-55分钟',
        tips: '深受小朋友喜爱，建议使用快速通道',
        bestTime: '上午或下午',
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        imagePath: '../images/fantasyland_pooh.jpg'
    },
    {
        id: 'fantasyland_dumbo_006',
        name: '小飞象旋转世界',
        type: 'ride',
        category: 'family_ride',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:00 至 晚上 8:15',
        intensity: '普通',
        description: '乘坐可爱的小飞象在空中旋转，体验飞行乐趣',
        facilities: ['旋转设施', '飞行主题', '拍照点'],
        restrictions: ['无特殊限制'],
        rating: 4.2,
        waitTime: '20-40分钟',
        tips: '适合小朋友游玩，等待时间较短',
        bestTime: '上午或下午',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/fantasyland_dumbo.jpg'
    },
    {
        id: 'fantasyland_carousel_007',
        name: '灰姑娘旋转木马',
        type: 'ride',
        category: 'family_ride',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:00 至 晚上 7:45',
        intensity: '普通',
        description: '在灰姑娘主题的旋转木马上体验童话般的浪漫',
        facilities: ['旋转木马', '童话主题', '拍照点'],
        restrictions: ['无特殊限制'],
        rating: 4.3,
        waitTime: '15-30分钟',
        tips: '经典项目，适合全家游玩',
        bestTime: '上午或下午',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/fantasyland_carousel.jpg'
    },
    {
        id: 'fantasyland_mickey_008',
        name: '米奇幻想曲',
        type: 'ride',
        category: 'dark_ride',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:30 至 晚上 9:00',
        intensity: '普通',
        description: '与米奇一起体验3D音乐幻想之旅',
        facilities: ['3D影院', '音响设备', '特效设备'],
        restrictions: ['无特殊限制'],
        rating: 4.5,
        waitTime: '30-60分钟',
        tips: '经典3D项目，建议使用快速通道',
        bestTime: '上午或下午',
        environment: 'indoor',
        weather: ['sunny', 'cloudy', 'rainy'],
        imagePath: '../images/fantasyland_mickey.jpg'
    },
    {
        id: 'fantasyland_fairytale_009',
        name: '童话园林',
        type: 'attraction',
        category: 'garden',
        status: 'available',
        heightRequirement: '任何高度',
        operatingHours: '上午 10:00 至 晚上 9:00',
        intensity: '普通',
        description: '在童话园林中漫步，欣赏迪士尼经典故事场景',
        facilities: ['园林景观', '童话场景', '拍照点'],
        restrictions: ['无特殊限制'],
        rating: 4.1,
        waitTime: '无需等待',
        tips: '适合休息和拍照，环境优美',
        bestTime: '上午或傍晚',
        environment: 'outdoor',
        weather: ['sunny', 'cloudy'],
        imagePath: '../images/fantasyland_fairytale.jpg'
    }
];

// 为魔雪奇缘世界添加游玩项目数据
function getFrozenWorldAttractions() {
    return frozenWorldAttractions;
}

// 为反斗奇兵大本营添加游玩项目数据
function getToyStoryAttractions() {
    return toyStoryAttractions;
}

// 为迷离庄园添加游玩项目数据
function getMysticManorAttractions() {
    return mysticManorAttractions;
}

// 为灰熊山谷添加游玩项目数据
function getGrizzlyGulchAttractions() {
    return grizzlyGulchAttractions;
}

// 为狮子王庆典添加游玩项目数据
function getLionKingAttractions() {
    return lionKingAttractions;
}

// 为探险世界添加游玩项目数据
function getAdventureWorldAttractions() {
    return adventureWorldAttractions;
}

// 为奇妙梦想城堡添加游玩项目数据
function getCastleAttractions() {
    return castleAttractions;
}

// 为明日世界添加游玩项目数据
function getTomorrowlandAttractions() {
    return tomorrowlandAttractions;
}

// 为幻想世界添加游玩项目数据
function getFantasylandAttractions() {
    return fantasylandAttractions;
}

// 获取特定区域的游玩项目
function getAttractionsByArea(areaName) {
    switch(areaName) {
        case '魔雪奇缘世界':
            return frozenWorldAttractions;
        case '反斗奇兵大本营':
            return toyStoryAttractions;
        case '迷离庄园':
            return mysticManorAttractions;
        case '灰熊山谷':
            return grizzlyGulchAttractions;
        case '狮子王庆典':
            return lionKingAttractions;
        case '探险世界':
            return adventureWorldAttractions;
        case '奇妙梦想城堡':
            return castleAttractions;
        case '明日世界':
            return tomorrowlandAttractions;
        case '幻想世界':
            return fantasylandAttractions;
        default:
            return [];
    }
} 