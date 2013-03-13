'use strict';

/**
 * Create the application namespace
 */
var app = {
    model: {},
    view: {},
    dao: {},
	crypto:{},
    util: {}
};

/**
 * Global app configurations
 */
app.config = {
	cloudUrl: 'https://whiteout-io.appspot.com',
	symKeySize: 128,
	symIvSize: 104,
	asymKeySize: 2048,
	workerPath: 'js'
};