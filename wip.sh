#!/bin/bash

set -x

cd test-project-6.4.1 || exit 1
# npx clinic heapprofiler -- node ./node_modules/.bin/rw build --no-prerender
npx clinic doctor -- node ./node_modules/.bin/rw build --no-prerender