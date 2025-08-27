// DOM 요소
const companySearchInput = document.getElementById('company-search');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');
const autocompleteResults = document.getElementById('autocomplete-results');
const optionsSection = document.getElementById('options-section');
const selectedCompanyName = document.getElementById('selected-company-name');
const selectedCompanyCode = document.getElementById('selected-company-code');
const yearSelect = document.getElementById('year-select');
const reportSelect = document.getElementById('report-select');
const fsDivSelect = document.getElementById('fs-div-select');
const loadDataBtn = document.getElementById('load-data-btn');
const resultsSection = document.getElementById('results-section');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const loadingElement = document.getElementById('loading');
const errorMessageElement = document.getElementById('error-message');
const explanationContent = document.getElementById('explanation-content');
const generateExplanationBtn = document.getElementById('generate-explanation-btn');

// 차트 객체
let bsChart = null;
let bsEquationChart = null;
let isChart = null;

// 선택된 회사 정보
let selectedCompany = null;

// 재무제표 데이터 저장
let currentFinancialData = null;

// 이벤트 리스너
searchBtn.addEventListener('click', searchCompany);
companySearchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchCompany();
  }
});

// 자동완성 이벤트 리스너
companySearchInput.addEventListener('input', debounce(handleAutocomplete, 300));
companySearchInput.addEventListener('focus', () => {
  if (companySearchInput.value.trim().length >= 1) {
    handleAutocomplete();
  }
});

// 자동완성 외부 클릭 시 닫기
document.addEventListener('click', (e) => {
  if (!e.target.closest('.autocomplete-container')) {
    autocompleteResults.style.display = 'none';
  }
});

loadDataBtn.addEventListener('click', loadFinancialData);
generateExplanationBtn.addEventListener('click', generateFinancialExplanation);

// 탭 버튼에 원본 텍스트 저장
tabBtns.forEach(btn => {
  btn.setAttribute('data-original-text', btn.textContent);
});

