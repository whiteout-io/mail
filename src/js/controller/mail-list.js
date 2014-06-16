define(function(require) {
    'use strict';

    var angular = require('angular'),
        _ = require('underscore'),
        appController = require('js/app-controller'),
        notification = require('js/util/notification'),
        emailDao, outboxBo, keychainDao;

    var MailListCtrl = function($scope, $timeout) {
        //
        // Init
        //

        emailDao = appController._emailDao;
        outboxBo = appController._outboxBo;
        keychainDao = appController._keychain;

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
            $scope.state.read.toggle(true);

            keychainDao.refreshKeyForUserId(email.from[0].address, onKeyRefreshed);

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

                $scope.toggleUnread(email);
            }
        };

        /**
         * Mark an email as unread or read, respectively
         */
        $scope.toggleUnread = function(message) {
            updateStatus('Updating unread flag...');

            message.unread = !message.unread;
            emailDao.setFlags({
                folder: currentFolder(),
                message: message
            }, function(err) {
                if (err && err.code === 42) {
                    // offline, restore
                    message.unread = !message.unread;
                    updateStatus('Unable to mark unread flag in offline mode!');
                    return;
                }

                if (err) {
                    updateStatus('Error on sync!');
                    $scope.onError(err);
                    return;
                }

                updateStatus('Online');
                $scope.$apply();
            });
        };

        /**
         * Delete a message
         */
        $scope.remove = function(message) {
            if (!message) {
                return;
            }

            updateStatus('Deleting message...');
            remove();

            function remove() {
                emailDao.deleteMessage({
                    folder: currentFolder(),
                    message: message
                }, function(err) {
                    if (err) {
                        // show errors where appropriate
                        if (err.code === 42) {
                            $scope.select(message);
                            updateStatus('Unable to delete message in offline mode!');
                            return;
                        }
                        updateStatus('Error during delete!');
                        $scope.onError(err);
                    }
                    updateStatus('Message deleted!');
                    $scope.$apply();
                });
            }
        };

        // share local scope functions with root state
        $scope.state.mailList = {
            remove: $scope.remove
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

            // in development, display dummy mail objects
            if (!window.chrome || !chrome.identity) {
                updateStatus('Last update: ', new Date());
                currentFolder().messages = createDummyMails();
                return;
            }

            // display and select first
            openCurrentFolder();
        });

        $scope.$watchCollection('state.nav.currentFolder.messages', selectFirstMessage);

        function selectFirstMessage(messages) {
            if (!messages) {
                return;
            }

            // Shows the next message based on the uid of the currently selected element
            if (messages.indexOf(currentMessage()) === -1) {
                // wait until after first $digest() so $scope.filteredMessages is set
                $timeout(function() {
                    $scope.select($scope.filteredMessages ? $scope.filteredMessages[0] : undefined);
                });
            }
        }

        /**
         * Sync current folder when client comes back online
         */
        $scope.$watch('account.online', function(isOnline) {
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
            emailDao.openFolder({
                folder: currentFolder()
            }, function(error) {
                if (error && error.code === 42) {
                    return;
                }

                $scope.onError(error);
            });
        }

        function updateStatus(lbl, time) {
            $scope.lastUpdateLbl = lbl;
            $scope.lastUpdate = (time) ? time : '';
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
            var popupId, popupTitle, popupMessage, unreadMsgs;

            unreadMsgs = msgs.filter(function(msg) {
                return msg.unread;
            });

            if (unreadMsgs.length === 0) {
                return;
            }

            popupId = '' + unreadMsgs[0].uid;
            if (unreadMsgs.length > 1) {
                popupTitle = unreadMsgs.length + ' new messages';
                popupMessage = _.pluck(unreadMsgs, 'subject').join('\n');
            } else {
                popupTitle = unreadMsgs[0].from[0].name || unreadMsgs[0].from[0].address;
                popupMessage = unreadMsgs[0].subject;
            }

            notification.create({
                id: popupId,
                title: popupTitle,
                message: popupMessage
            });
        };

        notification.setOnClickedListener(function(uidString) {
            var uid = parseInt(uidString, 10);

            if (isNaN(uid)) {
                return;
            }

            $scope.select(_.findWhere(currentFolder().messages, {
                uid: uid
            }));
        });
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
                        isPartiallyVisibleTop, isPartiallyVisibleBottom, isVisible;

                    for (var i = 0, len = listItems.length; i < len; i++) {
                        // the n-th list item (the dom representation of an email) corresponds to
                        // the n-th message model in the filteredMessages array
                        listItem = listItems.item(i).getBoundingClientRect();

                        if (!scope.filteredMessages || scope.filteredMessages.length <= i) {
                            // stop if i get larger than the size of filtered messages
                            break;
                        }
                        message = scope.filteredMessages[i];


                        isPartiallyVisibleTop = listItem.top < top && listItem.bottom > top; // a portion of the list item is visible on the top
                        isPartiallyVisibleBottom = listItem.top < bottom && listItem.bottom > bottom; // a portion of the list item is visible on the bottom
                        isVisible = listItem.top >= top && listItem.bottom <= bottom; // the list item is visible as a whole

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

    // Helper for development mode

    function createDummyMails() {
        var uid = 0;

        var Email = function(unread, attachments, answered, html) {
            this.uid = uid++;
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
            if (attachments) {
                // body structure with three attachments
                this.bodystructure = {
                    "1": {
                        "part": "1",
                        "type": "text/plain",
                        "parameters": {
                            "charset": "us-ascii"
                        },
                        "encoding": "7bit",
                        "size": 9,
                        "lines": 2
                    },
                    "2": {
                        "part": "2",
                        "type": "application/octet-stream",
                        "parameters": {
                            "name": "a.md"
                        },
                        "encoding": "7bit",
                        "size": 123,
                        "disposition": [{
                            "type": "attachment",
                            "filename": "a.md"
                        }]
                    },
                    "3": {
                        "part": "3",
                        "type": "application/octet-stream",
                        "parameters": {
                            "name": "b.md"
                        },
                        "encoding": "7bit",
                        "size": 456,
                        "disposition": [{
                            "type": "attachment",
                            "filename": "b.md"
                        }]
                    },
                    "4": {
                        "part": "4",
                        "type": "application/octet-stream",
                        "parameters": {
                            "name": "c.md"
                        },
                        "encoding": "7bit",
                        "size": 789,
                        "disposition": [{
                            "type": "attachment",
                            "filename": "c.md"
                        }]
                    },
                    "type": "multipart/mixed"
                };
                this.attachments = [{
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
                }];
            } else {
                this.bodystructure = {
                    "part": "1",
                    "type": "text/plain",
                    "parameters": {
                        "charset": "us-ascii"
                    },
                    "encoding": "7bit",
                    "size": 9,
                    "lines": 2
                };
                this.attachments = [];
            }
            this.unread = unread;
            this.answered = answered;
            this.html = html;
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
            this.html = '<!DOCTYPE html><html><head></head><body><div dir="ltr"><br><br><div class="gmail_quote">---------- Forwarded message ----------<br>From: <b class="gmail_sendername">MunichJS User Group</b> <span dir="ltr">&lt;<a href="mailto:info@meetup.com">info@meetup.com</a>&gt;</span><br>Date: Thu, May 8, 2014 at 11:10 PM<br>Subject: Stay in touch!<br>To: <a href="mailto:mail@john.com">mail@john.com</a><br><br><br><div style="margin:0;padding:0;font-family:arial;color:#333;background-color:#fff;text-align:center"><div style="background:#fff"><table style="width:100%" cellpadding="0" cellspacing="0"><tbody><tr><td style="width:49%;padding:0;border-top:1px solid #e6304c" valign="top"><div style="min-height:22px;background:#e6304c"> </div></td><td style="width:52px;padding:0;border-top:1px solid #e6304c"><a href="http://www.meetup.com/t/cp1.3_1/" target="_blank"><img src="http://www.meetup.com/z/img/cp1.3/MSMxNDI2MjI0NDIjMjAxNC0wNS0wOCAxNzoxMDoyMyNmMjZmMWQ0NC1mNmI5LTQyZjctYWYwYi0yNzY1NjRiMTQ4ZjM%3D/logo_52x35.gif" alt="Meetup" style="border:0" height="35" width="52"></a></td><td style="width:49%;padding:0;border-top:1px solid #e6304c" valign="top"><div style="min-height:22px;background:#e6304c"> </div></td></tr></tbody></table><div style="width:94%;min-width:220px;max-width:650px;margin:0 auto;padding-top:6px;text-align:left;font-family:arial,sans-serif;font-size:13px;line-height:18px;color:#545454"><div style="text-align:center;border-top:20px solid #fff;border-bottom:5px solid #fff;background:#fff"><a href="http://www.meetup.com/MunichJS-User-Group/events/177696242/t/cp1.3_2" style="text-decoration:none;color:#333;font-weight:bold;font-size:22px" target="_blank">MunichJS meetup</a></div><div style="border-top:20px solid #fff;border-bottom:20px solid #fff;border-left:20px solid #fff;border-right:20px solid #fff;background:#fff"><div style="float:left;width:48%;min-width:220px;border-top:20px solid #fff;border-bottom:20px solid #fff;background:#fff"><table cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td style="width:78px" valign="top"><div style="min-width:78px;overflow:hidden;min-height:78px;min-height:78px;max-height:78px;width:78px;border-right:10px solid #fff;background:#fff"><div style="min-height:78px;overflow:hidden;min-width:78px;min-height:78px;max-height:78px"><a href="http://www.meetup.com/MunichJS-User-Group/members/12479218/t/cp1.3_3" target="_blank"><img src="http://photos4.meetupstatic.com/photos/member/7/7/b/c/thumb_191490652.jpeg" alt="Axel Rauschmayer" style="max-width:78px;min-height:78px;display:block;margin:0" border="0"></a></div></div></td><td><div style="text-align:left;word-wrap:break-work"><div><div style="font-weight:bold;font-size:12px;line-height:15px">Axel Rauschmayer</div><div style="font-size:12px;line-height:15px">Organizer</div></div><table style="width:165px;border-top:10px solid #fff;background:#fff"><tbody><tr><td><table style="margin:0 auto" cellpadding="0" cellspacing="0"><tbody><tr><td style="border:solid 1px #b4152b;border-collapse:collapse;border-radius:2px"><table style="background-color:#e11b36;border-collapse:collapse;border-width:1px;border-style:solid;border-color:#ef7d8c #e11b36 #e11b36 #ef7d8c;border-radius:2px" cellpadding="0" cellspacing="0"><tbody><tr><td style="padding:0.5em 0.75em 0.4em"><a href="http://www.meetup.com/__ms142622442/MunichJS-User-Group/events/177696242/survey/t/cp1.3_b/?m=12479218&amp;_af_eid=177696242&amp;_af=event&amp;expires=1399756223842&amp;sig=0795a7bc0bd27d90b173b813280aaf740b7de533" style="display:inline-block;text-decoration:none;color:#ffffff!important;font-weight:bold;font-size:16px;font-family:helvetica,arial,sans-serif;line-height:1" target="_blank"><font color="#FFFFFF">Good to see you</font></a></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></div></td></tr></tbody></table></div><div style="float:left;width:48%;min-width:220px;border-top:20px solid #fff;border-bottom:20px solid #fff;background:#fff"><table cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td style="width:78px" valign="top"><div style="min-width:78px;overflow:hidden;min-height:78px;min-height:78px;max-height:78px;width:78px;border-right:10px solid #fff;background:#fff"><div style="min-height:78px;overflow:hidden;min-width:78px;min-height:78px;max-height:78px"><a href="http://www.meetup.com/MunichJS-User-Group/members/12748118/t/cp1.3_3" target="_blank"><img src="http://photos1.meetupstatic.com/photos/member/7/b/1/8/thumb_176791512.jpeg" alt="Béla Varga" style="max-width:78px;min-height:78px;display:block;margin:0" border="0"></a></div></div></td><td><div style="text-align:left;word-wrap:break-work"><div><div style="font-weight:bold;font-size:12px;line-height:15px">Béla Varga</div><div style="font-size:12px;line-height:15px">Co-Organizer</div></div><table style="width:165px;border-top:10px solid #fff;background:#fff"><tbody><tr><td><table style="margin:0 auto" cellpadding="0" cellspacing="0"><tbody><tr><td style="border:solid 1px #b4152b;border-collapse:collapse;border-radius:2px"><table style="background-color:#e11b36;border-collapse:collapse;border-width:1px;border-style:solid;border-color:#ef7d8c #e11b36 #e11b36 #ef7d8c;border-radius:2px" cellpadding="0" cellspacing="0"><tbody><tr><td style="padding:0.5em 0.75em 0.4em"><a href="http://www.meetup.com/__ms142622442/MunichJS-User-Group/events/177696242/survey/t/cp1.3_b/?m=12748118&amp;_af_eid=177696242&amp;_af=event&amp;expires=1399756223844&amp;sig=31304a00c64fa5426aae2ece07136df0ba96b69b" style="display:inline-block;text-decoration:none;color:#ffffff!important;font-weight:bold;font-size:16px;font-family:helvetica,arial,sans-serif;line-height:1" target="_blank"><font color="#FFFFFF">Good to see you</font></a></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></div></td></tr></tbody></table></div><div style="float:left;width:48%;min-width:220px;border-top:20px solid #fff;border-bottom:20px solid #fff;background:#fff"><table cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td style="width:78px" valign="top"><div style="min-width:78px;overflow:hidden;min-height:78px;min-height:78px;max-height:78px;width:78px;border-right:10px solid #fff;background:#fff"><div style="min-height:78px;overflow:hidden;min-width:78px;min-height:78px;max-height:78px"><a href="http://www.meetup.com/MunichJS-User-Group/members/122476792/t/cp1.3_3" target="_blank"><img src="http://photos1.meetupstatic.com/photos/member/3/3/6/thumb_162300822.jpeg" alt="Alexander Schmidt" style="max-width:78px;min-height:78px;display:block;margin:0" border="0"></a></div></div></td><td><div style="text-align:left;word-wrap:break-work"><div><div style="font-weight:bold;font-size:12px;line-height:15px">Alexander Schmidt</div><div style="font-size:12px;line-height:15px"> </div></div><table style="width:165px;border-top:10px solid #fff;background:#fff"><tbody><tr><td><table style="margin:0 auto" cellpadding="0" cellspacing="0"><tbody><tr><td style="border:solid 1px #b4152b;border-collapse:collapse;border-radius:2px"><table style="background-color:#e11b36;border-collapse:collapse;border-width:1px;border-style:solid;border-color:#ef7d8c #e11b36 #e11b36 #ef7d8c;border-radius:2px" cellpadding="0" cellspacing="0"><tbody><tr><td style="padding:0.5em 0.75em 0.4em"><a href="http://www.meetup.com/__ms142622442/MunichJS-User-Group/events/177696242/survey/t/cp1.3_b/?m=122476792&amp;_af_eid=177696242&amp;_af=event&amp;expires=1399756223845&amp;sig=c5be06ae269a248ea3ba7ef3ed0f7a5fda3012b5" style="display:inline-block;text-decoration:none;color:#ffffff!important;font-weight:bold;font-size:16px;font-family:helvetica,arial,sans-serif;line-height:1" target="_blank"><font color="#FFFFFF">Good to see you</font></a></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></div></td></tr></tbody></table></div><div style="float:left;width:48%;min-width:220px;border-top:20px solid #fff;border-bottom:20px solid #fff;background:#fff"><table cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td style="width:78px" valign="top"><div style="min-width:78px;overflow:hidden;min-height:78px;min-height:78px;max-height:78px;width:78px;border-right:10px solid #fff;background:#fff"><div style="min-height:78px;overflow:hidden;min-width:78px;min-height:78px;max-height:78px"><a href="http://www.meetup.com/MunichJS-User-Group/members/64473112/t/cp1.3_3" target="_blank"><img src="http://photos1.meetupstatic.com/photos/member/9/b/9/8/thumb_75219832.jpeg" alt="Amer Alimanovic" style="max-width:78px;min-height:78px;display:block;margin:0" border="0"></a></div></div></td><td><div style="text-align:left;word-wrap:break-work"><div><div style="font-weight:bold;font-size:12px;line-height:15px">Amer Alimanovic</div><div style="font-size:12px;line-height:15px"> </div></div><table style="width:165px;border-top:10px solid #fff;background:#fff"><tbody><tr><td><table style="margin:0 auto" cellpadding="0" cellspacing="0"><tbody><tr><td style="border:solid 1px #b4152b;border-collapse:collapse;border-radius:2px"><table style="background-color:#e11b36;border-collapse:collapse;border-width:1px;border-style:solid;border-color:#ef7d8c #e11b36 #e11b36 #ef7d8c;border-radius:2px" cellpadding="0" cellspacing="0"><tbody><tr><td style="padding:0.5em 0.75em 0.4em"><a href="http://www.meetup.com/__ms142622442/MunichJS-User-Group/events/177696242/survey/t/cp1.3_b/?m=64473112&amp;_af_eid=177696242&amp;_af=event&amp;expires=1399756223846&amp;sig=16c0da34fb46dc57aad292d5029037a0e9478a57" style="display:inline-block;text-decoration:none;color:#ffffff!important;font-weight:bold;font-size:16px;font-family:helvetica,arial,sans-serif;line-height:1" target="_blank"><font color="#FFFFFF">Good to see you</font></a></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></div></td></tr></tbody></table></div><div style="float:left;width:48%;min-width:220px;border-top:20px solid #fff;border-bottom:20px solid #fff;background:#fff"><table cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td style="width:78px" valign="top"><div style="min-width:78px;overflow:hidden;min-height:78px;min-height:78px;max-height:78px;width:78px;border-right:10px solid #fff;background:#fff"><div style="min-height:78px;overflow:hidden;min-width:78px;min-height:78px;max-height:78px"><a href="http://www.meetup.com/MunichJS-User-Group/members/106407802/t/cp1.3_3" target="_blank"><img src="http://photos3.meetupstatic.com/photos/member/5/3/0/e/thumb_139281262.jpeg" alt="Ankit Bahuguna" style="max-width:78px;min-height:78px;display:block;margin:0" border="0"></a></div></div></td><td><div style="text-align:left;word-wrap:break-work"><div><div style="font-weight:bold;font-size:12px;line-height:15px">Ankit Bahuguna</div><div style="font-size:12px;line-height:15px"> </div></div><table style="width:165px;border-top:10px solid #fff;background:#fff"><tbody><tr><td><table style="margin:0 auto" cellpadding="0" cellspacing="0"><tbody><tr><td style="border:solid 1px #b4152b;border-collapse:collapse;border-radius:2px"><table style="background-color:#e11b36;border-collapse:collapse;border-width:1px;border-style:solid;border-color:#ef7d8c #e11b36 #e11b36 #ef7d8c;border-radius:2px" cellpadding="0" cellspacing="0"><tbody><tr><td style="padding:0.5em 0.75em 0.4em"><a href="http://www.meetup.com/__ms142622442/MunichJS-User-Group/events/177696242/survey/t/cp1.3_b/?m=106407802&amp;_af_eid=177696242&amp;_af=event&amp;expires=1399756223846&amp;sig=a3e5c915ec63cad7e4e4216b019e711f823d35c5" style="display:inline-block;text-decoration:none;color:#ffffff!important;font-weight:bold;font-size:16px;font-family:helvetica,arial,sans-serif;line-height:1" target="_blank"><font color="#FFFFFF">Good to see you</font></a></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></div></td></tr></tbody></table></div><div style="float:left;width:48%;min-width:220px;border-top:20px solid #fff;border-bottom:20px solid #fff;background:#fff"><table cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td style="width:78px" valign="top"><div style="min-width:78px;overflow:hidden;min-height:78px;min-height:78px;max-height:78px;width:78px;border-right:10px solid #fff;background:#fff"><div style="min-height:78px;overflow:hidden;min-width:78px;min-height:78px;max-height:78px"><a href="http://www.meetup.com/MunichJS-User-Group/members/24007312/t/cp1.3_3" target="_blank"><img src="http://photos3.meetupstatic.com/photos/member/4/f/e/e/thumb_146660462.jpeg" alt="Avinash" style="max-width:78px;min-height:78px;display:block;margin:0" border="0"></a></div></div></td><td><div style="text-align:left;word-wrap:break-work"><div><div style="font-weight:bold;font-size:12px;line-height:15px">Avinash</div><div style="font-size:12px;line-height:15px"> </div></div><table style="width:165px;border-top:10px solid #fff;background:#fff"><tbody><tr><td><table style="margin:0 auto" cellpadding="0" cellspacing="0"><tbody><tr><td style="border:solid 1px #b4152b;border-collapse:collapse;border-radius:2px"><table style="background-color:#e11b36;border-collapse:collapse;border-width:1px;border-style:solid;border-color:#ef7d8c #e11b36 #e11b36 #ef7d8c;border-radius:2px" cellpadding="0" cellspacing="0"><tbody><tr><td style="padding:0.5em 0.75em 0.4em"><a href="http://www.meetup.com/__ms142622442/MunichJS-User-Group/events/177696242/survey/t/cp1.3_b/?m=24007312&amp;_af_eid=177696242&amp;_af=event&amp;expires=1399756223847&amp;sig=7ef560f2dc8af80b1b9a4e15a396200697f550a9" style="display:inline-block;text-decoration:none;color:#ffffff!important;font-weight:bold;font-size:16px;font-family:helvetica,arial,sans-serif;line-height:1" target="_blank"><font color="#FFFFFF">Good to see you</font></a></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></div></td></tr></tbody></table></div><div style="clear:both;float:none"></div></div></div><table style="width:100%" cellpadding="0" cellspacing="0"><tbody><tr><td style="text-align:center"><table style="margin:0 auto"><tbody><tr><td><table style="width:100%" cellpadding="0" cellspacing="0"><tbody><tr style="width:100%"><td style="border:solid 1px #aaaaaa;border-collapse:collapse;border-radius:2px;width:100%"><table style="background-color:#dddddd;border-collapse:collapse;border-width:1px;border-style:solid;border-color:#e7e7e7 #c4c4c4 #c4c4c4 #e7e7e7;border-radius:2px;width:100%" cellpadding="0" cellspacing="0"><tbody><tr style="width:100%"><td style="padding:0.5em 0.75em 0.4em;width:100%;text-align:center"><a href="http://www.meetup.com/__ms142622442/MunichJS-User-Group/events/177696242/survey/t/cp1.3_b/?_af_eid=177696242&amp;_af=event&amp;expires=1399756223847&amp;sig=d625672e1d948543b2bd02574b18ace288a32ce6" style="display:inline-block;text-decoration:none;color:#484848!important;font-weight:bold;font-size:16px;font-family:helvetica,arial,sans-serif;line-height:1" target="_blank"><font color="#484848">See all 91 people</font></a></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td style="text-align:center;padding:10px 0 30px 0">Couldn&#39;t go? <a href="http://www.meetup.com/__ms142622442/MunichJS-User-Group/events/177696242/survey/t/cp1.3_4/?_af_eid=177696242&amp;_af=event&amp;went=no&amp;expires=1399756223847&amp;sig=9a5707813c3bc7f4c1adb77e08bc729379f9e43e" style="color:#3b74a4;text-decoration:none" target="_blank">Click here</a>.</td></tr></tbody></table><div style="background:#555;text-align:center;border:5px solid #555"><div style="clear:both;background:#555;text-align:center;border-top:solid 20px #555;border-bottom:solid 20px #555"><div style="width:94%;margin:0 auto;border-left:solid 10px #555;border-right:solid 10px #555;min-width:220px;max-width:650px;text-align:left;font-family:arial;color:#ccc;font-size:11px;line-height:14px"><p style="margin:0 0 .25em;color:#ccc"><a href="http://www.meetup.com/__ms142622442/MunichJS-User-Group/optout/?submit=true&amp;_ms_unsub=true&amp;email=evRating&amp;expires=1399756223847&amp;sig=5d51b0e02ec189e92c58d64aa385e279a6845981" style="color:#ccc" target="_blank">Unsubscribe</a> from similar emails from this Meetup Group</p><p style="margin:0 0 .25em;color:#ccc">Add <b><a href="mailto:info@meetup.com" style="color:#ccc" target="_blank">info@meetup.com</a></b> to your address book to receive all Meetup emails</p><p style="margin:0 0 .25em;color:#ccc"><a href="#145ddac61f476fb7_" style="color:#ccc;text-decoration:none">Meetup, POB 4668 #37895 NY NY USA 10163</a></p><p style="margin:0 0 .25em;color:#ccc"><b>Meetup HQ in NYC is hiring!</b><a href="http://www.meetup.com/jobs/" style="color:#ccc" target="_blank">meetup.com/jobs</a></p></div></div></div></div></div></div><br></div></body></html>';
            this.encrypted = true;
            this.decrypted = true;
        };

        var dummys = [new Email(true, true), new Email(true, false, true, true), new Email(false, true, true), new Email(false, true), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false), new Email(false)];

        return dummys;
    }

    return MailListCtrl;
});