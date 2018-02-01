var _ = require('underscore');
var Backbone = require('backbone');
var CartoError = require('./error-handling/carto-error');
var Engine = require('../../engine');
var Events = require('./events');
var LayerBase = require('./layer/base');
var Layers = require('./layers');
var VERSION = require('../../../package.json').version;
var CartoValidationError = require('./error-handling/carto-validation-error');

function getValidationError (code) {
  return new CartoValidationError('client', code);
}

/**
 * This is the entry point for a CARTO.js application.
 *
 * A CARTO client allows managing layers and dataviews. Some operations like addding a layer or a dataview are asynchronous.
 * The client takes care of the communication between CARTO.js and the server for you.
 *
 * To create a new client you need a CARTO account, where you will be able to get
 * your API key and username.
 *
 * @param {object} settings
 * @param {string} settings.apiKey - API key used to authenticate against CARTO
 * @param {string} settings.username - Name of the user
 * @param {string} [settings.serverUrl] - URL of the windshaft server
 *
 * @example
 * var client = new carto.Client({
 *   apiKey: 'YOUR_API_KEY_HERE',
 *   username: 'YOUR_USERNAME_HERE'
 * });
 *
 * @constructor
 * @memberof carto
 * @api
 *
 * @fires error
 * @fires success
 */
function Client (settings) {
  _checkSettings(settings);
  this._layers = new Layers();
  this._dataviews = [];
  this._engine = new Engine({
    apiKey: settings.apiKey,
    username: settings.username,
    serverUrl: settings.serverUrl || 'https://{user}.carto.com'.replace(/{user}/, settings.username),
    statTag: 'carto.js-v' + VERSION
  });
  this._bindEngine(this._engine);
}

_.extend(Client.prototype, Backbone.Events);

/**
 * Add a layer to the client.
 * If the layer id already exists in the client this method will throw an error.
 *
 * @param {carto.layer.Base} - The layer to be added
 *
 * @fires error
 * @fires success
 *
 * @example
 * // Add a layer to the client
 * client.addLayer(layer)
 *  .then(() => {
 *    console.log('Layer added');
 *  })
 *  .catch(cartoError => {
 *    console.error(cartoError.message);
 *  });
 *
 * @returns {Promise} - A promise that will be fulfilled when the layer is added
 * @api
 */
Client.prototype.addLayer = function (layer) {
  return this.addLayers([layer]);
};

/**
 * Add multiple layers to the client at once.
 *
 * @param {carto.layer.Base[]} - An array with the layers to be added. Note that ([A, B]) displays B as the top layer.
 *
 * @fires error
 * @fires success
 *
 * @example
 * // Add multiple layers ad once layer to the client
 * client.addLayers([layer0, layer1])
 *  .then(() => {
 *    console.log('Layers added');
 *  })
 *  .catch(cartoError => {
 *    console.error(cartoError.message);
 *  });
 *
 * @returns {Promise} A promise that will be fulfilled when the layers are added
 * @api
 */
Client.prototype.addLayers = function (layers) {
  layers.forEach(this._addLayer, this);
  return this._reload();
};

/**
 * Remove a layer from the client.
 *
 * @example
 * // Remove a layer from the client
 * client.removeLayer(layer)
 * .then(() => {
 *  console.log('Layer removed');
 * })
 * .catch(cartoError => {
 *  console.error(cartoError.message);
 * });
 *
 * @param {carto.layer.Base} - The layer to be removed
 *
 * @fires error
 * @fires success
 *
 * @returns {Promise} A promise that will be fulfilled when the layer is removed
 * @api
 */
Client.prototype.removeLayer = function (layer) {
  return this.removeLayers([layer]);
};

/**
 * Remove multiple layers from the client.
 *
 * @example
 * // Remove multiple layers from the client
 * client.removeLayers([layer1, layer2])
 * .then(() => {
 *  console.log('Layers removed');
 * })
 * .catch(cartoError => {
 *  console.error(cartoError.message);
 * });
 *
 *
 * @param {carto.layer.Base[]} - An array with the layers to be removed
 *
 * @fires error
 * @fires success
 *
 * @returns {Promise} A promise that will be fulfilled when the layers are removed
 * @api
 */
Client.prototype.removeLayers = function (layers) {
  layers.forEach(this._removeLayer, this);
  return this._reload();
};

