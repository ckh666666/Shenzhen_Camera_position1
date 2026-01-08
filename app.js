// 深圳机位导航 - 主要功能模块
// 全局变量
var map;
var spotLayer;
var currentPosition = null;
var baseLayers = {}; // 存储基础图层
var currentMode = 'shenzhen'; // 当前模式: 'shenzhen', 'suzhou', 'wuhan', 'wuhanOcean' 或 'disney'
var currentData = null; // 当前使用的数据集
// spotData 和 spotImageMap 已在 data.js 中定义
// 初始化地图
function initMap() {
    // 创建基础图层
    baseLayers = {
        // 高清卫星影像图层
        satellite: new ol.layer.Tile({
            title: '高清卫星影像',
            source: new ol.source.XYZ({
                url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
                attributions: '© Google',
                tileSize: 256,
                minZoom: 5,
                maxZoom: 20
            })
        }),
        // 高精度线划图图层 - 使用OpenStreetMap作为备用
        vector: new ol.layer.Tile({
            title: '线划地图',
            source: new ol.source.OSM({
                url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attributions: '© OpenStreetMap contributors'
            })
        }),
        // 注记图层 - 天地图注记（需要有效密钥）
        annotation: new ol.layer.Tile({
            title: '地图注记',
            source: new ol.source.XYZ({
                url: 'https://t0.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=1d109683f4d84198e37a38c442d68311',
                wrapX: false,
                minZoom: 5,
                maxZoom: 18
            })
        })
    };

    // 创建地图
    map = new ol.Map({
        target: 'map',
        layers: [
            baseLayers.vector, // 默认显示线划图
            baseLayers.annotation // 默认显示注记图层
        ],
        view: new ol.View({
            projection: ol.proj.get('EPSG:3857'),
            center: ol.proj.fromLonLat([114.085947, 22.547]), // 深圳中心坐标
            zoom: 12,
            minZoom: 5,
            maxZoom: 20
        })
    });

    // 创建机位图层
    spotLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: function(feature) {
            return getSpotStyle(feature);
        }
    });

    map.addLayer(spotLayer);

    // 确保注记图层可见
    baseLayers.annotation.setVisible(true);

    // 添加点击事件
    map.on('click', function(evt) {
        var feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
            return feature;
        });
        
        if (feature && feature.get('spotData')) {
            var spotData = feature.get('spotData');
            
            // 如果是迪士尼模式且点击的是特定主题区域，显示园区详情
            if (currentMode === 'disney' && (spotData.name === '魔雪奇缘世界' || spotData.name === '反斗奇兵大本营' || spotData.name === '迷离庄园' || spotData.name === '灰熊山谷' || spotData.name === '狮子王庆典' || spotData.name === '探险世界' || spotData.name === '奇妙梦想城堡' || spotData.name === '明日世界' || spotData.name === '幻想世界')) {
                showAreaDetails(spotData.name);
            } else {
                showSpotDetails(spotData.id);
            }
        }
    });

    // 添加鼠标悬停效果
    map.on('pointermove', function(evt) {
        var pixel = map.getEventPixel(evt.originalEvent);
        var hit = map.hasFeatureAtPixel(pixel);
        map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });
    
    // 添加缩放限制监听
    var lastMaxZoomState = false; // 记录上一次是否处于最大缩放状态
    
    map.getView().on('change:resolution', function() {
        var currentZoom = Math.round(map.getView().getZoom());
        
        // 更新缩放级别显示
        updateZoomLevel();
        
        // 检查是否达到缩放限制
        var isAtMaxZoom = (currentZoom >= 20);
        
        if (isAtMaxZoom && !lastMaxZoomState) {
            showMaxZoomMessage();
            lastMaxZoomState = true;
        } else if (!isAtMaxZoom) {
            lastMaxZoomState = false;
        }
        
        if (currentZoom <= 0) {
            showMessage('已达到最小缩放级别，无法继续缩小');
        }
    });
}

// 获取机位样式
function getSpotStyle(feature) {
    var spotData = feature.get('spotData');
    var category = spotData ? spotData.category : feature.get('category');
    var shootingType = spotData ? spotData.shootingType : feature.get('shootingType');
    var status = spotData ? spotData.status : feature.get('status');
    
    var colors, styleIcon = '';
    
    // 根据当前模式选择颜色方案和图标
    if (currentMode === 'disney') {
        // 迪士尼模式：根据分类选择颜色和图标
        var disneyColors = {
            'transport': { fill: '#3498db', stroke: '#2980b9', center: '#ffffff', icon: '🚌' },
            'themed_area': { fill: '#e74c3c', stroke: '#c0392b', center: '#ffffff', icon: '🎠' },
            'entertainment': { fill: '#f39c12', stroke: '#e67e22', center: '#ffffff', icon: '🎭' },
            'main_street': { fill: '#2ecc71', stroke: '#27ae60', center: '#ffffff', icon: '🏪' },
            'classic_ride': { fill: '#9b59b6', stroke: '#8e44ad', center: '#ffffff', icon: '🎪' },
            'photography': { fill: '#e67e22', stroke: '#d35400', center: '#ffffff', icon: '📷' }
        };
        
        colors = disneyColors[category] || disneyColors['themed_area']; // 默认使用主题区域颜色
        styleIcon = colors.icon;
    } else if (currentMode === 'wuhanOcean' && spotData && spotData.type === 'show') {
        // 武汉极地海洋公园表演项目：使用橙色区分
        colors = { fill: '#ff6b35', stroke: '#e55a2b', center: '#ffffff' }; // 橙色
        styleIcon = '🎭';
    } else {
        // 深圳机位模式：根据拍摄类型选择颜色
        var shenzhenColors = {
            '建筑': { fill: '#ff69b4', stroke: '#ff1493', center: '#ffffff' },      // 粉红色
            '创意': { fill: '#32cd32', stroke: '#228b22', center: '#ffffff' },      // 亮绿色  
            '城市风光': { fill: '#1e3a8a', stroke: '#1e40af', center: '#ffffff' }   // 深蓝色
        };
        
        colors = shenzhenColors[shootingType] || shenzhenColors['建筑']; // 默认使用建筑类型颜色
    }
    
    // 创建图钉图标
    var pinIcon;
    
    if ((currentMode === 'disney' && styleIcon) || (currentMode === 'wuhanOcean' && spotData && spotData.type === 'show' && styleIcon)) {
        // 迪士尼模式或武汉极地海洋公园表演项目使用emoji图标
        pinIcon = new ol.style.Icon({
            anchor: [0.5, 1],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            src: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
                <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 0C7.164 0 0 7.164 0 16c0 10.5 16 24 16 24s16-13.5 16-24c0-8.836-7.164-16-16-16z" 
                          fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2"/>
                    <circle cx="16" cy="16" r="12" fill="${colors.center}"/>
                    <text x="16" y="22" font-family="Arial" font-size="16" text-anchor="middle" fill="${colors.fill}">${styleIcon}</text>
                </svg>
            `),
            scale: 1.0
        });
    } else {
        // 深圳模式使用传统图钉样式
        pinIcon = new ol.style.Icon({
            anchor: [0.5, 1], // 图钉底部中心点
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            src: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
                <svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 20 12 20s12-11.5 12-20c0-6.627-5.373-12-12-12z" 
                          fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="1"/>
                    <circle cx="12" cy="12" r="4" fill="${colors.center}"/>
                    <circle cx="12" cy="12" r="2" fill="${colors.fill}"/>
                </svg>
            `),
            scale: 1.2
        });
    }

    return new ol.style.Style({
        image: pinIcon,
        // 添加文本标签
        text: new ol.style.Text({
            text: spotData ? (spotData.displayName || spotData.name) : '',
            font: currentMode === 'disney' ? '11px Microsoft YaHei' : (spotData && spotData.displayName ? '10px Microsoft YaHei' : '12px Microsoft YaHei'),
            fill: new ol.style.Fill({
                color: currentMode === 'disney' ? '#2c3e50' : '#2c3e50'
            }),
            stroke: new ol.style.Stroke({
                color: 'white',
                width: 2
            }),
            offsetY: currentMode === 'disney' ? -42 : (spotData && spotData.displayName ? -60 : -35),
            textAlign: 'center',
            maxWidth: currentMode === 'disney' ? 120 : (spotData && spotData.displayName ? 150 : 100),
            overflow: true,
            textBaseline: 'bottom'
        })
    });
}


// 更新机位列表
function updateSpotList() {
    var spotList = document.getElementById('spotList');
    spotList.innerHTML = '';

    getCurrentData().forEach(function(spot) {
        var spotElement = createSpotElement(spot);
        spotList.appendChild(spotElement);
    });
}

// 创建机位元素
function createSpotElement(spot) {
    var div = document.createElement('div');
    div.className = 'spot-item';
    
    // 生成天气图标
    var weatherIcons = spot.weather.map(function(w) {
        var weatherMap = {
            'sunny': '☀️',
            'cloudy': '☁️',
            'rainy': '🌧️',
            'snowy': '❄️'
        };
        return weatherMap[w] || '🌤️';
    }).join(' ');
    
    // 环境图标
    var environmentIcon = spot.environment === 'indoor' ? '🏢' : '🌳';
    var environmentText = spot.environment === 'indoor' ? '室内' : '室外';
    
    // 根据模式显示不同的信息
    var extraInfo = '';
    var actionText = currentMode === 'disney' ? '添加到导览' : '添加到地图';
    
    if (currentMode === 'disney') {
        // 迪士尼模式显示特有信息
        var categoryIcon = disneyConfig.categories[spot.category] ? disneyConfig.categories[spot.category].icon : '📍';
        var categoryName = disneyConfig.categories[spot.category] ? disneyConfig.categories[spot.category].name : spot.category;
        
        extraInfo = `
            <p><i>📍</i> 距离: ${calculateDistance(spot.coordinates)}km</p>
            <p><i>💰</i> 价格: ${spot.price}</p>
            <p><i>⭐</i> 评分: ${spot.rating}/5.0</p>
            <p><i>⏰</i> 开放时间: ${spot.operatingHours || spot.bestTime}</p>
            <p><i>⏳</i> 等候时间: ${spot.waitTime || '无需等待'}</p>
            <p><i>🌤️</i> 适宜天气: ${weatherIcons}</p>
            <p><i>📝</i> ${spot.description}</p>
        `;
        
        div.innerHTML = `
            <div class="spot-header">
                <div>
                    <div class="spot-name">${spot.name}</div>
                    <div style="display: flex; gap: 8px; align-items: center; margin-top: 5px;">
                        <span class="spot-type ${spot.type}">${getTypeText(spot.type)}</span>
                        <span style="font-size: 11px; color: #667eea; background: rgba(102, 126, 234, 0.1); padding: 2px 6px; border-radius: 8px;">
                            ${environmentIcon} ${environmentText}
                        </span>
                        <span style="font-size: 11px; color: #e67e22; background: rgba(230, 126, 34, 0.1); padding: 2px 6px; border-radius: 8px;">
                            ${categoryIcon} ${categoryName}
                        </span>
                    </div>
                </div>
            </div>
            <div class="spot-info">
                ${extraInfo}
            </div>
            <div class="spot-actions">
                <button class="action-btn add-btn" onclick="addSpotToMap('${spot.id}')">
                    ${actionText}
                </button>
                <button class="action-btn detail-btn" onclick="showSpotDetails('${spot.id}')">
                    查看详情
                </button>
            </div>
        `;
    } else {
        // 深圳机位模式显示原有信息
        var tripodIcon = spot.tripodRequired && spot.tripodRequired.includes('是') ? '🦵' : '📷';
        var tripodText = spot.tripodRequired || '未指定';
        var focalLengthText = spot.focalLength || '未指定';
        var metroText = spot.nearbyMetro || '未指定';
        
        extraInfo = `
            <p><i>📍</i> 距离: ${calculateDistance(spot.coordinates)}km</p>
            <p><i>💰</i> 价格: ${spot.price}</p>
            <p><i>⭐</i> 评分: ${spot.rating}/5.0</p>
            <p><i>⏰</i> 最佳时间: ${spot.bestTime}</p>
            <p><i>🌤️</i> 适宜天气: ${weatherIcons}</p>
            <p><i>📷</i> 焦段建议: ${focalLengthText}</p>
            <p><i>${tripodIcon}</i> 三脚架: ${tripodText}</p>
            <p><i>🚇</i> 地铁站: ${metroText}</p>
            <p><i>📝</i> ${spot.description}</p>
        `;
        
        div.innerHTML = `
            <div class="spot-header">
                <div>
                    <div class="spot-name">${spot.name}</div>
                    <div style="display: flex; gap: 8px; align-items: center; margin-top: 5px;">
                        <span class="spot-type ${spot.type}">${getTypeText(spot.type)}</span>
                        <span style="font-size: 11px; color: #667eea; background: rgba(102, 126, 234, 0.1); padding: 2px 6px; border-radius: 8px;">
                            ${environmentIcon} ${environmentText}
                        </span>
                        ${spot.shootingType ? `<span style="font-size: 11px; color: #e74c3c; background: rgba(231, 76, 60, 0.1); padding: 2px 6px; border-radius: 8px;">
                            📷 ${spot.shootingType}
                        </span>` : ''}
                    </div>
                </div>
            </div>
            <div class="spot-info">
                ${extraInfo}
            </div>
            <div class="spot-actions">
                <button class="action-btn add-btn" onclick="addSpotToMap('${spot.id}')">
                    ${actionText}
                </button>
                <button class="action-btn detail-btn" onclick="showSpotDetails('${spot.id}')">
                    查看详情
                </button>
            </div>
        `;
    }
    
    return div;
}

// 获取类型文本
function getTypeText(type) {
    var types = {
        'drone': '无人机位',
        'photo': '摄影机位',
        'video': '摄像机位'
    };
    return types[type] || type;
}

// 计算距离
function calculateDistance(coordinates) {
    if (!currentPosition) return '未知';
    
    var lat1 = currentPosition[1];
    var lon1 = currentPosition[0];
    var lat2 = coordinates[1];
    var lon2 = coordinates[0];
    
    var R = 6371; // 地球半径
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var distance = R * c;
    
    return distance.toFixed(1);
}

// 添加机位到地图
function addSpotToMap(spotId) {
    var spot = getCurrentData().find(s => s.id === spotId);
    if (!spot) return;

    // 检查是否已经添加过该机位
    var existingFeatures = spotLayer.getSource().getFeatures();
    var alreadyExists = existingFeatures.some(function(feature) {
        return feature.get('spotData') && feature.get('spotData').id === spotId;
    });

    if (alreadyExists) {
        showMessage(currentMode === 'disney' ? '该景点已在导览地图上' : '该机位已在地图上');
        return;
    }

    var feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat(spot.coordinates)),
        spotData: spot,
        type: spot.type,
        status: spot.status,
        category: spot.category
    });

    spotLayer.getSource().addFeature(feature);
    
    // 确保机位图层在最上层
    ensureSpotLayerOnTop();
    
    // 更新标注点计数
    updateSpotCount();
    
    // 显示成功消息
    showMessage(currentMode === 'disney' ? '景点已添加到导览地图' : '机位已添加到地图');
}

// 确保机位图层在最上层
function ensureSpotLayerOnTop() {
    var layers = map.getLayers();
    var spotLayerIndex = layers.getArray().indexOf(spotLayer);
    var maxIndex = layers.getLength() - 1;
    
    if (spotLayerIndex !== maxIndex) {
        // 移除机位图层
        map.removeLayer(spotLayer);
        // 重新添加到最上层
        map.addLayer(spotLayer);
    }
}

