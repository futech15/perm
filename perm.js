const puppeteer = require('puppeteer');
const axios = require('axios');

// Function to solve CAPTCHA using 2Captcha (or another CAPTCHA solving service)
async function solveCaptcha(imageUrl) {
  try {
    const response = await axios.post('http://2captcha.com/in.php', {
      method: 'post',
      body: { imageUrl },
      key: 'YOUR_2CAPTCHA_API_KEY'
    });
    
    return response.data; // This will return the CAPTCHA solution
  } catch (error) {
    console.error('Error solving CAPTCHA:', error);
    return null;
  }
}

// Function to extract data from the website and send it to Google Sheets
async function fetchTotalCompletedToday() {
  const url = 'https://permtimeline.com';
  
  // Launch Puppeteer browser
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto(url);
  
  // Add CAPTCHA solving logic (if needed)
  const captchaImage = await page.$('selector-for-captcha'); // You'll need to find the CAPTCHA image on the page
  if (captchaImage) {
    const captchaImageUrl = await captchaImage.screenshot({ encoding: 'base64' });
    const captchaSolution = await solveCaptcha(captchaImageUrl);
    
    if (captchaSolution) {
      // Complete CAPTCHA solving process here (e.g., fill out form and submit)
      await page.type('captcha-input-selector', captchaSolution);
      await page.click('submit-captcha-button-selector');
      await page.waitForNavigation();
    }
  }
  
  // Extract the Total Completed Today data after solving CAPTCHA
  const totalCompletedToday = await page.$eval('#todayCount', el => el.textContent);
  
  console.log('Total Completed Today:', totalCompletedToday);
  
  // Send data to Google Sheets (via API)
  await updateGoogleSheet(new Date(), totalCompletedToday);
  
  await browser.close();
}

// Function to update Google Sheets with the fetched data
async function updateGoogleSheet(date, completedValue) {
  const sheetId = '1xscPwljvNZEdB8yESa32kDLQlmnU-MGezLB6NuhX6YA'; // Your Google Sheet ID
  const sheetRange = 'Sheet1!A:B'; // Sheet name and range where you want to insert data
  const googleSheetApiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetRange}:append`;

  const data = {
    values: [
      [date, completedValue]
    ]
  };

  const headers = {
    Authorization: `Bearer YOUR_GOOGLE_API_ACCESS_TOKEN`,  // Google API Token
  };

  try {
    const response = await axios.post(googleSheetApiUrl, data, { headers });
    console.log('Google Sheets Updated:', response.data);
  } catch (error) {
    console.error('Error updating Google Sheets:', error);
  }
}

// Call the fetch function (for testing)
fetchTotalCompletedToday();

// To run this on a schedule (e.g., every day), you can set up a cron job or use cloud functions.
