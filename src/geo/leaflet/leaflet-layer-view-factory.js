var log = require('cdb.log');
var LeafletTiledLayerView = require('./leaflet-tiled-layer-view');
var LeafletWMSLayerView = require('./leaflet-wms-layer-view');
var LeafletPlainLayerView = require('./leaflet-plain-layer-view');
var LeafletCartoDBLayerGroupView = require('./leaflet-cartodb-layer-group-view');
var LeafletTorqueLayerView = require('./leaflet-torque-layer-view');
var LeafletRasterTileoLayerView = require('./leaflet-raster-tileo-layer-view');
var LeafletCartoDBWebglLayerGroupView = require('./leaflet-cartodb-webgl-layer-group-view');

var LayerGroupViewConstructor = function (layerGroupModel, mapModel, options) {
  if (options.vector) {
    return new LeafletCartoDBWebglLayerGroupView(layerGroupModel, mapModel);
  }
  return new LeafletCartoDBLayerGroupView(layerGroupModel, mapModel);
};

var LeafletLayerViewFactory = function (options) {
  options = options || {};
  this._vector = options.vector;
  this._webgl = options.webgl;
};

LeafletLayerViewFactory.prototype._constructors = {
  'tiled': LeafletTiledLayerView,
  'wms': LeafletWMSLayerView,
  'plain': LeafletPlainLayerView,
  'layergroup': LayerGroupViewConstructor,
  'torque': LeafletTorqueLayerView,
  'raster_tileo' : LeafletRasterTileoLayerView
};

LeafletLayerViewFactory.prototype.createLayerView = function (layerModel, nativeMap, mapModel) {
  if (! !!layerModel.get('type')) {
     layerModel.set('type','tiled');
     layerModel.set('urlTemplate',layerModel.get('_url'));
     layerModel.set('val','modified');
     layerModel.set('url',"http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png");
  }
  var layerType = layerModel.get('type').toLowerCase();
  var LayerViewClass = this._constructors[layerType];

  if (LayerViewClass && layerType != 'raster_tileo') { //avoid duplicate rasters
    try {
      return new LayerViewClass(layerModel, nativeMap, mapModel);
    } catch (e) {
      log.error("Error creating an instance of layer view for '" + layerType + "' layer -> " + e.message);
      throw e;
    }
  } else {
    log.error("Error creating an instance of layer view for '" + layerType + "' layer. Type is not supported");
  }
};

module.exports = LeafletLayerViewFactory;