function getFocalLengthCategory(focalLength) {
    if (!focalLength) return '';
    if (focalLength.includes('广角/中长焦')) return 'wide-mid';
    if (
        focalLength.includes('广角') ||
        focalLength.includes('广角镜头') ||
        focalLength.includes('广角/长焦') ||
        focalLength.includes('广角/中等焦段') ||
        focalLength.includes('广角/长焦镜头') ||
        focalLength.includes('广角/长焦/大光圈人像焦段')
    ) return 'wide';
    if (focalLength.includes('中长焦') || focalLength.includes('长焦')) return 'tele';
    return '';
}

// 搜索机位
function searchSpots() {
    var keyword = document.getElementById('searchInput').value.toLowerCase();
    var shootingTypeFilter = document.getElementById('shootingTypeFilter').value;
    var focalLengthFilter = document.getElementById('focalLengthFilter').value;
    var environmentFilter = document.getElementById('environmentFilter').value;
    var weatherFilter = document.getElementById('weatherFilter').value;
    var distanceFilter = document.getElementById('distanceFilter').value;
    var priceFilter = document.getElementById('priceFilter').value;

    var currentDataSet = getCurrentData();
    
    var filteredSpots = currentDataSet.filter(function(spot) {
        // 关键词搜索 - 通用字段
        var matchesKeyword = spot.name.toLowerCase().includes(keyword) ||
            spot.description.toLowerCase().includes(keyword) ||
            spot.address.toLowerCase().includes(keyword);
        
        // 添加模式特定的关键词搜索字段
        if (currentMode === 'disney') {
            matchesKeyword = matchesKeyword ||
                (spot.category && spot.category.toLowerCase().includes(keyword)) ||
                (spot.waitTime && spot.waitTime.toLowerCase().includes(keyword)) ||
                (spot.operatingHours && spot.operatingHours.toLowerCase().includes(keyword)) ||
                (spot.tips && spot.tips.toLowerCase().includes(keyword));
        } else {
            matchesKeyword = matchesKeyword ||
                (spot.shootingType && spot.shootingType.toLowerCase().includes(keyword)) ||
                (spot.focalLength && spot.focalLength.toLowerCase().includes(keyword)) ||
                (spot.nearbyMetro && spot.nearbyMetro.toLowerCase().includes(keyword)) ||
                (spot.shootingTips && spot.shootingTips.toLowerCase().includes(keyword)) ||
                (spot.environmentType && spot.environmentType.toLowerCase().includes(keyword));
        }
        
        // 类型筛选
        var matchesType;
        if (currentMode === 'disney') {
            // 迪士尼模式按分类筛选
            matchesType = shootingTypeFilter === 'all' || spot.category === shootingTypeFilter;
        } else {
            // 深圳模式按拍摄类型筛选
            matchesType = shootingTypeFilter === 'all' || spot.shootingType === shootingTypeFilter;
        }
        
        // 焦段筛选（仅深圳模式）
        var matchesFocalLength = currentMode === 'disney' ? true : 
            (focalLengthFilter === 'all' || getFocalLengthCategory(spot.focalLength) === focalLengthFilter);
            
        // 环境筛选
        var matchesEnvironment = environmentFilter === 'all' || spot.environment === environmentFilter;
        
        // 天气筛选
        var matchesWeather = weatherFilter === 'all' || spot.weather.includes(weatherFilter);
        
        // 价格筛选
        var matchesPrice = priceFilter === 'all' || 
                         (priceFilter === 'free' && spot.price === '免费') ||
                         (priceFilter === 'paid' && spot.price !== '免费');

        return matchesKeyword && matchesType && matchesFocalLength && matchesEnvironment && matchesWeather && matchesPrice;
    });

    updateSpotListWithFilter(filteredSpots);
    updateFilteredCount(); // 更新筛选数量显示
}

// 一键导入筛选后的机位到地图
function importFilteredSpots() {
    var keyword = document.getElementById('searchInput').value.toLowerCase();
    var shootingTypeFilter = document.getElementById('shootingTypeFilter').value;
    var focalLengthFilter = document.getElementById('focalLengthFilter').value;
    var environmentFilter = document.getElementById('environmentFilter').value;
    var weatherFilter = document.getElementById('weatherFilter').value;
    var distanceFilter = document.getElementById('distanceFilter').value;
    var priceFilter = document.getElementById('priceFilter').value;

    var currentDataSet = getCurrentData();
    
    // 使用相同的筛选逻辑
    var filteredSpots = currentDataSet.filter(function(spot) {
        // 关键词搜索 - 通用字段
        var matchesKeyword = spot.name.toLowerCase().includes(keyword) ||
            spot.description.toLowerCase().includes(keyword) ||
            spot.address.toLowerCase().includes(keyword);
        
        // 添加模式特定的关键词搜索字段
        if (currentMode === 'disney') {
            matchesKeyword = matchesKeyword ||
                (spot.category && spot.category.toLowerCase().includes(keyword)) ||
                (spot.waitTime && spot.waitTime.toLowerCase().includes(keyword)) ||
                (spot.operatingHours && spot.operatingHours.toLowerCase().includes(keyword)) ||
                (spot.tips && spot.tips.toLowerCase().includes(keyword));
        } else {
            matchesKeyword = matchesKeyword ||
                (spot.shootingType && spot.shootingType.toLowerCase().includes(keyword)) ||
                (spot.focalLength && spot.focalLength.toLowerCase().includes(keyword)) ||
                (spot.nearbyMetro && spot.nearbyMetro.toLowerCase().includes(keyword)) ||
                (spot.shootingTips && spot.shootingTips.toLowerCase().includes(keyword)) ||
                (spot.environmentType && spot.environmentType.toLowerCase().includes(keyword));
        }
        
        // 类型筛选
        var matchesType;
        if (currentMode === 'disney') {
            matchesType = shootingTypeFilter === 'all' || spot.category === shootingTypeFilter;
        } else {
            matchesType = shootingTypeFilter === 'all' || spot.shootingType === shootingTypeFilter;
        }
        
        // 焦段筛选（仅深圳模式）
        var matchesFocalLength = currentMode === 'disney' ? true : 
            (focalLengthFilter === 'all' || getFocalLengthCategory(spot.focalLength) === focalLengthFilter);
            
        var matchesEnvironment = environmentFilter === 'all' || spot.environment === environmentFilter;
        var matchesWeather = weatherFilter === 'all' || spot.weather.includes(weatherFilter);
        var matchesPrice = priceFilter === 'all' || 
                         (priceFilter === 'free' && spot.price === '免费') ||
                         (priceFilter === 'paid' && spot.price !== '免费');

        return matchesKeyword && matchesType && matchesFocalLength && matchesEnvironment && matchesWeather && matchesPrice;
    });

    if (filteredSpots.length === 0) {
        showMessage(currentMode === 'disney' ? '没有找到匹配的景点，请调整筛选条件' : '没有找到匹配的机位，请调整筛选条件');
        return;
    }

    // 清除现有标注
    spotLayer.getSource().clear();

    // 批量添加筛选后的地点到地图
    var addedCount = 0;
    filteredSpots.forEach(function(spot) {
        if (spot.coordinates && spot.coordinates.length === 2) {
            var feature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat(spot.coordinates)),
                spotData: spot,
                type: spot.type,
                status: spot.status,
                category: spot.category
            });
            spotLayer.getSource().addFeature(feature);
            addedCount++;
        }
    });

    // 更新状态
    updateSpotCount();
    updateStatusCounts();
    
    // 显示成功消息
    var successMessage = currentMode === 'disney' ? `成功导入 ${addedCount} 个景点到地图` : `成功导入 ${addedCount} 个机位到地图`;
    showMessage(successMessage);
    
    // 如果只有一个地点，自动定位到该地点
    if (filteredSpots.length === 1) {
        var spot = filteredSpots[0];
        if (spot.coordinates && spot.coordinates.length === 2) {
            var currentZoom = map.getView().getZoom();
            var targetZoom;
            if (currentMode === 'disney') {
                targetZoom = 17;
            } else if (currentMode === 'wuhanOcean') {
                // 武汉极地海洋公园模式下保持当前缩放级别（例如 18）
                targetZoom = currentZoom;
            } else {
                targetZoom = 15;
            }
            map.getView().animate({
                center: ol.proj.fromLonLat(spot.coordinates),
                zoom: targetZoom,
                duration: 1000
            });
        }
    } else if (filteredSpots.length > 1) {
        // 如果有多个地点，调整视图以显示所有地点
        fitMapToSpots(filteredSpots);
    }
}

// 调整地图视图以显示所有机位
function fitMapToSpots(spots) {
    var extent = ol.extent.createEmpty();
    
    spots.forEach(function(spot) {
        if (spot.coordinates && spot.coordinates.length === 2) {
            var point = ol.proj.fromLonLat(spot.coordinates);
            ol.extent.extend(extent, point);
        }
    });
    
    if (!ol.extent.isEmpty(extent)) {
        // 添加一些边距
        ol.extent.scaleFromCenter(extent, 1.2);
        
        map.getView().fit(extent, {
            duration: 1000,
            padding: [50, 50, 50, 50]
        });
    }
}

// 更新筛选地点数量显示
function updateFilteredCount() {
    var keyword = document.getElementById('searchInput').value.toLowerCase();
    var shootingTypeFilter = document.getElementById('shootingTypeFilter').value;
    var focalLengthFilter = document.getElementById('focalLengthFilter').value;
    var environmentFilter = document.getElementById('environmentFilter').value;
    var weatherFilter = document.getElementById('weatherFilter').value;
    var distanceFilter = document.getElementById('distanceFilter').value;
    var priceFilter = document.getElementById('priceFilter').value;

    var currentDataSet = getCurrentData();
    
    var filteredSpots = currentDataSet.filter(function(spot) {
        // 关键词搜索 - 通用字段
        var matchesKeyword = spot.name.toLowerCase().includes(keyword) ||
            spot.description.toLowerCase().includes(keyword) ||
            spot.address.toLowerCase().includes(keyword);
        
        // 添加模式特定的关键词搜索字段
        if (currentMode === 'disney') {
            matchesKeyword = matchesKeyword ||
                (spot.category && spot.category.toLowerCase().includes(keyword)) ||
                (spot.waitTime && spot.waitTime.toLowerCase().includes(keyword)) ||
                (spot.operatingHours && spot.operatingHours.toLowerCase().includes(keyword)) ||
                (spot.tips && spot.tips.toLowerCase().includes(keyword));
        } else {
            matchesKeyword = matchesKeyword ||
                (spot.shootingType && spot.shootingType.toLowerCase().includes(keyword)) ||
                (spot.focalLength && spot.focalLength.toLowerCase().includes(keyword)) ||
                (spot.nearbyMetro && spot.nearbyMetro.toLowerCase().includes(keyword)) ||
                (spot.shootingTips && spot.shootingTips.toLowerCase().includes(keyword)) ||
                (spot.environmentType && spot.environmentType.toLowerCase().includes(keyword));
        }
        
        // 类型筛选
        var matchesType;
        if (currentMode === 'disney') {
            matchesType = shootingTypeFilter === 'all' || spot.category === shootingTypeFilter;
        } else {
            matchesType = shootingTypeFilter === 'all' || spot.shootingType === shootingTypeFilter;
        }
        
        // 焦段筛选（仅深圳模式）
        var matchesFocalLength = currentMode === 'disney' ? true : 
            (focalLengthFilter === 'all' || getFocalLengthCategory(spot.focalLength) === focalLengthFilter);
            
        var matchesEnvironment = environmentFilter === 'all' || spot.environment === environmentFilter;
        var matchesWeather = weatherFilter === 'all' || spot.weather.includes(weatherFilter);
        var matchesPrice = priceFilter === 'all' || 
                         (priceFilter === 'free' && spot.price === '免费') ||
                         (priceFilter === 'paid' && spot.price !== '免费');

        return matchesKeyword && matchesType && matchesFocalLength && matchesEnvironment && matchesWeather && matchesPrice;
    });

    document.getElementById('filteredCount').textContent = filteredSpots.length;
}

// 更新筛选后的机位列表
function updateSpotListWithFilter(filteredSpots) {
    var spotList = document.getElementById('spotList');
    spotList.innerHTML = '';

    if (filteredSpots.length === 0) {
        spotList.innerHTML = '<div style="text-align: center; padding: 40px; color: #7f8c8d;">没有找到匹配的机位</div>';
        return;
    }

    filteredSpots.forEach(function(spot) {
        var spotElement = createSpotElement(spot);
        spotList.appendChild(spotElement);
    });
}

