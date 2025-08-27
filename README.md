# 재무제표 시각화 서비스

OpenDART API를 활용하여 상장 기업의 재무제표를 시각화하고 AI 설명을 제공하는 웹 서비스입니다.

## 주요 기능

- 회사명 검색 및 자동완성
- 재무제표 데이터 조회 (OpenDART API 활용)
- 재무상태표 및 손익계산서 시각화
- 자산 = 부채 + 자본 관계 시각화
- 유동/비유동 자산 및 부채 구분 표시
- AI를 활용한 재무제표 설명 생성 (Gemini API 활용)

## 설치 방법

1. 저장소 클론
```bash
git clone <repository-url>
cd fs-project
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
`.env` 파일을 생성하고 다음 내용을 추가합니다:
```
OPEN_DART_API_KEY=your_opendart_api_key
GEMINI_API_KEY=your_gemini_api_key
```

4. 회사 코드 다운로드
```bash
npm run download-corps
```

5. 서버 실행
```bash
npm start
```

6. 웹 브라우저에서 접속
```
http://localhost:3000
```

## 배포 가이드

### 필요 사항

- Node.js 버전 18 이상
- OpenDART API 키
- Gemini API 키

### 배포 옵션

#### 1. 클라우드 서비스 배포 (추천)

##### Heroku 배포
1. Heroku 계정 생성 및 Heroku CLI 설치
2. 프로젝트 디렉토리에서 다음 명령어 실행:
```bash
heroku login
heroku create fs-project
git push heroku main
```
3. 환경 변수 설정:
```bash
heroku config:set OPEN_DART_API_KEY=your_opendart_api_key
heroku config:set GEMINI_API_KEY=your_gemini_api_key
```
4. 회사 코드 다운로드:
```bash
heroku run npm run download-corps
```

##### Render 배포
1. Render 계정 생성
2. 새 웹 서비스 생성 및 GitHub 저장소 연결
3. 환경 변수 설정: `OPEN_DART_API_KEY`, `GEMINI_API_KEY`
4. 빌드 명령어: `npm install`
5. 시작 명령어: `npm start`
6. 배포 후 회사 코드 다운로드를 위해 Shell 접속하여 `npm run download-corps` 실행

#### 2. Docker 컨테이너 배포

1. Dockerfile 생성:
```dockerfile
FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
```

2. 이미지 빌드 및 실행:
```bash
docker build -t fs-project .
docker run -p 3000:3000 -e OPEN_DART_API_KEY=your_key -e GEMINI_API_KEY=your_key fs-project
```

3. 회사 코드 다운로드:
```bash
docker exec -it <container_id> npm run download-corps
```

#### 3. VPS(Virtual Private Server) 배포

1. 서버에 Node.js 설치
2. 프로젝트 파일 업로드
3. 의존성 설치: `npm install`
4. 환경 변수 설정
5. PM2를 사용하여 서버 실행:
```bash
npm install -g pm2
pm2 start server.js
```
6. 회사 코드 다운로드: `npm run download-corps`
7. Nginx 등의 웹 서버를 사용하여 리버스 프록시 설정

## 주의 사항

- OpenDART API는 요청 한도가 있으므로 과도한 요청을 피해야 합니다.
- Gemini API도 무료 티어의 경우 사용량 제한이 있습니다.
- 회사 코드 데이터(`corps.json`, `listed_corps.json`)는 정기적으로 업데이트해야 합니다.
- 재무제표 설명은 참고용으로만 사용하세요. 투자 결정에 직접적으로 활용하지 마세요.

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.