mail-html5 [![Build Status](https://travis-ci.org/whiteout-io/mail-html5.png)](https://travis-ci.org/whiteout-io/mail-html5)
==========

Whiteout Mail is an easy to use email client with integrated OpenPGP encryption written in pure JavaScript. Download the official version under [whiteout.io](http://whiteout.io).

### Features

You can read about product features and our future roadmap in our [FAQ](https://github.com/whiteout-io/mail-html5/wiki/FAQ).

### Privacy and Security

We take the privacy of your data very seriously. Here are some of the technical details:

* Messages are [encrypted end-to-end ](http://en.wikipedia.org/wiki/End-to-end_encryption) using the [OpenPGP](http://en.wikipedia.org/wiki/Pretty_Good_Privacy) standard. This means that only you and the recipient can read your mail. Your messages and private PGP key are stored encrypted on your computer and are never sent to our our servers.

* Like most native email clients whiteout mail uses raw [TCP sockets](http://developer.chrome.com/apps/socket.html) to communicate directly with your mail server via IMAP/SMTP.

* Mail server [SSL certificates are pinned](http://security.stackexchange.com/questions/29988/what-is-certificate-pinning) under [`src/ca/`](https://github.com/whiteout-io/mail-html5/tree/master/src/ca) in order to protect against SSL certificate forgery and other man in the middle attacks.

* The app is deployed as a [Chrome Packaged App](https://developer.chrome.com/apps/about_apps.html) with [auditable static versions](https://github.com/whiteout-io/mail-html5/releases) in order to prevent [problems with host-based security](http://tonyarcieri.com/whats-wrong-with-webcrypto).

* [Content Security Policy (CSP)](http://www.html5rocks.com/en/tutorials/security/content-security-policy/) is enforced to prevent against injection attacks.

* The code is still under heavy development and is not yet recommended for production use. That being said, we have done multiple code audits and penetration tests (which will be published regularly once all reported vulnerabilities are fixed).

### Reporting bugs and feature requests

* We will launch a bug bounty program later on for independant security researchers. If you find any security vulnerabilities, don't hesitate to contact us [security@whiteout.io](mailto:security@whiteout.io).

* You can also just create an [issue](https://github.com/whiteout-io/mail-html5/issues) on GitHub if you're missing a feature or just want to give us feedback. It would be much appreciated!

### Testing

You can download a prebuilt bundle under [releases](https://github.com/whiteout-io/mail-html5/releases) or build your own from source (requires [node.js](http://nodejs.org/download/), [grunt](http://gruntjs.com/getting-started#installing-the-cli) and [sass](http://sass-lang.com/install)):

    npm install && npm test

(Requires grunt and sass to be installed)
    
This will download all dependencies, run the tests and build the Chrome Packaged App bundle **DEV.zip** which can be installed under [chrome://extensions](chrome://extensions) in developer mode.

### Development
For development you can start a connect dev server:

    grunt dev

Then visit [http://localhost:8580/dist/chrome.html#/desktop](http://localhost:8580/dist/chrome.html#/desktop) for front-end code or [http://localhost:8580/test/new-unit/](http://localhost:8580/test/new-unit/) to test JavaScript changes. You can also start a watch task so you don't have rebuild everytime you make a change:

    grunt watch

## License

    Copyright © 2013, Whiteout Networks GmbH. All rights reserved.

    The code is open for inspection and peer review by the security community.
    The code is currently not licensed under an open source license. If you're
    interested in contributing or getting a license, please get in touch with
    us (info@whiteout.io).

### Third party libraries

We work together with existing open source projects wherever possible and contribute any changes we make back upstream. Many of theses libraries are licensed under an open source license. Here are some of them:

* [OpenPGP.js](http://openpgpjs.org): An implementation of OpenPGP in Javascript
* [Inbox](https://github.com/andris9/inbox): Simple IMAP client for node.js
* [Nodemailer](http://www.nodemailer.com): SMTP client for node.js
* [Forge](https://github.com/digitalbazaar/forge): An implementation of TLS in Javascript
* [node-shims](https://github.com/whiteout-io/node-shims): Shims for wrapping node's net/tls (TCP socket) APIs around chrome.socket
