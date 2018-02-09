var log = require('cdb.log');
var LeafletTiledLayerView = require('./leaflet-tiled-layer-view');
var LeafletWMSLayerView = require('./leaflet-wms-layer-view');
var LeafletPlainLayerView = require('./leaflet-plain-layer-view');
var LeafletCartoDBLayerGroupView = require('./leaflet-cartodb-layer-group-view');
var LeafletTorqueLayerView = require('./leaflet-torque-layer-view');
var LeafletRasterTileoLayerView = require('./leaflet-raster-tileo-layer-view');
var RenderModes = require('../../geo/render-modes');

var LayerGroupViewConstructor = function (layerGroupModel, opts) {
  opts = opts || {};
  if (opts.mapModel.get('renderMode') === RenderModes.VECTOR) {
    console.warn('Vector rendering is not supported anymore');
  }
  return new LeafletCartoDBLayerGroupView(layerGroupModel, opts);
};

var LeafletLayerViewFactory = function () { };

LeafletLayerViewFactory.prototype._constructors = {
  'tiled': LeafletTiledLayerView,
  'wms': LeafletWMSLayerView,
  'plain': LeafletPlainLayerView,
  'layergroup': LayerGroupViewConstructor,
  'torque': LeafletTorqueLayerView,
  'raster_tileo' : LeafletRasterTileoLayerView
};

LeafletLayerViewFactory.prototype.createLayerView = function (layerModel, opts) {
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
      return new LayerViewClass(layerModel, opts);
    } catch (error) {
      log.error("Error creating an instance of layer view for '" + layerType + "' layer -> " + error.message);
      throw error;
    }
  } else if (layerType != 'raster_tileo') {
    log.error("Error creating an instance of layer view for '" + layerType + "' layer. Type is not supported");
  }
};

module.exports = LeafletLayerViewFactory;