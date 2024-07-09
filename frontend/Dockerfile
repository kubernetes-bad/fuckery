FROM node:22 AS builder

WORKDIR /app
EXPOSE 5173

COPY . .
RUN npm install
RUN npm run build


FROM node:22

WORKDIR /app
EXPOSE 5000

COPY package*.json ./

COPY --from=builder /app/dist ./dist
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "5000"]
