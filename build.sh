#!/bin/env bash

if ! command -v tsc &> /dev/null
then
	echo "run npm install typescript"
	exit 1
fi

cp -r src/ build/

cp src/static/* build/

webpack
