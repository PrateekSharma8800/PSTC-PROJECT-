#!/bin/sh
# Builds the console version (gcc) and the WebAssembly version (emcc).
set -e
cd "$(dirname "$0")"

LOGIC="backend/voting.c backend/voter.c backend/candidate.c backend/results.c"

echo "Building console version..."
gcc -std=c99 -Wall -Wextra -o voting_console backend/main.c $LOGIC

if command -v emcc >/dev/null 2>&1; then
    echo "Building WebAssembly version..."
    mkdir -p wasm
    emcc $LOGIC -O2 -std=c99 -o wasm/voting.js \
        -sEXPORTED_RUNTIME_METHODS=cwrap,ccall \
        -sENVIRONMENT=web
    echo "Done: wasm/voting.js + wasm/voting.wasm"
else
    echo "emcc not found - skipped WebAssembly build. Install with: brew install emscripten"
fi
