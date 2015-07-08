Whiteout Mail [![Build Status](https://travis-ci.org/whiteout-io/mail-html5.svg?branch=master)](https://travis-ci.org/whiteout-io/mail-html5) [![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/whiteout-io/mail-html5?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
==========

Whiteout Mail is an easy to use email client with integrated OpenPGP encryption written in pure JavaScript. Download the official version under [whiteout.io](https://whiteout.io/#product).

![Screenshot](https://whiteout.io/img/screens.png)

### Features

You can read about product features and our future roadmap in our [FAQ](https://github.com/whiteout-io/mail-html5/wiki/FAQ).

### Privacy and Security

We take the privacy of your data very seriously. Here are some of the technical details:

* The code has undergone a [full security audit](https://blog.whiteout.io/2015/06/11/whiteout-mail-1-0-and-security-audit-by-cure53/) by [Cure53](https://cure53.de).

* Messages are [encrypted end-to-end ](http://en.wikipedia.org/wiki/End-to-end_encryption) using the [OpenPGP](http://en.wikipedia.org/wiki/Pretty_Good_Privacy) standard. This means that only you and the recipient can read your mail. Your messages and private PGP key are stored only on your computer (in IndexedDB).

* Users have the option to use [encrypted private key sync](https://github.com/whiteout-io/mail-html5/wiki/Secure-OpenPGP-Key-Pair-Synchronization-via-IMAP) if they want to use Whiteout on multiple devices.

* [Content Security Policy (CSP)](http://www.html5rocks.com/en/tutorials/security/content-security-policy/) is enforced to prevent injection attacks.

* HTML mails are sanitized with [DOMPurify](https://github.com/cure53/DOMPurify) and are rendered in a sandboxed iframe.

* Displaying mail images is optional and opt-in by default.

* Like most native email clients, whiteout mail uses raw [TCP sockets](http://developer.chrome.com/apps/socket.html) to communicate directly with your mail server via IMAP/SMTP. TLS is used to protect your password and message data in transit.

* The app is deployed as a signed [Chrome Packaged App](https://developer.chrome.com/apps/about_apps.html) with [auditable static versions](https://github.com/whiteout-io/mail-html5/releases) in order to prevent [problems with host-based security](https://blog.whiteout.io/2014/04/13/heartbleed-and-javascript-crypto/).

* The app can also be used from any modern web browser in environments where installing an app is not possible (e.g. a locked down corporate desktop). The IMAP/SMTP TLS sessions are still terminated in the user's browser using JS crypto ([Forge](https://github.com/digitalbazaar/forge)), but the encrypted TLS payload is proxied via [socket.io](http://socket.io/), due to the lack of raw sockets in the browser. **Please keep in mind that this mode of operation is not as secure as using the signed packaged app, since users must trust the webserver to deliver the correct code. This mode will still protect user against passive attacks like wiretapping (since PGP and TLS are still applied in the user's browser), but not against active attacks from the webserver. So it's best to decide which threat model applies to you.**

### Architecture

![client architecture](https://whiteout.io/img/app_layers.png)

### Reporting bugs and feature requests

* We will launch a bug bounty program later on for independent security researchers. If you find any security vulnerabilities, don't hesitate to contact us [security@whiteout.io](mailto:security@whiteout.io).

* You can also just create an [issue](https://github.com/whiteout-io/mail-html5/issues) on GitHub if you're missing a feature or just want to give us feedback. It would be much appreciated!

### Testing

You can download a prebuilt bundle under [releases](https://github.com/whiteout-io/mail-html5/releases) or build your own from source (requires [node.js](http://nodejs.org/download/), [grunt](http://gruntjs.com/getting-started#installing-the-cli) and [sass](http://sass-lang.com/install)):

    npm install && npm test

This will download all dependencies, run the tests and build the Chrome Packaged App bundle **release/whiteout-mail_DEV.zip** which can be installed under [chrome://extensions](chrome://extensions) in developer mode.

### Development
For development you can start a connect dev server:

    grunt dev

Then visit [http://localhost:8580/dist/#/account?dev=true](http://localhost:8580/dist/#/account?dev=true) for front-end code or [http://localhost:8580/test/unit/](http://localhost:8580/test/unit/) to test JavaScript changes. You can also start a watch task so you don't have rebuild everytime you make a change:

    grunt watch

## Releasing Chrome App

    grunt release-test --release=0.0.0.x
    grunt release-stable --release=0.x.0

## Deploying Web App & Selfhosting

The App can be used either as a Chrome Packaged App or just by hosting it on your own trusted web server. You can build the app from source.

### Build from source

Clone the git repository

    git clone https://github.com/whiteout-io/mail-html5.git

Build and generate the `dist/` directory:

    npm install && grunt

### Running the server

To test the server, start it in development mode (without SSL):

    node server.js --dev

Navigate to [http://localhost:8889](http://localhost:8889) (or whatever port is set using the `PORT` environment variable).

To start the server for production use (this automatically redirects to `https`)

    npm start

**A note on security: The app should not be used without SSL so it's best to set up a reverse proxy or Loadbalancer with your SSL certificates. If you are not sure how to do this it might be easier to use our managed web hosting or packaged apps under [https://whiteout.io/#product](https://whiteout.io/#product).**

You can limit incoming and outgoing connections to the socket.io proxy by setting the following environment variables:

    # the web socket proxy listens to this port
    # if unset, defaults to 8889
    PORT=12345

    # the socket.io proxy accepts connections from these origins to tunnel them to tcp,
    # separate with commas
    # if unset, defaults to 'localhost:' + port
    INBOUND_ORIGINS='foo:1234,bar:569'

    # the socket.io proxy opens tcp connections with these ports to tunnel them to socket.io
    # separate with commas
    # if unset, defaults to '143,465,587,993' (25 is forbidden by default)
    OUTBOUND_PORTS='123,456,789'

To start the server in development mode (no forced HTTPS, iframe loads http content), run `node server.js --dev`

## License

    The MIT License (MIT)

    Copyright (c) 2014 Whiteout Networks GmbH.

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.

### Third party libraries

We work together with existing open source projects wherever possible and contribute any changes we make back upstream. Many of theses libraries are licensed under an open source license. Here are some of them:

* [OpenPGP.js](http://openpgpjs.org) (LGPL license): An implementation of OpenPGP in Javascript
* [email.js](http://emailjs.org) (MIT license): IMAP, SMTP, MIME-building and MIME-parsing engine
* [Forge](https://github.com/digitalbazaar/forge) (BSD license): An implementation of TLS in JavaScript
