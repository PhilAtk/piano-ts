FROM nginx:alpine

WORKDIR /piano

RUN apk add npm

COPY . .

RUN npm install
RUN npx tsc

RUN mkdir static
RUN mv js static/js
RUN mv index.html static/index.html

COPY ./nginx.conf /etc/nginx/nginx.conf