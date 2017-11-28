"use strict";

/** 硅谷中心坐标，也是这个项目的起始坐标 */
var start_point = { lat: 37.387474, lng: -122.057543 };

//const wikipedia_api_url = "http://zh.wikipedia.org/w/api.php?&action=query&titles=%E7%A1%85%E8%B0%B7&format=json&prop=revisions&rvprop=content";

var wikipedia_api_url = "https://free-api.heweather.com/s6/weather/forecast?location=%E5%9C%A3%E4%BD%95%E5%A1%9E&key=7959b2d195af4b38a2afe26eccd7493f&lang=cn&unit=m";

var map = void 0;

/**
 * 初始话地图，是由google map API在加载完成后直接调用
 */
function initMap() {
    // Constructor creates a new map - only center and zoom are required.
    map = new google.maps.Map($('#map').get(0), {
        center: start_point,
        styles: mapstyles,
        zoom: 9,
        mapTypeControl: false
    });

    /** 启动 knockoutjs 的 MVVM 模式*/
    ko.applyBindings(new ViewModel());
}

var ViewModel = function ViewModel() {
    var self = this;

    /** 绑定输入框 */
    this.current = ko.observable();
    /** 绑定是否显示poi图标复选框 */
    this.use_poi_icon = ko.observable();
    /** 绑定搜索结果列表 */
    this.markers = ko.observableArray([]);

    /** 地图中的弹出框 */
    this.infoWindow = new google.maps.InfoWindow();

    /** 中心点标记 */
    this.centerMarker = new google.maps.Marker({
        position: start_point,
        title: "硅谷",
        animation: google.maps.Animation.DROP,
        id: 1
    });

    /** ViewModel类的启动函数 */
    (function () {
        map.addListener('bounds_changed', function () {
            var autocomplete = new google.maps.places.Autocomplete($('#search-place').get(0), { bounds: map.getBounds() });
            autocomplete.addListener('place_changed', function () {
                var place = autocomplete.getPlace();
                self.searchPlaces(place.formatted_address);
            });
        });

        self.centerMarker.addListener('click', function () {
            self.showCenterInfoWindow(self.centerMarker, self.infoWindow);
        });

        self.centerMarker.setMap(map);
    })();

    /**
     * 显示 中心点标记 的弹出框，调用第三方API
     */
    this.showCenterInfoWindow = function (marker, infoWindow) {
        if (infoWindow.marker != marker) {
            infoWindow.marker = marker;

            var html = "<div><h1>\u7845\u8C37-\u5929\u6C14</h1><br><p>\u6B63\u5728\u83B7\u53D6\u6570\u636E </p></div>";
            infoWindow.setContent(html);
            infoWindow.open(map, marker);

            fetch(wikipedia_api_url).then(function (response) {
                return response.json();
            }).then(function (obj) {
                forecast = obj.HeWeather6[0].daily_forecast;

                html = "<div><h1>\u7845\u8C37-\u5929\u6C14</h1><ul>";
                forecast.forEach(function (f) {
                    html += "<li>" + f.date + ": \u767D\u5929" + f.cond_txt_d + "\uFF0C\u665A\u4E0A" + f.cond_txt_n + " \u6700\u4F4E" + f.tmp_min + "\u6444\u6C0F\u5EA6 \u6700\u9AD8" + f.tmp_max + "\u6444\u6C0F\u5EA6 " + f.wind_dir + " " + f.wind_sc + "</li>";
                });
                html += "</ul></div>";
                console.log(html);

                infoWindow.setContent(html);
            }).catch(function (error) {
                // 获取错误
                console.error(error);
                html = "<div>" + "<h1>\u7845\u8C37-\u5929\u6C14</h1><br><p>\u83B7\u53D6\u9519\u8BEF: </p>" + ("<span>" + error + "</span>") + "</div>";
                infoWindow.setContent(html);
            });
            infoWindow.addListener('closeclick', function () {
                infoWindow.marker = null;
            });
        }
    };

    /**
     * 搜索地址
     */
    this.search = function () {
        var address = this.current().trim();
        if (address) {
            self.searchPlaces(address);
        }
    };

    this.searchPlaces = function (address) {
        if (address == null) {
            address = $('#search-place').get(0).value;
        }
        if (address.length = 0) {
            window.alert('You must enter an address.');
            return;
        }
        self.clearMarkers();
        var bounds = map.getBounds();
        var placesService = new google.maps.places.PlacesService(map);
        placesService.textSearch({
            query: address,
            bounds: bounds
        }, function (results, status) {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                self.createMarkersForPlaces(results);
            }
        });
    };

    /**
     * 给搜索出来的地址，在地图中添加标记
     * @param {*} places 
     */

    this.createMarkersForPlaces = function (places) {
        var bounds = new google.maps.LatLngBounds();

        var _loop = function _loop(i) {
            var place = places[i];
            var marker = void 0;
            if (self.use_poi_icon()) {
                // 地图标记的时候，显示POI图标
                marker = new google.maps.Marker({
                    map: map,
                    icon: {
                        url: place.icon,
                        size: new google.maps.Size(35, 35),
                        origin: new google.maps.Point(0, 0),
                        anchor: new google.maps.Point(15, 34),
                        scaledSize: new google.maps.Size(25, 25)
                    },
                    title: place.name,
                    position: place.geometry.location,
                    id: place.place_id
                });
            } else {
                // 地图标记的时候，显示Google地图默认图标
                marker = new google.maps.Marker({
                    map: map,
                    title: place.name,
                    position: place.geometry.location,
                    id: place.place_id
                });
            }

            // 设置每个点点击弹出详细内容
            marker.addListener('click', function () {
                self.populateInfoWindow(marker, self.infoWindow);
            });
            self.markers.push(marker);
            if (place.geometry.viewport) {
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        };

        for (var i = 0; i < places.length; i++) {
            _loop(i);
        }
        map.fitBounds(bounds);
    };

    /**
     * 清楚所有标记和弹出框
     */
    this.clearMarkers = function () {
        console.log('clearMarkers');
        self.markers().forEach(function (marker) {
            return marker.setMap(null);
        });
        self.markers.removeAll();

        self.centerMarker.setMap(null);
    };

    /**
     * 绑定knockoutjs里面 当用户点击地址列表中的一项时
     *  @param {google.maps.Marker} marker 用户点击的项对应地图中的哪一个标记
     */
    this.showPlaceInfo = function (marker) {
        google.maps.event.trigger(marker, 'click');
        $('#nav').removeClass('open');
    }.bind(this);

    /**
     * 
     * @param {google.maps.Marker} marker  需要弹出详细内容的标记
     * @param {google.maps.InfoWindow} infoWindow  弹出框对象
     */

    this.populateInfoWindow = function (marker, infoWindow) {
        if (infoWindow.marker != marker) {
            infoWindow.marker = marker;

            var service = new google.maps.places.PlacesService(map);
            service.getDetails({
                placeId: marker.id
            }, function (place, status) {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    // 设置弹出框的内容
                    var html = '<div>';
                    if (place.name) {
                        html += "<strong>" + place.name + "</strong>";
                    }
                    if (place.formatted_address) {
                        html += "<br>" + place.adr_address;
                    }
                    if (place.formatted_phone_number) {
                        html += "<br>" + place.formatted_phone_number;
                    }
                    if (place.photos) {
                        html += "<br><br><img src=\"" + place.photos[0].getUrl({ maxHeight: 100, maxWidth: 200 }) + "\">";
                    }
                    html += '</div>';
                    infoWindow.setContent(html);
                    infoWindow.open(map, marker);
                }
            });
            infoWindow.addListener('closeclick', function () {
                return infoWindow.marker = null;
            });
        }
    };

    /**
     * 用户在移动模式下点击了 是否开启导航栏
     */
    this.toggleNav = function () {
        $('#nav').toggleClass('open');
        event.stopPropagation();
    };
};