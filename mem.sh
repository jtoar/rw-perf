#!/bin/bash

set -e

# Check if the number of arguments is correct
if [ $# -ne 1 ]; then
    echo "Usage: $0 <pid>";
    exit 1;
fi

# Init the output file
echo "const memData = \`" > out-data.js;
echo "$1" >> out-data.js;

# Make sure to 'close' the data file on exit
function close {
    echo "\`;" >> out-data.js;
}
trap close EXIT

# Measure until the process no longer exists
echo "Measuring memory usage of process $1, press Ctrl+C to stop";
while true; do
    { printf "\n"; date +%s%N; } >> out-data.js;
    ps -o pid=,rss= -g "$1" >> out-data.js;

    sleep 0.25;
done
