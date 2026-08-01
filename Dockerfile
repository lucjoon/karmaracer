# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV KARMA_GUEST_MODE=1
ENV KARMA_MEMORY_DB=1
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/public ./public
COPY --from=build /app/views ./views
COPY --from=build /app/libs ./libs
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/*.js ./
COPY --from=build /app/config_shared.js ./config_shared.js
EXPOSE 8080
CMD ["node", "server.js"]
