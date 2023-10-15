const express = require('express');
const app = express();
const cors = require('cors');
const { default: axios } = require('axios');
app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
  axios.get('https://sparkling-bass-crown.cyclic.app/scrapeview')
    .then(response => {
      res.send({})
    })
    .catch(err => {
      console.log(err)
    })
})

app.get('/call', (req, res) => {
  res.send({ message: 'Hello World' })
})


  


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on ${PORT} `);
})

module.exports = app;



