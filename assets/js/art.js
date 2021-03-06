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
ART.settings.default_coords = new L.LatLng(32.33523, -95.3011);
ART.settings.default_zoom = 13;
ART.settings.artwork_zoom = 18;

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
      "beforeSend" : function(xhr, settings){
          $("#loading").show();
      },
      "success": function(data, textStatus, xhr) {
          var columns = data["table"]["cols"];
          var rows = data["table"]["rows"];

          var data = _.map(rows, function(row) {
              return ART.utils.dict_zip(columns, row);
          });

          $("#loading").hide();
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
        "art/:slug":    "art",
        "contact":      "contact"
    },

    initialize: function(options) {
        this.root_view = options.root_view;
    },

    home: function() { this.root_view.goto_home(); },
    map: function(slug) { this.root_view.goto_map(slug); },
    list: function() { this.root_view.goto_list(); },
    art: function(slug) { this.root_view.goto_art(slug); },
    contact: function() { this.root_view.goto_contact(); }
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

        ART.utils.query("SELECT * FROM %t ORDER BY title", reset_artwork);
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

   /*
     * Get a view for a page and display it
     * Parameters:
     *  id: div ID. By convention in this project, the id also == the route.
     *  options: (optional) options to pass to the get_or_create_view function
     *  
     * Additional arguments passed to this function will be passed to
     * current_content_view.reset. 
     */
    switch_page: function(id, options) {

        // Set options to an empty object for consistency if not provided.
        options = options || {}

        // Get the view
        this.current_content_view = this.get_or_create_view(id, options);

        // Display the view div before we attempt to render into it
        $(".page").hide();
        $("#" + id).show();

        // Get all but the first two arguments, and store it in args
        var args = Array.prototype.slice.call(arguments).slice(2);  
        this.current_content_view.reset.apply(this, args);
    },

    goto_home: function() {
        this.switch_page("home");
    },
    
    goto_map: function(slug) {
        var opts = {
          artwork_collection: this.artwork_collection
        };

        this.switch_page("map", opts, slug);
    },
    
    goto_list: function() {
        var opts = {
          artwork_collection: this.artwork_collection
        };

        this.switch_page("list", opts);
    },

    goto_art: function(slug) {
        var opts = {
          artwork_collection: this.artwork_collection
        };

        this.switch_page("art", opts, slug);
    },

    goto_contact: function() {
        this.switch_page("contact");
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
    clusterer: null,
    base_layer: new L.StamenTileLayer("terrain"),

    initialize: function(options) {
        _.bindAll(this);

        // Recalculate map dimensions on window resize
        $(window).resize(this.resize);

        this.artwork_collection = options.artwork_collection;
        
        this.render();
    },

    reset: function(slug) {
        this.slug = slug;
        this.refresh();
    },

    refresh: function() {
        this.resize();
        this.render_artwork();

        if (this.slug) {
            var artwork = this.artwork_collection.find(function(a) {
                return a.get("slug") == this.slug;
            }, this);

            if (artwork) {
                this.map.setView(this.art_coords(artwork), ART.settings.artwork_zoom);
            }
        }
    },

    render: function() {
        this.map = new L.Map("map-canvas", { minZoom:13, maxZoom:18 });
        this.map.setView(ART.settings.default_coords, ART.settings.default_zoom);
        this.map.addLayer(this.base_layer);

        this.clusterer = new LeafClusterer(this.map, [], { gridSize: 48 });
    },

    render_artwork: function() {
        this.clusterer.clearMarkers();

        this.artwork_collection.each(function(artwork) {   
            var latlng = this.art_coords(artwork);

            var marker = new L.Marker(latlng);

            marker.on("mouseover", function(e) {
                var description = "<em>" + artwork.get("title") + "</em>";

                // Append type to description if available
                if (artwork.get("type")){
                    description += " (" + artwork.get("type") + ")";
                }

                var popup = $("<div></div>", {
                    id: "popup-" + artwork.get("slug"),
                    html: description
                });

                popup.appendTo("#map-canvas");
            }, this);

            marker.on("mouseout", function(e) {
                $("#popup-" + artwork.get("slug")).remove();
            });

            marker.on("click", _.bind(function(e) {
                window.ArtRouter.navigate("#art/" + artwork.get("slug"), true);
            }, this));

            this.clusterer.addMarker(marker);
        }, this);
    },

    resize: function() {
        var h = $(window).height(),
        offsetTop = $(".navbar-fixed-top").height();

        $('#map-canvas').css('height', (h - offsetTop));
        this.map.invalidateSize();
    },

    art_coords: function(artwork){
      var lat = artwork.get("latitude");
      var lon = artwork.get("longitude");
      return new L.LatLng(lat,lon);
    }
});

ART.views.list = Backbone.View.extend({
    artwork_collection: null,

    initialize: function(options) {
        _.bindAll(this);

        this.artwork_collection = options.artwork_collection;
        
        this.render();

        // Make the table sortable
        $("table").stupidtable();
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

ART.views.contact = Backbone.View.extend({
    initialize: function(options) {
        _.bindAll(this);
        
        this.render();
    },

    reset: function() {
    },

    refresh: function() {
    },

    render: function() {
        var html = '<iframe src="https://docs.google.com/spreadsheet/embeddedform?formkey=dHQzMnBaRy1yenRnbGlTN1M0UVBWS1E6MQ" width="' + ($(window).width() - 40) + '" height="844" frameborder="0" marginheight="0" marginwidth="0">Loading...</iframe>'
        $("#contact-form-wrapper").html(html);
    }
});




