'use strict';

var ngModule = angular.module('woDirectives');

ngModule.directive('woTouch', function($parse) {
    var className = 'wo-touch-active';

    return function(scope, elm, attrs) {
        var handler = $parse(attrs.woTouch);

        elm.on('touchstart', function() {
            elm.addClass(className);
        });
        elm.on('touchleave touchcancel touchmove touchend', function() {
            elm.removeClass(className);
        });

        elm.on('click', function(event) {
            elm.removeClass(className);
            scope.$apply(function() {
                handler(scope, {
                    $event: event
                });
            });
        });
    };
});

ngModule.directive('woTooltip', function($document, $timeout) {
    return function(scope, elm, attrs) {
        var selector = attrs.woTooltip;
        var tooltip = $document.find(selector);

        elm.on('mouseover', function() {
            // Compute tooltip position
            var offsetElm = elm.offset();
            var offsetTooltipParent = tooltip.offsetParent().offset();

            // Set tooltip position
            tooltip[0].style.top = (offsetElm.top - offsetTooltipParent.top +
                elm[0].offsetHeight / 2 - tooltip[0].offsetHeight / 2) + 'px';
            tooltip[0].style.left = (offsetElm.left - offsetTooltipParent.left +
                elm[0].offsetWidth) + 'px';

            // Wait till browser repaint
            $timeout(function() {
                tooltip.addClass('tooltip--show');
            });
        });

        elm.on('mouseout', function() {
            tooltip.removeClass('tooltip--show');
            tooltip[0].style.top = '-9999px';
            tooltip[0].style.left = '-9999px';
        });
    };
});

ngModule.directive('woDropdown', function($document, $timeout) {
    return function(scope, elm, attrs) {
        var selector = attrs.woDropdown;
        var position = (attrs.woDropdownPosition || '').split(' ');
        var dropdown = $document.find(selector);

        function appear() {
            // Compute dropdown position
            var offsetElm = elm.offset();
            var offsetDropdownParent = dropdown.offsetParent().offset();

            // Set dropdown position
            switch(position[1]) {
            case 'up':
                dropdown[0].style.top = (offsetElm.top - offsetDropdownParent.top -
                    dropdown[0].offsetHeight - 3) + 'px';
                break;
            default:
                dropdown[0].style.top = (offsetElm.top - offsetDropdownParent.top +
                    elm[0].offsetHeight + 3) + 'px';
            }

            switch(position[0]) {
            case 'center':
                dropdown[0].style.left = (offsetElm.left - offsetDropdownParent.left +
                    elm[0].offsetWidth / 2 - dropdown[0].offsetWidth / 2) + 'px';
                break;
            case 'right':
                dropdown[0].style.left = (offsetElm.left - offsetDropdownParent.left +
                    elm[0].offsetWidth - dropdown[0].offsetWidth) + 'px';
                break;
            default:
                dropdown[0].style.left = (offsetElm.left - offsetDropdownParent.left) + 'px';
            }

            // Wait till browser repaint
            $timeout(function() {
                dropdown.addClass('dropdown--show');
            });

            // class on element to change style if drowdown is visible
            elm.addClass('wo-dropdown-active');
        }

        function disappear() {
            dropdown.removeClass('dropdown--show');
            dropdown[0].style.top = '-9999px';
            dropdown[0].style.left = '-9999px';

            elm.removeClass('wo-dropdown-active');
        }

        function toggle() {
            if(dropdown.hasClass('dropdown--show')) {
                disappear();
            }
            else {
                appear();
            }
        }

        elm.on('click', function(e) {
            e.preventDefault();
            toggle();
        });

        // close if user clicks button in dropdown list
        dropdown.on('click.woDropdown', 'button', disappear);

        // close if user clicks outside of dropdown and elm
        $document.on('touchstart.woDropdown click.woDropdown', function(e) {
            var t = angular.element(e.target);
            if(dropdown.hasClass('dropdown--show') &&
                !t.closest(dropdown).length &&
                !t.closest(elm).length) {
                disappear();
            }
        });

        // remove event listener on document
        scope.$on('$destroy', function() {
            dropdown.off('click.woDropdown');
            $document.off('touchstart.woDropdown click.woDropdown');
        });
    };
});

ngModule.directive('woFocusMe', function($timeout, $parse) {
    return function(scope, element, attrs) {
        var model = $parse(attrs.woFocusMe);
        scope.$watch(model, function(value) {
            if (value === true) {
                $timeout(function() {
                    var el = element[0];
                    el.focus();
                    // set cursor to start of textarea
                    if (el.type === 'textarea') {
                        el.selectionStart = 0;
                        el.selectionEnd = 0;
                        el.scrollTop = 0;
                    }
                }, 100);
            }
        });
    };
});

ngModule.directive('woClickFileInput', function() {
    return function(scope, elm, attrs) {
        var fileInput = document.querySelector(attrs.woClickFileInput);
        elm.on('click touchstart', function(e) {
            e.preventDefault();
            fileInput.click();
        });
    };
});

