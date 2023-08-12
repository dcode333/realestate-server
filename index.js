const Xray = require('x-ray');
const x = Xray();
const express = require('express');
const app = express();
const cors = require('cors');
const ConnectToMongo = require("./Utlis/connection");
const { saveOrUpdateProperties } = require('./Utlis/utils');
const fastcsv = require('fast-csv');
const fs = require('fs');
const realEstateData = require('./Models/properties');

const baseUrl = 'https://www.pisos.com/';
const mongoose = require('mongoose');

let chrome = {};
let puppeteer;

(async function scrapeData() {
  await ConnectToMongo();
})()


// if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
//   chrome = require("chrome-aws-lambda");
//   puppeteer = require("puppeteer-core");
// } else puppeteer = require("puppeteer");


app.use(express.json());
app.use(cors());

// Utils----------------------------------------------------------------------------------------------------------------


function isSelectorPresent(url, selector) {
  return new Promise((resolve, reject) => {
    x(url, selector, [{
      class: '@class',
    }])((error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    })
  })

}

function getProvincesNames(url) {
  return new Promise((resolve, reject) => {
    isSelectorPresent(url, '#ComponenteSEO').then((results) => {
      if (results?.length > 0) {
        x(url, `#ComponenteSEO > div.seolinks-zones.clearfix > div.column`, [{
          links: x('a', [{
            name: '@text',
            href: '@href',
            classname: '@class',
            tagName: '@id'
          }])
        }])((error, results) => {
          if (error) {
            reject(error);
          } else {
            const allLinks = results.flatMap(item => item.links);
            resolve(allLinks);
          }
        });
      }
      else {
        x(url, 'body > div.body > div.content.subHome > div.zoneList > div:nth-child(2)', [{
          outerDivs: x('div:nth-child(n)', [{
            innerDivs: x('div:nth-child(n)', [{
              links: x('a', [{
                name: '@text',
                href: '@href',
                classname: '@class'
              }])
            }])
          }])
        }])((altError, altResults) => {
          if (altError) {
            reject(altError);
          } else {
            const allLinks = altResults.flatMap(item =>
              item.outerDivs.flatMap(outerDivItem =>
                outerDivItem.innerDivs.flatMap(innerDivItem =>
                  innerDivItem.links
                )
              )
            );
            resolve(allLinks);
          }
        });
      }
    }).catch((error) => {
      reject(error)
    })
  })
}

function getPropertyCards(url) {
  return new Promise((resolve, reject) => {
    x(url, '#main > div.grid__body > div > div.grid__wrapper > div.ad-preview', [{
      id: '@id',
      price: 'div.ad-preview__bottom > div.ad-preview__info > div.ad-preview__section.ad-preview__section--has-textlink > div > span',
      description: 'div.ad-preview__bottom > div.ad-preview__info > div:nth-child(2) > a',
      subDescription: 'div.ad-preview__bottom > div.ad-preview__info > div:nth-child(2) > p',
      tag: 'div.ad-preview__top > div.ad-preview__product > div > span',
      attributeA: 'div.ad-preview__bottom > div.ad-preview__info > div:nth-child(3) > div > p:nth-child(1)',
      attributeB: 'div.ad-preview__bottom > div.ad-preview__info > div:nth-child(3) > div > p:nth-child(2)',
      attributeC: 'div.ad-preview__bottom > div.ad-preview__info > div:nth-child(3) > div > p:nth-child(3)',
      attributeD: 'div.ad-preview__bottom > div.ad-preview__info > div:nth-child(3) > div > p:nth-child(4)',
      punchLine: 'div.ad-preview__bottom > div.ad-preview__info > div.ad-preview__section.u-hide.u-show--s768 > p',
      href: '@data-lnk-href',
      image: 'div.ad-preview__top > div.carousel > div.carousel__container > div:nth-child(2) > div@data-bg',
      realtorLogo: 'div.ad-preview__logo > a > img@src',
    }])((error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    })
  })
}

function getPropertyDetail(url) {
  return new Promise((resolve, reject) => {
    x(url, 'body > div.body > div.detail', [{
      description: 'div.maindata > div > div.maindata-info > h1',
      subDescription: 'div.maindata > div > div.maindata-info > h2',
      price: 'div.maindata > div > div.maindata-box > div.priceBox > div > div > span',
      tag: 'div.mainphoto > div > div.product > div',
      number: '#dvFormContactar > div.floatcontact-phone.phone > span.number.one',
      detail: '#descriptionBody',
      basicData: '#characteristics > div:nth-child(1) > div.charblock-right',
      equips: '#characteristics > div:nth-child(3) > div.charblock-right',
      date: 'div.generic-block > div > div.container-right > div.owner-data > div.owner-data-info > div',
      realEstate: 'div.generic-block > div > div.container-right > div.owner-data > div.owner-data-info > a'
    }])((error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    })
  })
}

