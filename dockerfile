FROM  node:8

MAINTAINER Kalisio <contact@kalisio.xyz>

ENV DEBUG=
USER root

WORKDIR /opt/k-vigicrues
COPY . /opt/k-vigicrues

RUN npm install -g @kalisio/krawler@0.5.2

CMD krawler "* */30 * * * *" /opt/k-vigicrues/jobfile.js

