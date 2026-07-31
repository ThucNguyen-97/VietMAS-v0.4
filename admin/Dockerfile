FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG USER_PORTAL=false
ENV USER_PORTAL=$USER_PORTAL
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG USER_PORTAL=false
ENV USER_PORTAL=$USER_PORTAL
COPY --from=builder /app ./
EXPOSE 3000
CMD ["npm", "run", "start"]
