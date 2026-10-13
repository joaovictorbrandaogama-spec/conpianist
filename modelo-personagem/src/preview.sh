#!/bin/bash
# preview.sh OUTDIR VIEWS [extra scene args]
OUT=$1; VIEWS=$2; shift 2
BP=/opt/blender-dl/blender-4.5.14-linux-x64/4.5/python/bin/python3.11
cd "$(dirname "$0")"
blender -b -P scene.py -- --views $VIEWS --out $OUT "$@" 2>&1 | grep -E "Traceback|Error|rror:" | grep -v EGL
imgs=""
for v in ${VIEWS//,/ }; do imgs="$imgs $OUT/$v.png"; done
$BP sheet.py $OUT/sheet.png 700 $imgs