// 탭 전환 이벤트
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.getAttribute('data-tab');
    
    // 탭 버튼 활성화
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // 탭 콘텐츠 활성화
    tabContents.forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabId}-content`).classList.add('active');
  });
});

// 회사 검색 함수
async function searchCompany() {
  const query = companySearchInput.value.trim();
  
  if (!query) {
    showError('검색어를 입력해주세요.');
    return;
  }
  
  try {
    showLoading();
    
    const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    hideLoading();
    
    if (data.error) {
      showError(data.error);
      return;
    }
    
    displaySearchResults(data.results);
  } catch (error) {
    hideLoading();
    showError('검색 중 오류가 발생했습니다.');
    console.error('검색 오류:', error);
  }
}

// 검색 결과 표시 함수
function displaySearchResults(results) {
  searchResults.innerHTML = '';
  
  if (results.length === 0) {
    searchResults.innerHTML = '<div class="search-result-item">검색 결과가 없습니다.</div>';
    searchResults.style.display = 'block';
    return;
  }
  
  results.forEach(company => {
    const resultItem = document.createElement('div');
    resultItem.className = 'search-result-item';
    
    // 영문명이 있으면 표시
    if (company.corp_name_eng) {
      resultItem.innerHTML = `${company.corp_name} <span class="corp-name-eng">(${company.corp_name_eng})</span> <span class="stock-code">${company.stock_code}</span>`;
    } else {
      resultItem.innerHTML = `${company.corp_name} <span class="stock-code">${company.stock_code}</span>`;
    }
    
    resultItem.addEventListener('click', () => {
      selectCompany(company);
    });
    
    searchResults.appendChild(resultItem);
  });
  
  searchResults.style.display = 'block';
}

// 회사 선택 함수
function selectCompany(company) {
  selectedCompany = company;
  
  // 회사 정보 표시
  // 영문명이 있으면 회사명 옆에 괄호 안에 표시
  if (company.corp_name_eng) {
    selectedCompanyName.innerHTML = `${company.corp_name} <small class="corp-name-eng">(${company.corp_name_eng})</small>`;
  } else {
    selectedCompanyName.textContent = company.corp_name;
  }
  
  // 종목코드와 고유번호 표시
  selectedCompanyCode.textContent = `종목코드: ${company.stock_code} | 고유번호: ${company.corp_code}`;
  
  // 검색 결과 닫기
  searchResults.style.display = 'none';
  // 자동완성 결과 닫기
  autocompleteResults.style.display = 'none';
  
  // 옵션 섹션 표시
  optionsSection.style.display = 'block';
  
  // 결과 섹션 숨기기
  resultsSection.style.display = 'none';
}

// 재무제표 데이터 로드 함수
async function loadFinancialData() {
  if (!selectedCompany) {
    showError('회사를 먼저 선택해주세요.');
    return;
  }
  
  const bsnsYear = yearSelect.value;
  const reprtCode = reportSelect.value;
  const fsDiv = fsDivSelect.value;
  
  try {
    showLoading();
    
    // 탭 버튼 원래 텍스트로 복원
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const originalText = btn.getAttribute('data-original-text');
      if (originalText) {
        btn.textContent = originalText;
      }
    });
    
    const response = await fetch(`/api/financial?corp_code=${selectedCompany.corp_code}&bsns_year=${bsnsYear}&reprt_code=${reprtCode}`);
    const data = await response.json();
    
    hideLoading();
    
    if (data.error) {
      showError(data.error);
      return;
    }
    
    if (data.status !== '000') {
      showError(`API 오류: ${data.status} - ${data.message}`);
      return;
    }
    
    // 데이터 처리 및 시각화
    processFinancialData(data);
    
    // 결과 섹션 표시
    resultsSection.style.display = 'block';
  } catch (error) {
    hideLoading();
    showError('데이터를 불러오는 중 오류가 발생했습니다.');
    console.error('데이터 로드 오류:', error);
  }
}

// 재무제표 데이터 처리 및 시각화 함수
function processFinancialData(data) {
  // 선택된 재무제표 유형 (연결/개별)
  const selectedFsDiv = fsDivSelect.value; // 'CFS' 또는 'OFS'
  
  // 재무제표 유형에 따라 필터링
  const filteredData = data.list.filter(item => item.fs_div === selectedFsDiv);
  
  // 현재 재무제표 데이터 저장
  currentFinancialData = filteredData;
  
  // 재무상태표와 손익계산서 데이터 분리
  const bsData = filteredData.filter(item => item.sj_div === 'BS');
  const isData = filteredData.filter(item => item.sj_div === 'IS');
  
  // 연도 정보 추출
  let thstrmYear = '';
  let frmtrmYear = '';
  let bfefrmtrmYear = '';
  
  if (bsData.length > 0) {
    // 당기 연도 추출 (예: "2018.12.31 현재" -> "2018")
    if (bsData[0].thstrm_dt) {
      thstrmYear = bsData[0].thstrm_dt.substring(0, 4);
    }
    
    // 전기 연도 추출
    if (bsData[0].frmtrm_dt) {
      frmtrmYear = bsData[0].frmtrm_dt.substring(0, 4);
    }
    
    // 전전기 연도 추출
    if (bsData[0].bfefrmtrm_dt) {
      bfefrmtrmYear = bsData[0].bfefrmtrm_dt.substring(0, 4);
    }
  } else if (isData.length > 0) {
    // 손익계산서에서 연도 정보 추출 (예: "2018.01.01 ~ 2018.12.31" -> "2018")
    if (isData[0].thstrm_dt) {
      thstrmYear = isData[0].thstrm_dt.substring(0, 4);
    }
    
    if (isData[0].frmtrm_dt) {
      frmtrmYear = isData[0].frmtrm_dt.substring(0, 4);
    }
    
    if (isData[0].bfefrmtrm_dt) {
      bfefrmtrmYear = isData[0].bfefrmtrm_dt.substring(0, 4);
    }
  }
  
  // 테이블 헤더 업데이트
  updateTableHeaders(thstrmYear, frmtrmYear, bfefrmtrmYear);
  
  // 재무제표 유형 표시
  const fsTypeText = selectedFsDiv === 'CFS' ? '연결 재무제표' : '개별 재무제표';
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const originalText = btn.getAttribute('data-original-text') || btn.textContent;
    btn.setAttribute('data-original-text', originalText);
    btn.textContent = `${originalText} (${fsTypeText})`;
  });
  
  // 데이터 시각화
  visualizeBalanceSheet(bsData, thstrmYear, frmtrmYear, bfefrmtrmYear);
  visualizeBalanceSheetEquation(bsData, thstrmYear, frmtrmYear, bfefrmtrmYear);
  visualizeIncomeStatement(isData, thstrmYear, frmtrmYear, bfefrmtrmYear);
  
  // 설명 탭 초기화
  resetExplanationTab();
}

// 테이블 헤더 업데이트 함수
function updateTableHeaders(thstrmYear, frmtrmYear, bfefrmtrmYear) {
  // 재무상태표 테이블 헤더 업데이트
  const bsTableHeaders = document.querySelectorAll('#bs-table thead th');
  if (bsTableHeaders.length >= 4) {
    bsTableHeaders[1].textContent = thstrmYear ? `당기 (${thstrmYear})` : '당기';
    bsTableHeaders[2].textContent = frmtrmYear ? `전기 (${frmtrmYear})` : '전기';
    bsTableHeaders[3].textContent = bfefrmtrmYear ? `전전기 (${bfefrmtrmYear})` : '전전기';
  }
  
  // 손익계산서 테이블 헤더 업데이트
  const isTableHeaders = document.querySelectorAll('#is-table thead th');
  if (isTableHeaders.length >= 4) {
    isTableHeaders[1].textContent = thstrmYear ? `당기 (${thstrmYear})` : '당기';
    isTableHeaders[2].textContent = frmtrmYear ? `전기 (${frmtrmYear})` : '전기';
    isTableHeaders[3].textContent = bfefrmtrmYear ? `전전기 (${bfefrmtrmYear})` : '전전기';
  }
}

// 재무상태표 시각화 함수
function visualizeBalanceSheet(data, thstrmYear, frmtrmYear, bfefrmtrmYear) {
  // 테이블 데이터 생성
  const bsTable = document.querySelector('#bs-table tbody');
  bsTable.innerHTML = '';
  
  // 주요 항목만 필터링 (예: 자산총계, 부채총계, 자본총계)
  const keyAccounts = data.filter(item => 
    ['자산총계', '부채총계', '자본총계', '유동자산', '비유동자산', '유동부채', '비유동부채'].includes(item.account_nm)
  );
  
  // 항목 정렬 순서 설정
  const accountOrder = ['자산총계', '유동자산', '비유동자산', '부채총계', '유동부채', '비유동부채', '자본총계'];
  keyAccounts.sort((a, b) => accountOrder.indexOf(a.account_nm) - accountOrder.indexOf(b.account_nm));
  
  // 테이블에 데이터 추가
  keyAccounts.forEach(item => {
    const row = document.createElement('tr');
    
    const accountCell = document.createElement('td');
    accountCell.textContent = item.account_nm;
    row.appendChild(accountCell);
    
    const thstrmCell = document.createElement('td');
    thstrmCell.textContent = formatAmount(item.thstrm_amount);
    row.appendChild(thstrmCell);
    
    const frmtrmCell = document.createElement('td');
    frmtrmCell.textContent = formatAmount(item.frmtrm_amount);
    row.appendChild(frmtrmCell);
    
    const bfefrmtrmCell = document.createElement('td');
    bfefrmtrmCell.textContent = formatAmount(item.bfefrmtrm_amount);
    row.appendChild(bfefrmtrmCell);
    
    bsTable.appendChild(row);
  });
  
  // 차트 데이터 준비
  const labels = [
    thstrmYear ? `당기 (${thstrmYear})` : '당기',
    frmtrmYear ? `전기 (${frmtrmYear})` : '전기',
    bfefrmtrmYear ? `전전기 (${bfefrmtrmYear})` : '전전기'
  ];
  
  // 주요 항목 찾기
  const assets = keyAccounts.find(item => item.account_nm === '자산총계');
  const currentAssets = keyAccounts.find(item => item.account_nm === '유동자산');
  const nonCurrentAssets = keyAccounts.find(item => item.account_nm === '비유동자산');
  const liabilities = keyAccounts.find(item => item.account_nm === '부채총계');
  const currentLiabilities = keyAccounts.find(item => item.account_nm === '유동부채');
  const nonCurrentLiabilities = keyAccounts.find(item => item.account_nm === '비유동부채');
  const equity = keyAccounts.find(item => item.account_nm === '자본총계');

  // 차트 생성 또는 업데이트
  const bsChartCanvas = document.getElementById('bs-chart');
  
  if (bsChart) {
    bsChart.destroy();
  }
  
  // 재무상태표 차트 데이터셋 준비
  const datasets = [];
  
  // 자산 관련 데이터셋
  if (currentAssets) {
    datasets.push({
      label: '유동자산',
      data: [
        parseAmount(currentAssets.thstrm_amount),
        parseAmount(currentAssets.frmtrm_amount),
        parseAmount(currentAssets.bfefrmtrm_amount)
      ],
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    });
  }
  
  if (nonCurrentAssets) {
    datasets.push({
      label: '비유동자산',
      data: [
        parseAmount(nonCurrentAssets.thstrm_amount),
        parseAmount(nonCurrentAssets.frmtrm_amount),
        parseAmount(nonCurrentAssets.bfefrmtrm_amount)
      ],
      backgroundColor: 'rgba(153, 102, 255, 0.5)',
      borderColor: 'rgba(153, 102, 255, 1)',
      borderWidth: 1
    });
  }
  
  // 항상 자산총계는 포함
  datasets.push({
    label: '자산총계',
    data: [
      parseAmount(assets?.thstrm_amount),
      parseAmount(assets?.frmtrm_amount),
      parseAmount(assets?.bfefrmtrm_amount)
    ],
    backgroundColor: 'rgba(54, 162, 235, 0.8)',
    borderColor: 'rgba(54, 162, 235, 1)',
    borderWidth: 1,
    type: 'line',
    pointStyle: 'circle',
    pointRadius: 5,
    pointHoverRadius: 8
  });
  
  // 부채 관련 데이터셋
  if (currentLiabilities) {
    datasets.push({
      label: '유동부채',
      data: [
        parseAmount(currentLiabilities.thstrm_amount),
        parseAmount(currentLiabilities.frmtrm_amount),
        parseAmount(currentLiabilities.bfefrmtrm_amount)
      ],
      backgroundColor: 'rgba(255, 99, 132, 0.5)',
      borderColor: 'rgba(255, 99, 132, 1)',
      borderWidth: 1
    });
  }
  
  if (nonCurrentLiabilities) {
    datasets.push({
      label: '비유동부채',
      data: [
        parseAmount(nonCurrentLiabilities.thstrm_amount),
        parseAmount(nonCurrentLiabilities.frmtrm_amount),
        parseAmount(nonCurrentLiabilities.bfefrmtrm_amount)
      ],
      backgroundColor: 'rgba(255, 159, 64, 0.5)',
      borderColor: 'rgba(255, 159, 64, 1)',
      borderWidth: 1
    });
  }
  
  // 부채총계 데이터셋
  datasets.push({
    label: '부채총계',
    data: [
      parseAmount(liabilities?.thstrm_amount),
      parseAmount(liabilities?.frmtrm_amount),
      parseAmount(liabilities?.bfefrmtrm_amount)
    ],
    backgroundColor: 'rgba(255, 99, 132, 0.8)',
    borderColor: 'rgba(255, 99, 132, 1)',
    borderWidth: 1,
    type: 'line',
    pointStyle: 'triangle',
    pointRadius: 5,
    pointHoverRadius: 8
  });
  
  // 자본총계 데이터셋
  datasets.push({
    label: '자본총계',
    data: [
      parseAmount(equity?.thstrm_amount),
      parseAmount(equity?.frmtrm_amount),
      parseAmount(equity?.bfefrmtrm_amount)
    ],
    backgroundColor: 'rgba(75, 192, 192, 0.8)',
    borderColor: 'rgba(75, 192, 192, 1)',
    borderWidth: 1,
    type: 'line',
    pointStyle: 'rect',
    pointRadius: 5,
    pointHoverRadius: 8
  });
  
  // 기존 재무상태표 차트 생성
  bsChart = new Chart(bsChartCanvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              // 차트 Y축은 간결하게 표시
              if (value === 0) return '0';
              
              if (Math.abs(value) >= 1000000000000) {
                return (value / 1000000000000).toFixed(1) + '조';
              } else if (Math.abs(value) >= 100000000) {
                return (value / 100000000).toFixed(0) + '억';
              } else if (Math.abs(value) >= 10000) {
                return (value / 10000).toFixed(0) + '만';
              } else {
                return value;
              }
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const num = context.raw;
              // 툴팁에는 상세한 금액 정보 표시
              const formattedNum = new Intl.NumberFormat('ko-KR').format(num);
              return `${context.dataset.label}: ${formattedNum}원 (${formatLargeNumber(num)})`;
            }
          }
        }
      }
    }
  });
}

// 재무상태표 등식 시각화 함수 (자산 = 부채 + 자본)
function visualizeBalanceSheetEquation(data, thstrmYear, frmtrmYear, bfefrmtrmYear) {
  // 주요 항목 필터링
  const assets = data.find(item => item.account_nm === '자산총계');
  const currentAssets = data.find(item => item.account_nm === '유동자산');
  const nonCurrentAssets = data.find(item => item.account_nm === '비유동자산');
  const liabilities = data.find(item => item.account_nm === '부채총계');
  const currentLiabilities = data.find(item => item.account_nm === '유동부채');
  const nonCurrentLiabilities = data.find(item => item.account_nm === '비유동부채');
  const equity = data.find(item => item.account_nm === '자본총계');
  
  if (!assets || !liabilities || !equity) {
    console.error('재무상태표 등식 차트에 필요한 데이터가 없습니다.');
    return;
  }
  
  // 차트 데이터 준비
  const labels = [
    thstrmYear ? `당기 (${thstrmYear})` : '당기',
    frmtrmYear ? `전기 (${frmtrmYear})` : '전기',
    bfefrmtrmYear ? `전전기 (${bfefrmtrmYear})` : '전전기'
  ];
  
  // 자산 데이터 (유동자산, 비유동자산)
  const currentAssetsData = currentAssets ? [
    parseAmount(currentAssets.thstrm_amount),
    parseAmount(currentAssets.frmtrm_amount),
    parseAmount(currentAssets.bfefrmtrm_amount)
  ] : [0, 0, 0];
  
  const nonCurrentAssetsData = nonCurrentAssets ? [
    parseAmount(nonCurrentAssets.thstrm_amount),
    parseAmount(nonCurrentAssets.frmtrm_amount),
    parseAmount(nonCurrentAssets.bfefrmtrm_amount)
  ] : [0, 0, 0];
  
  // 자산 데이터가 없거나 불완전한 경우 총계에서 계산
  if (currentAssets && nonCurrentAssets) {
    // 유동자산과 비유동자산 데이터가 모두 있는 경우 그대로 사용
  } else if (!currentAssets && !nonCurrentAssets) {
    // 둘 다 없는 경우 자산총계를 유동자산으로 표시
    currentAssetsData[0] = parseAmount(assets.thstrm_amount);
    currentAssetsData[1] = parseAmount(assets.frmtrm_amount);
    currentAssetsData[2] = parseAmount(assets.bfefrmtrm_amount);
  } else if (currentAssets && !nonCurrentAssets) {
    // 유동자산만 있는 경우 비유동자산 = 자산총계 - 유동자산
    nonCurrentAssetsData[0] = parseAmount(assets.thstrm_amount) - parseAmount(currentAssets.thstrm_amount);
    nonCurrentAssetsData[1] = parseAmount(assets.frmtrm_amount) - parseAmount(currentAssets.frmtrm_amount);
    nonCurrentAssetsData[2] = parseAmount(assets.bfefrmtrm_amount) - parseAmount(currentAssets.bfefrmtrm_amount);
  } else if (!currentAssets && nonCurrentAssets) {
    // 비유동자산만 있는 경우 유동자산 = 자산총계 - 비유동자산
    currentAssetsData[0] = parseAmount(assets.thstrm_amount) - parseAmount(nonCurrentAssets.thstrm_amount);
    currentAssetsData[1] = parseAmount(assets.frmtrm_amount) - parseAmount(nonCurrentAssets.frmtrm_amount);
    currentAssetsData[2] = parseAmount(assets.bfefrmtrm_amount) - parseAmount(nonCurrentAssets.bfefrmtrm_amount);
  }
  
  // 부채 데이터 (유동부채, 비유동부채)
  const currentLiabilitiesData = currentLiabilities ? [
    parseAmount(currentLiabilities.thstrm_amount),
    parseAmount(currentLiabilities.frmtrm_amount),
    parseAmount(currentLiabilities.bfefrmtrm_amount)
  ] : [0, 0, 0];
  
  const nonCurrentLiabilitiesData = nonCurrentLiabilities ? [
    parseAmount(nonCurrentLiabilities.thstrm_amount),
    parseAmount(nonCurrentLiabilities.frmtrm_amount),
    parseAmount(nonCurrentLiabilities.bfefrmtrm_amount)
  ] : [0, 0, 0];
  
  // 부채 데이터가 없거나 불완전한 경우 총계에서 계산
  if (currentLiabilities && nonCurrentLiabilities) {
    // 유동부채와 비유동부채 데이터가 모두 있는 경우 그대로 사용
  } else if (!currentLiabilities && !nonCurrentLiabilities) {
    // 둘 다 없는 경우 부채총계를 유동부채로 표시
    currentLiabilitiesData[0] = parseAmount(liabilities.thstrm_amount);
    currentLiabilitiesData[1] = parseAmount(liabilities.frmtrm_amount);
    currentLiabilitiesData[2] = parseAmount(liabilities.bfefrmtrm_amount);
  } else if (currentLiabilities && !nonCurrentLiabilities) {
    // 유동부채만 있는 경우 비유동부채 = 부채총계 - 유동부채
    nonCurrentLiabilitiesData[0] = parseAmount(liabilities.thstrm_amount) - parseAmount(currentLiabilities.thstrm_amount);
    nonCurrentLiabilitiesData[1] = parseAmount(liabilities.frmtrm_amount) - parseAmount(currentLiabilities.frmtrm_amount);
    nonCurrentLiabilitiesData[2] = parseAmount(liabilities.bfefrmtrm_amount) - parseAmount(currentLiabilities.bfefrmtrm_amount);
  } else if (!currentLiabilities && nonCurrentLiabilities) {
    // 비유동부채만 있는 경우 유동부채 = 부채총계 - 비유동부채
    currentLiabilitiesData[0] = parseAmount(liabilities.thstrm_amount) - parseAmount(nonCurrentLiabilities.thstrm_amount);
    currentLiabilitiesData[1] = parseAmount(liabilities.frmtrm_amount) - parseAmount(nonCurrentLiabilities.frmtrm_amount);
    currentLiabilitiesData[2] = parseAmount(liabilities.bfefrmtrm_amount) - parseAmount(nonCurrentLiabilities.bfefrmtrm_amount);
  }
  
  // 자본 데이터
  const equityData = [
    parseAmount(equity.thstrm_amount),
    parseAmount(equity.frmtrm_amount),
    parseAmount(equity.bfefrmtrm_amount)
  ];
  
  // 차트 생성 또는 업데이트
  const bsEquationChartCanvas = document.getElementById('bs-equation-chart');
  
  if (bsEquationChart) {
    bsEquationChart.destroy();
  }
  
  bsEquationChart = new Chart(bsEquationChartCanvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        // 자산 측 (왼쪽)
        {
          label: '유동자산',
          data: currentAssetsData,
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          stack: 'stack0'
        },
        {
          label: '비유동자산',
          data: nonCurrentAssetsData,
          backgroundColor: 'rgba(153, 102, 255, 0.7)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
          stack: 'stack0'
        },
        // 부채와 자본 측 (오른쪽)
        {
          label: '유동부채',
          data: currentLiabilitiesData,
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
          stack: 'stack1'
        },
        {
          label: '비유동부채',
          data: nonCurrentLiabilitiesData,
          backgroundColor: 'rgba(255, 159, 64, 0.7)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 1,
          stack: 'stack1'
        },
        {
          label: '자본총계',
          data: equityData,
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
          stack: 'stack1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: '자산 = 부채 + 자본 관계 시각화',
          font: {
            size: 16
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const num = context.raw;
              const formattedNum = new Intl.NumberFormat('ko-KR').format(num);
              return `${context.dataset.label}: ${formattedNum}원 (${formatLargeNumber(num)})`;
            }
          }
        },
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 15
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: '기간'
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          title: {
            display: true,
            text: '금액'
          },
          ticks: {
            callback: function(value) {
              if (value === 0) return '0';
              
              if (Math.abs(value) >= 1000000000000) {
                return (value / 1000000000000).toFixed(1) + '조';
              } else if (Math.abs(value) >= 100000000) {
                return (value / 100000000).toFixed(0) + '억';
              } else if (Math.abs(value) >= 10000) {
                return (value / 10000).toFixed(0) + '만';
              } else {
                return value;
              }
            }
          }
        }
      }
    }
  });
}

// 손익계산서 시각화 함수
function visualizeIncomeStatement(data, thstrmYear, frmtrmYear, bfefrmtrmYear) {
  // 테이블 데이터 생성
  const isTable = document.querySelector('#is-table tbody');
  isTable.innerHTML = '';
  
  // 주요 항목만 필터링
  const keyAccounts = data.filter(item => 
    ['매출액', '영업이익', '법인세차감전 순이익', '당기순이익'].includes(item.account_nm)
  );
  
  // 테이블에 데이터 추가
  keyAccounts.forEach(item => {
    const row = document.createElement('tr');
    
    const accountCell = document.createElement('td');
    accountCell.textContent = item.account_nm;
    row.appendChild(accountCell);
    
    const thstrmCell = document.createElement('td');
    thstrmCell.textContent = formatAmount(item.thstrm_amount);
    row.appendChild(thstrmCell);
    
    const frmtrmCell = document.createElement('td');
    frmtrmCell.textContent = formatAmount(item.frmtrm_amount);
    row.appendChild(frmtrmCell);
    
    const bfefrmtrmCell = document.createElement('td');
    bfefrmtrmCell.textContent = formatAmount(item.bfefrmtrm_amount);
    row.appendChild(bfefrmtrmCell);
    
    isTable.appendChild(row);
  });
  
  // 차트 데이터 준비
  const labels = [
    thstrmYear ? `당기 (${thstrmYear})` : '당기',
    frmtrmYear ? `전기 (${frmtrmYear})` : '전기',
    bfefrmtrmYear ? `전전기 (${bfefrmtrmYear})` : '전전기'
  ];
  const revenue = keyAccounts.find(item => item.account_nm === '매출액');
  const operatingProfit = keyAccounts.find(item => item.account_nm === '영업이익');
  const netIncome = keyAccounts.find(item => item.account_nm === '당기순이익');
  
  // 차트 생성 또는 업데이트
  const isChartCanvas = document.getElementById('is-chart');
  
  if (isChart) {
    isChart.destroy();
  }
  
  isChart = new Chart(isChartCanvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '매출액',
          data: [
            parseAmount(revenue?.thstrm_amount),
            parseAmount(revenue?.frmtrm_amount),
            parseAmount(revenue?.bfefrmtrm_amount)
          ],
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        },
        {
          label: '영업이익',
          data: [
            parseAmount(operatingProfit?.thstrm_amount),
            parseAmount(operatingProfit?.frmtrm_amount),
            parseAmount(operatingProfit?.bfefrmtrm_amount)
          ],
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        },
        {
          label: '당기순이익',
          data: [
            parseAmount(netIncome?.thstrm_amount),
            parseAmount(netIncome?.frmtrm_amount),
            parseAmount(netIncome?.bfefrmtrm_amount)
          ],
          backgroundColor: 'rgba(255, 206, 86, 0.5)',
          borderColor: 'rgba(255, 206, 86, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              // 차트 Y축은 간결하게 표시
              if (value === 0) return '0';
              
              if (Math.abs(value) >= 1000000000000) {
                return (value / 1000000000000).toFixed(1) + '조';
              } else if (Math.abs(value) >= 100000000) {
                return (value / 100000000).toFixed(0) + '억';
              } else if (Math.abs(value) >= 10000) {
                return (value / 10000).toFixed(0) + '만';
              } else {
                return value;
              }
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const num = context.raw;
              // 툴팁에는 상세한 금액 정보 표시
              const formattedNum = new Intl.NumberFormat('ko-KR').format(num);
              return `${context.dataset.label}: ${formattedNum}원 (${formatLargeNumber(num)})`;
            }
          }
        }
      }
    }
  });
}

// 금액 포맷팅 함수 (1,000,000 -> 1,000,000)
function formatAmount(amountStr) {
  if (!amountStr) return '-';
  
  // 콤마와 공백 제거
  const cleanAmount = amountStr.replace(/,/g, '').trim();
  
  // 숫자로 변환
  const num = parseInt(cleanAmount);
  
  // 큰 숫자는 단위로 표시, 작은 숫자는 콤마로 포맷팅
  if (Math.abs(num) >= 10000) {
    return formatLargeNumber(num);
  } else {
    return new Intl.NumberFormat('ko-KR').format(num);
  }
}

// 금액 파싱 함수 (문자열 -> 숫자)
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  
  // 콤마와 공백 제거
  return parseInt(amountStr.replace(/,/g, '').trim());
}

// 큰 숫자 포맷팅 (단위 표시)
function formatLargeNumber(num) {
  if (num === 0) return '0';
  
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  // 조 단위 (1조 이상)
  if (absNum >= 1000000000000) {
    const trillion = absNum / 1000000000000;
    const remainder = absNum % 1000000000000;
    
    if (remainder === 0) {
      return `${sign}${trillion.toFixed(0)}조`;
    }
    
    // 조 단위 + 억 단위 (예: 1조 2,345억)
    if (remainder >= 100000000) {
      const billion = Math.floor(remainder / 100000000);
      return `${sign}${trillion.toFixed(0)}조 ${billion.toLocaleString('ko-KR')}억`;
    }
    
    return `${sign}${trillion.toFixed(2)}조`;
  }
  
  // 억 단위 (1억 이상)
  if (absNum >= 100000000) {
    const billion = absNum / 100000000;
    const remainder = absNum % 100000000;
    
    if (remainder === 0) {
      return `${sign}${billion.toFixed(0)}억`;
    }
    
    // 억 단위 + 만 단위 (예: 1억 2,345만)
    if (remainder >= 10000) {
      const tenThousand = Math.floor(remainder / 10000);
      return `${sign}${billion.toFixed(0)}억 ${tenThousand.toLocaleString('ko-KR')}만`;
    }
    
    return `${sign}${billion.toFixed(2)}억`;
  }
  
  // 만 단위 (1만 이상)
  if (absNum >= 10000) {
    const tenThousand = absNum / 10000;
    return `${sign}${tenThousand.toFixed(1)}만`;
  }
  
  // 1만 미만
  return new Intl.NumberFormat('ko-KR').format(num);
}

// 로딩 표시 함수
function showLoading() {
  loadingElement.style.display = 'block';
  errorMessageElement.style.display = 'none';
}

// 로딩 숨김 함수
function hideLoading() {
  loadingElement.style.display = 'none';
}

// 에러 메시지 표시 함수
function showError(message) {
  errorMessageElement.textContent = message;
  errorMessageElement.style.display = 'block';
  setTimeout(() => {
    errorMessageElement.style.display = 'none';
  }, 5000);
}

// 디바운스 함수 - 연속 호출 방지
function debounce(func, delay) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

// 자동완성 처리 함수
async function handleAutocomplete() {
  const query = companySearchInput.value.trim();
  
  if (!query || query.length < 1) {
    autocompleteResults.style.display = 'none';
    return;
  }
  
  try {
    const response = await fetch(`/api/autocomplete?query=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (data.suggestions && data.suggestions.length > 0) {
      displayAutocompleteSuggestions(data.suggestions);
    } else {
      autocompleteResults.style.display = 'none';
    }
  } catch (error) {
    console.error('자동완성 오류:', error);
    autocompleteResults.style.display = 'none';
  }
}

