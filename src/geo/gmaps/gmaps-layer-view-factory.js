var log = require('cdb.log');
var GMapsTiledLayerView = require('./gmaps-tiled-layer-view');
var GMapsPlainLayerView = require('./gmaps-plain-layer-view');
var GMapsBaseLayerView = require('./gmaps-base-layer-view');
var GMapsCartoDBLayerGroupView = require('./gmaps-cartodb-layer-group-view');
var LeafletWMSLayerView = require('../leaflet/leaflet-wms-layer-view');

var GMapsLayerViewFactory = function () {};

GMapsLayerViewFactory.prototype.createLayerView = function (layerModel, mapModel) {
  var layerType = layerModel.get('type').toLowerCase();
  var LayerViewClass;

  if (layerType === 'tiled') {
    LayerViewClass = GMapsTiledLayerView;
  } else if (layerType === 'wms') {
    LayerViewClass = LeafletWMSLayerView;
  } else if (layerType === 'plain') {
    LayerViewClass = GMapsPlainLayerView;
  } else if (layerType === 'gmapsbase') {
    LayerViewClass = GMapsBaseLayerView;
  } else if (layerType === 'layergroup') {
    LayerViewClass = GMapsCartoDBLayerGroupView;
  } else if (layerType === 'namedmap') {
    LayerViewClass = GMapsCartoDBLayerGroupView;
  } else if (layerType === 'torque') {
    LayerViewClass = function (layer, map) {
      // TODO for now adding this error to be thrown if object is not present, since it's dependency
      // is not included in the standard bundle
      if (!cdb.geo.GMapsTorqueLayerView) {
        throw new Error('torque library must have been loaded for a torque layer to work');
      }
      return new cdb.geo.GMapsTorqueLayerView(layer, map);
    };
  }

  if (LayerViewClass) {
    try {
      return new LayerViewClass(layerModel, mapModel);
    } catch (e) {
      log.error("Error creating an instance of layer view for '" + layerType + "' layer -> " + e.message);
      throw e;
    }
  } else {
    log.error("Error creating an instance of layer view for '" + layerType + "' layer. Type is not supported");
  }
};

module.exports = GMapsLayerViewFactory;
