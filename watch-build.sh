#!/bin/bash

watch-cmd() {
DIR_TO_WATCH=${1}
COMMAND=${2}
 
trap "echo Exited!; exit;" SIGINT SIGTERM
while [[ 1=1 ]]
do
  watch --chgexit -n 1 "ls --all -l --recursive --full-time ${DIR_TO_WATCH} | sha256sum" && ${COMMAND}
  sleep 1
done
}

watch-cmd ./src ./build.sh
