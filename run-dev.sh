#!/bin/bash

if ! command -v http-server &> /dev/null
then
	echo "run npm install http-server"
	exit 1
fi

PORT=${PORT-9999}

cd build
http-server -p $PORT
