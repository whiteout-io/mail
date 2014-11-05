'use strict';

var appController = require('../app-controller'),
    notification = require('../util/notification'),
    emailDao, outboxBo, keychainDao, searchTimeout, firstSelect;

//
// Constants
//

var INIT_DISPLAY_LEN = 20,
    SCROLL_DISPLAY_LEN = 10,
    FOLDER_TYPE_INBOX = 'Inbox',
    NOTIFICATION_INBOX_TIMEOUT = 5000;

var MailListCtrl = function($scope, $routeParams) {
    //
    // Init
    //

    emailDao = appController._emailDao;
    outboxBo = appController._outboxBo;
    keychainDao = appController._keychain;

    /**
     * Gathers unread notifications to be cancelled later
     */
    $scope.pendingNotifications = [];

    //
    // scope functions
    //

    $scope.getBody = function(email) {
        emailDao.getBody({
            folder: currentFolder(),
            message: email
        }, function(err) {
            if (err && err.code !== 42) {
                $scope.onError(err);
                return;
            }

            // display fetched body
            $scope.$digest();

            // automatically decrypt if it's the selected email
            if (email === currentMessage()) {
                emailDao.decryptBody({
                    message: email
                }, $scope.onError);
            }
        });
    };

    /**
     * Called when clicking on an email list item
     */
    $scope.select = function(email) {
        // unselect an item
        if (!email) {
            $scope.state.mailList.selected = undefined;
            return;
        }

        $scope.state.mailList.selected = email;

        if (!firstSelect) {
            // only toggle to read view on 2nd select in mobile mode
            $scope.state.read.toggle(true);
        }
        firstSelect = false;

        keychainDao.refreshKeyForUserId({
            userId: email.from[0].address
        }, onKeyRefreshed);

        function onKeyRefreshed(err) {
            if (err) {
                $scope.onError(err);
            }

            emailDao.decryptBody({
                message: email
            }, $scope.onError);

            // if the email is unread, please sync the new state.
            // otherweise forget about it.
            if (!email.unread) {
                return;
            }

            // let's close pending notifications for unread messages in the inbox
            if (currentFolder().type === FOLDER_TYPE_INBOX) {
                while ($scope.pendingNotifications.length) {
                    notification.close($scope.pendingNotifications.shift());
                }
            }

            $scope.state.actionBar.markMessage(email, false);
        }
    };

    // share local scope functions with root state
    $scope.state.mailList = {
        updateStatus: updateStatus
    };

    //
    // watch tasks
    //

    /**
     * List emails from folder when user changes folder
     */
    $scope._stopWatchTask = $scope.$watch('state.nav.currentFolder', function() {
        if (!currentFolder()) {
            return;
        }

        // reset searchFilter
        $scope.searchText = undefined;

        // in development, display dummy mail objects
        if ($routeParams.dev) {
            updateStatus('Last update: ', new Date());
            currentFolder().messages = createDummyMails();
            return;
        }

        // display and select first
        openCurrentFolder();
    });

    $scope.watchMessages = $scope.$watchCollection('state.nav.currentFolder.messages', function(messages) {
        if (!messages) {
            return;
        }

        // sort message by uid
        currentFolder().messages.sort(byUidDescending);
        // set display buffer to first messages
        $scope.displayMessages = currentFolder().messages.slice(0, INIT_DISPLAY_LEN);

        // Shows the next message based on the uid of the currently selected element
        if (currentFolder().messages.indexOf(currentMessage()) === -1) {
            firstSelect = true; // reset first selection
            $scope.select($scope.displayMessages[0]);
        }
    });

    /**
     * display more items (for infinite scrolling)
     */
    $scope.displayMore = function() {
        if (!currentFolder() || !$scope.displayMessages) {
            // folders not yet initialized
            return;
        }

        var len = currentFolder().messages.length,
            dLen = $scope.displayMessages.length;

        if (dLen === len || $scope.searchText) {
            // all messages are already displayed or we're in search mode
            return;
        }

        // copy next interval of messages to the end of the display messages array
        var next = currentFolder().messages.slice(dLen, dLen + SCROLL_DISPLAY_LEN);
        Array.prototype.push.apply($scope.displayMessages, next);
    };

    /**
     * This method is called when the user changes the searchText
     */
    $scope.displaySearchResults = function(searchText) {
        if (searchTimeout) {
            // remove timeout to wait for user typing query
            clearTimeout(searchTimeout);
        }

        if (!searchText) {
            // set display buffer to first messages
            $scope.displayMessages = currentFolder().messages.slice(0, INIT_DISPLAY_LEN);
            setSearching(false);
            updateStatus('Online');
            return;
        }

        // display searching spinner
        setSearching(true);
        updateStatus('Searching ...');
        searchTimeout = setTimeout(function() {
            $scope.$apply(function() {
                // filter relevant messages
                $scope.displayMessages = $scope.search(currentFolder().messages, searchText);
                setSearching(false);
                updateStatus('Matches in this folder');
            });
        }, 500);
    };

    /**
     * Do full text search on messages. Parse meta data first
     */
    $scope.search = function(messages, searchText) {
        // don't filter on empty searchText
        if (!searchText) {
            return messages;
        }

        // escape search string
        searchText = searchText.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
        // compare all strings (case insensitive)
        var regex = new RegExp(searchText, 'i');

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

    /**
     * Sync current folder when client comes back online
     */
    $scope.watchOnline = $scope.$watch('account.online', function(isOnline) {
        if (isOnline) {
            updateStatus('Online');
            openCurrentFolder();
        } else {
            updateStatus('Offline mode');
        }
    }, true);

    //
    // Helper Functions
    //

    function openCurrentFolder() {
        if (!currentFolder()) {
            return;
        }

        emailDao.openFolder({
            folder: currentFolder()
        }, function(error) {
            // dont wait until scroll to load visible mail bodies
            $scope.loadVisibleBodies();

            // don't display error for offline case
            if (error && error.code === 42) {
                return;
            }
            $scope.onError(error);
        });
    }

    function updateStatus(lbl, time) {
        $scope.state.mailList.lastUpdateLbl = lbl;
        $scope.state.mailList.lastUpdate = (time) ? time : '';
    }

    function setSearching(state) {
        $scope.state.mailList.searching = state;
    }

    function currentFolder() {
        return $scope.state.nav.currentFolder;
    }

    function currentMessage() {
        return $scope.state.mailList.selected;
    }

    //
    // Notification API
    //

    (emailDao || {}).onIncomingMessage = function(msgs) {
        var note, title, message, unreadMsgs;

        unreadMsgs = msgs.filter(function(msg) {
            return msg.unread;
        });

        if (unreadMsgs.length === 0) {
            return;
        }

        if (unreadMsgs.length === 1) {
            title = unreadMsgs[0].from[0].name || unreadMsgs[0].from[0].address;
            message = unreadMsgs[0].subject;
        } else {
            title = unreadMsgs.length + ' new messages';
            message = _.pluck(unreadMsgs, 'subject').join('\n');
        }

        note = notification.create({
            title: title,
            message: message,
            onClick: function() {
                // force toggle into read mode when notification is clicked
                firstSelect = false;

                // remove from pending notificatiosn
                var index = $scope.pendingNotifications.indexOf(note);
                if (index !== -1) {
                    $scope.pendingNotifications.splice(index, 1);
                }

                // mark message as read
                $scope.select(_.findWhere(currentFolder().messages, {
                    uid: unreadMsgs[0].uid
                }));
            },
            timeout: NOTIFICATION_INBOX_TIMEOUT
        });
        $scope.pendingNotifications.push(note);
    };
};

//
// Directives
//

var ngModule = angular.module('mail-list', []);

ngModule.directive('listScroll', function() {
    return {
        link: function(scope, elm, attrs) {
            var model = attrs.listScroll,
                listEl = elm[0],
                scrollTimeout;

            /*
             * iterates over the mails in the mail list and loads their bodies if they are visible in the viewport
             */
            scope.loadVisibleBodies = function() {
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
                    // the n-th list item (the dom representation of an email) corresponds to
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

function byUidDescending(a, b) {
    if (a.uid < b.uid) {
        return 1;
    } else if (b.uid < a.uid) {
        return -1;
    } else {
        return 0;
    }
}

// Helper for development mode

function createDummyMails() {
    var uid = 1000000;

    var Email = function(unread, attachments, answered) {
        this.uid = uid--;
        this.from = [{
            name: 'Whiteout Support',
            address: 'support@whiteout.io'
        }]; // sender address
        this.to = [{
            address: 'max.musterman@gmail.com'
        }, {
            address: 'max.musterman@gmail.com'
        }]; // list of receivers
        this.cc = [{
            address: 'john.doe@gmail.com'
        }]; // list of receivers
        this.attachments = attachments ? [{
            "filename": "a.md",
            "filesize": 123,
            "mimeType": "text/x-markdown",
            "part": "2",
            "content": null
        }, {
            "filename": "b.md",
            "filesize": 456,
            "mimeType": "text/x-markdown",
            "part": "3",
            "content": null
        }, {
            "filename": "c.md",
            "filesize": 789,
            "mimeType": "text/x-markdown",
            "part": "4",
            "content": null
        }] : [];
        this.unread = unread;
        this.answered = answered;
        this.sentDate = new Date('Thu Sep 19 2013 20:41:23 GMT+0200 (CEST)');
        this.subject = 'Getting started'; // Subject line
        this.body = 'And a good day to you too sir. \n' +
            '\n' +
            'Thursday, Apr 24, 2014 3:33 PM safewithme.testuser@gmail.com wrote:\n' +
            '> adsfadfasdfasdfasfdasdfasdfas\n' +
            '\n' +
            'http://example.com\n' +
            '\n' +
            '> Tuesday, Mar 25, 2014 4:19 PM gianniarcore@gmail.com wrote:\n' +
            '>> from 0.7.0.1\n' +
            '>>\n' +
            '>> God speed!'; // plaintext body
        //this.html = '<!DOCTYPE html><html><head></head><body><h1 style="border: 1px solid red; width: 500px;">Hello there' + Math.random() + '</h1></body></html>';
        this.encrypted = true;
        this.decrypted = true;
    };

    var dummies = [],
        i = 100;
    while (i--) {
        // every second/third/fourth dummy mail with unread/attachments/answered
        dummies.push(new Email((i % 2 === 0), (i % 3 === 0), (i % 5 === 0)));
    }

    return dummies;
}

module.exports = MailListCtrl;