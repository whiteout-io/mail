'use strict';

var ngModule = angular.module('woDirectives');

ngModule.directive('listScroll', function($timeout) {
    return {
        link: function(scope, elm, attrs) {
            var model = attrs.listScroll,
                listEl = elm[0],
                scrollTimeout;

            /*
             * iterates over the mails in the mail list and loads their bodies if they are visible in the viewport
             */
            function loadVisibleBodies() {
                var listBorder = listEl.getBoundingClientRect(),
                    top = listBorder.top,
                    bottom = listBorder.bottom,
                    listItems = listEl.children[0].children,
                    inViewport = false,
                    listItem, message,
                    isPartiallyVisibleTop, isPartiallyVisibleBottom, isVisible,
                    displayMessages = scope[model];

                if (!top && !bottom) {
                    // list not visible
                    return;
                }

                for (var i = 0, len = listItems.length; i < len; i++) {
                    // the n-th list item (the dom representation of an message) corresponds to
                    // the n-th message model in the filteredMessages array
                    listItem = listItems.item(i).getBoundingClientRect();

                    if (!displayMessages || displayMessages.length <= i) {
                        // stop if i get larger than the size of filtered messages
                        break;
                    }
                    message = displayMessages[i];


                    isPartiallyVisibleTop = listItem.top < top && listItem.bottom > top; // a portion of the list item is visible on the top
                    isPartiallyVisibleBottom = listItem.top < bottom && listItem.bottom > bottom; // a portion of the list item is visible on the bottom
                    isVisible = (listItem.top || listItem.bottom) && listItem.top >= top && listItem.bottom <= bottom; // the list item is visible as a whole

                    if (isPartiallyVisibleTop || isVisible || isPartiallyVisibleBottom) {
                        // we are now iterating over visible elements
                        inViewport = true;
                        // load mail body of visible
                        scope.getBody(message);
                    } else if (inViewport) {
                        // we are leaving the viewport, so stop iterating over the items
                        break;
                    }
                }
            }

            scope.loadVisibleBodies = function() {
                // wait for next tick so that scope is digested and synced to DOM
                $timeout(function() {
                    loadVisibleBodies();
                });
            };

            // load body when scrolling
            listEl.onscroll = function() {
                if (scrollTimeout) {
                    // remove timeout so that only scroll end
                    clearTimeout(scrollTimeout);
                }
                scrollTimeout = setTimeout(function() {
                    scope.loadVisibleBodies();
                }, 300);
            };

            // load the visible message bodies, when the list is re-initialized and when scrolling stopped
            scope.$watchCollection(model, function() {
                scope.loadVisibleBodies();
            });
        }
    };
});