// 자동완성 결과 표시 함수
function displayAutocompleteSuggestions(suggestions) {
  autocompleteResults.innerHTML = '';
  
  suggestions.forEach(company => {
    const suggestionItem = document.createElement('div');
    suggestionItem.className = 'autocomplete-item';
    
    // 영문명이 있으면 표시
    const engNameDisplay = company.corp_name_eng ? `<span class="corp-name-eng">${company.corp_name_eng}</span>` : '';
    
    suggestionItem.innerHTML = `
      <span>${company.corp_name}</span>
      ${engNameDisplay}
      <span class="stock-code">${company.stock_code}</span>
    `;
    
    suggestionItem.addEventListener('click', () => {
      selectCompanyFromAutocomplete(company);
    });
    
    autocompleteResults.appendChild(suggestionItem);
  });
  
  autocompleteResults.style.display = 'block';
}

// 자동완성에서 회사 선택 함수
function selectCompanyFromAutocomplete(company) {
  companySearchInput.value = company.corp_name;
  autocompleteResults.style.display = 'none';
  
  // 회사 정보로 바로 선택
  selectCompany({
    corp_name: company.corp_name,
    stock_code: company.stock_code,
    corp_code: company.corp_code,
    corp_name_eng: company.corp_name_eng || ''
  });
}

