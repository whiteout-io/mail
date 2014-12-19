'use strict';

var ngModule = angular.module('woServices');
ngModule.service('newsletter', Newsletter);
module.exports = Newsletter;

function Newsletter() {}

/**
 * Sign up to the whiteout newsletter
 */
Newsletter.prototype.signup = function(emailAddress, agree) {
    return new Promise(function(resolve, reject) {
        // validate email address
        if (emailAddress.indexOf('@') < 0) {
            reject(new Error('Invalid email address!'));
            return;
        }

        if (!agree) {
            // don't sign up if the user has not agreed
            resolve(false);
            return;
        }

        var formData = new FormData();
        formData.append('EMAIL', emailAddress);
        formData.append('b_52ea5a9e1be9e1d194f184158_6538e8f09f', '');

        var uri = 'https://whiteout.us8.list-manage.com/subscribe/post?u=52ea5a9e1be9e1d194f184158&id=6538e8f09f';
        var xhr = new XMLHttpRequest();
        xhr.open('post', uri, true);

        xhr.onload = function() {
            resolve(xhr);
        };

        xhr.onerror = function(err) {
            reject(err);
        };

        xhr.send(formData);
    });
};