/**
 * Get all the {@link carto.layer.Base|layers} from the client.
 *
 * @example
 * // Get all layers from the client
 * const layers = client.getLayers();
 *
 * @example
 * // Hide all layers from the client
 * client.getLayers().forEach(layer => layer.hide());
 *
 * @returns {carto.layer.Base[]} An array with all the Layers from the client
 * @api
 */
Client.prototype.getLayers = function () {
  return this._layers.toArray();
};

/**
 * Add a dataview to the client.
 *
 * @example
 * // Add a dataview to the client
 * client.addDataview(dataview)
 *  .then(() => {
 *    console.log('Dataview added');
 *  })
 *  .catch(cartoError => {
 *    console.error(cartoError.message);
 *  }):
 *
 * @param {carto.dataview.Base} - The dataview to be added
 *
 * @fires error
 * @fires success
 *
 * @returns {Promise} - A promise that will be fulfilled when the dataview is added
 * @api
 */
Client.prototype.addDataview = function (dataview) {
  return this.addDataviews([dataview]);
};

/**
 * Add multipe dataviews to the client.
 *
 * @example
 * // Add several dataviews to the client
 * client.addDataview([dataview0, dataview1])
 *  .then(() => {
 *    console.log('Dataviews added');
 *  })
 *  .catch(cartoError => {
 *    console.error(cartoError.message);
 *  }):
 *
 * @param {carto.dataview.Base[]} - An array with the dataviews to be added
 *
 * @fires error
 * @fires success
 *
 * @returns {Promise} A promise that will be fulfilled when the dataviews are added
 * @api
 */
Client.prototype.addDataviews = function (dataviews) {
  dataviews.forEach(this._addDataview, this);
  return this._reload();
};

/**
 * Remove a dataview from the client.
 *
 * @example
 * // Remove a dataview from the client
 * client.removeDataview(dataview)
 * .then(() => {
 *    console.log('Dataviews removed');
 *  })
 *  .catch(cartoError => {
 *    console.error(cartoError.message);
 *  }):
 *
 * @param {carto.dataview.Base} - The dataview array to be removed
 *
 * @fires error
 * @fires success
 *
 * @returns {Promise} A promise that will be fulfilled when the dataview is removed
 * @api
 */
Client.prototype.removeDataview = function (dataview) {
  this._dataviews.splice(this._dataviews.indexOf(dataview));
  this._engine.removeDataview(dataview.$getInternalModel());
  return this._reload();
};

/**
 * Get all the dataviews from the client.
 *
 * @example
 * // Get all the dataviews from the client
 * const dataviews = client.getDataviews();
 *
 * @returns {carto.dataview.Base[]} An array with all the dataviews from the client
 * @api
 */
Client.prototype.getDataviews = function () {
  return this._dataviews;
};

/**
 * Return a {@link http://leafletjs.com/reference-1.2.0.html#tilelayer|leaflet layer} that groups all the layers that have been
 * added to this client.
 *
 * @example
 * // Get the leafletlayer from the client
 * const cartoLeafletLayer = client.getLeafletLayer();
 *
 * @example
 * // Add the leafletLayer to a leafletMap
 * client.getLeafletLayer().addTo(map);
 *
 * @returns A {@link http://leafletjs.com/reference-1.2.0.html#tilelayer|L.TileLayer} layer that groups all the layers.
 *
 * @api
 */
Client.prototype.getLeafletLayer = function () {
  // Check if Leaflet is loaded
  _isLeafletLoaded();
  if (!this._leafletLayer) {
    var LeafletLayer = require('./native/leaflet-layer');
    this._leafletLayer = new LeafletLayer(this._layers, this._engine);
  }
  return this._leafletLayer;
};

/**
 * Return a {@link https://developers.google.com/maps/documentation/javascript/maptypes|google.maps.MapType} that groups all the layers that have been
 * added to this client.
 *
 * @example
 * // Get googlemaps MapType from client
 * const gmapsMapType = client.getGoogleMapsMapType();
 *
 * @example
 * // Add googlemaps MapType to a google map
 * googleMap.overlayMapTypes.push(client.getGoogleMapsMapType(googleMap));
 *
 * @param {google.maps.Map} - The native Google Maps map where the CARTO layers will be displayed.
 *
 * @return {google.maps.MapType} A Google Maps mapType that groups all the layers:
 * {@link https://developers.google.com/maps/documentation/javascript/maptypes|google.maps.MapType}
 * @api
 */
