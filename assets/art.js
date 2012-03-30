var map;

var base_layer = new L.StamenTileLayer("terrain");
var fusion_table_id = "1OHO4HXJyZNjKiGDrG_Mmdp-NTTmNE9lhkBPOMwk";

function dict_zip(keys, values) {
    var obj = {};

    _.each(keys, function(k, i) {
        obj[k] = values[i];
    });

    return obj;
}

function on_feature_clicked(feature, data) {
    console.log(data["name"]);
}

$(document).ready(function() {
    map = new L.Map('map_canvas', { minZoom:13, maxZoom:20 });
    map.setView(new L.LatLng(32.33523, -95.3011), 13);

    map.addLayer(base_layer);
            
    $.ajax("https://www.google.com/fusiontables/api/query?sql=SELECT * FROM " + fusion_table_id, {
        "dataType": "jsonp",
        "jsonp": "jsonCallback",
        "success": function(data, textStatus, xhr) {
            var columns = data["table"]["cols"];
            var rows = data["table"]["rows"];

            _.each(rows, function(row) {   
                var data = dict_zip(columns, row);
                var latlng = new L.LatLng(data["latitude"], data["longitude"]);

                var marker = new L.CircleMarker(latlng, {
                    radius: 8,
                    fillColor: "#ff7800",
                    color: "#000",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                });

                marker.on("click", function(e) {
                    on_feature_clicked(e.target, data); 
                });

                map.addLayer(marker);
            });
        }
    });
});