ngModule.directive('woFingerprint', function($timeout) {
    return function(scope, elm) {
        return $timeout(function() {
            // add space after every fourth char to make pgp fingerprint more readable
            var fingerprint = elm.text().replace(/(\w{4})/g, '$1 ').trim();
            elm.text(fingerprint);
        });
    };
});

ngModule.directive('woInputCode', function() {
    var BLOCK_SIZE = 4;
    var NUM_BLOCKS = 6;
    var BLOCK_DIVIDER = '-';

    // helpers

    function getBlockIndex(code, pos) {
        return code.substr(0, pos).replace(new RegExp('[^' + BLOCK_DIVIDER + ']', 'g'), '').length;
    }

    function getBlockDimensions(code, i) {
        var start = 0;
        var end = code.length;
        var found = 0;
        for(var j = 0; j < code.length; j++) {
            if(code[j] === BLOCK_DIVIDER) {
                found++;
                if(found === i) {
                    start = j + 1;
                }
                if(found === i + 1) {
                    end = j - 1;
                }
            }
        }

        return {
            start: start,
            end: end
        };
    }

    function getBlock(code, i) {
        var dims = getBlockDimensions(code, i);
        return code.substring(dims.start, dims.end + 1);
    }

    function setBlock(code, i, val) {
        var dims = getBlockDimensions(code, i);
        return code.substring(0, dims.start) + val + code.substring(dims.end + 1);
    }

    return {
        restrict: 'A',
        require: 'ngModel',
        link: function(scope, elm, attrs, ngModelCtrl) {
            function format(val) {
                var str = '';

                // check if value exists
                if (!val) {
                    return str;
                }

                for(var i = 0; i < val.length; i++) {
                    if(i > 0 && i % BLOCK_SIZE === 0) {
                        str += BLOCK_DIVIDER;
                    }
                    str += val[i];
                }

                return str;
            }

            function parse(val) {
                var parsed = val.replace(new RegExp(BLOCK_DIVIDER, 'g'), '').trim();
                return parsed;
            }

            ngModelCtrl.$parsers.push(parse);
            ngModelCtrl.$formatters.push(format);

            var maxlength = NUM_BLOCKS * (BLOCK_SIZE + 1) - 1;

            function handleInput(el) {
                var start = el.selectionStart;
                var end = el.selectionEnd;
                var val = el.value;

                var blockIndex = getBlockIndex(val, start);
                var blockDims = getBlockDimensions(val, blockIndex);
                var block = getBlock(val, blockIndex);

                // add new block to the end
                if(val.length < maxlength && start === val.length && block.length > BLOCK_SIZE) {
                    val = setBlock(val, blockIndex, block.substr(0, BLOCK_SIZE) + BLOCK_DIVIDER + block.substr(BLOCK_SIZE));
                    start = val.length;
                    end = val.length;
                }
                // maxsize in last block
                else if(start === val.length && block.length > BLOCK_SIZE) {
                    val = setBlock(val, blockIndex, block.substr(0, BLOCK_SIZE));
                    start = val.length;
                    end = val.length;
                }
                // overwrite next char if block is full
                else if(block.length > BLOCK_SIZE && start <= blockDims.end) {
                    val = val.substring(0, start) + val.substring(start + 1);
                }
                // jump to next block if cursor is at the end of the block and block is full
                else if(block.length > BLOCK_SIZE && start === blockDims.end + 1) {
                    var overflow = block.substr(BLOCK_SIZE);
                    if(overflow.length > BLOCK_SIZE) {
                        overflow = overflow.substr(0, BLOCK_SIZE);
                    }
                    val = setBlock(val, blockIndex, block.substr(0, BLOCK_SIZE));

                    var nextBlock = getBlock(val, blockIndex + 1);
                    val = setBlock(val, blockIndex + 1, (overflow + nextBlock).substr(0, BLOCK_SIZE));

                    start++;
                    end++;
                }

                ngModelCtrl.$setViewValue(val);
                ngModelCtrl.$render();

                el.setSelectionRange(start, end);
            }

            function handlePastedInput(el) {
                // reformat whole input value
                el.value = format(parse(el.value).substr(0, BLOCK_SIZE * NUM_BLOCKS));

                // select first block to have clear predefined selection behavior
                var dims = getBlockDimensions(el.value, 0);
                el.setSelectionRange(dims.start, dims.end + 1);
            }

            // Events

            var pasted = false;

            elm.on('input', function() {
                if(pasted) {
                    handlePastedInput(this);
                    pasted = false;
                    return;
                }

                handleInput(this);
            });

            elm.on('paste', function() {
                // next input event will handle pasted input
                pasted = true;
            });

            elm.on('click', function() {
                var blockIndex = getBlockIndex(this.value, this.selectionStart);
                var dims = getBlockDimensions(this.value, blockIndex);

                this.setSelectionRange(dims.start, dims.end + 1);
            });
        }
    };
});