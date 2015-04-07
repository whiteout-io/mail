'use strict';

var PREFETCH_ITEMS = 10;

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
                    displayMessages = scope[model],
                    visible = [],
                    prefetchLowerBound = displayMessages.length, // lowest index where we need to start prefetching
                    prefetchUpperBound = 0; // highest index where we need to start prefetching

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
                        visible.push(message);

                        prefetchLowerBound = Math.max(Math.min(prefetchLowerBound, i - 1), 0);
                        prefetchUpperBound = Math.max(prefetchUpperBound, i + 1);
                    } else if (inViewport) {
                        // we are leaving the viewport, so stop iterating over the items
                        break;
                    }
                }

                //
                // prefetch: [prefetchLowerBound - 20 ; prefetchLowerBound] and [prefetchUpperBound; prefetchUpperBound + 20]
                //

                // normalize lowest index to 0, slice interprets values <0 as "start from end"
                var prefetchLower = displayMessages.slice(Math.max(prefetchLowerBound - PREFETCH_ITEMS, 0), prefetchLowerBound);
                var prefetchUpper = displayMessages.slice(prefetchUpperBound, prefetchUpperBound + PREFETCH_ITEMS);

                visible.concat(prefetchLower).concat(prefetchUpper).forEach(function(email) {
                    scope.getBody([email]);
                });
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