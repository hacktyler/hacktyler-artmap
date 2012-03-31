/* Globals */

var ART = {};

ART.routers = {};
ART.models = {};
ART.collections = {};
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

/* Wrapper for jQuery.ajax fusion table query. 
 *  Parameters:
 *    query: The query string. Use %t as the table name, the function will 
 *           perform the appropriate substitution.
 *    callback: Callback function with data parameter available.
 *  
 *  You'll need to use _.bind to enforce your desired context.
 * 
 *  Example:
 *   ART.utils.query("SELECT * FROM %t", _.bind(function(data){
 *       this.do_something_with(data);
 *   }, this));
*/
ART.utils.query = function(query, callback){
  
  // Replace %t with the fusion table
  queryString = query.replace("%t", ART.settings.fusion_table_id); 
  queryURL = "https://www.google.com/fusiontables/api/query?sql=" + queryString;

  $.ajax(queryURL, {
      "dataType": "jsonp",
      "jsonp": "jsonCallback",
      "success": function(data, textStatus, xhr) {
          var columns = data["table"]["cols"];
          var rows = data["table"]["rows"];

          var data = _.map(rows, function(row) {
              return ART.utils.dict_zip(columns, row);
          });

          // Fire the callback with the data available
          callback(data);
      }
  });
}

/* Routers */

ART.routers.index = Backbone.Router.extend({
    routes: {
        "":             "home",
        "map":          "map",
        "map/:slug":    "map",
        "list":         "list",
        "art/:slug":    "art"
    },

    initialize: function(options) {
        this.root_view = options.root_view;
    },

    home: function() { this.root_view.goto_home(); },
    map: function(slug) { this.root_view.goto_map(slug); },
    list: function() { this.root_view.goto_list(); },
    art: function(slug) { this.root_view.goto_art(slug); }
});

/* Models */

ART.models.artwork = Backbone.Model.extend({});

/* Collections */

ART.collections.artworks = Backbone.Collection.extend({
    model: ART.models.artwork
});

/* Views */

ART.views.root = Backbone.View.extend({
    views: {},

    current_content_view: null,
    artwork_collection: new ART.collections.artworks(),

    initialize: function() {
        // Bind local methods
        _.bindAll(this);
        
        this.artwork_collection.bind("reset", this.refresh_view, this);
        this.refresh_artwork();

        return this;
    },

    refresh_artwork: function() {

    		var reset_artwork = _.bind(function(data){
        		this.artwork_collection.reset(data);
				}, this);

        ART.utils.query("SELECT * FROM %t", reset_artwork);
    },

    refresh_view: function() {
        this.current_content_view.refresh();
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

    switch_page: function(id) {
        $(".page").hide();
        $("#" + id).show();
    },

    goto_home: function() {
        this.current_content_view = this.get_or_create_view("home");
        this.switch_page("home");
        this.current_content_view.reset();
    },
    
    goto_map: function(slug) {
        this.current_content_view = this.get_or_create_view("map", {
            artwork_collection: this.artwork_collection
        });
        this.switch_page("map");
        this.current_content_view.reset(slug);
    },
    
    goto_list: function() {
        this.current_content_view = this.get_or_create_view("list", {
            artwork_collection: this.artwork_collection
        });
        this.switch_page("list");
        this.current_content_view.reset();
    },

    goto_art: function(slug) {
        this.current_content_view = this.get_or_create_view("art", {
            artwork_collection: this.artwork_collection
        });
        this.switch_page("art");
        this.current_content_view.reset(slug);
    }
});

ART.views.home = Backbone.View.extend({
    initialize: function(options) {
        _.bindAll(this);
        
        this.render();
    },

    reset: function() {
    },

    refresh: function() {
    },

    render: function() {
    }
});

ART.views.map = Backbone.View.extend({
    artwork_collection: null,

    slug: null,
    map: null,
    marker_group: new L.LayerGroup(),
    base_layer: new L.StamenTileLayer("terrain"),

    initialize: function(options) {
        _.bindAll(this);

        this.artwork_collection = options.artwork_collection;
        
        this.render();
    },

    reset: function(slug) {
        this.slug = slug;
        this.refresh();
    },

    refresh: function() {
        this.map.invalidateSize();
        this.render_artwork();

        if (this.slug) {
            var artwork = this.artwork_collection.find(function(a) {
                return a.get("slug") == this.slug;
            }, this);

            if (artwork) {
                this.map.setView(new L.LatLng(artwork.get("latitude"), artwork.get("longitude")), 16);
            }
        }
    },

    render: function() {
        this.map = new L.Map("map-canvas", { minZoom:13, maxZoom:20 });
        this.map.setView(new L.LatLng(32.33523, -95.3011), 13);
        this.map.addLayer(this.base_layer);
        this.map.addLayer(this.marker_group);
    },

    render_artwork: function() {
        this.marker_group.clearLayers();

        this.artwork_collection.each(function(artwork) {   
            var latlng = new L.LatLng(artwork.get("latitude"), artwork.get("longitude"));

            var marker = new L.CircleMarker(latlng, {
                radius: 8,
                fillColor: "#ff7800",
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });

            marker.on("click", _.bind(function(e) {
                window.ArtRouter.navigate("#art/" + artwork.get("slug"), true);
            }, this));

            this.marker_group.addLayer(marker);
        }, this);
    },
});

ART.views.list = Backbone.View.extend({
    artwork_collection: null,

    initialize: function(options) {
        _.bindAll(this);

        this.artwork_collection = options.artwork_collection;
        
        this.render();
    },

    reset: function() {
        this.refresh();
    },

    refresh: function() {
        this.render_list();
    },

    render: function() {
        this.render_list();
    },

    render_list: function() {
        artwork_list = $("#artwork-list")
        artwork_list.empty();

        this.artwork_collection.each(function(artwork) {
            artwork_list.append(ART.templates["artwork-list-item"](artwork.toJSON()));
        });
    }
});

ART.views.art = Backbone.View.extend({
    slug: null,
    artwork_collection: null,
    artwork: null,

    initialize: function(options) {
        _.bindAll(this);

        this.artwork_collection = options.artwork_collection;
    },

    reset: function(slug) {
        this.slug = slug;
        this.refresh();
    },

    refresh: function() {
        if (this.slug) {
            this.artwork = this.artwork_collection.find(function(a) {
                return a.get("slug") == this.slug;
            }, this);

            if (!this.artwork) {
                return;
            }

            this.render();
        }
    },

    render: function() {
        var context = {};

        $("#art").html(ART.templates.artwork(this.artwork.toJSON()));
    }
});

