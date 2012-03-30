/* Globals */

var ART = {};

ART.routers = {};
ART.views = {};
ART.templates = {};
ART.settings = {};
ART.utils = {};

/* Settings */

ART.settings.fusion_table_id = "1OHO4HXJyZNjKiGDrG_Mmdp-NTTmNE9lhkBPOMwk";

/* Utility functions */

ART.utils.dict_zip = function(keys, values) {
    var obj = {};

    _.each(keys, function(k, i) {
        obj[k] = values[i];
    });

    return obj;
}

/* Routers */

ART.routers.index = Backbone.Router.extend({
    routes: {
        "":             "home",
        "map":          "map",
        "list":         "list",
        "art/:id":      "art"
    },

    initialize: function(options) {
        this.root_view = options.root_view;
    },

    home: function() { this.root_view.goto_home(); },
    map: function() { this.root_view.goto_map(); },
    list: function() { this.root_view.goto_list(); },
    art: function(id) { this.root_view.goto_art(id); }
});

/* Views */

ART.views.root = Backbone.View.extend({
    views: {},

    current_content_view: null,

    initialize: function() {
        // Bind local methods
        _.bindAll(this);

        return this;
    },

    get_or_create_view: function(name, options) {
        /*
         * Register each view as it is created and never create more than one.
         */
        if (name in this.views) {
            return this.views[name];
        }

        this.views[name] = new ART.views[name](options);

        return this.views[name];
    },

    goto_home: function() {
        this.current_content_view = this.get_or_create_view("home");
        this.current_content_view.reset();
    },
    
    goto_map: function() {
        this.current_content_view = this.get_or_create_view("map");
        this.current_content_view.reset();
    },
    
    goto_list: function() {
        this.current_content_view = this.get_or_create_view("list");
        this.current_content_view.reset();
    },

    goto_art: function(id) {
        this.current_content_view = this.get_or_create_view("art");
        this.current_content_view.reset(id);
    }
});

ART.views.home = Backbone.View.extend({
    initialize: function(options) {
        _.bindAll(this);
        
        this.render();
    },

    reset: function() {
        $(".page").hide();
        $("#home").show();
    },

    render: function() {
    }
});

ART.views.map = Backbone.View.extend({
    map: null,
    base_layer: new L.StamenTileLayer("terrain"),

    initialize: function(options) {
        _.bindAll(this);
        
        this.render();
    },

    reset: function() {
        $(".page").hide();
        $("#map").show();

        this.map.invalidateSize();
    },

    render: function() {
        var context = {};

        //$("#container").html(ART.templates.map(context));
        
        this.map = new L.Map('map', { minZoom:13, maxZoom:20 });
        this.map.setView(new L.LatLng(32.33523, -95.3011), 13);
        this.map.addLayer(this.base_layer);

        $.ajax("https://www.google.com/fusiontables/api/query?sql=SELECT * FROM " + ART.settings.fusion_table_id, {
            "async": false,
            "dataType": "jsonp",
            "jsonp": "jsonCallback",
            "success": _.bind(function(data, textStatus, xhr) {
                var columns = data["table"]["cols"];
                var rows = data["table"]["rows"];

                _.each(rows, _.bind(function(row) {   
                    var data = ART.utils.dict_zip(columns, row);
                    var latlng = new L.LatLng(data["latitude"], data["longitude"]);

                    var marker = new L.CircleMarker(latlng, {
                        radius: 8,
                        fillColor: "#ff7800",
                        color: "#000",
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    });

                    marker.on("click", _.bind(function(e) {
                        this.on_feature_clicked(e.target, data); 
                    }, this));

                    this.map.addLayer(marker);
                }, this));
            }, this)
        });
    },
    
    on_feature_clicked: function(feature, data) {
        alert(data["name"]);
    }
});

ART.views.list = Backbone.View.extend({
});

ART.views.art = Backbone.View.extend({
});


