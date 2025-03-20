const puppeteer = require('puppeteer-core');
const fetch = require('node-fetch');

(async () => {
    try {
        // Fetch WebSocket Debugger URL
        console.log('Fetching WebSocket Debugger URL...');
        const response = await fetch('http://gologin:3000/json/version');
        const data = await response.json();
        const browserWSEndpoint = data.webSocketDebuggerUrl.replace('localhost', 'gologin').replace('3500', '3000');
        console.log(browserWSEndpoint)

        console.log('Connecting to Puppeteer...');
        const browser = await puppeteer.connect({
            browserWSEndpoint: browserWSEndpoint,
            // ignoreHTTPSErrors: true,
        });

        console.log('Connected to browser, getting pages...');
        page = await browser.newPage();
        console.log('Navigating to URL...');
        await page.goto('https://myip.link/mini');

        console.log('Page content:', await page.content());

        console.log('Disconnecting from browser...');
        await browser.disconnect(); // Properly close the connection
        process.exit(0);
    } catch (error) {
        console.error('Error:', error); // Log the error
    }
})();