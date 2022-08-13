#!/usr/bin/env bash

for dir in "$(dirname "$0")"/../packages/beastcss-webpack-plugin/test/webpack-versions/*; do (cd "$dir" && yarn install); done
