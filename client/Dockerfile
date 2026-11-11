# Invoice Desk web UI: the Vite build, served by nginx on port 80.
# nginx also proxies /api to n8n's webhooks (see nginx.conf), so the browser
# talks to one origin, exactly like the Vite dev server.
#
#   docker build -t invoice-desk-client client

FROM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /src/dist /usr/share/nginx/html
# Where n8n runs, and the key its webhooks expect; set at `docker run`.
ENV N8N_UPSTREAM=http://n8n:5678
ENV INVOICE_API_KEY=""
EXPOSE 80
