#!/usr/bin/env bash
#
# The macOS entry point, kept because it is what gets typed. Everything is in
# deploy.sh, which picks the install path from `uname` - see the note at the top
# of it for why there is no longer a second copy of the deploy logic here.
#
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/deploy.sh" "$@"
