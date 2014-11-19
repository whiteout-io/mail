'use strict';

var ngModule = angular.module('woServices');
ngModule.service('appConfigStore', AppConfigStore);
module.exports = AppConfigStore;

/**
 * A service for storing app configuration and user credential data locally
 */
function AppConfigStore(lawnchairDAO) {
    this._localDbDao = lawnchairDAO;
    this._localDbDao.init('app-config');
}

// TODO: inherit DeviceStorage service api