const express = require('express');
const app = express();
const cors = require('cors');

app.use(express.json());
app.use(cors());

let chrome = {};
let puppeteer;

async function scrapePisosData(url) {

  let options = {};

  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    options = {
      args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    };
  }

  try {
    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();

    // Intercept requests to block images and unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet') {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Set a reasonable timeout for page navigation and selector wait
    await page.goto(url, { timeout: 30000 });

    // Wait for the content to load
    await page.waitForSelector('.seolinks-zones', { timeout: 30000 });

    const data = await page.evaluate(() => {
      const container = document.querySelector('.seolinks-zones');
      const columns = container.querySelectorAll('.column');

      const result = [];

      columns.forEach((column) => {
        const links = column.querySelectorAll('.seolinks-zones-item');
        const items = [];

        links.forEach((link) => {
          const href = link.getAttribute('href');
          const classname = link.getAttribute('class');
          const name = link.textContent.trim();

          items.push({ href, classname, name });
        });

        result.push(items);
      });

      return result;
    });

    //   await browser.close();
    return data;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chrome = require("chrome-aws-lambda");
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}

app.get("/", async (req, res) => {

  let baseUrl = 'https://www.pisos.com';

  scrapePisosData(baseUrl)
    .then((data) => {
      let flatted = data?.flat();
      res.status(200).send({ data: flatted, flag: "edium", success: true });
    })
    .catch((error) => {
      console.error('Error occurred:', error);
    });


});

app.post('/', (req, res) => {

  const baseUrl = 'https://www.pisos.com';
  const { flag, url } = req.body;

  if (flag === "edium") {
    scrapePisosData(baseUrl + url)
      .then((data) => {
        let flatted = data.flat();
        res.status(200).send({ data: flatted, flag, success: true });
      })
      .catch((error) => {
        res.status(500).send({ error, success: false });
      });
  }

  else if (flag === "-item" || flag === "bitem") {
    res.status(200).send({ data: [], flag, success: true });
  }

  else res.status(500).send({ error: "Internal server error", success: false });

});




app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});

module.exports = app; 
