// OpenDART API 설정
require('dotenv').config();

const config = {
  openDartApiKey: process.env.OPEN_DART_API_KEY || '',
};

// API 키가 설정되었는지 확인
if (!config.openDartApiKey) {
  console.warn('경고: OPEN_DART_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.');
}

module.exports = config;
