'use strict';

var mailreader = require('mailreader');

var ngModule = angular.module('woEmail');
ngModule.factory('mailreader', function(appConfig) {
    mailreader.startWorker(appConfig.config.workerPath + '/mailreader-parser-worker.min.js');
    return mailreader;
});