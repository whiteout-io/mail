'use strict';

var ngModule = angular.module('woDirectives');

ngModule.directive('replySelection', function() {
    return function(scope, elm) {
        var popover, visible;

        popover = angular.element(document.querySelector('.reply-selection'));
        visible = false;

        elm.on('touchstart click', appear);
        elm.parent().parent().on('touchstart click', disappear);
        popover.on('touchstart click', disappear);

        function appear(e) {
            e.preventDefault();
            e.stopPropagation();

            visible = true;

            // set popover position
            var top = elm[0].offsetTop;
            var left = elm[0].offsetLeft;
            var width = elm[0].offsetWidth;
            var height = elm[0].offsetHeight;

            popover[0].style.transition = 'opacity 0.1s linear';
            popover[0].style.top = (top + height) + 'px';
            popover[0].style.left = (left + width / 2 - popover[0].offsetWidth / 2) + 'px';
            popover[0].style.opacity = '1';
        }

        function disappear() {
            if (!visible) {
                return;
            }

            popover[0].style.transition = 'opacity 0.25s linear, top 0.25s step-end, left 0.25s step-end';
            popover[0].style.opacity = '0';
            popover[0].style.top = '-9999px';
            popover[0].style.left = '-9999px';
            visible = false;
        }
    };
});

ngModule.directive('frameLoad', function($window) {
    return function(scope, elm) {
        var iframe = elm[0];

        scope.$watch('state.read.open', function(open) {
            if (open) {
                // trigger rendering of iframe
                // otherwise scale to fit would not compute correct dimensions on mobile
                displayContent();
            }
        });

        scope.$on('$destroy', function() {
            $window.removeEventListener('resize', resetWidth);
            $window.removeEventListener('orientationchange', resetWidth);
        });

        $window.addEventListener('resize', resetWidth);
        $window.addEventListener('orientationchange', resetWidth);

        // use iframe-resizer to dynamically adapt iframe size to its content
        elm.iFrameResize({
            enablePublicMethods: true,
            sizeWidth: true,
            resizedCallback: scaleToFit,
            messageCallback: function(e) {
                if (e.message.type === 'email') {
                    scope.state.writer.write({
                        from: [{
                            address: e.message.address
                        }]
                    });
                }
            }
        });

        iframe.onload = function() {
            // set listeners
            scope.$watch('state.mailList.selected.body', displayContent);
            scope.$watch('state.mailList.selected.html', displayContent);
            // display initial message body
            scope.$apply();
        };

        function displayContent() {
            var mail = scope.state.mailList.selected;

            if (!mail || (mail.encrypted && !mail.decrypted)) {
                return;
            }

            resetWidth();

            if (mail.html) {
                // if there are image tags in the html?
                var hasImages = /<img[^>]+\bsrc=['"][^'">]+['"]/ig.test(mail.html);
                scope.showImageButton = hasImages;

                iframe.contentWindow.postMessage({
                    html: mail.html,
                    removeImages: hasImages // avoids doing unnecessary work on the html
                }, '*');

                // only add a scope function to reload the html if there are images
                if (hasImages) {
                    // reload WITH images
                    scope.displayImages = function() {
                        scope.showImageButton = false;
                        iframe.contentWindow.postMessage({
                            html: mail.html,
                            removeImages: false
                        }, '*');
                    };
                }
            } else if (mail.body) {
                iframe.contentWindow.postMessage({
                    text: mail.body
                }, '*');
            }
        }

        // reset the iframe width to the original (min-width:100%)
        // usually required before a new scaleToFit event
        function resetWidth() {
            elm.css('width', '');
        }

        // transform scale iframe to fit container width
        // necessary if iframe is wider than container
        function scaleToFit() {
            var parentWidth = elm.parent().width();
            var w = elm.width();
            var scale = 'none';

            // only scale html mails
            var mail = scope.state.mailList.selected;
            if (mail && mail.html && (w > parentWidth)) {
                scale = parentWidth / w;
                scale = 'scale(' + scale + ',' + scale + ')';
            }

            elm.css({
                '-webkit-transform-origin': '0 0',
                '-moz-transform-origin': '0 0',
                '-ms-transform-origin': '0 0',
                'transform-origin': '0 0',
                '-webkit-transform': scale,
                '-moz-transform': scale,
                '-ms-transform': scale,
                'transform': scale
            });
        }
    };
});