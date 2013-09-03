'use strict';

$(document).ready(function() {
    setListeners();
});

function setListeners() {
    var li = $('li');

    if ("ontouchstart" in window) {
        li.on('touchstart', select);
    } else {
        li.mousedown(select);
    }

    function select() {
        li.toggleClass('selected', false);
        $(this).toggleClass('selected');
    }
}