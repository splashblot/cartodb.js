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
    if (!options.engine) throw new Error('engine is required');

    this._engine = options.engine;
    if (attrs && attrs.cartocss) {
      this.set('initialStyle', attrs.cartocss);
    }
    
    if (attrs.source) {
      this.setSource(attrs.source);
    }

    // Hopefully in the future (@apercas) => legends ✓
      // PUBLIC PROPERTIES
      this.infowindow = new InfowindowTemplate(attrs.infowindow);
      this.tooltip = new TooltipTemplate(attrs.tooltip);
      this.unset('infowindow');
      this.unset('tooltip');

      this.legends = new Legends(attrs.legends, {
        engine: this._engine
      });
      this.unset('legends');

      this.bind('change', this._onAttributeChanged, this);
      this.infowindow.fields.bind('reset add remove', this._reloadVis, this);
      this.tooltip.fields.bind('reset add remove', this._reloadVis, this);


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
    this._engine.reload({
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

 getSourceId: function () {
    var source = this.getSource();
    return source && source.id;
  },

  getSource: function () {
    return this.get('source');
  },

  setSource: function (newSource, options) {
    if (this.getSource()) {
      this.getSource().unmarkAsSourceOf(this);
    }
    newSource.markAsSourceOf(this);
    this.set('source', newSource, options);
  },

  isInteractive: function () {
    // By default it has one field (cartodb_id)
    // return this.getInteractiveColumnNames().length > 1;
    return false;
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
});

module.exports = RasterLayer;