const Xray = require('x-ray');
const x = Xray();
const express = require('express');
const app = express();
const cors = require('cors');
const baseUrl = 'https://www.pisos.com/';
// let chrome = {};
// let puppeteer;

app.use(express.json());
app.use(cors());



function isPresent(url, selector) {
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

function getProvincesInfo(url) {
  return new Promise((resolve, reject) => {
    isPresent(url, '#ComponenteSEO').then((results) => {
      if (results?.length > 0) {
        x(url, `#ComponenteSEO > div.seolinks-zones.clearfix > div.column`, [{
          links: x('a', [{
            name: '@text',
            href: '@href',
            classname: '@class'
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

function getPropertiesInfo(url) {
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
      image: 'div.ad-preview__top > div.carousel > div.carousel__container > div:nth-child(2) > div@data-bg'
    }])((error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    })
  })
}

app.post("/props", async (req, res) => {

  const { url } = req.body;

  getPropertiesInfo(url)
    .then((data) => {
      res.status(200).send({ data, success: true });
    })
    .catch((error) => {
      res.status(500).send({ error, success: false });
    })
});

app.get("/", async (req, res) => {

  getProvincesInfo(baseUrl)
    .then((data) => {
      res.status(200).send({ data, success: true });
    })
    .catch((error) => {
      res.status(500).send({ error, success: false });
    })
});

app.post('/', async (req, res) => {

  const { flag, url } = req.body;

  if (flag === "edium") {
    getProvincesInfo(url)
      .then(data => {
        res.status(200).send({ data, flag, success: true });
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


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on ${PORT} `);
})


module.exports = app;


//div.ad-preview__top > div.carousel > div.carousel__container > div:nth-child(2) > div
//div.ad-preview__top > div.carousel > div.carousel__container > div:nth-child(2) > div.carousel__main-photo--mosaic
//div.ad-preview__top > div.carousel > div.carousel__container > div:nth-child(2) > div.carousel__main-photo--mosaic.carousel__main-photo--as-img > img