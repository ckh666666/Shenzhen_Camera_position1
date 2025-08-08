// 深圳机位导航 - 主要功能模块
// 全局变量
var map;
var spotLayer;
var currentPosition = null;
var baseLayers = {}; // 存储基础图层
var currentMode = 'shenzhen'; // 当前模式: 'shenzhen' 或 'disney'
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
            
            // 如果是迪士尼模式且点击的是特定主题区域，显示游玩项目
            if (currentMode === 'disney' && (spotData.name === '魔雪奇缘世界' || spotData.name === '反斗奇兵大本营' || spotData.name === '迷离庄园' || spotData.name === '灰熊山谷' || spotData.name === '狮子王庆典' || spotData.name === '探险世界' || spotData.name === '奇妙梦想城堡' || spotData.name === '明日世界' || spotData.name === '幻想世界')) {
                showAttractionsList(spotData.name);
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
    
    if (currentMode === 'disney' && styleIcon) {
        // 迪士尼模式使用emoji图标
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
            text: spotData ? spotData.name : '',
            font: currentMode === 'disney' ? '11px Microsoft YaHei' : '12px Microsoft YaHei',
            fill: new ol.style.Fill({
                color: currentMode === 'disney' ? '#2c3e50' : '#2c3e50'
            }),
            stroke: new ol.style.Stroke({
                color: 'white',
                width: 2
            }),
            offsetY: currentMode === 'disney' ? -42 : -35,
            textAlign: 'center',
            maxWidth: currentMode === 'disney' ? 120 : 100
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
            map.getView().animate({
                center: ol.proj.fromLonLat(spot.coordinates),
                zoom: currentMode === 'disney' ? 17 : 15,
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
    var spot = getCurrentData().find(s => s.id === spotId);
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
    if (currentMode === 'disney') {
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
function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    var menuBtn = document.getElementById('mobileMenuBtn');
    
    sidebar.classList.toggle('active');
    menuBtn.classList.toggle('active');
    
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

// 重置视图
function resetView() {
    map.getView().setCenter(ol.proj.fromLonLat([114.085947, 22.547]));
    map.getView().setZoom(12);
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
    } else {
        currentData = spotData;
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
    
    showMessage(mode === 'disney' ? '已切换到香港迪士尼导览模式' : '已切换到深圳机位导航模式');
}

// 更新模式UI
function updateModeUI() {
    var logoTitle = document.querySelector('.logo h1');
    
    // 更新模式按钮状态（桌面端和移动端）
    var shenzhenBtn = document.getElementById('shenzhenModeBtn');
    var disneyBtn = document.getElementById('disneyModeBtn');
    var mobileSzBtn = document.getElementById('mobileSzModeBtn');
    var mobileDisneyBtn = document.getElementById('mobileDisneyModeBtn');
    
    if (currentMode === 'disney') {
        logoTitle.textContent = '香港迪士尼导览';
        document.querySelector('.search-title').textContent = '🏰 景点搜索';
        
        // 更新桌面端按钮状态
        if (shenzhenBtn && disneyBtn) {
            shenzhenBtn.classList.remove('active');
            disneyBtn.classList.add('active');
        }
        
        // 更新移动端按钮状态
        if (mobileSzBtn && mobileDisneyBtn) {
            mobileSzBtn.classList.remove('active');
            mobileDisneyBtn.classList.add('active');
        }
        
        updateDisneyFilters();
    } else {
        logoTitle.textContent = '深圳机位导航';
        document.querySelector('.search-title').textContent = '🔍 机位搜索';
        
        // 更新桌面端按钮状态
        if (shenzhenBtn && disneyBtn) {
            shenzhenBtn.classList.add('active');
            disneyBtn.classList.remove('active');
        }
        
        // 更新移动端按钮状态
        if (mobileSzBtn && mobileDisneyBtn) {
            mobileSzBtn.classList.add('active');
            mobileDisneyBtn.classList.remove('active');
        }
        
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
    
    // 生成游玩项目列表HTML
    var attractionsHtml = `
        <div class="attractions-list">
            <div class="attractions-header">
                <h3>🎠 ${areaName}游玩项目</h3>
                <p>共 ${attractions.length} 个项目</p>
            </div>
            <div class="attractions-grid">
    `;
    
    attractions.forEach(function(attraction, index) {
        // 检查开放时间，如果是"无使用时间段"则显示为关闭
        var isClosed = attraction.operatingHours === '无使用时间段' || attraction.operatingHours === '无适用时段';
        var statusColor = (attraction.status === 'available' && !isClosed) ? '#2ecc71' : '#e74c3c';
        var statusText = (attraction.status === 'available' && !isClosed) ? '开放' : '关闭';
        
        attractionsHtml += `
            <div class="attraction-card" onclick="showAttractionDetails('${attraction.id}')">
                <div class="attraction-header">
                    <h4>${attraction.name}</h4>
                    <span class="status-badge" style="background-color: ${statusColor}">${statusText}</span>
                </div>
                <div class="attraction-info">
                    <div class="info-row">
                        <span class="label">📏 身高要求:</span>
                        <span class="value">${attraction.heightRequirement}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">⏰ 开放时间:</span>
                        <span class="value">${attraction.operatingHours}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">🎯 刺激程度:</span>
                        <span class="value">${attraction.intensity}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">⭐ 评分:</span>
                        <span class="value">${attraction.rating}/5.0</span>
                    </div>
                    <div class="info-row">
                        <span class="label">⏳ 等待时间:</span>
                        <span class="value">${attraction.waitTime}</span>
                    </div>
                </div>
                <div class="attraction-description">
                    <p>${attraction.description}</p>
                </div>
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

    // 更新模态窗口内容
    document.getElementById('modalTitle').textContent = attraction.name;
    document.getElementById('modalSubtitle').textContent = '游玩项目详情';
    
    var modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <div class="attraction-details">
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