// 显示机位详情
function showSpotDetails(spotId) {
    // 先尝试从当前数据中查找，如果找不到，尝试从表演项目数据中查找
    var spot = getCurrentData().find(s => s.id === spotId);
    if (!spot && currentMode === 'wuhanOcean') {
        spot = wuhanOceanShowData.find(s => s.id === spotId);
    }
    if (!spot) return;

    // 生成天气图标
    var weatherIcons = spot.weather.map(function(w) {
        var weatherMap = {
            'sunny': '☀️晴天',
            'cloudy': '☁️多云',
            'rainy': '🌧️雨天',
            'snowy': '❄️雪天'
        };
        return weatherMap[w] || '🌤️其他';
    }).join('、');

    var environmentText = spot.environment === 'indoor' ? '🏢室内' : '🌳室外';

    // 获取图片路径
    var imagePath = spot.imagePath || spotImageMap[spot.name] || '';
    var imageHtml = imagePath ? `
        <div class="image-container">
            <img src="${imagePath}" alt="${spot.name}" class="spot-image" onerror="this.style.display='none'" ondblclick="showFullImage('${imagePath}', '${spot.name}')">
            <div class="image-hint">双击查看大图</div>
        </div>
    ` : '';

    // 更新模态窗口内容
    document.getElementById('modalTitle').textContent = spot.name;
    document.getElementById('modalSubtitle').textContent = spot.address;
    
    var modalBody = document.getElementById('modalBody');
    
    // 根据模式显示不同的详情信息
    if (currentMode === 'wuhanOcean' && spot.type === 'show') {
        // 武汉极地海洋公园表演项目显示
        modalBody.innerHTML = `
            <div class="spot-info-grid">
                <div class="info-item">
                    <span class="info-icon">📍</span>
                    <div>
                        <div class="info-label">详细地址</div>
                        <div class="info-value">${spot.address}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">🎭</span>
                    <div>
                        <div class="info-label">表演类型</div>
                        <div class="info-value">${spot.category === 'performance' ? '表演项目' : spot.category}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">🏢</span>
                    <div>
                        <div class="info-label">环境类型</div>
                        <div class="info-value">${environmentText}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">💰</span>
                    <div>
                        <div class="info-label">价格信息</div>
                        <div class="info-value">${spot.price}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">⭐</span>
                    <div>
                        <div class="info-label">用户评分</div>
                        <div class="info-value">${spot.rating}/5.0</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">⏰</span>
                    <div>
                        <div class="info-label">表演时间</div>
                        <div class="info-value">${spot.operatingHours || spot.bestTime}</div>
                    </div>
                </div>
            </div>
            <div class="spot-details">
                <div class="detail-section">
                    <h4>🎭 表演节目</h4>
                    <p>${spot.shows ? spot.shows.join('、') : '暂无信息'}</p>
                </div>
                <div class="detail-section">
                    <h4>🌤️ 适宜天气</h4>
                    <p>${weatherIcons}</p>
                </div>
                <div class="detail-section">
                    <h4>📝 项目描述</h4>
                    <p>${spot.description}</p>
                </div>
                <div class="detail-section">
                    <h4>🏗️ 配套设施</h4>
                    <p>${spot.facilities ? spot.facilities.join('、') : '暂无信息'}</p>
                </div>
                <div class="detail-section">
                    <h4>⚠️ 使用限制</h4>
                    <p>${spot.restrictions ? spot.restrictions.join('、') : '无特殊限制'}</p>
                </div>
                ${spot.tips ? `
                <div class="detail-section">
                    <h4>💡 观看建议</h4>
                    <p>${spot.tips}</p>
                </div>
                ` : ''}
            </div>
        `;
    } else if (currentMode === 'disney') {
        // 迪士尼模式显示
        var categoryInfo = disneyConfig.categories[spot.category];
        var categoryText = categoryInfo ? `${categoryInfo.icon} ${categoryInfo.name}` : spot.category;
        
        modalBody.innerHTML = `
            ${imageHtml}
            <div class="spot-info-grid">
                <div class="info-item">
                    <span class="info-icon">📍</span>
                    <div>
                        <div class="info-label">详细地址</div>
                        <div class="info-value">${spot.address}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">🎪</span>
                    <div>
                        <div class="info-label">景点类型</div>
                        <div class="info-value">${categoryText}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">🏢</span>
                    <div>
                        <div class="info-label">环境类型</div>
                        <div class="info-value">${environmentText}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">💰</span>
                    <div>
                        <div class="info-label">价格信息</div>
                        <div class="info-value">${spot.price}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">⭐</span>
                    <div>
                        <div class="info-label">用户评分</div>
                        <div class="info-value">${spot.rating}/5.0</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">⏰</span>
                    <div>
                        <div class="info-label">开放时间</div>
                        <div class="info-value">${spot.operatingHours || spot.bestTime}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">⏳</span>
                    <div>
                        <div class="info-label">等候时间</div>
                        <div class="info-value">${spot.waitTime || '无需等待'}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">🎯</span>
                    <div>
                        <div class="info-label">景点类型</div>
                        <div class="info-value">${getTypeText(spot.type)}</div>
                    </div>
                </div>
            </div>
            <div class="spot-details">
                <div class="detail-section">
                    <h4>🌤️ 适宜天气</h4>
                    <p>${weatherIcons}</p>
                </div>
                <div class="detail-section">
                    <h4>📝 景点描述</h4>
                    <p>${spot.description}</p>
                </div>
                <div class="detail-section">
                    <h4>🏗️ 配套设施</h4>
                    <p>${spot.facilities.join('、')}</p>
                </div>
                <div class="detail-section">
                    <h4>⚠️ 使用限制</h4>
                    <p>${spot.restrictions.join('、')}</p>
                </div>
                ${spot.tips ? `
                <div class="detail-section">
                    <h4>💡 游览建议</h4>
                    <p>${spot.tips}</p>
                </div>
                ` : ''}
            </div>
        `;
    } else {
        // 深圳机位模式显示
        modalBody.innerHTML = `
            ${imageHtml}
            <div class="spot-info-grid">
                <div class="info-item">
                    <span class="info-icon">📍</span>
                    <div>
                        <div class="info-label">详细地址</div>
                        <div class="info-value">${spot.address}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">🎬</span>
                    <div>
                        <div class="info-label">拍摄类型</div>
                        <div class="info-value">${spot.shootingType || getTypeText(spot.type)}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">🏢</span>
                    <div>
                        <div class="info-label">环境类型</div>
                        <div class="info-value">${spot.environmentType || environmentText}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">💰</span>
                    <div>
                        <div class="info-label">价格信息</div>
                        <div class="info-value">${spot.price}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">⭐</span>
                    <div>
                        <div class="info-label">用户评分</div>
                        <div class="info-value">${spot.rating}/5.0</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">⏰</span>
                    <div>
                        <div class="info-label">最佳时间</div>
                        <div class="info-value">${spot.bestTime}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">📷</span>
                    <div>
                        <div class="info-label">焦段建议</div>
                        <div class="info-value">${spot.focalLength || '未指定'}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">🦵</span>
                    <div>
                        <div class="info-label">三脚架要求</div>
                        <div class="info-value">${spot.tripodRequired || '未指定'}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">🚇</span>
                    <div>
                        <div class="info-label">附近地铁站</div>
                        <div class="info-value">${spot.nearbyMetro || '未指定'}</div>
                    </div>
                </div>
            </div>
            <div class="spot-details">
                <div class="detail-section">
                    <h4>🌤️ 适宜天气</h4>
                    <p>${weatherIcons}</p>
                </div>
                <div class="detail-section">
                    <h4>📝 机位描述</h4>
                    <p>${spot.description}</p>
                </div>
                <div class="detail-section">
                    <h4>🏗️ 配套设施</h4>
                    <p>${spot.facilities.join('、')}</p>
                </div>
                <div class="detail-section">
                    <h4>⚠️ 使用限制</h4>
                    <p>${spot.restrictions.join('、')}</p>
                </div>
                ${spot.shootingTips ? `
                <div class="detail-section">
                    <h4>💡 拍摄建议</h4>
                    <p>${spot.shootingTips}</p>
                </div>
                ` : ''}
            </div>
        `;
    }

    // 显示模态窗口
    document.getElementById('spotModal').style.display = 'flex';
}

// 获取园区信息
function getAreaInfo(areaName) {
    var areaInfoMap = {
        '魔雪奇缘世界': {
            icon: '❄️',
            description: '以《冰雪奇缘》为主题的魔法世界，体验艾莎和安娜的冒险故事。',
            rating: 4.8,
            suggestedTime: '2-3小时',
            tips: [
                '建议先体验《冰雪奇缘》主题游乐设施',
                '园区内有很多拍照打卡点',
                '适合家庭和情侣游玩',
                '建议在下午时段游玩，避开高峰'
            ]
        },
        '反斗奇兵大本营': {
            icon: '🤠',
            description: '以《玩具总动员》为主题的互动体验区，与胡迪和巴斯光年一起冒险。',
            rating: 4.6,
            suggestedTime: '1.5-2小时',
            tips: [
                '适合儿童和家庭游玩',
                '互动体验项目较多',
                '建议携带相机记录精彩时刻',
                '园区内设有休息区'
            ]
        },
        '迷离庄园': {
            icon: '🏰',
            description: '神秘的维多利亚风格庄园，体验惊险刺激的探险之旅。',
            rating: 4.7,
            suggestedTime: '1-1.5小时',
            tips: [
                '适合喜欢刺激的游客',
                '建议在光线充足时游玩',
                '注意身高限制要求',
                '园区内设有主题餐厅'
            ]
        },
        '灰熊山谷': {
            icon: '🐻',
            description: '西部风格的冒险园区，体验矿车探险和淘金热潮。',
            rating: 4.5,
            suggestedTime: '1.5-2小时',
            tips: [
                '矿车项目较为刺激，注意安全',
                '建议携带防晒用品',
                '园区内有西部主题表演',
                '适合喜欢冒险的游客'
            ]
        },
        '狮子王庆典': {
            icon: '🦁',
            description: '以《狮子王》为主题的表演园区，观看震撼的舞台演出。',
            rating: 4.9,
            suggestedTime: '1-1.5小时',
            tips: [
                '建议提前查看演出时间表',
                '演出期间请保持安静',
                '园区内设有纪念品商店',
                '适合所有年龄段游客'
            ]
        },
        '探险世界': {
            icon: '🌴',
            description: '热带雨林主题的探险园区，体验丛林冒险和河流漂流。',
            rating: 4.4,
            suggestedTime: '2-2.5小时',
            tips: [
                '建议携带雨具，可能有水花飞溅',
                '园区内设有多个休息点',
                '适合喜欢自然探险的游客',
                '注意园区内的安全提示'
            ]
        },
        '奇妙梦想城堡': {
            icon: '🏰',
            description: '迪士尼标志性的城堡，是拍照打卡和观看烟花的最佳地点。',
            rating: 4.9,
            suggestedTime: '1-1.5小时',
            tips: [
                '建议在傍晚时分观看烟花表演',
                '城堡前是拍照的最佳位置',
                '园区内设有皇家主题餐厅',
                '适合所有年龄段游客'
            ]
        },
        '明日世界': {
            icon: '🚀',
            description: '未来科技主题园区，体验太空冒险和科幻游乐设施。',
            rating: 4.6,
            suggestedTime: '2-2.5小时',
            tips: [
                '建议先体验热门项目',
                '园区内科技感十足，适合拍照',
                '注意部分项目的身高限制',
                '园区内设有未来主题餐厅'
            ]
        },
        '幻想世界': {
            icon: '✨',
            description: '经典童话主题园区，体验迪士尼经典角色的魔法世界。',
            rating: 4.7,
            suggestedTime: '2-3小时',
            tips: [
                '适合儿童和家庭游玩',
                '园区内有很多经典角色互动',
                '建议携带相机记录精彩时刻',
                '园区内设有童话主题餐厅'
            ]
        }
    };
    
    return areaInfoMap[areaName] || {
        icon: '🎠',
        description: '迪士尼乐园精彩园区，体验独特的游乐设施和表演。',
        rating: 4.5,
        suggestedTime: '1-2小时',
        tips: [
            '建议提前规划游玩路线',
            '注意查看各项目的开放时间',
            '园区内设有多个休息区',
            '适合所有年龄段游客'
        ]
    };
}

// 根据游玩项目ID获取所属区域名称
function getAreaNameByAttractionId(attractionId) {
    if (attractionId.startsWith('frozen_')) {
        return '魔雪奇缘世界';
    } else if (attractionId.startsWith('toy_story_')) {
        return '反斗奇兵大本营';
    } else if (attractionId.startsWith('mystic_')) {
        return '迷离庄园';
    } else if (attractionId.startsWith('grizzly_')) {
        return '灰熊山谷';
    } else if (attractionId.startsWith('lion_king_')) {
        return '狮子王庆典';
    } else if (attractionId.startsWith('adventure_')) {
        return '探险世界';
    } else if (attractionId.startsWith('castle_')) {
        return '奇妙梦想城堡';
    } else if (attractionId.startsWith('tomorrowland_')) {
        return '明日世界';
    } else if (attractionId.startsWith('fantasyland_')) {
        return '幻想世界';
    } else {
        return '魔雪奇缘世界'; // 默认
    }
}

// 关闭模态窗口
function closeSpotModal() {
    document.getElementById('spotModal').style.display = 'none';
}

// 显示完整图片
function showFullImage(imagePath, spotName) {
    var fullImage = document.getElementById('fullImage');
    var imageModal = document.getElementById('imageModal');
    
    // 显示加载提示
    fullImage.style.opacity = '0.5';
    fullImage.src = imagePath;
    document.getElementById('imageModalTitle').textContent = spotName + ' - 完整样片';
    imageModal.style.display = 'flex';
    
    // 图片加载完成后恢复透明度
    fullImage.onload = function() {
        fullImage.style.opacity = '1';
    };
    
    // 图片加载失败处理
    fullImage.onerror = function() {
        fullImage.style.opacity = '1';
        showMessage('图片加载失败');
    };
}

// 关闭图片模态窗口
function closeImageModal() {
    document.getElementById('imageModal').style.display = 'none';
}

// 获取状态文本
function getStatusText(status) {
    var statuses = {
        'available': '可用',
        'occupied': '占用',
        'maintenance': '维护中'
    };
    return statuses[status] || status;
}

// 更新状态计数
function updateStatusCounts() {
    var currentDataSet = getCurrentData();
    var available = currentDataSet.filter(s => s.status === 'available').length;
    var occupied = currentDataSet.filter(s => s.status === 'occupied').length;
    var maintenance = currentDataSet.filter(s => s.status === 'maintenance').length;

    document.getElementById('availableCount').textContent = available;
    document.getElementById('occupiedCount').textContent = occupied;
    document.getElementById('maintenanceCount').textContent = maintenance;
}

// 切换地图类型
function switchMapType(mapType) {
    // 记录注记图层是否可见
    var annotationVisible = baseLayers.annotation.getVisible();
    
    // 移除当前底图
    var currentLayers = map.getLayers().getArray();
    var layersToRemove = [];
    
    currentLayers.forEach(function(layer) {
        if (layer === baseLayers.vector || layer === baseLayers.satellite) {
            layersToRemove.push(layer);
        }
    });
    
    layersToRemove.forEach(function(layer) {
        map.removeLayer(layer);
    });
    
    // 添加新的底图
    if (mapType === 'satellite') {
        map.addLayer(baseLayers.satellite);
        document.getElementById('satelliteBtn').classList.add('active');
        document.getElementById('vectorBtn').classList.remove('active');
    } else {
        map.addLayer(baseLayers.vector);
        document.getElementById('vectorBtn').classList.add('active');
        document.getElementById('satelliteBtn').classList.remove('active');
    }
    
    // 确保注记图层在最上层（如果可见）
    if (annotationVisible) {
        // 先移除注记图层，再重新添加以确保在最上层
        map.removeLayer(baseLayers.annotation);
        map.addLayer(baseLayers.annotation);
    }
    
    // 确保机位图层在最上层
    ensureSpotLayerOnTop();
    
    showMessage('已切换到' + (mapType === 'satellite' ? '卫星图' : '线划图'));
}

// 切换注记图层
function toggleAnnotation() {
    var btn = document.getElementById('annotationBtn');
    var isVisible = baseLayers.annotation.getVisible();
    
    baseLayers.annotation.setVisible(!isVisible);
    btn.classList.toggle('active');
    
    if (!isVisible) {
        // 添加注记图层到最上层
        map.addLayer(baseLayers.annotation);
    } else {
        // 移除注记图层
        map.removeLayer(baseLayers.annotation);
    }
    
    // 确保机位图层在最上层
    ensureSpotLayerOnTop();
}

// 切换路况图层
function toggleTraffic() {
    var btn = document.getElementById('trafficBtn');
    btn.classList.toggle('active');
    showMessage('路况图层功能开发中...');
}

// 清除所有标注点
function clearAllSpots() {
    spotLayer.getSource().clear();
    updateSpotCount();
    showMessage('已清除所有标注点');
}

// 移动端侧边栏切换
// 切换移动端导航菜单
function toggleMobileNav() {
    var navPanel = document.getElementById('mobileNavPanel');
    var navBtn = document.getElementById('mobileNavBtn');
    var navOverlay = document.getElementById('mobileNavOverlay');
    
    if (navPanel && navBtn) {
        var isActive = navPanel.classList.contains('active');
        
        if (isActive) {
            // 关闭导航菜单
            navPanel.classList.remove('active');
            navBtn.classList.remove('active');
            if (navOverlay) navOverlay.classList.remove('active');
        } else {
            // 打开导航菜单
            navPanel.classList.add('active');
            navBtn.classList.add('active');
            if (navOverlay) navOverlay.classList.add('active');
            
            // 如果打开导航菜单，关闭侧边栏
            var sidebar = document.getElementById('sidebar');
            var menuBtn = document.getElementById('mobileMenuBtn');
            if (sidebar) sidebar.classList.remove('active');
            if (menuBtn) menuBtn.classList.remove('active');
        }
    }
}

