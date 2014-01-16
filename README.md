mail-html5 [![Build Status](https://travis-ci.org/whiteout-io/mail-html5.png)](https://travis-ci.org/whiteout-io/mail-html5)
==========

Whiteout Mail is a packaged HTML5 app with full IMAP, SMTP, TLS and OpenPGP support written in pure JavaScript on top of [chrome.socket](http://developer.chrome.com/apps/socket.html). Download the official version under [whiteout.io](http://whiteout.io).

### Building

You can download a prebuilt bundle under [releases](https://github.com/whiteout-io/mail-html5/releases) or build your own:

    npm install && grunt
    
This builds the Chrome Packaged App bundle **DEV.zip** which can be installed under [chrome://extensions](chrome://extensions) in developer mode.

## License

    Copyright © 2013, Whiteout Networks GmbH. All rights reserved.

    The code is open for inspection and peer review by the security community. The code is currently not licensed under an open source license. If you're interested in contributing or getting a license, please get in touch with us [info@whiteout.io](mailto:info@whiteout.io).

These are some of the libraries we use. For a complete list please take a look at the code.

* [OpenPGP.js](https://github.com/openpgpjs/openpgpjs): An implementation of OpenPGP in Javascript.
* [Forge](https://github.com/digitalbazaar/forge): A native implementation of TLS in Javascript
* [Inbox](https://github.com/andris9/inbox): Simple IMAP client for node.js
* [Nodemailer](http://www.nodemailer.com): SMTP client for node.js
* [node-shims](https://github.com/whiteout-io/node-shims): A basic set shims of commonly used node API for use in the browser