// 설명 탭 초기화 함수
function resetExplanationTab() {
  explanationContent.innerHTML = `
    <div class="explanation-placeholder">
      <p>재무제표 설명을 불러오는 중입니다...</p>
      <button id="generate-explanation-btn" class="explanation-btn">AI 설명 생성하기</button>
    </div>
  `;
  
  // 버튼 이벤트 리스너 다시 연결
  document.getElementById('generate-explanation-btn').addEventListener('click', generateFinancialExplanation);
}

// 재무제표 설명 생성 함수
async function generateFinancialExplanation() {
  if (!currentFinancialData || !selectedCompany) {
    showError('재무제표 데이터가 없습니다. 데이터를 먼저 불러와주세요.');
    return;
  }
  
  try {
    // 로딩 상태 표시
    explanationContent.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>AI가 재무제표를 분석하고 있습니다...</p>
      </div>
    `;
    
    // API 요청
    const response = await fetch('/api/explain-financial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        financialData: currentFinancialData,
        companyName: selectedCompany.corp_name
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      explanationContent.innerHTML = `
        <div class="error-message">
          <p>${data.error}</p>
          <button id="generate-explanation-btn" class="explanation-btn">다시 시도하기</button>
        </div>
      `;
      document.getElementById('generate-explanation-btn').addEventListener('click', generateFinancialExplanation);
      return;
    }
    
    // 설명 표시
    explanationContent.innerHTML = `
      <div class="explanation-content">
        ${data.explanation}
        <div style="margin-top: 30px; text-align: right;">
          <small style="color: #666;">* 이 설명은 AI에 의해 생성되었으며, 투자 결정에 참고용으로만 사용하세요.</small>
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('설명 생성 오류:', error);
    explanationContent.innerHTML = `
      <div class="error-message">
        <p>설명을 생성하는 중 오류가 발생했습니다.</p>
        <button id="generate-explanation-btn" class="explanation-btn">다시 시도하기</button>
      </div>
    `;
    document.getElementById('generate-explanation-btn').addEventListener('click', generateFinancialExplanation);
  }
}
