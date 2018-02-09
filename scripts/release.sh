#!/bin/bash

npm update

VERSION=$(node --eval "console.log(require('./package.json').version);")

npm test || exit 1

echo "Ready to publish CARTO.js version $VERSION"
echo "Has the version number been bumped?"
read -n1 -r -p "Press Ctrl+C to cancel, or any other key to continue." key

npm run build

echo "Uploading to CDN..."

grunt publish_s3
grunt invalidate

echo "Uploading to npm..."

node scripts/generate-package-json.js
cp README.md dist/public

cd dist/public

npm publish

echo "All done."