Client.prototype.getGoogleMapsMapType = function (map) {
  // NOTE: the map is required here because of wax.g.connector

  // Check if Google Maps is loaded
  _isGoogleMapsLoaded();
  if (!this._gmapsMapType) {
    var GoogleMapsMapType = require('./native/google-maps-map-type');
    this._gmapsMapType = new GoogleMapsMapType(this._layers, this._engine, map);
  }
  return this._gmapsMapType;
};

/**
 * Call engine.reload wrapping the native cartojs errors
 * into public CartoErrors.
 */
Client.prototype._reload = function () {
  return this._engine.reload()
    .then(function () {
      return Promise.resolve();
    })
    .catch(function (error) {
      return Promise.reject(new CartoError(error));
    });
};

/**
 * Helper used to link a layer and an engine.
 * @private
 */
Client.prototype._addLayer = function (layer, engine) {
  _checkLayer(layer);
  this._checkDuplicatedLayerId(layer);
  this._layers.add(layer);
  layer.$setEngine(this._engine);
  this._engine.addLayer(layer.$getInternalModel());
};

/**
 * Helper used to remove a layer from the client.
 */
Client.prototype._removeLayer = function (layer) {
  _checkLayer(layer);
  this._layers.remove(layer);
  this._engine.removeLayer(layer.$getInternalModel());
};

/**
 * Helper used to link a dataview and an engine
 * @private
 */
Client.prototype._addDataview = function (dataview, engine) {
  this._dataviews.push(dataview);
  dataview.$setEngine(this._engine);
  this._engine.addDataview(dataview.$getInternalModel());
};

/**
 * Client exposes Event.SUCCESS and RELOAD_ERROR to the api users,
 * those events are wrappers using _engine internaly.
 */
Client.prototype._bindEngine = function (engine) {
  engine.on(Engine.Events.RELOAD_SUCCESS, function () {
    this.trigger(Events.SUCCESS);
  }.bind(this));

  engine.on(Engine.Events.RELOAD_ERROR, function (err) {
    this.trigger(Events.ERROR, new CartoError(err, { layers: this._layers }));
  }.bind(this));

  engine.on(Engine.Events.LAYER_ERROR, function (err) {
    this.trigger(Events.ERROR, new CartoError(err));
  }.bind(this));
};

/**
 * Check if some layer in the client has the same id.
 * @param {carto.layer.Base} layer 
 */
Client.prototype._checkDuplicatedLayerId = function (layer) {
  if (this._layers.findById(layer.getId())) {
    throw getValidationError('duplicatedLayerId');
  }
};

/**
 * Utility function to reduce duplicated code.
 */
function _checkLayer (layer) {
  if (!(layer instanceof LayerBase)) {
    throw getValidationError('badLayerType');
  }
}

function _checkSettings (settings) {
  _checkApiKey(settings.apiKey);
  _checkUsername(settings.username);
  if (settings.serverUrl) {
    _checkServerUrl(settings.serverUrl, settings.username);
  }
}

function _checkApiKey (apiKey) {
  if (!apiKey) {
    throw getValidationError('apiKeyRequired');
  }
  if (!_.isString(apiKey)) {
    throw getValidationError('apiKeyString');
  }
}

function _checkUsername (username) {
  if (!username) {
    throw getValidationError('usernameRequired');
  }
  if (!_.isString(username)) {
    throw getValidationError('usernameString');
  }
}

function _checkServerUrl (serverUrl, username) {
  var urlregex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
  if (!serverUrl.match(urlregex)) {
    throw getValidationError('nonValidServerURL');
  }
  if (serverUrl.indexOf(username) < 0) {
    throw getValidationError('serverURLDoesntMatchUsername');
  }
}

function _isLeafletLoaded () {
  if (!window.L) {
    throw new Error('Leaflet is required');
  }
  if (window.L.version < '1.0.0') {
    throw new Error('Leaflet +1.0 is required');
  }
}

function _isGoogleMapsLoaded () {
  if (!window.google) {
    throw new Error('Google Maps is required');
  }
  if (!window.google.maps) {
    throw new Error('Google Maps is required');
  }
  if (window.google.maps.version < '3.0.0') {
    throw new Error('Google Maps +3.0 is required');
  }
}

module.exports = Client;
