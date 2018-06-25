FROM  node:8

MAINTAINER Kalisio <contact@kalisio.xyz>

ENV DEBUG=

WORKDIR /opt/kontainer-vigicrue
COPY . /opt/kontainer-vigicrue

RUN yarn install

CMD krawler "* */30 * * * *" jobfile.js

