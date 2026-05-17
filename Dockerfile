FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM alpine:3.22 AS runtime

RUN apk add --no-cache lighttpd

COPY docker/lighttpd.conf /etc/lighttpd/lighttpd.conf
COPY --from=build /app/dist/ /var/www/localhost/htdocs/
COPY --from=build /app/dist/ /var/www/localhost/htdocs/admin/

EXPOSE 8080

USER lighttpd

CMD ["lighttpd", "-D", "-f", "/etc/lighttpd/lighttpd.conf"]
