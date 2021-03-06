var _ = require('underscore');
var Backbone = require('backbone');

var TILED_LAYER_TYPE = 'tiled';
var CARTODB_LAYER_TYPE = 'CartoDB';
var TORQUE_LAYER_TYPE = 'torque';
var RASTER_TILEO_LAYER_TYPE = 'raster_tileo';

var Layers = Backbone.Collection.extend({

  initialize: function () {
    this.comparator = function (m) {
      return parseInt(m.get('order'), 10);
    };
    this.bind('add', this._assignIndexes);
    this.bind('remove', this._assignIndexes);
  },

  /**
   * each time a layer is added or removed
   * the index should be recalculated
   */
  _assignIndexes: function (model, col, options) {
    if (this.size() > 0) {
      // Assign an order of 0 to the first layer
      this.at(0).set({ order: 0 });

      if (this.size() > 1) {
        var layersByType = this.reduce(function (layersByType, layerModel, index) {
          var type = layerModel.get('type');
          type = (!!layerModel.attributes.layer_name && layerModel.attributes.layer_name.indexOf('_raster') > 0) ? 'CartoDB' : type;
          if (index === 0 && type === TILED_LAYER_TYPE) { return layersByType; }
          layersByType[type] = layersByType[type] || [];
          layersByType[type].push(layerModel);
          return layersByType;
        }, {});

        var lastOrder = 1;
        var sortedTypes = [TILED_LAYER_TYPE, TORQUE_LAYER_TYPE, CARTODB_LAYER_TYPE];
        _.each(sortedTypes, function (layerType) {
          var layers = layersByType[layerType] || [];
          _.each(layers, function (layerModel) {
            layerModel.set({
              order: lastOrder
            });
            lastOrder += 1;
          });
        });
      }
    }

    this.sort();
  },

  getCartoDBLayers: function () {
    return this._getLayersByType(CARTODB_LAYER_TYPE);
  },

  getCartoAndRasterLayers: function () {
    return this.select(function (layerModel) {
      return layerModel.get('type') === CARTODB_LAYER_TYPE || layerModel.get('type') == RASTER_TILEO_LAYER_TYPE;
    });
  },

  getRasterLayers: function () {
    return this._getLayersByType(RASTER_TILEO_LAYER_TYPE);
  },

  getTiledLayers: function () {
    return this._getLayersByType(TILED_LAYER_TYPE);
  },

  getTorqueLayers: function () {
    return this._getLayersByType(TORQUE_LAYER_TYPE);
  },

  _getLayersByType: function (layerType) {
    return this.select(function (layerModel) {
      return layerModel.get('type') === layerType;
    });
  },

  getLayersWithLegends: function () {
    return this.select(function (layerModel) {
      return !!layerModel.legends;
    });
  },

  moveCartoDBLayer: function (from, to) {
    if (from === to) {
      return false;
    }

    var movingLayer = this.at(from);

    if (!movingLayer || movingLayer.get('type') !== CARTODB_LAYER_TYPE && movingLayer.get('type') !== RASTER_TILEO_LAYER_TYPE) {
      return false;
    }

    this.remove(movingLayer, { silent: true });
    this.add(movingLayer, {
      at: to,
      silent: true
    });

    return movingLayer;
  }
});

module.exports = Layers;
