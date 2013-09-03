'use strict';

$(document).ready(function() {
    setListeners();
});

function setListeners() {
    var li = $('li');

    li.mousedown(function() {
        li.toggleClass('selected', false);
        $(this).toggleClass('selected');
    });

    li.mouseup(function() {});
}