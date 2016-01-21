var _ = require('underscore');
var log = require('cdb.log');
var MapView = require('../map-view');
var Projector = require('./projector');
var PointView = require('./gmaps-point-view');
var PathView = require('./gmaps-path-view');

var GoogleMapsMapView = MapView.extend({

  initialize: function() {
    _.bindAll(this, '_ready');
    this._isReady = false;
    var self = this;

    MapView.prototype.initialize.call(this);

    var bounds = this.map.getViewBounds();

    if (bounds) {
      this.showBounds(bounds);
    }

    var center = this.map.get('center');

    if (!this.isMapAlreadyCreated()) {

      this.map_googlemaps = new google.maps.Map(this.el, {
        center: new google.maps.LatLng(center[0], center[1]),
        zoom: this.map.get('zoom'),
        minZoom: this.map.get('minZoom'),
        maxZoom: this.map.get('maxZoom'),
        disableDefaultUI: true,
        scrollwheel: this.map.get("scrollwheel"),
        draggable: this.map.get("drag"),
        disableDoubleClickZoom: !this.map.get("drag"),
        mapTypeControl:false,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        backgroundColor: 'white',
        tilt: 0
      });

      this.map.bind('change:maxZoom', function() {
        self.map_googlemaps.setOptions({ maxZoom: self.map.get('maxZoom') });
      }, this);

      this.map.bind('change:minZoom', function() {
        self.map_googlemaps.setOptions({ minZoom: self.map.get('minZoom') });
      }, this);

    } else {

      this.map_googlemaps = this.options.map_object;
      this.setElement(this.map_googlemaps.getDiv());

      // fill variables
      var c = self.map_googlemaps.getCenter();

      self._setModelProperty({ center: [c.lat(), c.lng()] });
      self._setModelProperty({ zoom: self.map_googlemaps.getZoom() });

      // unset bounds to not change mapbounds
      self.map.unset('view_bounds_sw', { silent: true });
      self.map.unset('view_bounds_ne', { silent: true });

    }


    google.maps.event.addListener(this.map_googlemaps, 'center_changed', function() {
      var c = self.map_googlemaps.getCenter();
      self._setModelProperty({ center: [c.lat(), c.lng()] });
    });

    google.maps.event.addListener(this.map_googlemaps, 'zoom_changed', function() {
      self._setModelProperty({
        zoom: self.map_googlemaps.getZoom()
      });
    });

    google.maps.event.addListener(this.map_googlemaps, 'click', function(e) {
      self.trigger('click', e, [e.latLng.lat(), e.latLng.lng()]);
    });

    google.maps.event.addListener(this.map_googlemaps, 'dragend', function(e) {
      var c = self.map_googlemaps.getCenter();
      self.trigger('dragend', e, [c.lat(), c.lng()]);
    });

    google.maps.event.addListener(this.map_googlemaps, 'dblclick', function(e) {
      self.trigger('dblclick', e);
    });

    this.map.geometries.bind('add', this._addGeometry, this);
    this.map.geometries.bind('remove', this._removeGeometry, this);

    this._bindModel();
    this._addLayers();
    this.setAttribution();

    this.projector = new Projector(this.map_googlemaps);

    this.projector.draw = this._ready;
  },

  _ready: function() {
    this.projector.draw = function() {};
    this.trigger('ready');
    this._isReady = true;
  },

  _setKeyboard: function(model, z) {
    this.map_googlemaps.setOptions({ keyboardShortcuts: z });
  },

  _setScrollWheel: function(model, z) {
    this.map_googlemaps.setOptions({ scrollwheel: z });
  },

  _setZoom: function(model, z) {
    z = z || 0;
    this.map_googlemaps.setZoom(z);
  },

  _setCenter: function(model, center) {
    var c = new google.maps.LatLng(center[0], center[1]);
    this.map_googlemaps.setCenter(c);
  },

  _getNativeMap: function () {
    return this.map_googlemaps;
  },

  _addLayerToMap: function(layerView, layerModel, opts) {
    if (layerView) {
      var isBaseLayer = _.keys(this.layers).length === 1 || (opts && opts.index === 0) || layerModel.get('order') === 0;
      // set base layer
      if(isBaseLayer) {
        var m = layerView.model;
        if(m.get('type') !== 'GMapsBase') {
          layerView.isBase = true;
        }
      } else {
        // TODO: Make sure this order will be right
        var idx = layerModel.get('order');
        if (layerView.getTile) {
          if (!layerView.gmapsLayer) {
            log.error("gmaps layer can't be null");
          }
          this.map_googlemaps.overlayMapTypes.setAt(idx, layerView.gmapsLayer);
        } else {
          layerView.gmapsLayer.setMap(this.map_googlemaps);
        }
      }
      if (opts === undefined || !opts.silent) {
        this.trigger('newLayerView', layerView, layerModel, this);
      }
    } else {
      log.error("layer type not supported");
    }

    return layerView;
  },

  pixelToLatLon: function(pos) {
    var latLng = this.projector.pixelToLatLng(new google.maps.Point(pos[0], pos[1]));
    return {
      lat: latLng.lat(),
      lng: latLng.lng()
    }
  },

  latLonToPixel: function(latlon) {
    return this.projector.latLngToPixel(new google.maps.LatLng(latlon[0], latlon[1]));
  },

  getSize: function() {
    return {
      x: this.$el.width(),
      y: this.$el.height()
    };
  },

  panBy: function(p) {
    var c = this.map.get('center');
    var pc = this.latLonToPixel(c);
    p.x += pc.x;
    p.y += pc.y;
    var ll = this.projector.pixelToLatLng(p);
    this.map.setCenter([ll.lat(), ll.lng()]);
  },

  getBounds: function() {
    if(this._isReady) {
      var b = this.map_googlemaps.getBounds();
      var sw = b.getSouthWest();
      var ne = b.getNorthEast();
      return [
        [sw.lat(), sw.lng()],
        [ne.lat(), ne.lng()]
      ];
    }
    return [ [0,0], [0,0] ];
  },

  setAttribution: function() {
    // There is no control over Google Maps attribution component, so we can't add
    // any attribution text there (if Map is already created using createLayer for example)
    // and there is no CartoDB attribution component.
  },

  setCursor: function(cursor) {
    this.map_googlemaps.setOptions({ draggableCursor: cursor });
  },

  _addGeomToMap: function(geom) {
    var geo = GoogleMapsMapView.createGeometry(geom);
    if(geo.geom.length) {
      for(var i = 0 ; i < geo.geom.length; ++i) {
        geo.geom[i].setMap(this.map_googlemaps);
      }
    } else {
        geo.geom.setMap(this.map_googlemaps);
    }
    return geo;
  },

  _removeGeomFromMap: function(geo) {
    if(geo.geom.length) {
      for(var i = 0 ; i < geo.geom.length; ++i) {
        geo.geom[i].setMap(null);
      }
    } else {
      geo.geom.setMap(null);
    }
  },

  getNativeMap: function() {
    return this.map_googlemaps;
  },

  invalidateSize: function() {
    google.maps.event.trigger(this.map_googlemaps, 'resize');
  }

}, {

  addLayerToMap: function(layer, map, pos) {
    pos = pos || 0;
    if (!layer) {
      log.error("gmaps layer can't be null");
    }
    if (layer.getTile) {
      map.overlayMapTypes.setAt(pos, layer);
    } else {
      layer.setMap(map);
    }
  },

  /**
   * create the view for the geometry model
   */
  createGeometry: function(geometryModel) {
    if(geometryModel.isPoint()) {
      return new PointView(geometryModel);
    }
    return new PathView(geometryModel);
  }
});

module.exports = GoogleMapsMapView;
