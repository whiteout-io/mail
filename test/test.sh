#!/bin/sh

# go to root
cd `dirname $0`
cd ..

PORT=8580

# start server for integration tests
echo "--> starting test server...\n"
PORT=$PORT node server.js --dev &
# get process id
PID=$!
# wait the service to init
sleep 1

# run integration tests
echo "\n--> run tests via grunt...\n"
grunt test

# stop server for integration tests
echo "\n--> stoping test server..."
# wait for request to terminate
sleep 0.5
# kill server process
kill $PID
echo "\n--> all done!\n"
