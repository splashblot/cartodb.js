var log = require('cdb.log');
var LeafletTiledLayerView = require('./leaflet-tiled-layer-view');
var LeafletWMSLayerView = require('./leaflet-wms-layer-view');
var LeafletPlainLayerView = require('./leaflet-plain-layer-view');
var LeafletGmapsTiledLayerView = require('./leaflet-gmaps-tiled-layer-view');
var LeafletCartoDBLayerGroupView = require('./leaflet-cartodb-layer-group-view');

var LeafletLayerViewFactory = function () {};

LeafletLayerViewFactory.prototype.createLayerView = function (layerModel, mapModel) {
  var layerType = layerModel.get('type').toLowerCase();
  var LayerViewClass;

  if (layerType === 'tiled') {
    LayerViewClass = LeafletTiledLayerView;
  } else if (layerType === 'wms') {
    LayerViewClass = LeafletWMSLayerView;
  } else if (layerType === 'plain') {
    LayerViewClass = LeafletPlainLayerView;
  } else if (layerType === 'gmapsbase') {
    LayerViewClass = LeafletGmapsTiledLayerView;
  } else if (layerType === 'layergroup') {
    LayerViewClass = LeafletCartoDBLayerGroupView;
  } else if (layerType === 'namedmap') {
    LayerViewClass = LeafletCartoDBLayerGroupView;
  } else if (layerType === 'torque') {
    LayerViewClass = function (layer, map) {
      // TODO for now adding this error to be thrown if object is not present, since it's dependency
      // is not included in the standard bundle
      if (!cdb.geo.LeafletTorqueLayer) {
        throw new Error('torque library must have been loaded for a torque layer to work');
      }
      return new cdb.geo.LeafletTorqueLayer(layer, map);
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

module.exports = LeafletLayerViewFactory;
