'use strict';

// set listener for event from main window
window.onmessage = function(e) {
    var html = '';

    if (e.data.html) {
        // display html mail body
        html = '<div class="scale-body">' + e.data.html + '</div>';
    } else if (e.data.text) {
        // diplay text mail body by with colored conversation nodes
        html = renderNodes(parseConversation(e.data.text));
    }

    // sanitize HTML content: https://github.com/cure53/DOMPurify
    html = window.DOMPurify.sanitize(html);
    // make links open in a new window
    html = html.replace(/<a /g, '<a target="_blank" ');

    // remove sources where necessary
    if (e.data.removeImages) {
        html = html.replace(/(<img[^>]+\b)src=['"][^'">]+['"]/ig, function(match, prefix) {
            return prefix;
        });
    }

    document.body.innerHTML = html;

    scaleToFit();
};

window.addEventListener('resize', scaleToFit);

/**
 * Parse email body and generate conversation nodes
 * @param  {Object} email The email object
 * @return {Node}       The root node of the conversion
 */
function parseConversation(textBody) {
    var nodes;

    function parseLines(body) {
        var lines = [];
        body.split('\n').forEach(parseLine);

        function parseLine(line) {
            var regex = /^>*/;
            var result = regex.exec(line);

            lines.push({
                text: line.replace(regex, '').trim(),
                level: (result && result.length > 0) ? result[0].length : 0
            });
        }

        return lines;
    }

    function buildTextNodes(lines) {
        var i, j, root, currentLevel, currentNode, levelDelta;

        root = new Node();
        currentLevel = 0;
        currentNode = root;

        // iterate over text lines
        for (i = 0; i < lines.length; i++) {
            levelDelta = lines[i].level - currentLevel;

            if (levelDelta === 0) {
                // we are at the desired node ... no traversal required
            } else if (levelDelta > 0) {
                // traverse to child node(s)
                for (j = 0; j < levelDelta; j++) {
                    var newChild = new Node(currentNode);
                    // create new child node
                    currentNode.children.push(newChild);
                    // go to last child node
                    currentNode = newChild;
                    // increase current level by one
                    currentLevel++;
                }
            } else {
                // traverse to parent(s)
                for (j = levelDelta; j < 0; j++) {
                    currentNode = currentNode.parent;
                    currentLevel--;
                }
            }

            // add text to the current node
            currentNode.addLine(lines[i].text);
        }

        return root;
    }

    function Node(parent) {
        this.parent = parent;
        this.children = [];
    }
    Node.prototype.addLine = function(lineText) {
        var c, l;

        c = this.children;
        l = c.length;

        // append text node to children if last child is not a text node
        if (l < 1 || typeof c[l - 1] !== 'string') {
            c[l] = '';
            l = c.length;
        }

        // append line to last child (add newline between lines)
        c[l - 1] += lineText + '\n';
    };

    function removeParentReference(node) {
        if (!node.children) {
            // this is a text leaf ... terminate recursion
            return;
        }

        // remove parent node to prevent infinite loop in JSON stringify
        delete node.parent;

        for (var i = 0; i < node.children.length; i++) {
            if (typeof node.children[i] === 'string') {
                // remove trailing newline in string
                node.children[i] = node.children[i].replace(/\n$/, '');
            } else {
                // I used recursion ...
                removeParentReference(node.children[i]);
            }
        }
    }

    nodes = buildTextNodes(parseLines(textBody.replace(/ >/g, '>')));
    removeParentReference(nodes);

    return nodes;
}

/**
 * Render the conversation nodes as markup. This is not injected directly into the DOM, but rather send to a sandboxed iframe to be rendered
 * @param  {Node} root The conversation root node
 * @return {Strin}      The conversation as markup
 */
function renderNodes(root) {
    var body = '';

    function render(node) {
        var i, html = '';
        if (!node.children) {
            // this is a text leaf
            var lines = node.split('\n');
            for (i = 0; i < lines.length; i++) {
                // replace all urls with anchors
                lines[i] = lines[i].replace(/(https?:\/\/[^\s]+)/g, createArchor);
                // wrap line into an element for easier styling
                html += '<div class="line';
                if (isLineEmpty(lines[i])) {
                    html += ' empty-line';
                }
                html += '"><span>' + lines[i] + '</span><br></div>';
            }
            return html;
        }

        for (i = 0; i < node.children.length; i++) {
            html += '<div class="prev-message">' + render(node.children[i]) + '</div>';
        }

        return html;
    }

    function createArchor(url) {
        return '<a href="' + url + '">' + url + '</a>';
    }

    function isLineEmpty(line) {
        return line.replace(/>/g, '').trim().length === 0;
    }

    for (var j = 0; j < root.children.length; j++) {
        // start by rendering the root nodes children
        body += render(root.children[j]);
    }

    return '<div class="view-read-body">' + body + '</div>';
}

/**
 * Transform scale content to fit iframe width
 */
function scaleToFit() {
    var view = document.getElementsByClassName('scale-body').item(0);
    if (!view) {
        return;
    }

    var parentWidth = view.parentNode.offsetWidth;
    var w = view.offsetWidth;
    var scale = '';

    if (w > parentWidth) {
        scale = parentWidth / w;
        scale = 'scale(' + scale + ',' + scale + ')';
    }

    view.style['-webkit-transform-origin'] = '0 0';
    view.style.transformOrigin = '0 0';
    view.style['-webkit-transform'] = scale;
    view.style.transform = scale;
}