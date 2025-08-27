const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const xml2js = require('xml2js');
require('dotenv').config();

// API 키 직접 사용
const API_KEY = 'f1dc445d4cb369ebf774d52acab754f4af9526dd';

// 회사 코드 파일 다운로드 함수
async function downloadCorpCodes() {
  console.log('회사 코드 파일 다운로드 중...');
  
  try {
    // API 키 확인
    if (!API_KEY) {
      throw new Error('OpenDART API 키가 설정되지 않았습니다.');
    }
    
    console.log('API 키 확인됨:', API_KEY.substring(0, 5) + '...');
    
    // 파일 다운로드 URL
    const url = `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${API_KEY}`;
    
    // 파일 저장 경로
    const downloadPath = path.join(__dirname, 'corp_codes.zip');
    const extractPath = path.join(__dirname, 'corp_codes');
    
    // 압축 해제 디렉토리 생성
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath);
    }
    
    // 파일 다운로드
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'arraybuffer'
    });
    
    // 응답 확인
    if (response.status !== 200) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }
    
    // 파일 저장
    fs.writeFileSync(downloadPath, response.data);
    console.log(`파일 다운로드 완료: ${downloadPath}`);
    
    // 압축 해제
    const zip = new AdmZip(downloadPath);
    zip.extractAllTo(extractPath, true);
    console.log(`압축 해제 완료: ${extractPath}`);
    
    // XML 파일 파싱
    const xmlFilePath = path.join(extractPath, 'CORPCODE.xml');
    if (!fs.existsSync(xmlFilePath)) {
      throw new Error('XML 파일을 찾을 수 없습니다.');
    }
    
    const xmlData = fs.readFileSync(xmlFilePath, 'utf-8');
    const parser = new xml2js.Parser();
    
    // 프로미스 방식으로 변경
    parser.parseStringPromise(xmlData)
      .then(result => {
        // 회사 코드 정보 추출
        const corps = result.result.list[0].corp;
        
        // JSON 형식으로 변환하여 저장
        const corpData = corps.map(corp => ({
          corp_code: corp.corp_code[0],
          corp_name: corp.corp_name[0],
          stock_code: corp.stock_code[0],
          modify_date: corp.modify_date[0]
        }));
        
        // 상장 회사만 필터링 (종목코드가 있는 회사)
        const listedCorps = corpData.filter(corp => corp.stock_code && corp.stock_code.trim() !== '');
        
        // JSON 파일로 저장
        fs.writeFileSync(
          path.join(__dirname, 'corps.json'), 
          JSON.stringify(corpData, null, 2)
        );
        console.log(`전체 회사 수: ${corpData.length}개`);
        
        fs.writeFileSync(
          path.join(__dirname, 'listed_corps.json'), 
          JSON.stringify(listedCorps, null, 2)
        );
        console.log(`상장 회사 수: ${listedCorps.length}개`);
        
        console.log('회사 코드 처리가 완료되었습니다.');
      })
      .catch(err => {
        console.error(`XML 파싱 오류: ${err.message}`);
      });
    
  } catch (error) {
    console.error('오류 발생:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data.toString());
    }
  }
}

// 함수 실행
downloadCorpCodes();
