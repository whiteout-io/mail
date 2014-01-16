mail-html5 [![Build Status](https://travis-ci.org/whiteout-io/mail-html5.png)](https://travis-ci.org/whiteout-io/mail-html5)
==========

Whiteout Mail is an easy to use email client with integrated OpenPGP encryption written in pure JavaScript. Download the official version under [whiteout.io](http://whiteout.io).

### Privacy and Security

* We take the privacy of your data very seriously. Messages are [encrypted end-to-end ](http://en.wikipedia.org/wiki/End-to-end_encryption) using the [OpenPGP](http://en.wikipedia.org/wiki/Pretty_Good_Privacy) protocol. This means that only you and your correspondents can read your mail.

* The client talks directly via IMAP/SMTP to your mail server. Your messages and private PGP key are stored encrypted on your computer and are never sent to our our servers.

* The app is deployed as a [Chrome Packaged App](https://developer.chrome.com/apps/about_apps.html) with auditable static versions in order to prevent [problems with host-based security](http://tonyarcieri.com/whats-wrong-with-webcrypto). It uses raw [TCP sockets](http://developer.chrome.com/apps/socket.html) to communicate with the mail server.

* Mail server [SSL certificates are pinned](http://security.stackexchange.com/questions/29988/what-is-certificate-pinning) under [`src/ca/`](https://github.com/whiteout-io/mail-html5/tree/master/src/ca) in order to protect against SSL stripping and other man in the middle attacks.

* [Content Securit Policy (CSP)](http://www.html5rocks.com/en/tutorials/security/content-security-policy/) is enforced to prevent against injection attacks.

* The code is still under heavy development and is not yet recommended for production use. That being said, we have done multiple code audits and penetration tests (which will be published regularly once all reported vulnerabilities are fixed).

### Reporting bugs and feature requests

* We will launch a bug bounty program later on the compensate security researchers. If you find any security vulnerabilities, don't hesitate to contact us [security@whiteout.io](mailto:security@whiteout.io).

* You can also just create an [issue](https://github.com/whiteout-io/mail-html5/issues) on GitHub if you're missing a feature or just want to give us feedback. It would be much appreciated!

### Testing

You can download a prebuilt bundle under [releases](https://github.com/whiteout-io/mail-html5/releases) or build your own from source:

    npm install && grunt
    
This builds the Chrome Packaged App bundle **DEV.zip** which can be installed under [chrome://extensions](chrome://extensions) in developer mode.

Run the unit tests locally:

    npm test

## License

    Copyright © 2013, Whiteout Networks GmbH. All rights reserved.

    The code is open for inspection and peer review by the security community.
    The code is currently not licensed under an open source license. If you're
    interested in contributing or getting a license, please get in touch with
    us (info@whiteout.io).

Many of the libraries we use are licensed under an open source license. Here are some of them:

* [OpenPGP.js](http://openpgpjs.org): An implementation of OpenPGP in Javascript
* [Inbox](https://github.com/andris9/inbox): Simple IMAP client for node.js
* [Nodemailer](http://www.nodemailer.com): SMTP client for node.js
* [Forge](https://github.com/digitalbazaar/forge): An implementation of TLS in Javascript
* [node-shims](https://github.com/whiteout-io/node-shims): A basic set shims of commonly used node APIs for use in the browser