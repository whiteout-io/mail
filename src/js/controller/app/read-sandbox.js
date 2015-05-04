'use strict';

// add DOMPurify hook to sanitze attributes
DOMPurify.addHook('afterSanitizeAttributes', function(node) {
    // open all links in a new window
    if ('target' in node) {
        node.setAttribute('target', '_blank');
    }
});

// set listener for event from main window
window.onmessage = function(e) {
    var html = '';

    if (e.data.html) {
        // display html mail body
        html = e.data.html;
    } else if (e.data.text) {
        // diplay text mail body by with colored conversation nodes
        html = renderNodes(parseConversation(e.data.text));
    }

    // sanitize HTML content: https://github.com/cure53/DOMPurify
    if (e.data.removeImages) {
        // remove http leaks
        document.body.innerHTML = DOMPurify.sanitize(html, {
            FORBID_TAGS: ['style', 'svg', 'audio', 'video', 'math'],
            FORBID_ATTR: ['src']
        });
    } else {
        document.body.innerHTML = DOMPurify.sanitize(html);
    }

    attachClickHandlers();
};

/**
 * Send a message to the main window when email address is clicked
 */
function attachClickHandlers() {
    var elements = document.getElementsByTagName('a');
    for (var i = 0, len = elements.length; i < len; i++) {
        elements[i].onclick = handle;
    }

    function handle(e) {
        var text = e.target.textContent || e.target.innerText;
        if (checkEmailAddress(text)) {
            e.preventDefault();
            window.parentIFrame.sendMessage({
                type: 'email',
                address: text
            });
        }
    }

    function checkEmailAddress(text) {
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(text);
    }
}

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
                lines[i] = lines[i].replace(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/g, createArchor);
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