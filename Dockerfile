FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# 회사 코드 다운로드
RUN npm run download-corps

CMD ["npm", "start"]
