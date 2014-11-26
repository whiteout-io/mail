'use strict';

var ngModule = angular.module('woEmail');
ngModule.service('search', Search);
module.exports = Search;

function Search() {}

/**
 * Do full text search on messages. Parse meta data first.
 * @param  {Array} messages The messages to be filtered
 * @param  {String} query   The text query used to filter messages
 * @return {Array}          The filtered messages
 */
Search.prototype.filter = function(messages, query) {
    // don't filter on empty query
    if (!query) {
        return messages;
    }

    // escape search string
    query = query.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
    // compare all strings (case insensitive)
    var regex = new RegExp(query, 'i');

    function contains(input) {
        if (!input) {
            return false;
        }
        return regex.test(input);
    }

    function checkAddresses(header) {
        if (!header || !header.length) {
            return false;
        }

        for (var i = 0; i < header.length; i++) {
            if (contains(header[i].name) || contains(header[i].address)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Filter meta data first and then only look at plaintext and decrypted message bodies
     */
    function matchMetaDataFirst(m) {
        // compare subject
        if (contains(m.subject)) {
            return true;
        }
        // compares address headers
        if (checkAddresses(m.from) || checkAddresses(m.to) || checkAddresses(m.cc) || checkAddresses(m.bcc)) {
            return true;
        }
        // compare plaintext body
        if (m.body && !m.encrypted && contains(m.body)) {
            return true;
        }
        // compare decrypted body
        if (m.body && m.encrypted && m.decrypted && contains(m.body)) {
            return true;
        }
        // compare plaintex html body
        if (m.html && !m.encrypted && contains(m.html)) {
            return true;
        }
        // compare decrypted html body
        if (m.html && m.encrypted && m.decrypted && contains(m.html)) {
            return true;
        }
        return false;
    }

    // user native js Array.filter
    return messages.filter(matchMetaDataFirst);
};