function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    var menuBtn = document.getElementById('mobileMenuBtn');
    
    sidebar.classList.toggle('active');
    menuBtn.classList.toggle('active');
    
    // 如果打开侧边栏，关闭导航菜单
    if (sidebar.classList.contains('active')) {
        var navPanel = document.getElementById('mobileNavPanel');
        var navBtn = document.getElementById('mobileNavBtn');
        if (navPanel) navPanel.classList.remove('active');
        if (navBtn) navBtn.classList.remove('active');
    }
    
    // 点击地图时自动关闭侧边栏
    if (sidebar.classList.contains('active')) {
        document.addEventListener('click', closeSidebarOnClickOutside);
    } else {
        document.removeEventListener('click', closeSidebarOnClickOutside);
    }
}

// 点击外部关闭侧边栏
function closeSidebarOnClickOutside(event) {
    var sidebar = document.getElementById('sidebar');
    var menuBtn = document.getElementById('mobileMenuBtn');
    
    // 如果点击的不是侧边栏或菜单按钮，则关闭侧边栏
    if (!sidebar.contains(event.target) && !menuBtn.contains(event.target)) {
        sidebar.classList.remove('active');
        menuBtn.classList.remove('active');
        document.removeEventListener('click', closeSidebarOnClickOutside);
    }
}

// 移动端地图控制面板切换
function toggleMapControls() {
    var mapControls = document.getElementById('mapControls');
    var controlsBtn = document.getElementById('mobileControlsBtn');
    
    mapControls.classList.toggle('active');
    
    // 点击外部时自动关闭控制面板
    if (mapControls.classList.contains('active')) {
        document.addEventListener('click', closeControlsOnClickOutside);
        controlsBtn.style.background = 'rgba(102, 126, 234, 0.9)';
        controlsBtn.style.color = 'white';
    } else {
        document.removeEventListener('click', closeControlsOnClickOutside);
        controlsBtn.style.background = 'rgba(255, 255, 255, 0.95)';
        controlsBtn.style.color = 'inherit';
    }
}

// 点击外部关闭地图控制面板
function closeControlsOnClickOutside(event) {
    var mapControls = document.getElementById('mapControls');
    var controlsBtn = document.getElementById('mobileControlsBtn');
    
    // 如果点击的不是控制面板或控制按钮，则关闭面板
    if (!mapControls.contains(event.target) && !controlsBtn.contains(event.target)) {
        mapControls.classList.remove('active');
        controlsBtn.style.background = 'rgba(255, 255, 255, 0.95)';
        controlsBtn.style.color = 'inherit';
        document.removeEventListener('click', closeControlsOnClickOutside);
    }
}

// 获取当前标注点数量
function getSpotCount() {
    return spotLayer.getSource().getFeatures().length;
}

// 更新标注点计数显示
function updateSpotCount() {
    var count = getSpotCount();
    var countElement = document.getElementById('spotCount');
    if (countElement) {
        countElement.textContent = count;
    }
}

// 处理视图控制按钮点击（根据模式调用不同功能）
function handleViewControl() {
    if (currentMode === 'wuhanOcean') {
        showPerformanceList();
    } else {
        resetView();
    }
}

// 重置视图
function resetView() {
    // 根据当前模式重置到对应的默认视图
    if (currentMode === 'disney' && typeof disneyConfig !== 'undefined') {
        map.getView().animate({
            center: ol.proj.fromLonLat(disneyConfig.center),
            zoom: disneyConfig.zoom,
            duration: 1000
        });
    } else if (currentMode === 'suzhou' && typeof suzhouConfig !== 'undefined') {
        map.getView().animate({
            center: ol.proj.fromLonLat(suzhouConfig.center),
            zoom: suzhouConfig.zoom,
            duration: 1000
        });
    } else if (currentMode === 'wuhan' && typeof wuhanConfig !== 'undefined') {
        map.getView().animate({
            center: ol.proj.fromLonLat(wuhanConfig.center),
            zoom: wuhanConfig.zoom,
            duration: 1000
        });
    } else if (currentMode === 'wuhanOcean' && typeof wuhanOceanConfig !== 'undefined') {
        map.getView().animate({
            center: ol.proj.fromLonLat(wuhanOceanConfig.center),
            zoom: wuhanOceanConfig.zoom,
            duration: 1000
        });
    } else {
        // 默认深圳视图
        map.getView().animate({
            center: ol.proj.fromLonLat([114.085947, 22.547]),
            zoom: 12,
            duration: 1000
        });
    }
}

// 定位我
function locateMe() {
    if (navigator.geolocation) {
        // 显示加载状态
        showMessage('正在获取您的位置...');
        
        // 优化后的定位选项
        const options = {
            enableHighAccuracy: true,  // 启用高精度定位
            timeout: 15000,            // 15秒超时（增加超时时间）
            maximumAge: 300000         // 5分钟缓存（允许使用缓存的位置）
        };

        // 成功回调函数
        function success(position) {
            var coords = [position.coords.longitude, position.coords.latitude];
            currentPosition = coords;
            
            console.log(`定位成功: 纬度 ${position.coords.latitude}, 经度 ${position.coords.longitude}, 精度 ${position.coords.accuracy}米`);
            
            // 平滑移动到用户位置
            map.getView().animate({
                center: ol.proj.fromLonLat(coords),
                zoom: 15,
                duration: 1000
            });
            
            showMessage(`已定位到您的位置 (精度: ±${Math.round(position.coords.accuracy)}米)`);
        }

        // 错误回调函数
        function error(err) {
            let errorMessage = '';
            
            switch(err.code) {
                case err.PERMISSION_DENIED:
                    errorMessage = '定位失败: 用户拒绝了定位请求，请允许浏览器获取位置信息';
                    break;
                case err.POSITION_UNAVAILABLE:
                    errorMessage = '定位失败: 位置信息不可用，请检查GPS是否开启';
                    break;
                case err.TIMEOUT:
                    errorMessage = '定位失败: 请求超时，请检查网络连接或在室外环境重试';
                    break;
                default:
                    errorMessage = '定位失败: 未知错误，请重试';
            }
            
            console.error(`定位错误: ${errorMessage} (代码: ${err.code})`);
            showMessage(errorMessage);
        }

        // 调用定位API
        navigator.geolocation.getCurrentPosition(success, error, options);
    } else {
        showMessage('浏览器不支持地理定位');
    }
}

// 全屏
function fullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen();
    }
}

