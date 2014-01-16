mail-html5 [![Build Status](https://travis-ci.org/whiteout-io/mail-html5.png)](https://travis-ci.org/whiteout-io/mail-html5)
==========

Whiteout Mail is a mail client with full IMAP, SMTP, TLS and OpenPGP support written in pure JavaScript. The Client is distributed as a [Chrome Packaged App](https://developer.chrome.com/apps/about_apps.html) since it requires [TCP sockets](http://developer.chrome.com/apps/socket.html). Download the official version under [whiteout.io](http://whiteout.io).

### Security

* The app is deployed as an auditable packaged app with static versions in order to prevent [problems with host-based security](http://tonyarcieri.com/whats-wrong-with-webcrypto).
* [Content Securit Policy (CSP)](http://www.html5rocks.com/en/tutorials/security/content-security-policy/) is enforced to prevent against injection attacks.
* The code is still under heavy development and is yet not recommended for production use. That being said, we have done multiple code audits and penetration tests (which will be published as soon as all reported vulnerabilities are fixed).

### Reporting bugs and feature requests

* We will launch a bug bounty program later on the compensate security researchers. If you find any security vulnerabilites, don't hesitate to contact us [security@whiteout.io](mailto:security@whiteout.io).
* You can also just create an [issue](https://github.com/whiteout-io/mail-html5/issues)

### Testing

You can download a prebuilt bundle under [releases](https://github.com/whiteout-io/mail-html5/releases) or build your own:

    npm install && grunt
    
This builds the Chrome Packaged App bundle **DEV.zip** which can be installed under [chrome://extensions](chrome://extensions) in developer mode.

To run the unit tests locally run:

    npm test

## License

    Copyright © 2013, Whiteout Networks GmbH. All rights reserved.

    The code is open for inspection and peer review by the security community.
    The code is currently not licensed under an open source license. If you're
    interested in contributing or getting a license, please get in touch with
    us (info@whiteout.io).

Many of the libraries we use are licensed under an open source license. Here are some of the libraries we use (for a complete list please take a look at the code):

* [OpenPGP.js](http://openpgpjs.org): An implementation of OpenPGP in Javascript
* [Inbox](https://github.com/andris9/inbox): Simple IMAP client for node.js
* [Nodemailer](http://www.nodemailer.com): SMTP client for node.js
* [Forge](https://github.com/digitalbazaar/forge): An implementation of TLS in Javascript
* [node-shims](https://github.com/whiteout-io/node-shims): A basic set shims of commonly used node API for use in the browser