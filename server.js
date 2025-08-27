const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// API 키 (직접 설정)
const OPEN_DART_API_KEY = 'f1dc445d4cb369ebf774d52acab754f4af9526dd';
const GEMINI_API_KEY = 'AIzaSyBuhHRDOAG3MFUhgi0eY2H3omzmR9MeUKU';

// API 키 확인 로그
console.log('OpenDART API 키:', OPEN_DART_API_KEY);
console.log('OpenDART API 키 길이:', OPEN_DART_API_KEY ? OPEN_DART_API_KEY.length : 0);
console.log('Gemini API 키:', GEMINI_API_KEY);
console.log('Gemini API 키 길이:', GEMINI_API_KEY ? GEMINI_API_KEY.length : 0);

// Gemini API 설정
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
console.log('Gemini API 모델: gemini-1.5-flash (최신 모델)');

const app = express();
const PORT = 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 회사 코드 데이터 로드
let corpsData = [];
let listedCorpsData = [];

try {
  const corpsPath = path.join(__dirname, 'corps.json');
  const listedCorpsPath = path.join(__dirname, 'listed_corps.json');
  
  if (fs.existsSync(corpsPath)) {
    corpsData = JSON.parse(fs.readFileSync(corpsPath, 'utf8'));
    console.log(`전체 회사 데이터 ${corpsData.length}개 로드 완료`);
  }
  
  if (fs.existsSync(listedCorpsPath)) {
    listedCorpsData = JSON.parse(fs.readFileSync(listedCorpsPath, 'utf8'));
    console.log(`상장 회사 데이터 ${listedCorpsData.length}개 로드 완료`);
  }
} catch (error) {
  console.error('회사 데이터 로드 중 오류 발생:', error);
}

// 회사 검색 API
app.get('/api/search', (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: '검색어를 입력해주세요.' });
  }
  
  // 회사명으로 검색 (대소문자 구분 없이)
  const lowerCaseQuery = query.toLowerCase();
  const results = listedCorpsData.filter(corp => 
    corp.corp_name.toLowerCase().includes(lowerCaseQuery)
  )
  .map(corp => ({
    ...corp,
    corp_name_eng: corp.corp_name_eng || '' // 영문명 추가
  }))
  .slice(0, 10); // 최대 10개 결과만 반환
  
  res.json({ results });
});

// 회사명 자동완성 API
app.get('/api/autocomplete', (req, res) => {
  const { query } = req.query;
  
  if (!query || query.length < 1) {
    return res.json({ suggestions: [] });
  }
  
  // 회사명으로 자동완성 검색 (대소문자 구분 없이)
  const lowerCaseQuery = query.toLowerCase();
  const suggestions = listedCorpsData
    .filter(corp => corp.corp_name.toLowerCase().includes(lowerCaseQuery))
    .map(corp => ({
      corp_name: corp.corp_name,
      stock_code: corp.stock_code,
      corp_code: corp.corp_code,
      corp_name_eng: corp.corp_name_eng || '' // 영문명 추가
    }))
    .slice(0, 5); // 최대 5개 제안만 반환
  
  res.json({ suggestions });
});

// 재무제표 데이터 가져오기 API
app.get('/api/financial', async (req, res) => {
  const { corp_code, bsns_year, reprt_code } = req.query;
  
  if (!corp_code || !bsns_year || !reprt_code) {
    return res.status(400).json({ error: '필수 파라미터가 누락되었습니다.' });
  }
  
  try {
    const url = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${OPEN_DART_API_KEY}&corp_code=${corp_code}&bsns_year=${bsns_year}&reprt_code=${reprt_code}`;
    
    const response = await axios.get(url);
    
    if (response.data.status !== '000') {
      return res.status(400).json({ 
        error: `API 오류: ${response.data.status} - ${response.data.message}` 
      });
    }
    
    res.json(response.data);
  } catch (error) {
    console.error('재무제표 데이터 요청 중 오류 발생:', error);
    res.status(500).json({ error: '재무제표 데이터를 가져오는 중 오류가 발생했습니다.' });
  }
});

// Gemini API를 사용하여 재무제표 설명 생성 API
app.post('/api/explain-financial', async (req, res) => {
  const { financialData, companyName } = req.body;
  
  if (!financialData || !companyName) {
    return res.status(400).json({ error: '필수 데이터가 누락되었습니다.' });
  }
  
  try {
    console.log(`${companyName}의 재무제표 설명 요청됨`);
    
    // Gemini 모델 설정 (최신 모델 사용)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // 재무제표 데이터 정리
    const keyFinancialData = financialData
      .filter(item => [
        '자산총계', '부채총계', '자본총계', '매출액', '영업이익', '당기순이익'
      ].includes(item.account_nm))
      .map(item => ({
        account_nm: item.account_nm,
        thstrm_amount: item.thstrm_amount,
        frmtrm_amount: item.frmtrm_amount,
        bfefrmtrm_amount: item.bfefrmtrm_amount,
        thstrm_year: item.thstrm_dt ? item.thstrm_dt.substring(0, 4) : '',
        frmtrm_year: item.frmtrm_dt ? item.frmtrm_dt.substring(0, 4) : '',
        bfefrmtrm_year: item.bfefrmtrm_dt ? item.bfefrmtrm_dt.substring(0, 4) : ''
      }));
    
    // Gemini API 프롬프트 생성
    const prompt = `
    ${companyName}의 다음 재무제표 데이터를 분석하고 쉽게 설명해주세요:
    
    ${JSON.stringify(keyFinancialData, null, 2)}
    
    다음 내용을 포함해주세요:
    1. 회사의 전반적인 재무 상태
    2. 매출, 영업이익, 당기순이익의 추세와 의미
    3. 자산, 부채, 자본의 구성과 변화
    4. 투자자 관점에서 중요한 포인트
    5. 간단한 재무 건전성 평가
    6. 유동성 비율과 부채 비율 분석
    
    전문용어는 최소화하고, 일반인도 이해하기 쉽게 설명해주세요.
    결과는 HTML 형식으로 반환해주세요. <h3>, <p>, <ul>, <li>, <strong> 태그 등을 사용해서 읽기 쉽게 구성해주세요.
    표와 그래프는 설명하지 말고, 텍스트로만 설명해주세요.
    응답 시작과 끝에 \`\`\`html 또는 \`\`\` 같은 마크다운 코드 블록 표시를 넣지 마세요.
    `;
    
    // Gemini API 호출
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const explanation = response.text();
    
    res.json({ explanation });
  } catch (error) {
    console.error('Gemini API 요청 중 오류 발생:', error);
    
    // 오류 발생 시 대체 메시지 반환
    const fallbackExplanation = `
      <h3>재무제표 설명을 생성하는 중 오류가 발생했습니다</h3>
      <p>죄송합니다. ${companyName}의 재무제표 설명을 생성하는 중 문제가 발생했습니다.</p>
      <p>대신 주요 재무 지표를 직접 확인해보세요:</p>
      <ul>
        <li><strong>재무상태표</strong>: 자산, 부채, 자본의 구성을 확인하세요.</li>
        <li><strong>손익계산서</strong>: 매출액, 영업이익, 당기순이익의 추이를 확인하세요.</li>
      </ul>
      <p>재무제표 시각화 탭에서 차트와 표를 통해 재무 정보를 확인할 수 있습니다.</p>
    `;
    
    res.json({ explanation: fallbackExplanation });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
