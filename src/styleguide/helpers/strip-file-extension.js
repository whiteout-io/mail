'use strict';

module.exports.register = function(Handlebars) {

    // Customize this helper
    Handlebars.registerHelper('stripFileExtension', function(str) {
        var content = str.replace(/\.[^\.]*$/, '');
        return new Handlebars.SafeString(content);
    });

};