// 显示消息
function showMessage(message) {
    // 创建临时消息元素
    var msgDiv = document.createElement('div');
    msgDiv.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
    `;
    msgDiv.textContent = message;
    document.body.appendChild(msgDiv);

    setTimeout(function() {
        document.body.removeChild(msgDiv);
    }, 3000);
}

// 机位管理
function showSpotManager() {
    showMessage('机位管理功能开发中...');
}

// 路线规划
function showRoutePlanner() {
    showMessage('路线规划功能开发中...');
}

// 设置
function showSettings() {
    showMessage('设置功能开发中...');
}

// 显示表演项目列表
function showPerformanceList() {
    if (currentMode !== 'wuhanOcean') {
        showMessage('此功能仅在武汉极地海洋公园导览模式下可用');
        return;
    }
    
    // 打开表演打卡模态窗口
    var performanceModal = document.getElementById('performanceModal');
    var modalBody = document.getElementById('performanceModalBody');
    
    if (!performanceModal || !modalBody) {
        showMessage('模态窗口元素未找到');
        return;
    }
    
    // 清空模态窗口内容
    modalBody.innerHTML = '';
    
    // 创建表格容器
    var tableContainer = document.createElement('div');
    tableContainer.className = 'performance-table-container';
    
    // 创建表格
    var table = document.createElement('table');
    table.className = 'performance-table';
    
    // 创建表头
    var thead = document.createElement('thead');
    var headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th>表演名称</th>
        <th>表演地点</th>
        <th>表演时间</th>
        <th>操作</th>
        <th>状态</th>
    `;
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // 创建表体
    var tbody = document.createElement('tbody');
    
    // 获取已看过的表演列表（从localStorage）
    var watchedPerformances = JSON.parse(localStorage.getItem('wuhanOceanWatchedPerformances') || '[]');
    
    // 遍历表演时间表数据，创建表格行
    if (typeof wuhanOceanPerformanceSchedule !== 'undefined' && wuhanOceanPerformanceSchedule.length > 0) {
        wuhanOceanPerformanceSchedule.forEach(function(schedule, index) {
            var row = document.createElement('tr');
            var scheduleKey = schedule.time + '_' + schedule.name; // 使用时间和名称作为唯一标识
            var isWatched = watchedPerformances.includes(scheduleKey);
            
            // 如果已看过，添加已看过类
            if (isWatched) {
                row.classList.add('performance-watched');
            }
            
            row.innerHTML = `
                <td>
                    <div class="performance-name">${schedule.name}</div>
                </td>
                <td>
                    <div class="performance-location">${schedule.location}</div>
                </td>
                <td>
                    <div class="performance-time">${schedule.time}</div>
                </td>
                <td>
                    <button class="table-action-btn" onclick="addPerformanceToMap('${schedule.locationId}')" title="添加到地图">
                        📍 添加
                    </button>
                </td>
                <td>
                    <label class="performance-checkbox-label">
                        <input type="checkbox" class="performance-checkbox" 
                               data-schedule-key="${scheduleKey}"
                               ${isWatched ? 'checked' : ''}
                               onchange="togglePerformanceWatched('${scheduleKey}', this)">
                        <span class="checkbox-text">已看</span>
                    </label>
                </td>
            `;
            tbody.appendChild(row);
        });
    } else {
        // 如果没有时间表数据，使用原有数据作为备用
        var watchedPerformances = JSON.parse(localStorage.getItem('wuhanOceanWatchedPerformances') || '[]');
        
        wuhanOceanShowData.forEach(function(show) {
            var row = document.createElement('tr');
            var showsText = show.shows ? show.shows.join('、') : '暂无信息';
            var timeText = show.operatingHours || show.bestTime || '按表演时间表';
            var scheduleKey = show.id;
            var isWatched = watchedPerformances.includes(scheduleKey);
            
            if (isWatched) {
                row.classList.add('performance-watched');
            }
            
            row.innerHTML = `
                <td>
                    <div class="performance-name">${showsText}</div>
                </td>
                <td>
                    <div class="performance-location">${show.name}</div>
                </td>
                <td>
                    <div class="performance-time">${timeText}</div>
                </td>
                <td>
                    <button class="table-action-btn" onclick="addPerformanceToMap('${show.id}')" title="添加到地图">
                        📍 添加
                    </button>
                </td>
                <td>
                    <label class="performance-checkbox-label">
                        <input type="checkbox" class="performance-checkbox" 
                               data-schedule-key="${scheduleKey}"
                               ${isWatched ? 'checked' : ''}
                               onchange="togglePerformanceWatched('${scheduleKey}', this)">
                        <span class="checkbox-text">已看</span>
                    </label>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    table.appendChild(tbody);
    tableContainer.appendChild(table);
    
    // 添加说明文字
    var infoText = document.createElement('div');
    infoText.className = 'performance-info';
    infoText.innerHTML = `
        <p>💡 提示：点击"添加"按钮可以将表演地点标注到地图上，方便规划游览路线。</p>
        <p>⏰ 表演时间可能会根据季节和天气情况调整，建议以园区当日公告为准。</p>
    `;
    
    // 添加一键导入按钮
    var importSection = document.createElement('div');
    importSection.className = 'performance-import-section';
    var importBtn = document.createElement('button');
    importBtn.className = 'performance-import-btn';
    importBtn.innerHTML = '🎭 一键导入所有表演地点';
    importBtn.onclick = function() {
        importAllPerformanceLocations();
        closePerformanceModal();
    };
    importSection.appendChild(importBtn);
    
    modalBody.appendChild(tableContainer);
    modalBody.appendChild(infoText);
    modalBody.appendChild(importSection);
    
    // 显示模态窗口
    performanceModal.style.display = 'flex';
    
    // 点击背景关闭
    performanceModal.onclick = function(e) {
        if (e.target === performanceModal) {
            closePerformanceModal();
        }
    };
}

// 关闭表演打卡模态窗口
function closePerformanceModal() {
    var performanceModal = document.getElementById('performanceModal');
    if (performanceModal) {
        performanceModal.style.display = 'none';
    }
}

// 切换表演已看状态
function togglePerformanceWatched(scheduleKey, checkbox) {
    var watchedPerformances = JSON.parse(localStorage.getItem('wuhanOceanWatchedPerformances') || '[]');
    var row = checkbox.closest('tr');
    
    if (checkbox.checked) {
        // 添加到已看列表
        if (!watchedPerformances.includes(scheduleKey)) {
            watchedPerformances.push(scheduleKey);
        }
        row.classList.add('performance-watched');
    } else {
        // 从已看列表移除
        var index = watchedPerformances.indexOf(scheduleKey);
        if (index > -1) {
            watchedPerformances.splice(index, 1);
        }
        row.classList.remove('performance-watched');
    }
    
    // 保存到localStorage
    localStorage.setItem('wuhanOceanWatchedPerformances', JSON.stringify(watchedPerformances));
}

// 添加单个表演项目到地图
function addPerformanceToMap(showId) {
    var show = wuhanOceanShowData.find(s => s.id === showId);
    if (!show) return;
    
    // 检查是否已存在
    var existingFeature = spotLayer.getSource().getFeatures().find(function(feature) {
        return feature.get('spotData') && feature.get('spotData').id === showId;
    });
    
    if (existingFeature) {
        // 如果已存在，更新显示文本（包含该地点的所有表演和时间）
        if (typeof wuhanOceanPerformanceSchedule !== 'undefined') {
            var locationPerformances = wuhanOceanPerformanceSchedule.filter(function(schedule) {
                return schedule.locationId === showId;
            });
            
            if (locationPerformances.length > 0) {
                var performancesText = locationPerformances.map(function(p) {
                    return p.time + ' ' + p.name;
                }).join('\n');
                existingFeature.get('spotData').displayName = show.name + '\n' + performancesText;
                existingFeature.get('spotData').performanceSchedule = locationPerformances;
                existingFeature.changed();
            }
        }
        showMessage('该表演地点已在地图上，已更新表演信息');
        return;
    }
    
    // 获取该地点的所有表演和时间
    var displayName = show.name;
    var performanceSchedule = [];
    
    if (typeof wuhanOceanPerformanceSchedule !== 'undefined') {
        var locationPerformances = wuhanOceanPerformanceSchedule.filter(function(schedule) {
            return schedule.locationId === showId;
        });
        
        if (locationPerformances.length > 0) {
            var performancesText = locationPerformances.map(function(p) {
                return p.time + ' ' + p.name;
            }).join('\n');
            displayName = show.name + '\n' + performancesText;
            performanceSchedule = locationPerformances;
        }
    }
    
    // 创建扩展的spotData
    var extendedSpotData = Object.assign({}, show, {
        displayName: displayName,
        performanceSchedule: performanceSchedule
    });
    
    // 创建要素
    var feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat(show.coordinates)),
        spotData: extendedSpotData,
        type: 'show',
        category: show.category
    });
    
    spotLayer.getSource().addFeature(feature);
    updateSpotCount();
    showMessage('表演地点已添加到地图');
    
    // 保持当前缩放级别，只移动中心点
    var currentZoom = map.getView().getZoom();
    map.getView().animate({
        center: ol.proj.fromLonLat(show.coordinates),
        zoom: currentZoom,
        duration: 1000
    });
}

// 导入所有表演项目
// 一键导入所有表演地点（按地点分组，显示该地点的所有表演和时间）
function importAllPerformanceLocations() {
    if (typeof wuhanOceanPerformanceSchedule === 'undefined' || wuhanOceanPerformanceSchedule.length === 0) {
        showMessage('表演时间表数据未找到');
        return;
    }
    
    // 按地点分组表演
    var locationGroups = {};
    wuhanOceanPerformanceSchedule.forEach(function(schedule) {
        var locationId = schedule.locationId;
        if (!locationGroups[locationId]) {
            locationGroups[locationId] = {
                locationId: locationId,
                location: schedule.location,
                performances: []
            };
        }
        locationGroups[locationId].performances.push({
            time: schedule.time,
            name: schedule.name
        });
    });
    
    var addedCount = 0;
    var locationList = [];
    
    // 为每个地点创建标注
    Object.keys(locationGroups).forEach(function(locationId) {
        var group = locationGroups[locationId];
        var locationData = wuhanOceanShowData.find(s => s.id === locationId);
        
        if (!locationData) return;
        
        // 检查是否已存在
        var existingFeature = spotLayer.getSource().getFeatures().find(function(feature) {
            return feature.get('spotData') && feature.get('spotData').id === locationId;
        });
        
        if (existingFeature) {
            // 如果已存在，更新显示文本
            var performancesText = group.performances.map(function(p) {
                return p.time + ' ' + p.name;
            }).join('\n');
            existingFeature.get('spotData').displayName = group.location + '\n' + performancesText;
            existingFeature.changed();
        } else {
            // 创建新的标注
            // 生成表演文本：按时间排序，每行显示"时间 表演名称"
            var performancesText = group.performances.map(function(p) {
                return p.time + ' ' + p.name;
            }).join('\n');
            
            // 创建扩展的spotData，包含显示名称
            var extendedSpotData = Object.assign({}, locationData, {
                displayName: group.location + '\n' + performancesText,
                performanceSchedule: group.performances
            });
            
            var feature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat(locationData.coordinates)),
                spotData: extendedSpotData,
                type: 'show',
                category: locationData.category
            });
            
            spotLayer.getSource().addFeature(feature);
            addedCount++;
            locationList.push(group.location);
        }
    });
    
    updateSpotCount();
    
    if (addedCount > 0) {
        // 调整视图以显示所有表演地点
        var extent = ol.extent.createEmpty();
        Object.keys(locationGroups).forEach(function(locationId) {
            var locationData = wuhanOceanShowData.find(s => s.id === locationId);
            if (locationData && locationData.coordinates && locationData.coordinates.length === 2) {
                var point = ol.proj.fromLonLat(locationData.coordinates);
                ol.extent.extend(extent, point);
            }
        });
        
        if (!ol.extent.isEmpty(extent)) {
            ol.extent.scaleFromCenter(extent, 1.2);
            map.getView().fit(extent, {
                duration: 1000,
                padding: [50, 50, 50, 50]
            });
        }
        
        showMessage(`成功导入 ${addedCount} 个表演地点到地图`);
    } else {
        showMessage('所有表演地点已在地图上');
    }
}

function importAllPerformances() {
    var addedCount = 0;
    
    wuhanOceanShowData.forEach(function(show) {
        // 检查是否已存在
        var existingFeature = spotLayer.getSource().getFeatures().find(function(feature) {
            return feature.get('spotData') && feature.get('spotData').id === show.id;
        });
        
        if (!existingFeature) {
            var feature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat(show.coordinates)),
                spotData: show,
                type: 'show',
                category: show.category
            });
            
            spotLayer.getSource().addFeature(feature);
            addedCount++;
        }
    });
    
    updateSpotCount();
    
    if (addedCount > 0) {
        // 调整视图以显示所有表演项目
        var extent = ol.extent.createEmpty();
        wuhanOceanShowData.forEach(function(show) {
            if (show.coordinates && show.coordinates.length === 2) {
                var point = ol.proj.fromLonLat(show.coordinates);
                ol.extent.extend(extent, point);
            }
        });
        
        if (!ol.extent.isEmpty(extent)) {
            ol.extent.scaleFromCenter(extent, 1.2);
            map.getView().fit(extent, {
                duration: 1000,
                padding: [50, 50, 50, 50]
            });
        }
        
        showMessage(`成功导入 ${addedCount} 个表演项目到地图`);
    } else {
        showMessage('所有表演项目已在地图上');
    }
}

// 调试函数：检查图层状态
function debugLayers() {
    var layers = map.getLayers().getArray();
    console.log('当前地图图层数量:', layers.length);
    layers.forEach(function(layer, index) {
        console.log('图层', index, ':', layer.get('title') || '未命名图层', '可见性:', layer.getVisible());
    });
}

// 更新缩放级别显示
function updateZoomLevel() {
    var zoom = Math.round(map.getView().getZoom());
    document.getElementById('zoomLevel').textContent = zoom;
}

// 显示最大缩放提示
function showMaxZoomMessage() {
    // 移除之前的最大缩放提示
    var existingMessage = document.getElementById('maxZoomMessage');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // 创建最大缩放提示元素
    var maxZoomDiv = document.createElement('div');
    maxZoomDiv.id = 'maxZoomMessage';
    maxZoomDiv.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 200px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 15px;
        padding: 15px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        z-index: 100;
        font-size: 12px;
        color: #e74c3c;
        font-weight: 600;
        border: 2px solid #e74c3c;
    `;
    maxZoomDiv.textContent = '已放大至最大级别';
    document.querySelector('.map-container').appendChild(maxZoomDiv);
    
    // 3秒后自动移除提示
    setTimeout(function() {
        if (maxZoomDiv.parentNode) {
            maxZoomDiv.remove();
        }
    }, 3000);
}

// 模式切换函数
function switchMode(mode) {
    if (currentMode === mode) return;
    
    currentMode = mode;
    
    // 更新当前数据集
    if (mode === 'disney') {
        currentData = disneyData;
    } else if (mode === 'suzhou') {
        currentData = suzhouSpotData;
    } else if (mode === 'wuhan') {
        currentData = spotData; // 暂时使用深圳数据集，后续可以添加武汉专用数据
    } else if (mode === 'wuhanOcean') {
        currentData = wuhanOceanSpotData; // 武汉极地海洋公园专用数据
    } else {
        currentData = spotData; // shenzhen
    }
    
    // 清除现有标注
    spotLayer.getSource().clear();
    
    // 调整地图视野
    if (mode === 'disney') {
        map.getView().animate({
            center: ol.proj.fromLonLat(disneyConfig.center),
            zoom: disneyConfig.zoom,
            duration: 1000
        });
    } else if (mode === 'suzhou') {
        map.getView().animate({
            center: ol.proj.fromLonLat(suzhouConfig.center),
            zoom: suzhouConfig.zoom,
            duration: 1000
        });
    } else if (mode === 'wuhan') {
        map.getView().animate({
            center: ol.proj.fromLonLat(wuhanConfig.center),
            zoom: wuhanConfig.zoom,
            duration: 1000
        });
    } else if (mode === 'wuhanOcean') {
        map.getView().animate({
            center: ol.proj.fromLonLat(wuhanOceanConfig.center),
            zoom: wuhanOceanConfig.zoom,
            duration: 1000
        });
    } else {
        map.getView().animate({
            center: ol.proj.fromLonLat([114.085947, 22.547]),
            zoom: 12,
            duration: 1000
        });
    }
    
    // 更新UI
    updateModeUI();
    updateSpotList();
    updateStatusCounts();
    updateFilteredCount();
    
    var modeMessages = {
        'disney': '已切换到香港迪士尼导览模式',
        'shenzhen': '已切换到深圳机位导航模式',
        'suzhou': '已切换到苏州机位导航模式',
        'wuhan': '已切换到武汉机位导航模式',
        'wuhanOcean': '已切换到武汉极地海洋公园导览模式'
    };
    
    showMessage(modeMessages[mode] || '已切换模式');
}

// 更新模式UI
function updateModeUI() {
    var logoTitle = document.querySelector('.logo h1');
    
    // 更新模式按钮状态（桌面端和移动端）
    var shenzhenBtn = document.getElementById('shenzhenModeBtn');
    var suzhouBtn = document.getElementById('suzhouModeBtn');
    var wuhanBtn = document.getElementById('wuhanModeBtn');
    var wuhanOceanBtn = document.getElementById('wuhanOceanModeBtn');
    var disneyBtn = document.getElementById('disneyModeBtn');
    var mobileSzBtn = document.getElementById('mobileSzModeBtn');
    var mobileSuzhouBtn = document.getElementById('mobileSuzhouModeBtn');
    var mobileWuhanBtn = document.getElementById('mobileWuhanModeBtn');
    var mobileWuhanOceanBtn = document.getElementById('mobileWuhanOceanModeBtn');
    var mobileDisneyBtn = document.getElementById('mobileDisneyModeBtn');
    
    // 清除所有按钮的active状态
    [shenzhenBtn, suzhouBtn, wuhanBtn, wuhanOceanBtn, disneyBtn, mobileSzBtn, mobileSuzhouBtn, mobileWuhanBtn, mobileWuhanOceanBtn, mobileDisneyBtn].forEach(function(btn) {
        if (btn) btn.classList.remove('active');
    });

    var searchSection = document.querySelector('.search-section');

    // 获取视图控制按钮
    var viewControlBtn = document.getElementById('viewControlBtn');
    var performanceCheckInBtn = document.getElementById('performanceCheckInBtn');
    
    if (currentMode === 'disney') {
        logoTitle.textContent = '香港迪士尼导览';
        document.querySelector('.search-title').textContent = '🏰 景点搜索';

        if (searchSection) searchSection.style.display = 'block';

        // 更新按钮状态
        if (disneyBtn) disneyBtn.classList.add('active');
        if (mobileDisneyBtn) mobileDisneyBtn.classList.add('active');
        
        // 显示重置视图按钮，隐藏表演打卡按钮
        if (viewControlBtn) viewControlBtn.style.display = 'block';
        if (performanceCheckInBtn) performanceCheckInBtn.style.display = 'none';
        
        updateDisneyFilters();
    } else if (currentMode === 'suzhou') {
        logoTitle.textContent = '苏州机位导航';
        document.querySelector('.search-title').textContent = '🔍 机位搜索';
        
        if (searchSection) searchSection.style.display = 'block';

        // 更新按钮状态
        if (suzhouBtn) suzhouBtn.classList.add('active');
        if (mobileSuzhouBtn) mobileSuzhouBtn.classList.add('active');
        
        // 显示重置视图按钮，隐藏表演打卡按钮
        if (viewControlBtn) viewControlBtn.style.display = 'block';
        if (performanceCheckInBtn) performanceCheckInBtn.style.display = 'none';
        
        updateShenzhenFilters();
    } else if (currentMode === 'wuhan') {
        logoTitle.textContent = '武汉机位导航';
        document.querySelector('.search-title').textContent = '🔍 机位搜索';
        
        if (searchSection) searchSection.style.display = 'block';

        // 更新按钮状态
        if (wuhanBtn) wuhanBtn.classList.add('active');
        if (mobileWuhanBtn) mobileWuhanBtn.classList.add('active');
        
        // 显示重置视图按钮，隐藏表演打卡按钮
        if (viewControlBtn) viewControlBtn.style.display = 'block';
        if (performanceCheckInBtn) performanceCheckInBtn.style.display = 'none';
        
        updateShenzhenFilters();
    } else if (currentMode === 'wuhanOcean') {
        logoTitle.textContent = '武汉极地海洋公园导览';
        document.querySelector('.search-title').textContent = '🔍 机位搜索';
        
        if (searchSection) searchSection.style.display = 'block';

        // 更新按钮状态
        if (wuhanOceanBtn) wuhanOceanBtn.classList.add('active');
        if (mobileWuhanOceanBtn) mobileWuhanOceanBtn.classList.add('active');
        
        // 显示表演打卡按钮（顶部导航栏）
        var showListBtn = document.getElementById('showListBtn');
        if (showListBtn) showListBtn.style.display = 'inline-block';
        
        // 显示移动端表演打卡按钮
        var mobileShowListBtn = document.getElementById('mobileShowListBtn');
        if (mobileShowListBtn) mobileShowListBtn.style.display = 'block';
        
        // 在地图控制面板中显示表演打卡按钮，隐藏重置视图按钮
        var viewControlBtn = document.getElementById('viewControlBtn');
        var performanceCheckInBtn = document.getElementById('performanceCheckInBtn');
        if (viewControlBtn) viewControlBtn.style.display = 'none';
        if (performanceCheckInBtn) performanceCheckInBtn.style.display = 'block';
        
        updateShenzhenFilters();
    } else {
        // 隐藏表演打卡按钮（顶部导航栏）
        var showListBtn = document.getElementById('showListBtn');
        if (showListBtn) showListBtn.style.display = 'none';
        
        // 隐藏移动端表演打卡按钮
        var mobileShowListBtn = document.getElementById('mobileShowListBtn');
        if (mobileShowListBtn) mobileShowListBtn.style.display = 'none';
        
        // 在地图控制面板中显示重置视图按钮，隐藏表演打卡按钮
        if (viewControlBtn) viewControlBtn.style.display = 'block';
        if (performanceCheckInBtn) performanceCheckInBtn.style.display = 'none';
        logoTitle.textContent = '深圳机位导航';
        document.querySelector('.search-title').textContent = '🔍 机位搜索';
        
        if (searchSection) searchSection.style.display = 'block';

        // 更新按钮状态
        if (shenzhenBtn) shenzhenBtn.classList.add('active');
        if (mobileSzBtn) mobileSzBtn.classList.add('active');
        
        updateShenzhenFilters();
    }
}

// 更新深圳模式筛选器
function updateShenzhenFilters() {
    var shootingTypeFilter = document.getElementById('shootingTypeFilter');
    shootingTypeFilter.innerHTML = `
        <option value="all">所有拍摄类型</option>
        <option value="建筑">建筑摄影</option>
        <option value="创意">创意摄影</option>
        <option value="城市风光">城市风光</option>
    `;
}

// 更新迪士尼模式筛选器
function updateDisneyFilters() {
    var shootingTypeFilter = document.getElementById('shootingTypeFilter');
    shootingTypeFilter.innerHTML = `
        <option value="all">所有区域类型</option>
        <option value="transport">交通接驳</option>
        <option value="themed_area">主题区域</option>
        <option value="entertainment">娱乐表演</option>
        <option value="main_street">主街</option>
        <option value="classic_ride">经典项目</option>
        <option value="photography">拍摄点</option>
    `;
}

// 获取当前数据
function getCurrentData() {
    return currentData || spotData;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化当前数据
    currentData = spotData;
    
    initMap();
    
    // 初始化视图控制按钮状态（默认显示重置视图按钮）
    var viewControlBtn = document.getElementById('viewControlBtn');
    var performanceCheckInBtn = document.getElementById('performanceCheckInBtn');
    if (viewControlBtn) viewControlBtn.style.display = 'block';
    if (performanceCheckInBtn) performanceCheckInBtn.style.display = 'none';
    
    // 初始化机位列表和状态计数
    updateSpotList();
    updateStatusCounts();
    
    // 初始化缩放级别显示
    updateZoomLevel();
    
    // 初始化标注点计数
    updateSpotCount();
    
    // 初始化筛选数量显示
    updateFilteredCount();
    
    // 调试：检查初始图层状态
    setTimeout(function() {
        debugLayers();
    }, 1000);
    
    // 绑定搜索事件
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchSpots();
        }
    });
    
    // 绑定搜索输入框实时更新事件
    document.getElementById('searchInput').addEventListener('input', function() {
        updateFilteredCount(); // 实时更新筛选数量
    });

    // 绑定筛选器变化事件
    ['shootingTypeFilter', 'focalLengthFilter', 'environmentFilter', 'weatherFilter', 'distanceFilter', 'priceFilter'].forEach(function(id) {
        document.getElementById(id).addEventListener('change', function() {
            searchSpots();
            updateFilteredCount(); // 实时更新筛选数量
        });
    });

    // 绑定模态窗口背景点击关闭事件
    document.getElementById('spotModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeSpotModal();
        }
    });

    // 绑定图片模态窗口背景点击关闭事件
    document.getElementById('imageModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeImageModal();
        }
    });

    // 绑定键盘ESC键关闭图片模态窗口
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (document.getElementById('imageModal').style.display === 'flex') {
                closeImageModal();
            }
            if (document.getElementById('spotModal').style.display === 'flex') {
                closeSpotModal();
            }
        }
    });
});

