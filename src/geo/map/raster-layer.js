var _ = require('underscore');
var config = require('../../cdb.config');
var LayerModelBase = require('./layer-model-base');
var InfowindowTemplate = require('./infowindow-template');
var TooltipTemplate = require('./tooltip-template');
var Legends = require('./legends/legends');
window.LayerGroupCollection = {};
var ATTRIBUTES_THAT_TRIGGER_VIS_RELOAD = ['sql', 'source', 'sql_wrap', 'cartocss'];

var RasterLayer = LayerModelBase.extend({
  defaults: {
    type: 'Raster',
    attribution: config.get('cartodb_attributions')
  },

  initialize: function (attrs, options) {
    attrs = attrs || {};
    options = options || {};
    if (!options.vis) throw new Error('vis is required');

    this._vis = options.vis;
    if (attrs && attrs.cartocss) {
      this.set('initialStyle', attrs.cartocss);
    }

    // Hopefully in the future (@apercas)
      // // PUBLIC PROPERTIES
      // this.infowindow = new InfowindowTemplate(attrs.infowindow);
      // this.tooltip = new TooltipTemplate(attrs.tooltip);
      // this.unset('infowindow');
      // this.unset('tooltip');

      // this.legends = new Legends(attrs.legends, {
      //   visModel: this._vis
      // });
      // this.unset('legends');

      this.bind('change', this._onAttributeChanged, this);
      // this.infowindow.fields.bind('reset add remove', this._reloadVis, this);
      // this.tooltip.fields.bind('reset add remove', this._reloadVis, this);

    // Pretty basic raster config
    const RASTERCONFIG = {
        "version": "1.3.1",
        "layers": [
            {
                "type": "cartodb",
                "options": {
                    "sql": " SELECT * FROM " + attrs.layer_name,
                    "cartocss": "#" + attrs.layer_name + " {raster-opacity: 1}",
                    "cartocss_version": "2.3.0",
                    "geom_column": "the_raster_webmercator",
                    "geom_type": "raster"
                }
            }
        ]
    };
    this.config = RASTERCONFIG;
    this._newRasterLayer();

    LayerModelBase.prototype.initialize.apply(this, arguments);
  },

  _onAttributeChanged: function () {
    var reloadVis = _.any(ATTRIBUTES_THAT_TRIGGER_VIS_RELOAD, function (attr) {
      if (this.hasChanged(attr)) {
        if (attr === 'cartocss' && this._dataProvider) {
          return false;
        }
        return true;
      }
    }, this);

    if (reloadVis) {
      this._reloadVis();
    }
  },

  _reloadVis: function () {
    this._vis.reload({
      sourceId: this.get('id')
    });
  },

  restoreCartoCSS: function () {
    this.set('cartocss', this.get('initialStyle'));
  },

  setOpacity: function (layer_name, opacity) {
    this.set('cartocss', "#" + attrs.layer_name + " {raster-opacity: " + opacity +"}");
  },

  isVisible: function () {
    return this.get('visible');
  },

  _hasInfowindowFields: function () {
    return this.infowindow.hasFields();
  },

  _hasTooltipFields: function () {
    return this.tooltip.hasFields();
  },

  getGeometryType: function () {
    if (this._dataProvider) {
      var index = this._dataProvider._layerIndex;
      var sublayer = this._dataProvider._vectorLayerView.renderers[index];
      return sublayer.inferGeometryType();
    }
    return null;
  },

  getInteractiveColumnNames: function () {
    return ['cartodb_id'];
    return _.chain(['cartodb_id'])
      .union(this.infowindow.getFieldNames())
      .union(this.tooltip.getFieldNames())
      .uniq()
      .value();
  },

  isInfowindowEnabled: function () {
    return this.infowindow.hasTemplate();
  },

  isTooltipEnabled: function () {
    return this.tooltip.hasTemplate();
  },

  getName: function () {
    return this.get('layer_name');
  },

  setDataProvider: function (dataProvider) {
    this._dataProvider = dataProvider;
  },

  getDataProvider: function () {
    return this._dataProvider;
  },

  _newRasterLayer: function () {
    const CURRENTURI = window.location;
    var USER = '';
    if (CURRENTURI.href.split('user/').length === 2) {
      USER = CURRENTURI.href.split('user/')[1].split('/')[0];
    } else if (CURRENTURI.href.split('/u/').length == 2) {
      // organizations & domains mode
      USER = CURRENTURI.href.split('/u/')[1].split('/')[0]
    } else {
      USER = CURRENTURI.href.split('//')[1].split('/')[0].split('.')[0];
    }
    const DOMAIN  = CURRENTURI.href.split('//')[1].split('/')[0];
    const APIKEY  = this._vis.attributes.apiKey;
    const APIURL  = CURRENTURI.protocol+ "//" + DOMAIN + "/user/" + USER + "/api/v1/map";
    const SELF    = this;

    function currentEndpoint() {
      return APIURL;
    }
    function getourThis(){
      return SELF;
    }

    //based on torque.js/lib/torque/provider/windshaft.js 
    var request = new XMLHttpRequest();
    request.open('POST', currentEndpoint() + "?api_key=" + APIKEY, true);
    request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    request.onload = function() {
        if (this.status >= 200 && this.status < 400){
            const DATA      = JSON.parse(this.response);
            const SELF      = getourThis();
            const ENDPOINT  = currentEndpoint() + "/" + DATA.layergroupid + "/{z}/{x}/{y}.png?api_key=" + APIKEY;
            window.LayerGroupCollection[SELF.attributes.layer_name] = DATA.layergroupid;
         
            // store layergroupid on LayerGroupCollection but don't load the layer on the map yet
            if (SELF.attributes.visible == false) return false;
            rasterLayer = L.tileLayer(ENDPOINT, {
                maxZoom: 18
            }).addTo(SELF._vis.map);
        } else {
            throw 'Error calling server: Error ' + this.status + ' -> ' + this.response;
        }
    };
    request.send(JSON.stringify(this.config));

  }
});

module.exports = RasterLayer;
