#!/bin/bash
source travis.env.sh

# Build Stations image
docker build -f dockerfile.stations -t kalisio/k-vigicrues-stations .
docker tag kalisio/k-vigicrues-stations kalisio/k-vigicrues:stations-$VERSION
# Build Sections image
docker build -f dockerfile.sections -t kalisio/k-vigicrues-sections .
docker tag kalisio/k-vigicrues-sections kalisio/k-vigicrues:sections-$VERSION
# Build Observations image
docker build -f dockerfile.observations -t kalisio/k-vigicrues-observations .
docker tag kalisio/k-vigicrues-observations kalisio/k-vigicrues:observations-$VERSION

# Push the built images to Docker hub
docker login -u="$DOCKER_USER" -p="$DOCKER_PASSWORD"
docker push kalisio/k-vigicrues:stations-$VERSION
docker push kalisio/k-vigicrues:sections-$VERSION
docker push kalisio/k-vigicrues:observations-$VERSION