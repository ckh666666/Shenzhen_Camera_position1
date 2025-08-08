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