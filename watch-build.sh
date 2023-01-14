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

build-and-log-to-file() {
  echo "Building" >> out.log
  ./build.sh 2>&1 >> out.log
  echo -e "Done\n" >> out.log
}

watch-cmd "./src ./*.*" build-and-log-to-file