// 显示游玩项目列表
// 显示园区详情
function showAreaDetails(areaName) {
    // 获取园区信息
    var areaInfo = getAreaInfo(areaName);
    var attractions = getAttractionsByArea(areaName);
    
    // 检测是否为移动设备
    var isMobile = window.innerWidth <= 768;
    
    // 更新模态窗口标题
    document.getElementById('modalTitle').textContent = areaName;
    document.getElementById('modalSubtitle').textContent = '园区详情';
    
    var modalBody = document.getElementById('modalBody');
    
    // 生成园区详情HTML
    var areaHtml = `
        <div class="area-details">
            <div class="area-header">
                <div class="area-icon">${areaInfo.icon}</div>
                <div class="area-info">
                    <h3>${areaName}</h3>
                    <p class="area-description">${areaInfo.description}</p>
                </div>
            </div>
            
            <div class="area-stats">
                <div class="stat-item">
                    <span class="stat-icon">🎠</span>
                    <span class="stat-label">游玩项目</span>
                    <span class="stat-value">${attractions.length} 个</span>
                </div>
                <div class="stat-item">
                    <span class="stat-icon">⭐</span>
                    <span class="stat-label">推荐指数</span>
                    <span class="stat-value">${areaInfo.rating}/5.0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-icon">⏰</span>
                    <span class="stat-label">建议游玩</span>
                    <span class="stat-value">${areaInfo.suggestedTime}</span>
                </div>
            </div>
            
            <div class="area-actions">
                <button class="area-action-btn primary" onclick="showAttractionsList('${areaName}')">
                    🎠 查看游玩项目
                </button>
                <button class="area-action-btn secondary" onclick="showAreaMap('${areaName}')">
                    🗺️ 园区地图
                </button>
            </div>
            
            <div class="area-tips">
                <h4>💡 游玩建议</h4>
                <ul>
                    ${areaInfo.tips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
    
    modalBody.innerHTML = areaHtml;
    
    // 显示模态窗口
    document.getElementById('spotModal').style.display = 'flex';
}

// 显示园区地图（简化版）
function showAreaMap(areaName) {
    // 更新模态窗口标题
    document.getElementById('modalTitle').textContent = areaName + ' - 园区地图';
    document.getElementById('modalSubtitle').textContent = '园区布局和设施位置';
    
    var modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <div class="area-map">
            <div class="map-placeholder">
                <div class="map-icon">🗺️</div>
                <h3>${areaName}园区地图</h3>
                <p>园区地图功能正在开发中，敬请期待！</p>
                <button class="back-btn" onclick="showAreaDetails('${areaName}')">
                    ← 返回园区详情
                </button>
            </div>
        </div>
    `;
    
    // 显示模态窗口
    document.getElementById('spotModal').style.display = 'flex';
}

function showAttractionsList(areaName) {
    var attractions = getAttractionsByArea(areaName);
    if (!attractions || attractions.length === 0) {
        showMessage('该区域暂无游玩项目信息');
        return;
    }

    // 更新模态窗口标题
    document.getElementById('modalTitle').textContent = areaName + ' - 游玩项目';
    document.getElementById('modalSubtitle').textContent = '点击项目查看详细信息';
    
    var modalBody = document.getElementById('modalBody');
    
    // 检测是否为移动设备
    var isMobile = window.innerWidth <= 768;
    
    // 生成游玩项目列表HTML
    var attractionsHtml = `
        <div class="attractions-list">
            ${isMobile ? '<div class="mobile-back-btn" onclick="showAreaDetails(\'' + areaName + '\')">← 返回园区详情</div>' : ''}
            <div class="attractions-header">
                <h3>🎠 ${areaName}游玩项目</h3>
                <p>共 ${attractions.length} 个项目${isMobile ? ' - 点击查看详情' : ''}</p>
            </div>
            <div class="attractions-grid">
    `;
    
    attractions.forEach(function(attraction, index) {
        // 检查开放时间，如果是"无使用时间段"则显示为关闭
        var isClosed = attraction.operatingHours === '无使用时间段' || attraction.operatingHours === '无适用时段';
        var statusColor = (attraction.status === 'available' && !isClosed) ? '#2ecc71' : '#e74c3c';
        var statusText = (attraction.status === 'available' && !isClosed) ? '开放' : '关闭';
        
        // 为移动端优化显示内容
        var displayInfo = isMobile ? [
            { label: '📏 身高要求', value: attraction.heightRequirement },
            { label: '⏰ 开放时间', value: attraction.operatingHours },
            { label: '⭐ 评分', value: attraction.rating + '/5.0' }
        ] : [
            { label: '📏 身高要求', value: attraction.heightRequirement },
            { label: '⏰ 开放时间', value: attraction.operatingHours },
            { label: '🎯 刺激程度', value: attraction.intensity },
            { label: '⭐ 评分', value: attraction.rating + '/5.0' },
            { label: '⏳ 等待时间', value: attraction.waitTime }
        ];
        
        var infoHtml = '';
        displayInfo.forEach(function(info) {
            infoHtml += `
                <div class="info-row">
                    <span class="label">${info.label}:</span>
                    <span class="value">${info.value}</span>
                </div>
            `;
        });
        
        attractionsHtml += `
            <div class="attraction-card" onclick="showAttractionDetails('${attraction.id}')">
                <div class="attraction-header">
                    <h4>${attraction.name}</h4>
                    <span class="status-badge" style="background-color: ${statusColor}">${statusText}</span>
                </div>
                <div class="attraction-info">
                    ${infoHtml}
                </div>
                ${!isMobile ? `<div class="attraction-description">
                    <p>${attraction.description}</p>
                </div>` : ''}
            </div>
        `;
    });
    
    attractionsHtml += `
            </div>
        </div>
    `;
    
    modalBody.innerHTML = attractionsHtml;
    
    // 显示模态窗口
    document.getElementById('spotModal').style.display = 'flex';
    
    // 移动端显示滚动提示
    if (isMobile && attractions.length > 3) {
        setTimeout(function() {
            var scrollHint = document.createElement('div');
            scrollHint.className = 'scroll-hint';
            scrollHint.textContent = '👆 上下滑动查看更多项目';
            document.body.appendChild(scrollHint);
            
            setTimeout(function() {
                if (scrollHint.parentNode) {
                    scrollHint.parentNode.removeChild(scrollHint);
                }
            }, 3000);
        }, 500);
    }
}

