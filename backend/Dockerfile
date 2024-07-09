FROM node:22 AS builder

WORKDIR /app
COPY . .
ENV PIP_BREAK_SYSTEM_PACKAGES 1
RUN apt update && apt install -y nano python3-pip && pip install spacy

RUN npm install --save-exact && npm run build

FROM node:slim
WORKDIR /app
EXPOSE 3030

ENV PIP_BREAK_SYSTEM_PACKAGES 1
RUN apt update && apt install -y nano python3-pip && pip install spacy

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/dist ./dist
RUN npm install --omit=dev
CMD npm run start
