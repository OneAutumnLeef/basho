const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on("console", (msg) => console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (err) => console.error(`[PAGE_ERROR] ${err.message}\n${err.stack}`));

  console.log("Navigating to http://localhost:8082...");
  await page.goto("http://localhost:8082", { waitUntil: "networkidle" });
  console.log("Navigation complete.");
  
  await browser.close();
})();
