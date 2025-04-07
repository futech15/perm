const puppeteer = require('puppeteer');
const axios = require('axios');
const { google } = require('googleapis'); // For Google Sheets API

// 2Captcha API Key (replace with yours)
const CAPTCHA_API_KEY = 'YOUR_2CAPTCHA_API_KEY';

// Google Sheets setup
const SPREADSHEET_ID = 'YOUR_SHEET_ID';
const SHEET_NAME = 'Sheet1';
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json', // Download from Google Cloud Console
  scopes: 'https://www.googleapis.com/auth/spreadsheets',
});

async function solveCaptcha(base64Image) {
  try {
    // Send CAPTCHA to 2Captcha
    const response = await axios.post(
      `http://2captcha.com/in.php`,
      `key=${CAPTCHA_API_KEY}&method=base64&body=${encodeURIComponent(base64Image)}&json=1`
    );
    
    if (!response.data.request) throw new Error('CAPTCHA submission failed');
    
    // Wait for solution
    const captchaId = response.data.request;
    await new Promise(resolve => setTimeout(resolve, 20000)); // Wait 20 seconds
    
    // Retrieve solution
    const solutionRes = await axios.get(
      `http://2captcha.com/res.php?key=${CAPTCHA_API_KEY}&action=get&id=${captchaId}&json=1`
    );
    
    return solutionRes.data.request;
  } catch (error) {
    console.error('CAPTCHA solving error:', error);
    return null;
  }
}

async function fetchTotalCompletedToday() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://permtimeline.com', { waitUntil: 'networkidle2' });
    
    // Check for CAPTCHA
    const captchaElement = await page.$('img[src*="captcha"], .captcha-image');
    if (captchaElement) {
      const captchaImage = await captchaElement.screenshot({ encoding: 'base64' });
      const solution = await solveCaptcha(captchaImage);
      
      if (solution) {
        // Find CAPTCHA input and submit
        await page.type('input[name="captcha"]', solution);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
      }
    }
    
    // Get the data
    const totalCompletedToday = await page.$eval('#todayCount', el => el.textContent.trim());
    console.log('Fetched data:', totalCompletedToday);
    
    // Update Google Sheets
    await updateGoogleSheet(totalCompletedToday);
    
  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    await browser.close();
  }
}

async function updateGoogleSheet(data) {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const now = new Date().toISOString();
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:B`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [[now, data]],
      },
    });
    
    console.log('Successfully updated Google Sheets');
  } catch (error) {
    console.error('Google Sheets API error:', error.message);
  }
}

// Run the function
fetchTotalCompletedToday();