function getPropertyListedInfo(url) {
  return new Promise((resolve, reject) => {
    x(url, 'body > div.body > div.detail', [{
      date: 'div.generic-block > div > div.container-right > div.owner-data > div.owner-data-info > div',
      realEstate: 'div.generic-block > div > div.container-right > div.owner-data > div.owner-data-info > a'
    }])((error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    })
  })
}

async function getRealEstateContact(url) {

  let options = { headless: 'new' };
  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    options = {
      args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: 'new',
      ignoreHTTPSErrors: true,
    };
  }
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();

  try {
    await page.goto(url);

    // Wait for the anchor element to be visible
    const linkSelector = '#dvFormContactar > div.floatcontact-phone.phone > a.link';
    await page.waitForSelector(linkSelector)
      .then(() => {
        console.log('linkSelector found');
      })
      .catch(() => {
        console.log('linkSelector not found');
      })
      ;

    const linkElement = await page.$(linkSelector);

    if (linkElement) {
      // Click the anchor element
      await linkElement.click();

    }

    // Wait for the phone number to load
    const phoneNumberSelector = '#dvFormContactar > div.floatcontact-phone.phone > span.number.one';
    await page.waitForSelector(phoneNumberSelector);

    // Extract phone number text
    const phoneNumber = await page.$eval(phoneNumberSelector, span => span.textContent);

    return phoneNumber.trim();

  } catch (error) {
    console.error('Error:', error);
    await browser.close();
    throw error;
  }
}

async function saveToMongo(url) {
  if (url[url.length - 1] === '/' || url[url.length - 1] === '1') {
    try {
      let isMoreData = 1;
      for (let i = 1; i < 11; i++) {
        if (!isMoreData) break;
        await getPropertyCards(url + i)
          .then((data) => {
            console.log(data.length)
            if (data.length > 0)
              saveOrUpdateProperties(data)
            else isMoreData = 0;
          })
          .catch((error) => {
            console.log(error)
          })
      }
    } catch (error) {
      console.log(error)
    }

  }
}

// Routes----------------------------------------------------------------------------------------------------------------



app.get("/", (req, res) => {

  getProvincesNames(baseUrl)
    .then((data) => {
      res.status(200).send({ data, success: true });
    })
    .catch((error) => {
      res.status(500).send({ error, success: false });
    })

});


app.post('/', (req, res) => {

  const { url } = req.body;

  isSelectorPresent(url, '.grid__wrapper')
    .then(results => {
      if (results?.length > 0)
        res.status(200).send({ data: [], flag: 'bitem', success: true });
      else {
        getProvincesNames(url)
          .then(data => {
            res.status(200).send({ data, flag: 'edium', success: true });
          })
          .catch((error) => {
            res.status(500).send({ error, success: false });
          });
      }
    })
    .catch(e => res.status(500).send({ error, success: false }))

});

app.post("/props", async (req, res) => {
  // console.log(new Date().toLocaleDateString())

  const { url } = req.body;


  getPropertyCards(url)
    .then((data) => {
      saveToMongo(url);
      res.status(200).send({ data, success: true });
    })
    .catch((error) => {
      res.status(500).send({ error, success: false });
    })

});

app.get('/csv', async (req, res) => {
  try {
    const data = await realEstateData.find()
      .select('-_id Description PriceOld PriceNew UpdatedOn Reference');

    res.status(200).json({ data, success: true });


  } catch (error) {
    console.error(error);
    res.status(500).json({ error, success: false });
  }
});

app.get('/deletedb', async (req, res) => {

  try {
    await realEstateData.deleteMany();
    res.status(200).send({ success: true });
  } catch (error) {
    res.status(500).send({ error, success: false });
  }

})

app.post('/detail', (req, res) => {

  const { url } = req.body;

  getPropertyDetail(url)
    .then((data) => {
      res.status(200).send({ data, success: true });
    })
    .catch((error) => {
      res.status(500).send({ error, success: false });
    })
})

app.post('/date', (req, res) => {

  const { url } = req.body;

  getPropertyListedInfo(url)
    .then((data) => {
      res.status(200).send({ data, success: true });
    })
    .catch((error) => {
      res.status(500).send({ error, success: false });
    })
})

app.post('/contact', async (req, res) => {

  const { url } = req.body;

  const contact = await getRealEstateContact(url);

  res.send({ contact, success: true });
})


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on ${PORT} `);
})

module.exports = app;