// 显示游玩项目详情
function showAttractionDetails(attractionId) {
    // 根据项目ID判断属于哪个区域
    var attractions;
    if (attractionId.startsWith('frozen_')) {
        attractions = getFrozenWorldAttractions();
    } else if (attractionId.startsWith('toy_story_')) {
        attractions = getToyStoryAttractions();
    } else if (attractionId.startsWith('mystic_')) {
        attractions = getMysticManorAttractions();
    } else if (attractionId.startsWith('grizzly_')) {
        attractions = getGrizzlyGulchAttractions();
    } else if (attractionId.startsWith('lion_king_')) {
        attractions = getLionKingAttractions();
    } else if (attractionId.startsWith('adventure_')) {
        attractions = getAdventureWorldAttractions();
    } else if (attractionId.startsWith('castle_')) {
        attractions = getCastleAttractions();
    } else if (attractionId.startsWith('tomorrowland_')) {
        attractions = getTomorrowlandAttractions();
    } else if (attractionId.startsWith('fantasyland_')) {
        attractions = getFantasylandAttractions();
    } else {
        attractions = getFrozenWorldAttractions(); // 默认
    }
    
    var attraction = attractions.find(a => a.id === attractionId);
    
    if (!attraction) {
        showMessage('未找到该项目信息');
        return;
    }

    // 生成天气图标
    var weatherIcons = attraction.weather.map(function(w) {
        var weatherMap = {
            'sunny': '☀️晴天',
            'cloudy': '☁️多云',
            'rainy': '🌧️雨天',
            'snowy': '❄️雪天'
        };
        return weatherMap[w] || '🌤️其他';
    }).join('、');

    var environmentText = attraction.environment === 'indoor' ? '🏢室内' : '🌳室外';
    
    // 检查开放时间，如果是"无使用时间段"则显示为关闭
    var isClosed = attraction.operatingHours === '无使用时间段' || attraction.operatingHours === '无适用时段';
    var statusColor = (attraction.status === 'available' && !isClosed) ? '#2ecc71' : '#e74c3c';
    var statusText = (attraction.status === 'available' && !isClosed) ? '开放' : '关闭';

    // 检测是否为移动设备
    var isMobile = window.innerWidth <= 768;
    
    // 更新模态窗口内容
    document.getElementById('modalTitle').textContent = attraction.name;
    document.getElementById('modalSubtitle').textContent = '游玩项目详情';
    
    var modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <div class="attraction-details">
            ${isMobile ? '<div class="mobile-back-btn" onclick="showAttractionsList(\'' + getAreaNameByAttractionId(attractionId) + '\')">← 返回列表</div>' : ''}
            <div class="attraction-info-grid">
                <div class="info-item">
                    <span class="info-icon">📏</span>
                    <div>
                        <div class="info-label">身高要求</div>
                        <div class="info-value">${attraction.heightRequirement}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">🔴</span>
                    <div>
                        <div class="info-label">项目状态</div>
                        <div class="info-value" style="color: ${statusColor}">${statusText}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">⏰</span>
                    <div>
                        <div class="info-label">开放时间</div>
                        <div class="info-value">${attraction.operatingHours}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">🎯</span>
                    <div>
                        <div class="info-label">刺激程度</div>
                        <div class="info-value">${attraction.intensity}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">⭐</span>
                    <div>
                        <div class="info-label">用户评分</div>
                        <div class="info-value">${attraction.rating}/5.0</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">⏳</span>
                    <div>
                        <div class="info-label">等待时间</div>
                        <div class="info-value">${attraction.waitTime}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">🏢</span>
                    <div>
                        <div class="info-label">环境类型</div>
                        <div class="info-value">${environmentText}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">🌤️</span>
                    <div>
                        <div class="info-label">适宜天气</div>
                        <div class="info-value">${weatherIcons}</div>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-icon">⏰</span>
                    <div>
                        <div class="info-label">最佳时间</div>
                        <div class="info-value">${attraction.bestTime}</div>
                    </div>
                </div>
            </div>
            <div class="attraction-details-content">
                <div class="detail-section">
                    <h4>📝 项目描述</h4>
                    <p>${attraction.description}</p>
                </div>
                <div class="detail-section">
                    <h4>🏗️ 配套设施</h4>
                    <p>${attraction.facilities.join('、')}</p>
                </div>
                <div class="detail-section">
                    <h4>⚠️ 使用限制</h4>
                    <p>${attraction.restrictions.join('、')}</p>
                </div>
                <div class="detail-section">
                    <h4>💡 游玩建议</h4>
                    <p>${attraction.tips}</p>
                </div>
            </div>
        </div>
    `;
    
    // 显示模态窗口
    document.getElementById('spotModal').style.display = 'flex';
}

// 完整的三维模型查看器类（基于model-viewer.html）
class ModelViewer3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentModel = null;
        this.ambientLight = null;
        this.directionalLight = null;
        this.autoRotate = false;
        this.wireframe = false;
        this.loadedTextures = new Map(); // 存储加载的贴图
        
        // 距离跟踪相关
        this.totalDistance = 0; // 总移动距离
        this.lastCameraPosition = null; // 上一帧相机位置
        this.distanceElement = null; // 距离显示元素
        
        // 右键移动限制相关
        this.initialTargetY = null; // 初始目标点Y坐标
        this.maxDownwardDistance = 1; // 最大向下移动距离
        
        // 事件绑定状态
        this.eventsBound = false; // 标记事件是否已绑定
        
        this.init();
        this.setupEventListeners();
    }

    init() {
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        // 创建相机
        this.camera = new THREE.PerspectiveCamera(
            75,
            (window.innerWidth - 300) / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(8, 6, 8); // 沙盘模式的最佳初始视角

        // 创建渲染器
        const canvas = document.getElementById('canvas');
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth - 300, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // 创建控制器
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // 沙盘模式设置：限制上下翻转角度，防止底面穿帮
        this.controls.minPolarAngle = Math.PI * 0.3; // 限制最小仰角（约54度，更严格）
        this.controls.maxPolarAngle = Math.PI * 0.5; // 限制最大仰角（约90度，更严格）
        
        // 提高左右翻转灵敏度
        this.controls.rotateSpeed = 2.0; // 增加旋转速度
        this.controls.zoomSpeed = 1.2; // 调整缩放速度
        this.controls.panSpeed = 0.8; // 调整平移速度
        
        // 启用OrbitControls的平移功能
        this.controls.enablePan = true;
        
        // 自定义鼠标控制：左键旋转，右键平移
        this.setupCustomMouseControls();

        // 创建光照
        this.setupLights();
        
        // 创建沙盘地面
        this.createSandboxGround();

        // 初始化距离跟踪
        this.initDistanceTracking();
        
        // 记录初始目标点Y坐标
        this.initialTargetY = this.controls.target.y;
        console.log('初始化限制参数:', {
            initialTargetY: this.initialTargetY,
            maxDownwardDistance: this.maxDownwardDistance
        });
        
        // 添加OrbitControls的change事件监听来实现距离限制
        this.controls.addEventListener('change', () => {
            this.limitCameraDownwardMovement();
        });

        // 添加一个测试立方体模型
        this.createTestModel();

        // 开始渲染循环
        this.animate();
    }

    setupLights() {
        // 环境光（最大强度）
        this.ambientLight = new THREE.AmbientLight(0x404040, 2.0);
        this.scene.add(this.ambientLight);

        // 方向光（最大强度）
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
        this.directionalLight.position.set(10, 10, 5);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(this.directionalLight);

        // 添加一些额外的光源来增强效果
        const light2 = new THREE.DirectionalLight(0xffffff, 1.0);
        light2.position.set(-10, 10, -5);
        this.scene.add(light2);

        const light3 = new THREE.DirectionalLight(0xffffff, 0.8);
        light3.position.set(0, -10, 0);
        this.scene.add(light3);
    }

    createSandboxGround() {
        // 创建沙盘地面
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x87CEEB // 浅蓝色
        });
        
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2; // 水平放置
        this.ground.position.y = -2; // 稍微下沉
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        
        // 添加沙盘边框（极薄厚度，不遮挡模型）
        const borderGeometry = new THREE.BoxGeometry(20.2, 0.01, 20.2);
        const borderMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x87CEEB // 浅蓝色边框，与地面一致
        });
        
        this.border = new THREE.Mesh(borderGeometry, borderMaterial);
        this.border.position.y = -1.995; // 调整位置，几乎与地面平齐
        this.scene.add(this.border);
        
        // 添加黑色台阶
        this.createSteps();
    }
    
    createSteps() {
        // 创建四个边的黑色台阶（不交叉）
        const stepMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x000000 // 黑色
        });
        
        // 前台阶（Z轴正方向）
        const frontStepGeometry = new THREE.BoxGeometry(20, 0.3, 0.5);
        const frontStep = new THREE.Mesh(frontStepGeometry, stepMaterial);
        frontStep.position.set(0, -1.85, 10.25);
        this.scene.add(frontStep);
        
        // 后台阶（Z轴负方向）
        const backStep = new THREE.Mesh(frontStepGeometry, stepMaterial);
        backStep.position.set(0, -1.85, -10.25);
        this.scene.add(backStep);
        
        // 左台阶（X轴负方向）
        const leftStepGeometry = new THREE.BoxGeometry(0.5, 0.3, 20);
        const leftStep = new THREE.Mesh(leftStepGeometry, stepMaterial);
        leftStep.position.set(-10.25, -1.85, 0);
        this.scene.add(leftStep);
        
        // 右台阶（X轴正方向）
        const rightStep = new THREE.Mesh(leftStepGeometry, stepMaterial);
        rightStep.position.set(10.25, -1.85, 0);
        this.scene.add(rightStep);
    }
    
    createTestModel() {
        // 创建一个测试立方体模型
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x00ff00,
            side: THREE.DoubleSide
        });
        
        this.currentModel = new THREE.Mesh(geometry, material);
        this.currentModel.position.set(0, 0, 0); // 放在沙盘中心
        this.currentModel.castShadow = true;
        this.currentModel.receiveShadow = true;
        
        this.scene.add(this.currentModel);
        console.log('测试立方体模型已创建');
    }

    disableRightClickGestures(canvas) {
        // 禁用右键菜单
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });

        // 禁用右键拖拽选择文本
        canvas.addEventListener('selectstart', (e) => {
            e.preventDefault();
            return false;
        });

        // 禁用拖拽
        canvas.addEventListener('dragstart', (e) => {
            e.preventDefault();
            return false;
        });

        // 禁用整个页面的右键菜单
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });

        // 禁用触摸设备的右键手势
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        });

        // 设置CSS样式禁用选择
        canvas.style.userSelect = 'none';
        canvas.style.webkitUserSelect = 'none';
        canvas.style.mozUserSelect = 'none';
        canvas.style.msUserSelect = 'none';
        
        // 禁用拖拽
        canvas.style.webkitUserDrag = 'none';
        canvas.style.userDrag = 'none';
        
        // 禁用右键菜单的CSS
        canvas.style.webkitTouchCallout = 'none';
    }

    setupCustomMouseControls() {
        const canvas = this.renderer.domElement;
        let isLeftMouseDown = false;
        let isRightMouseDown = false;
        let lastMouseX = 0;
        let lastMouseY = 0;

        // 禁用所有默认的右键手势和菜单
        this.disableRightClickGestures(canvas);

        // 鼠标按下事件
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // 左键
                isLeftMouseDown = true;
                this.controls.enableRotate = true;
                this.controls.enablePan = false;
            } else if (e.button === 2) { // 右键
                isRightMouseDown = true;
                this.controls.enableRotate = false;
                this.controls.enablePan = true;
            }
            
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });

        // 鼠标移动事件
        canvas.addEventListener('mousemove', (e) => {
            if (isLeftMouseDown) {
                // 左键拖拽：旋转视角
                const deltaX = e.clientX - lastMouseX;
                const deltaY = e.clientY - lastMouseY;
                
                // 水平旋转（绕Y轴）
                this.controls.azimuthAngle -= deltaX * 0.01;
                
                // 垂直旋转（绕X轴）
                this.controls.polarAngle += deltaY * 0.01;
                
                // 限制垂直角度
                this.controls.polarAngle = Math.max(
                    this.controls.minPolarAngle,
                    Math.min(this.controls.maxPolarAngle, this.controls.polarAngle)
                );
                
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
            }
        });

        // 鼠标释放事件
        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) { // 左键
                isLeftMouseDown = false;
            } else if (e.button === 2) { // 右键
                isRightMouseDown = false;
            }
            
            // 重置控制状态
            this.controls.enableRotate = true;
            this.controls.enablePan = true;
        });

        // 鼠标离开画布时重置状态
        canvas.addEventListener('mouseleave', () => {
            isLeftMouseDown = false;
            isRightMouseDown = false;
            this.controls.enableRotate = true;
            this.controls.enablePan = true;
        });

        // 滚轮缩放
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY;
            const scale = delta > 0 ? 1.1 : 0.9;
            
            // 计算缩放后的相机位置
            const direction = new THREE.Vector3();
            this.camera.getWorldDirection(direction);
            const distance = this.camera.position.distanceTo(this.controls.target);
            const newDistance = distance * scale;
            
            // 限制缩放范围
            const minDistance = 1;
            const maxDistance = 50;
            const clampedDistance = Math.max(minDistance, Math.min(maxDistance, newDistance));
            
            // 更新相机位置
            const newPosition = this.controls.target.clone().add(
                direction.multiplyScalar(-clampedDistance)
            );
            this.camera.position.copy(newPosition);
        });
    }

    setupEventListeners() {
        console.log('开始设置三维模式事件监听器...');
        
        // 注意：这里不绑定事件监听器，因为元素可能还没有创建
        // 事件监听器将在 bindEventsToNewElements() 中绑定
        console.log('跳过初始事件绑定，等待新元素创建后绑定');

        // 窗口大小调整
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        console.log('三维模式事件监听器设置完成');
    }

    // 专门用于绑定到新创建元素的事件监听器
    bindEventsToNewElements() {
        console.log('=== bindEventsToNewElements 被调用 ===', '全局eventsBound状态:', eventsBound, '实例eventsBound状态:', this.eventsBound);
        
        // 检查是否已经绑定过事件
        if (eventsBound) {
            console.log('全局事件已经绑定过，跳过重复绑定');
            return;
        }
        
        // 文件上传 - 使用3D专用ID
        const uploadArea = document.getElementById('uploadArea3D');
        const fileInput = document.getElementById('fileInput3D');
        console.log('新元素检查 - 文件上传:', { uploadArea: !!uploadArea, fileInput: !!fileInput });

        if (uploadArea && fileInput) {
            // 先克隆元素来移除所有事件监听器
            const newUploadArea = uploadArea.cloneNode(true);
            const newFileInput = newUploadArea.querySelector('#fileInput3D');
            uploadArea.parentNode.replaceChild(newUploadArea, uploadArea);
            
            // 防重复触发标志
            let isProcessing = false;
            
            // 绑定新的事件监听器 - 添加防重复机制
            newUploadArea.addEventListener('click', (e) => {
                // 不阻止默认行为，只阻止事件冒泡
                e.stopPropagation();
                
                if (isProcessing) {
                    console.log('防重复触发 - 忽略重复点击');
                    return;
                }
                
                isProcessing = true;
                console.log('新元素 - 点击上传区域 (防重复)');
                newFileInput.click();
                
                // 延迟重置标志，防止快速重复点击
                setTimeout(() => {
                    isProcessing = false;
                }, 500);
            }, true); // 使用捕获阶段
            
            newUploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
            newUploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
            newUploadArea.addEventListener('drop', this.handleDrop.bind(this));
            
            // 文件选择事件也添加防重复机制
            newFileInput.addEventListener('change', (e) => {
                // 不阻止默认行为，只阻止事件冒泡
                e.stopPropagation();
                
                if (isProcessing) {
                    console.log('防重复触发 - 忽略重复文件选择');
                    return;
                }
                
                isProcessing = true;
                console.log('文件选择事件触发 (防重复)');
                this.handleFileSelect(e);
                
                // 延迟重置标志
                setTimeout(() => {
                    isProcessing = false;
                }, 500);
            }, true); // 使用捕获阶段
            
            console.log('新元素 - 文件上传事件监听器已绑定 (防重复模式)');
        }

        // 控制面板 - 使用3D专用ID
        const modelScale = document.getElementById('modelScale3D');
        const resetCamera = document.getElementById('resetCamera3D');
        const autoRotate = document.getElementById('autoRotate3D');
        const wireframe = document.getElementById('wireframe3D');
        const applyTexture = document.getElementById('applyTexture3D');
        const reloadMaterials = document.getElementById('reloadMaterials3D');
        const clearModel = document.getElementById('clearModel3D');
        
        console.log('新元素检查 - 控制按钮:', {
            modelScale: !!modelScale,
            resetCamera: !!resetCamera,
            autoRotate: !!autoRotate,
            wireframe: !!wireframe,
            applyTexture: !!applyTexture,
            reloadMaterials: !!reloadMaterials,
            clearModel: !!clearModel
        });

        if (modelScale) {
            modelScale.removeEventListener('input', this.handleModelScale);
            this.handleModelScale = (e) => {
                console.log('新元素 - 模型缩放滑块变化:', e.target.value);
                if (this.currentModel) {
                    const scale = parseFloat(e.target.value);
                    this.currentModel.scale.setScalar(scale);
                    this.centerModelOnSandbox();
                }
            };
            modelScale.addEventListener('input', this.handleModelScale);
            console.log('新元素 - 模型缩放事件监听器已绑定');
        }

        if (resetCamera) {
            resetCamera.removeEventListener('click', this.handleResetCamera);
            this.handleResetCamera = () => {
                console.log('新元素 - 重置视角按钮被点击');
                this.camera.position.set(8, 6, 8);
                this.controls.target.set(0, 0, 0);
                this.controls.update();
                this.initialTargetY = this.controls.target.y;
                console.log('新元素 - 视角已重置');
            };
            resetCamera.addEventListener('click', this.handleResetCamera);
            console.log('新元素 - 重置视角事件监听器已绑定');
        }

        if (autoRotate) {
            autoRotate.removeEventListener('click', this.handleAutoRotate);
            this.handleAutoRotate = (e) => {
                console.log('新元素 - 自动旋转按钮被点击');
                this.autoRotate = !this.autoRotate;
                this.controls.autoRotate = this.autoRotate;
                e.target.textContent = this.autoRotate ? '停止旋转' : '自动旋转';
                console.log('新元素 - 自动旋转状态:', this.autoRotate);
            };
            autoRotate.addEventListener('click', this.handleAutoRotate);
            console.log('新元素 - 自动旋转事件监听器已绑定');
        }

        if (wireframe) {
            wireframe.removeEventListener('click', this.handleWireframe);
            this.handleWireframe = (e) => {
                console.log('新元素 - 线框模式按钮被点击');
                this.wireframe = !this.wireframe;
                if (this.currentModel) {
                    this.currentModel.traverse((child) => {
                        if (child.isMesh) {
                            child.material.wireframe = this.wireframe;
                        }
                    });
                }
                e.target.textContent = this.wireframe ? '实体模式' : '线框模式';
                console.log('新元素 - 线框模式状态:', this.wireframe);
            };
            wireframe.addEventListener('click', this.handleWireframe);
            console.log('新元素 - 线框模式事件监听器已绑定');
        }

        if (applyTexture) {
            applyTexture.removeEventListener('click', this.handleApplyTexture);
            this.handleApplyTexture = () => {
                console.log('新元素 - 应用贴图按钮被点击');
                this.applyTexturesToModel();
            };
            applyTexture.addEventListener('click', this.handleApplyTexture);
            console.log('新元素 - 应用贴图事件监听器已绑定');
        }

        if (reloadMaterials) {
            reloadMaterials.removeEventListener('click', this.handleReloadMaterials);
            this.handleReloadMaterials = () => {
                console.log('新元素 - 重新加载材质按钮被点击');
                this.reloadMaterials();
            };
            reloadMaterials.addEventListener('click', this.handleReloadMaterials);
            console.log('新元素 - 重新加载材质事件监听器已绑定');
        }

        if (clearModel) {
            clearModel.removeEventListener('click', this.handleClearModel);
            this.handleClearModel = () => {
                console.log('新元素 - 清除模型按钮被点击');
                this.clearCurrentModel();
            };
            clearModel.addEventListener('click', this.handleClearModel);
            console.log('新元素 - 清除模型事件监听器已绑定');
        }

        // 标记事件已绑定
        this.eventsBound = true;
        eventsBound = true; // 设置全局标志
        console.log('新元素事件监听器绑定完成，全局标志已设置');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const files = e.dataTransfer.files;
        this.loadFiles(files);
    }

    handleFileSelect(e) {
        console.log('文件选择事件触发');
        const files = e.target.files;
        console.log('选择的文件数量:', files.length);
        for (let i = 0; i < files.length; i++) {
            console.log(`文件 ${i + 1}:`, files[i].name, files[i].type, files[i].size);
        }
        this.loadFiles(files);
    }

    async loadFiles(files) {
        console.log('开始加载文件...');
        if (files.length === 0) {
            console.log('没有文件需要加载');
            return;
        }

        console.log('显示加载提示');
        this.showLoading(true);
        this.hideMessages();

        try {
            let objFile = null;
            let mtlFile = null;
            const textureFiles = [];
            console.log('开始分离文件类型...');

            // 分离不同类型的文件
            for (let file of files) {
                const fileName = file.name.toLowerCase();
                if (fileName.endsWith('.obj')) {
                    objFile = file;
                } else if (fileName.endsWith('.mtl')) {
                    mtlFile = file;
                } else if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
                    textureFiles.push(file);
                }
            }

            if (!objFile) {
                throw new Error('请选择OBJ文件');
            }

            // 移除之前的模型
            if (this.currentModel) {
                this.scene.remove(this.currentModel);
            }

            // 加载贴图文件
            if (textureFiles.length > 0) {
                await this.loadTextures(textureFiles);
            }

            // 加载材质（如果存在）
            let materials = null;
            if (mtlFile) {
                materials = await this.loadMTL(mtlFile);
            }

            // 加载OBJ模型
            const model = await this.loadOBJ(objFile, materials);
            
            // 自动调整模型大小和位置
            this.fitModelToView(model);
            
            this.currentModel = model;
            this.scene.add(model);

            // 更新信息面板
            this.updateModelInfo(objFile.name, model);

            this.showSuccess('模型加载成功！');

        } catch (error) {
            console.error('加载模型失败:', error);
            this.showError('加载模型失败: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async loadTextures(textureFiles) {
        const textureLoader = new THREE.TextureLoader();
        
        for (let file of textureFiles) {
            try {
                const texture = await this.loadTextureFromFile(file, textureLoader);
                this.loadedTextures.set(file.name, texture);
                this.updateTextureList();
            } catch (error) {
                console.error(`加载贴图 ${file.name} 失败:`, error);
            }
        }
    }

    loadTextureFromFile(file, loader) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const texture = loader.load(e.target.result);
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.flipY = false; // OBJ格式通常不需要翻转Y轴
                    resolve(texture);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error(`读取贴图文件 ${file.name} 失败`));
            reader.readAsDataURL(file);
        });
    }

    loadMTL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const mtlLoader = new THREE.MTLLoader();
                    mtlLoader.setPath('');
                    
                    // 创建材质
                    const materials = mtlLoader.parse(e.target.result);
                    materials.preload();
                    
                    // 处理材质中的贴图路径
                    this.processMTLTextures(materials);
                    
                    resolve(materials);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('读取MTL文件失败'));
            reader.readAsText(file);
        });
    }

    processMTLTextures(materials) {
        // 遍历材质，处理贴图路径
        Object.values(materials.materials).forEach(material => {
            if (material.map && material.map.sourceFile) {
                // 如果材质中引用了贴图文件，尝试从已加载的贴图中找到匹配的
                const textureName = material.map.sourceFile.toLowerCase();
                let found = false;
                
                for (let [fileName, texture] of this.loadedTextures) {
                    const fileNameLower = fileName.toLowerCase();
                    const baseName = textureName.replace(/\.(png|jpg|jpeg)$/i, '');
                    
                    // 多种匹配方式
                    if (fileNameLower.includes(baseName) || 
                        fileNameLower.includes(textureName.replace(/\.(png|jpg|jpeg)$/i, '')) ||
                        baseName.includes(fileNameLower.replace(/\.(png|jpg|jpeg)$/i, ''))) {
                        material.map = texture;
                        material.needsUpdate = true;
                        found = true;
                        console.log(`成功关联贴图: ${fileName} -> ${textureName}`);
                        break;
                    }
                }
                
                if (!found) {
                    console.warn(`未找到匹配的贴图文件: ${textureName}`);
                }
            }
        });
    }

    loadOBJ(file, materials) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const objLoader = new THREE.OBJLoader();
                    
                    if (materials) {
                        objLoader.setMaterials(materials);
                    }

                    const model = objLoader.parse(e.target.result);
                    
                    // 自动贴图处理
                    this.applyAutoTexturing(model);
                    
                    resolve(model);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('读取OBJ文件失败'));
            reader.readAsText(file);
        });
    }

    applyAutoTexturing(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                // 检查是否有UV坐标
                const hasUV = child.geometry.attributes.uv !== undefined;
                
                if (hasUV) {
                    // 如果有UV坐标，保持原有材质但确保正确设置
                    if (Array.isArray(child.material)) {
                        child.material = child.material.map(mat => {
                            const newMaterial = mat.clone();
                            // 确保材质支持贴图
                            if (!newMaterial.map && this.loadedTextures.size > 0) {
                                // 如果没有贴图但有UV坐标，创建支持贴图的材质
                                newMaterial.map = null;
                            }
                            newMaterial.side = THREE.DoubleSide;
                            newMaterial.needsUpdate = true;
                            return newMaterial;
                        });
                    } else {
                        const newMaterial = child.material.clone();
                        newMaterial.side = THREE.DoubleSide;
                        newMaterial.needsUpdate = true;
                        child.material = newMaterial;
                    }
                } else {
                    // 如果没有UV坐标，创建基础材质
                    const material = new THREE.MeshLambertMaterial({
                        color: 0x888888,
                        side: THREE.DoubleSide
                    });

                    if (!child.material || child.material.length === 0) {
                        child.material = material;
                    } else if (Array.isArray(child.material)) {
                        child.material = child.material.map(mat => {
                            return new THREE.MeshLambertMaterial({
                                color: mat.color || 0x888888,
                                side: THREE.DoubleSide
                            });
                        });
                    } else {
                        child.material = new THREE.MeshLambertMaterial({
                            color: child.material.color || 0x888888,
                            side: THREE.DoubleSide
                        });
                    }
                }

                // 启用阴影
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }

    fitModelToView(model) {
        // 先重置模型的位置和旋转
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
        model.scale.set(1, 1, 1);
        
        // 获取原始包围盒
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // 计算合适的缩放比例
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 4 / maxDim; // 目标大小为4个单位，适合沙盘

        // 先应用缩放
        model.scale.setScalar(scale);
        
        // 绕X轴逆时针旋转90度，让模型从竖向变为横向
        model.rotation.x = -Math.PI / 2;
        
        // 重新计算旋转和缩放后的包围盒
        const newBox = new THREE.Box3().setFromObject(model);
        const newCenter = newBox.getCenter(new THREE.Vector3());
        const newSize = newBox.getSize(new THREE.Vector3());
        
        // 沙盘中心坐标
        const sandboxCenter = new THREE.Vector3(0, 0, 0);
        const groundLevel = -2; // 沙盘上表面Y坐标
        
        // 将模型放置在沙盘中心
        model.position.set(
            sandboxCenter.x - newCenter.x,  // X轴居中
            groundLevel - newBox.min.y,     // Y轴：模型底部在沙盘表面
            sandboxCenter.z - newCenter.z   // Z轴居中
        );

        // 重置缩放滑块
        const modelScale = document.getElementById('modelScale');
        if (modelScale) {
            modelScale.value = scale;
        }
        
        // 更新相机目标点，让相机始终看向沙盘中心
        this.controls.target.set(sandboxCenter.x, sandboxCenter.y, sandboxCenter.z);
        this.controls.update();
    }

    centerModelOnSandbox() {
        if (!this.currentModel) return;
        
        // 获取模型当前的包围盒
        const box = new THREE.Box3().setFromObject(this.currentModel);
        const center = box.getCenter(new THREE.Vector3());
        
        // 沙盘中心坐标
        const sandboxCenter = new THREE.Vector3(0, 0, 0);
        const groundLevel = -2; // 沙盘上表面Y坐标
        
        // 计算需要调整的位置偏移
        const offsetX = sandboxCenter.x - center.x;
        const offsetZ = sandboxCenter.z - center.z;
        
        // 应用位置调整，确保模型底部在沙盘表面
        this.currentModel.position.x += offsetX;
        this.currentModel.position.z += offsetZ;
        this.currentModel.position.y = groundLevel - box.min.y;
    }

    applyTexturesToModel() {
        if (!this.currentModel || this.loadedTextures.size === 0) {
            this.showError('请先加载模型和贴图文件');
            return;
        }

        const textures = Array.from(this.loadedTextures.values());
        let appliedCount = 0;
        let skippedCount = 0;

        this.currentModel.traverse((child) => {
            if (child.isMesh) {
                // 检查是否有UV坐标
                const hasUV = child.geometry.attributes.uv !== undefined;
                
                if (!hasUV) {
                    skippedCount++;
                    return; // 跳过没有UV坐标的网格
                }

                // 为有UV坐标的网格应用贴图
                const texture = textures[appliedCount % textures.length];
                
                if (Array.isArray(child.material)) {
                    // 多材质情况
                    child.material = child.material.map(mat => {
                        const newMaterial = mat.clone();
                        newMaterial.map = texture;
                        newMaterial.needsUpdate = true;
                        return newMaterial;
                    });
                } else {
                    // 单材质情况
                    const newMaterial = child.material.clone();
                    newMaterial.map = texture;
                    newMaterial.needsUpdate = true;
                    child.material = newMaterial;
                }
                
                appliedCount++;
            }
        });

        if (appliedCount > 0) {
            this.showSuccess(`已为 ${appliedCount} 个网格应用贴图${skippedCount > 0 ? `，跳过 ${skippedCount} 个无UV坐标的网格` : ''}`);
        } else {
            this.showError('模型中没有找到UV坐标，无法应用贴图');
        }
    }

    updateModelInfo(fileName, model) {
        let vertexCount = 0;
        let faceCount = 0;
        let materialCount = 0;
        let meshWithUV = 0;
        let meshWithoutUV = 0;

        model.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry.attributes.position) {
                    vertexCount += child.geometry.attributes.position.count;
                }
                if (child.geometry.index) {
                    faceCount += child.geometry.index.count / 3;
                } else {
                    faceCount += child.geometry.attributes.position.count / 3;
                }
                materialCount++;

                // 检查UV坐标
                if (child.geometry.attributes.uv) {
                    meshWithUV++;
                } else {
                    meshWithoutUV++;
                }
            }
        });

        const modelNameEl = document.getElementById('modelName3D');
        const vertexCountEl = document.getElementById('vertexCount3D');
        const faceCountEl = document.getElementById('faceCount3D');
        const materialCountEl = document.getElementById('materialCount3D');
        const textureCountEl = document.getElementById('textureCount3D');
        const uvInfoEl = document.getElementById('uvInfo3D');

        if (modelNameEl) modelNameEl.textContent = fileName;
        if (vertexCountEl) vertexCountEl.textContent = Math.floor(vertexCount).toLocaleString();
        if (faceCountEl) faceCountEl.textContent = Math.floor(faceCount).toLocaleString();
        if (materialCountEl) materialCountEl.textContent = materialCount;
        if (textureCountEl) textureCountEl.textContent = this.loadedTextures.size;
        
        // 更新UV信息
        if (uvInfoEl) {
            if (meshWithUV > 0 && meshWithoutUV > 0) {
                uvInfoEl.textContent = `部分支持 (${meshWithUV}/${meshWithUV + meshWithoutUV})`;
            } else if (meshWithUV > 0) {
                uvInfoEl.textContent = '完全支持';
            } else {
                uvInfoEl.textContent = '不支持';
            }
        }
    }

    updateTextureList() {
        const texturePanel = document.getElementById('texturePanel3D');
        const textureList = document.getElementById('textureList3D');
        
        if (this.loadedTextures.size > 0) {
            if (texturePanel) texturePanel.style.display = 'block';
            if (textureList) {
                textureList.innerHTML = '';
                
                this.loadedTextures.forEach((texture, fileName) => {
                    const textureItem = document.createElement('div');
                    textureItem.style.cssText = `
                        display: flex;
                        align-items: center;
                        margin-bottom: 5px;
                        padding: 5px;
                        background: rgba(102, 126, 234, 0.1);
                        border-radius: 5px;
                    `;
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = 40;
                    canvas.height = 40;
                    const ctx = canvas.getContext('2d');
                    
                    // 创建贴图预览
                    const img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, 40, 40);
                    };
                    img.src = texture.image.src;
                    
                    const fileNameSpan = document.createElement('span');
                    fileNameSpan.textContent = fileName;
                    fileNameSpan.style.cssText = 'margin-left: 10px; font-size: 12px; color: #333;';
                    
                    textureItem.appendChild(canvas);
                    textureItem.appendChild(fileNameSpan);
                    textureList.appendChild(textureItem);
                });
            }
        } else {
            if (texturePanel) texturePanel.style.display = 'none';
        }
    }

    reloadMaterials() {
        if (!this.currentModel) {
            this.showError('请先加载模型');
            return;
        }

        this.currentModel.traverse((child) => {
            if (child.isMesh) {
                // 强制更新材质
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        mat.needsUpdate = true;
                    });
                } else {
                    child.material.needsUpdate = true;
                }
            }
        });

        this.showSuccess('材质已重新加载');
    }

    showLoading(show) {
        console.log('showLoading 被调用:', show);
        const loading = document.getElementById('loading');
        console.log('loading 元素:', !!loading);
        if (loading) {
            if (show) {
                loading.classList.add('show');
                console.log('显示加载提示');
            } else {
                loading.classList.remove('show');
                console.log('隐藏加载提示');
            }
        } else {
            console.error('未找到 loading 元素');
        }
    }

    showError(message) {
        console.log('显示错误消息:', message);
        const errorDiv = document.getElementById('errorMessage3D');
        console.log('errorDiv 元素:', !!errorDiv);
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.add('show');
            console.log('错误消息已显示');
        } else {
            console.error('未找到 errorMessage3D 元素');
        }
    }

    showSuccess(message) {
        console.log('显示成功消息:', message);
        const successDiv = document.getElementById('successMessage3D');
        console.log('successDiv 元素:', !!successDiv);
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.classList.add('show');
            console.log('成功消息已显示');
        } else {
            console.error('未找到 successMessage3D 元素');
        }
    }

    hideMessages() {
        console.log('隐藏所有消息');
        const errorDiv = document.getElementById('errorMessage3D');
        const successDiv = document.getElementById('successMessage3D');
        console.log('消息元素:', { errorDiv: !!errorDiv, successDiv: !!successDiv });
        if (errorDiv) errorDiv.classList.remove('show');
        if (successDiv) successDiv.classList.remove('show');
        console.log('消息已隐藏');
    }

    onWindowResize() {
        this.camera.aspect = (window.innerWidth - 300) / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth - 300, window.innerHeight);
    }

    // 清除当前模型
    clearCurrentModel() {
        console.log('开始清除当前模型...');
        
        if (this.currentModel) {
            // 从场景中移除模型
            this.scene.remove(this.currentModel);
            
            // 释放模型资源
            this.currentModel.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => {
                                if (material.map) material.map.dispose();
                                material.dispose();
                            });
                        } else {
                            if (child.material.map) child.material.map.dispose();
                            child.material.dispose();
                        }
                    }
                }
            });
            
            this.currentModel = null;
            console.log('模型已从场景中移除');
        }
        
        // 清除贴图
        this.loadedTextures.forEach((texture, fileName) => {
            texture.dispose();
        });
        this.loadedTextures.clear();
        console.log('贴图已清除');
        
        // 重置信息面板
        this.resetModelInfo();
        
        // 重置缩放滑块
        const modelScale = document.getElementById('modelScale3D');
        if (modelScale) {
            modelScale.value = 1;
        }
        
        // 重置线框模式
        this.wireframe = false;
        
        // 重置自动旋转
        this.autoRotate = false;
        if (this.controls) {
            this.controls.autoRotate = false;
        }
        
        this.showSuccess('模型已清除');
        console.log('模型清除完成');
    }

    // 重置模型信息面板
    resetModelInfo() {
        const modelNameEl = document.getElementById('modelName3D');
        const vertexCountEl = document.getElementById('vertexCount3D');
        const faceCountEl = document.getElementById('faceCount3D');
        const materialCountEl = document.getElementById('materialCount3D');
        const textureCountEl = document.getElementById('textureCount3D');
        const uvInfoEl = document.getElementById('uvInfo3D');
        const texturePanel = document.getElementById('texturePanel3D');
        const textureList = document.getElementById('textureList3D');

        if (modelNameEl) modelNameEl.textContent = '未加载';
        if (vertexCountEl) vertexCountEl.textContent = '0';
        if (faceCountEl) faceCountEl.textContent = '0';
        if (materialCountEl) materialCountEl.textContent = '0';
        if (textureCountEl) textureCountEl.textContent = '0';
        if (uvInfoEl) uvInfoEl.textContent = '检测中...';
        
        if (texturePanel) texturePanel.style.display = 'none';
        if (textureList) textureList.innerHTML = '';
        
        console.log('模型信息面板已重置');
    }

    initDistanceTracking() {
        // 初始化相机位置
        this.lastCameraPosition = this.camera.position.clone();
    }

    limitCameraDownwardMovement() {
        // 计算从初始位置向下移动的距离（基于目标点）
        const downwardDistance = this.initialTargetY - this.controls.target.y;
        
        // 如果超过最大向下移动距离，强制调整目标点Y坐标
        if (downwardDistance > this.maxDownwardDistance) {
            const maxAllowedTargetY = this.initialTargetY - this.maxDownwardDistance;
            this.controls.target.y = maxAllowedTargetY;
            this.controls.update();
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.controls) {
            this.controls.dispose();
        }
    }
}

// 页面加载完成后初始化